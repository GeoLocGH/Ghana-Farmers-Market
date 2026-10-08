import { supabase } from './supabase';
import type { UserFile } from '../types';
import { fileToDataUri } from '../utils';

const LOCAL_FILES_CACHE_PREFIX = 'agro_user_files_cache_';

const getLocalCachedFiles = (userId: string): UserFile[] => {
  if (!userId || typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(`${LOCAL_FILES_CACHE_PREFIX}${userId}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.warn('Could not read local file cache:', e);
    return [];
  }
};

const saveLocalCachedFile = (userId: string, fileRecord: UserFile): void => {
  if (!userId || typeof window === 'undefined') return;
  try {
    const existing = getLocalCachedFiles(userId);
    const filtered = existing.filter(
      (f) => f.id !== fileRecord.id && (f.storage_path ? f.storage_path !== fileRecord.storage_path : true)
    );
    const updated = [fileRecord, ...filtered].slice(0, 100);
    localStorage.setItem(`${LOCAL_FILES_CACHE_PREFIX}${userId}`, JSON.stringify(updated));
  } catch (e) {
    console.warn('Could not save local file cache:', e);
  }
};

const removeLocalCachedFile = (userId: string, fileId: string, storagePath?: string): void => {
  if (!userId || typeof window === 'undefined') return;
  try {
    const existing = getLocalCachedFiles(userId);
    const updated = existing.filter(
      (f) => f.id !== fileId && (!storagePath || f.storage_path !== storagePath)
    );
    localStorage.setItem(`${LOCAL_FILES_CACHE_PREFIX}${userId}`, JSON.stringify(updated));
  } catch (e) {
    console.warn('Could not update local file cache:', e);
  }
};

/**
 * Normalizes any database row from `user_files` (which uses camelCase `downloadUrl`, `storagePath`,
 * `fileName`, `fileType` in the live Supabase schema) into the application's `UserFile` interface.
 */
export const normalizeUserFileRow = (row: any, fallbackUserId: string): UserFile => {
  const storagePath = row.storage_path || row.storagePath || row.path || '';
  let resolvedDownloadUrl =
    row.download_url ||
    row.downloadUrl ||
    row.file_url ||
    row.url ||
    row.public_url ||
    '';

  if (!resolvedDownloadUrl && storagePath && !storagePath.startsWith('data:')) {
    try {
      const { data } = supabase.storage.from('uploads').getPublicUrl(storagePath);
      if (data?.publicUrl) {
        resolvedDownloadUrl = data.publicUrl;
      }
    } catch {
      // Ignore storage URL resolution errors
    }
  }

  return {
    id: String(row.id || `file-${Date.now()}`),
    user_id: row.user_id || row.userId || fallbackUserId,
    download_url: resolvedDownloadUrl,
    storage_path: storagePath,
    file_name: row.file_name || row.fileName || row.name || 'Uploaded File',
    file_type: row.file_type || row.fileType || row.mime_type || 'application/octet-stream',
    context: row.context || 'marketplace',
    ai_summary: row.ai_summary || row.aiSummary || '',
    notes: row.notes || '',
    created_at: row.created_at || row.createdAt || new Date().toISOString(),
  };
};

/**
 * Inserts a record into `user_files` using the exact columns present in the live Supabase schema
 * (`downloadUrl`, `storagePath`, `fileName`, `fileType`, `user_id`, `context`, `ai_summary`, `aiSummary`, `notes`, `created_at`, `createdAt`).
 */
const insertIntoUserFiles = async (
  fileData: Omit<UserFile, 'id'>
): Promise<Record<string, any> | null> => {
  const nowIso = fileData.created_at || new Date().toISOString();

  // Primary payload matching the exact live Supabase `user_files` table schema
  const dbPayload: Record<string, any> = {
    user_id: fileData.user_id,
    downloadUrl: fileData.download_url,
    storagePath: fileData.storage_path,
    fileName: fileData.file_name,
    fileType: fileData.file_type,
    context: fileData.context,
    ai_summary: fileData.ai_summary || '',
    aiSummary: fileData.ai_summary || '',
    notes: fileData.notes || '',
    created_at: nowIso,
    createdAt: nowIso,
  };

  const { data, error } = await supabase
    .from('user_files')
    .insert([dbPayload])
    .select()
    .maybeSingle();

  if (!error) {
    return data;
  }

  return null;
};

/**
 * Uploads a file to Supabase Storage and syncs metadata to the `user_files` table.
 * Bucket: 'uploads'
 */
export const uploadUserFile = async (
  userId: string,
  file: File,
  context: UserFile['context'],
  aiSummary?: string,
  notes?: string
): Promise<UserFile> => {
  const timestamp = Date.now();
  const safeFileName = (file?.name ? String(file.name) : 'file').replace(/[^a-zA-Z0-9.]/g, '_');

  let storagePath = '';

  if (context === 'admin-logo') {
    storagePath = `admin/${timestamp}_${safeFileName}`;
  } else {
    let subfolder = 'misc';
    switch (context) {
      case 'profile':
        subfolder = 'profile';
        break;
      case 'pest-diagnosis':
        subfolder = 'diagnosis';
        break;
      case 'marketplace':
        subfolder = 'market';
        break;
      case 'rental':
        subfolder = 'rental';
        break;
      case 'forum':
        subfolder = 'forum';
        break;
    }
    storagePath = `${userId}/${subfolder}/${timestamp}_${safeFileName}`;
  }

  let publicUrl = '';

  try {
    // 1. Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('uploads')
      .upload(storagePath, file, { upsert: true });

    if (uploadError) {
      publicUrl = await fileToDataUri(file);
    } else {
      // 2. Get Public URL
      const { data } = supabase.storage.from('uploads').getPublicUrl(storagePath);
      publicUrl = data?.publicUrl || (await fileToDataUri(file));
    }
  } catch {
    publicUrl = await fileToDataUri(file);
  }

  // 3. Create normalized application metadata object
  const fileData: Omit<UserFile, 'id'> = {
    user_id: userId,
    download_url: publicUrl,
    storage_path: storagePath,
    file_name: file.name,
    file_type: file.type,
    context,
    ai_summary: aiSummary || '',
    notes: notes || '',
    created_at: new Date().toISOString(),
  };

  const fallbackRecord: UserFile = {
    id: context === 'admin-logo' ? 'admin-upload' : `local-${timestamp}`,
    ...fileData,
  };

  // 4. Save to 'user_files' table using exact schema columns
  if (userId && context !== 'admin-logo') {
    saveLocalCachedFile(userId, fallbackRecord);

    const insertedData = await insertIntoUserFiles(fileData);
    if (insertedData) {
      const normalized = normalizeUserFileRow(insertedData, userId);
      const finalRecord: UserFile = {
        ...fallbackRecord,
        ...normalized,
        download_url: normalized.download_url || publicUrl,
      };
      saveLocalCachedFile(userId, finalRecord);
      return finalRecord;
    }
  }

  return fallbackRecord;
};

export const deleteUserFile = async (
  userId: string,
  fileId: string,
  storagePath: string
): Promise<void> => {
  try {
    removeLocalCachedFile(userId, fileId, storagePath);

    // 1. Delete from Storage
    if (storagePath && !storagePath.startsWith('data:')) {
      await supabase.storage.from('uploads').remove([storagePath]);
    }

    // 2. Delete from Database
    if (userId && fileId && !String(fileId).startsWith('local-')) {
      await supabase.from('user_files').delete().eq('id', fileId);
    }
  } catch (error) {
    console.error('Error deleting file:', error);
    throw error;
  }
};

export const getFreshDownloadUrl = async (storagePath: string): Promise<string> => {
  if (!storagePath) return '';
  if (storagePath.startsWith('data:') || storagePath.startsWith('http')) {
    return storagePath;
  }
  try {
    const {
      data: { publicUrl },
    } = supabase.storage.from('uploads').getPublicUrl(storagePath);
    return publicUrl || '';
  } catch {
    return '';
  }
};

export const getUserFiles = async (userId: string): Promise<UserFile[]> => {
  const localFiles = getLocalCachedFiles(userId);
  try {
    const { data, error } = await supabase
      .from('user_files')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      return localFiles;
    }

    const dbFiles = Array.isArray(data)
      ? data.map((row) => normalizeUserFileRow(row, userId))
      : [];

    // Merge DB files with any local-only cached files
    const dbPaths = new Set(dbFiles.map((f) => f.storage_path).filter(Boolean));
    const dbIds = new Set(dbFiles.map((f) => f.id));
    return [
      ...dbFiles,
      ...localFiles.filter(
        (lf) => !dbIds.has(lf.id) && (!lf.storage_path || !dbPaths.has(lf.storage_path))
      ),
    ];
  } catch {
    return localFiles;
  }
};

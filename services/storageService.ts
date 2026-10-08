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
 * Normalizes any database row from `user_files` so `download_url` and required fields
 * are always populated even if the database table omits `download_url` or uses alternative column names.
 */
const normalizeUserFileRow = (row: any, fallbackUserId: string): UserFile => {
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
 * Inserts a record into `user_files`, automatically stripping any column
 * that is missing from the Supabase PostgREST schema cache (e.g., `download_url`).
 */
const insertIntoUserFilesResilient = async (
  payload: Record<string, any>
): Promise<Record<string, any> | null> => {
  const currentPayload: Record<string, any> = { ...payload };
  const maxAttempts = 10;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (Object.keys(currentPayload).length === 0) {
      return null;
    }

    const { data, error } = await supabase
      .from('user_files')
      .insert([currentPayload])
      .select()
      .maybeSingle();

    if (!error) {
      return data;
    }

    const errMsg = error.message || JSON.stringify(error);
    // Detect PostgREST missing column error:
    // "Could not find the 'download_url' column of 'user_files' in the schema cache"
    // or PostgreSQL: column "download_url" of relation "user_files" does not exist
    const missingColMatch =
      errMsg.match(/Could not find the '([^']+)' column/i) ||
      errMsg.match(/column "([^"]+)" of relation "user_files" does not exist/i);

    if (missingColMatch && missingColMatch[1]) {
      const missingCol = missingColMatch[1];
      if (missingCol in currentPayload) {
        console.warn(
          `Column '${missingCol}' not found in 'user_files' schema cache; retrying insert without '${missingCol}'.`
        );
        delete currentPayload[missingCol];
        continue;
      }
    }

    // For any other DB error (e.g. table missing or RLS restriction), log warning and do not block upload
    console.warn("Non-fatal warning syncing metadata to 'user_files':", errMsg);
    return null;
  }

  return null;
};

/**
 * Uploads a file to Supabase Storage and syncs metadata to the database.
 * Resilient to missing columns (such as `download_url`) in `user_files` schema cache.
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
      console.warn('Supabase storage upload warning, using local Data URI fallback:', uploadError.message);
      publicUrl = await fileToDataUri(file);
    } else {
      // 2. Get Public URL
      const { data } = supabase.storage.from('uploads').getPublicUrl(storagePath);
      publicUrl = data?.publicUrl || (await fileToDataUri(file));
    }
  } catch (storageErr) {
    console.warn('Storage upload fallback triggered:', storageErr);
    publicUrl = await fileToDataUri(file);
  }

  // 3. Create Metadata Object
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

  // 4. Save to 'user_files' table resiliently
  if (userId && context !== 'admin-logo') {
    saveLocalCachedFile(userId, fallbackRecord);

    const insertedData = await insertIntoUserFilesResilient(fileData as Record<string, any>);
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
      const { error: storageError } = await supabase.storage
        .from('uploads')
        .remove([storagePath]);

      if (storageError) console.warn('Storage delete warning:', storageError);
    }

    // 2. Delete from Database
    if (userId && fileId && !String(fileId).startsWith('local-')) {
      const { error: dbError } = await supabase
        .from('user_files')
        .delete()
        .eq('id', fileId);

      if (dbError) console.warn('DB delete warning:', dbError);
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
  } catch (e) {
    console.warn('Could not get public URL for path:', storagePath, e);
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
      console.warn('Warning fetching user_files from DB, returning local cache:', error.message);
      return localFiles;
    }

    const dbFiles = Array.isArray(data)
      ? data.map((row) => normalizeUserFileRow(row, userId))
      : [];

    // Merge DB files with any local-only cached files
    const dbPaths = new Set(dbFiles.map((f) => f.storage_path).filter(Boolean));
    const dbIds = new Set(dbFiles.map((f) => f.id));
    const merged = [
      ...dbFiles,
      ...localFiles.filter(
        (lf) => !dbIds.has(lf.id) && (!lf.storage_path || !dbPaths.has(lf.storage_path))
      ),
    ];

    return merged;
  } catch (error) {
    console.error('Error fetching user files:', error);
    return localFiles;
  }
};

import { createClient } from '@supabase/supabase-js';

export const supabaseUrl =
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SUPABASE_URL) ||
  (typeof process !== 'undefined' && process.env?.SUPABASE_URL) ||
  'https://cgseqxxicdnowawistcr.supabase.co';

export const supabaseKey =
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SUPABASE_PUBLISHABLE_KEY) ||
  (typeof process !== 'undefined' && process.env?.SUPABASE_PUBLISHABLE_KEY) ||
  'sb_publishable_G-jJFMAgbAm7J1S2WEa3EQ_9KpaAFUG';

export const supabaseJwksUrl =
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SUPABASE_JWKS_URL) ||
  (typeof process !== 'undefined' && process.env?.SUPABASE_JWKS_URL) ||
  'https://cgseqxxicdnowawistcr.supabase.co/auth/v1/.well-known/jwks.json';

const rawSupabase = createClient(supabaseUrl, supabaseKey);

/**
 * Column name mapping from application model keys to the actual live Supabase database schema.
 */
const TABLE_COLUMN_MAP: Record<string, Record<string, string>> = {
  user_files: {
    download_url: 'downloadUrl',
    storage_path: 'storagePath',
    file_name: 'fileName',
    file_type: 'fileType',
  },
  marketplace: {
    name: 'title',
    seller: 'seller_name',
    seller_id: 'user_id',
  },
  equipment: {
    owner_id: 'user_id',
  },
  users: {
    uid: 'id',
  },
};

const mapColumnName = (table: string, col: string): string => {
  return TABLE_COLUMN_MAP[table]?.[col] || col;
};

const transformOutgoingRow = (table: string, row: any): any => {
  if (!row || typeof row !== 'object' || Array.isArray(row)) return row;
  const out: Record<string, any> = { ...row };

  if (table === 'user_files') {
    if ('download_url' in out) {
      out.downloadUrl = out.downloadUrl ?? out.download_url;
      delete out.download_url;
    }
    if ('storage_path' in out) {
      out.storagePath = out.storagePath ?? out.storage_path;
      delete out.storage_path;
    }
    if ('file_name' in out) {
      out.fileName = out.fileName ?? out.file_name;
      delete out.file_name;
    }
    if ('file_type' in out) {
      out.fileType = out.fileType ?? out.file_type;
      delete out.file_type;
    }
  } else if (table === 'marketplace') {
    if ('name' in out) {
      out.title = out.title ?? out.name;
      delete out.name;
    }
    if ('seller' in out) {
      out.seller_name = out.seller_name ?? out.seller;
      delete out.seller;
    }
    if ('seller_id' in out) {
      out.user_id = out.user_id ?? out.seller_id;
      out.sellerId = out.sellerId ?? out.seller_id;
      delete out.seller_id;
    }
    if ('image_urls' in out && !('imageUrls' in out)) {
      out.imageUrls = out.image_urls;
    }
  } else if (table === 'equipment') {
    if ('owner_id' in out) {
      out.user_id = out.user_id ?? out.owner_id;
      delete out.owner_id;
    }
    if ('price_per_day' in out && !('pricePerDay' in out)) {
      out.pricePerDay = out.price_per_day;
    }
  } else if (table === 'users') {
    if ('uid' in out) {
      out.id = out.id ?? out.uid;
      delete out.uid;
    }
    if ('photo_url' in out && !('photoURL' in out)) {
      out.photoURL = out.photo_url;
    }
    if ('merchant_id' in out && !('merchantId' in out)) {
      out.merchantId = out.merchant_id;
    }
  }

  return out;
};

const transformOutgoingPayload = (table: string, payload: any): any => {
  if (Array.isArray(payload)) {
    return payload.map((item) => transformOutgoingRow(table, item));
  }
  return transformOutgoingRow(table, payload);
};

const normalizeIncomingRow = (table: string, row: any): any => {
  if (!row || typeof row !== 'object' || Array.isArray(row)) return row;
  const normalized: Record<string, any> = { ...row };

  if (table === 'user_files') {
    normalized.download_url = normalized.download_url ?? normalized.downloadUrl ?? '';
    normalized.storage_path = normalized.storage_path ?? normalized.storagePath ?? '';
    normalized.file_name = normalized.file_name ?? normalized.fileName ?? '';
    normalized.file_type = normalized.file_type ?? normalized.fileType ?? '';
    normalized.ai_summary = normalized.ai_summary ?? normalized.aiSummary ?? '';
    normalized.created_at = normalized.created_at ?? normalized.createdAt ?? '';
  } else if (table === 'marketplace') {
    normalized.name = normalized.name ?? normalized.title ?? 'Produce Listing';
    normalized.seller = normalized.seller ?? normalized.seller_name ?? 'Verified Farmer';
    normalized.seller_id = normalized.seller_id ?? normalized.user_id ?? normalized.sellerId ?? '';
    normalized.image_urls = normalized.image_urls ?? normalized.imageUrls ?? [];
    normalized.usage_instructions =
      normalized.usage_instructions ?? normalized.usageInstructions ?? '';
    normalized.storage_recommendations =
      normalized.storage_recommendations ?? normalized.storageRecommendations ?? '';
    normalized.seller_email = normalized.seller_email ?? normalized.sellerEmail ?? '';
    normalized.seller_phone = normalized.seller_phone ?? normalized.sellerPhone ?? '';
  } else if (table === 'equipment') {
    normalized.owner_id = normalized.owner_id ?? normalized.user_id ?? '';
    normalized.price_per_day = normalized.price_per_day ?? normalized.pricePerDay ?? 0;
  } else if (table === 'users') {
    normalized.uid = normalized.uid ?? normalized.id ?? '';
    normalized.photo_url = normalized.photo_url ?? normalized.photoURL ?? '';
    normalized.merchant_id = normalized.merchant_id ?? normalized.merchantId ?? '';
    normalized.name = normalized.name ?? normalized.full_name ?? 'User';
  }

  return normalized;
};

const normalizeIncomingResult = (table: string, result: any): any => {
  if (!result || !result.data) return result;
  if (Array.isArray(result.data)) {
    return {
      ...result,
      data: result.data.map((r: any) => normalizeIncomingRow(table, r)),
    };
  }
  if (typeof result.data === 'object') {
    return {
      ...result,
      data: normalizeIncomingRow(table, result.data),
    };
  }
  return result;
};

const clonePayload = (payload: any): any => {
  if (Array.isArray(payload)) {
    return payload.map((item) => (item && typeof item === 'object' ? { ...item } : item));
  }
  if (payload && typeof payload === 'object') {
    return { ...payload };
  }
  return payload;
};

const stripColumnFromPayload = (payload: any, col: string): boolean => {
  if (Array.isArray(payload)) {
    let removed = false;
    for (const item of payload) {
      if (item && typeof item === 'object' && col in item) {
        delete item[col];
        removed = true;
      }
    }
    return removed;
  }
  if (payload && typeof payload === 'object' && col in payload) {
    delete payload[col];
    return true;
  }
  return false;
};

const hasAnyKeys = (payload: any): boolean => {
  if (Array.isArray(payload)) {
    return payload.some((item) => item && typeof item === 'object' && Object.keys(item).length > 0);
  }
  if (payload && typeof payload === 'object') {
    return Object.keys(payload).length > 0;
  }
  return false;
};

const mapFilterArgs = (table: string, prop: string | symbol, args: any[]): any[] => {
  if (
    (prop === 'eq' ||
      prop === 'neq' ||
      prop === 'gt' ||
      prop === 'gte' ||
      prop === 'lt' ||
      prop === 'lte' ||
      prop === 'in' ||
      prop === 'is' ||
      prop === 'like' ||
      prop === 'ilike' ||
      prop === 'order') &&
    typeof args[0] === 'string'
  ) {
    const mapped = [...args];
    mapped[0] = mapColumnName(table, args[0]);
    return mapped;
  }
  if (prop === 'match' && args[0] && typeof args[0] === 'object') {
    const mappedObj: Record<string, any> = {};
    for (const [k, v] of Object.entries(args[0])) {
      mappedObj[mapColumnName(table, k)] = v;
    }
    return [mappedObj, ...args.slice(1)];
  }
  return args;
};

const createSmartBuilder = (
  rawFrom: (table: string) => any,
  table: string,
  operation: 'select' | 'insert' | 'upsert' | 'update' | 'delete',
  initialArg?: any,
  options?: any
) => {
  const steps: Array<{ prop: string | symbol; args: any[] }> = [];

  const execute = async () => {
    if (operation === 'select' || operation === 'delete') {
      let builder =
        options !== undefined
          ? rawFrom(table)[operation](initialArg, options)
          : initialArg !== undefined
          ? rawFrom(table)[operation](initialArg)
          : rawFrom(table)[operation]();

      for (const step of steps) {
        if (typeof builder[step.prop] === 'function') {
          const mappedArgs = mapFilterArgs(table, step.prop, step.args);
          builder = builder[step.prop](...mappedArgs);
        }
      }

      const result = await builder;
      return normalizeIncomingResult(table, result);
    }

    // Mutation operations: insert, upsert, update
    const currentPayload = transformOutgoingPayload(table, clonePayload(initialArg));
    const maxAttempts = 10;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      let builder =
        options !== undefined
          ? rawFrom(table)[operation](clonePayload(currentPayload), options)
          : rawFrom(table)[operation](clonePayload(currentPayload));

      for (const step of steps) {
        if (typeof builder[step.prop] === 'function') {
          const mappedArgs = mapFilterArgs(table, step.prop, step.args);
          builder = builder[step.prop](...mappedArgs);
        }
      }

      const result = await builder;
      if (!result?.error) {
        return normalizeIncomingResult(table, result);
      }

      const errMsg: string = result.error.message || JSON.stringify(result.error);
      const missingColMatch =
        errMsg.match(/Could not find the '([^']+)' column/i) ||
        errMsg.match(/column "([^"]+)" of relation "[^"]+" does not exist/i);

      if (missingColMatch && missingColMatch[1]) {
        const missingCol = missingColMatch[1];
        const stripped = stripColumnFromPayload(currentPayload, missingCol);
        if (stripped && hasAnyKeys(currentPayload)) {
          continue;
        }
      }

      return normalizeIncomingResult(table, result);
    }

    return { data: null, error: null };
  };

  const proxy: any = new Proxy(
    {},
    {
      get(_target, prop) {
        if (prop === 'then') {
          const promise = execute();
          return promise.then.bind(promise);
        }
        if (prop === 'catch') {
          const promise = execute();
          return promise.catch.bind(promise);
        }
        if (prop === 'finally') {
          const promise = execute();
          return promise.finally.bind(promise);
        }
        return (...args: any[]) => {
          steps.push({ prop, args });
          return proxy;
        };
      },
    }
  );

  return proxy;
};

const rawFrom = rawSupabase.from.bind(rawSupabase);

export const supabase = new Proxy(rawSupabase, {
  get(target, prop, receiver) {
    if (prop === 'from') {
      return (table: string) => {
        const queryBuilder = rawFrom(table);
        return new Proxy(queryBuilder, {
          get(qbTarget, qbProp, qbReceiver) {
            if (
              qbProp === 'select' ||
              qbProp === 'insert' ||
              qbProp === 'upsert' ||
              qbProp === 'update' ||
              qbProp === 'delete'
            ) {
              return (arg?: any, options?: any) =>
                createSmartBuilder(rawFrom, table, qbProp, arg, options);
            }
            const value = Reflect.get(qbTarget, qbProp, qbReceiver);
            return typeof value === 'function' ? value.bind(qbTarget) : value;
          },
        });
      };
    }
    const value = Reflect.get(target, prop, receiver);
    return typeof value === 'function' ? value.bind(target) : value;
  },
});

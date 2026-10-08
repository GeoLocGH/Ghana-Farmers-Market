import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vhigfbctihanitwrrohv.supabase.co';
const supabaseKey = 'sb_publishable_OmoujvfmVnGB5XcXpfBlJA_Nuuo4UIS';

const rawSupabase = createClient(supabaseUrl, supabaseKey);

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

const setColumnInPayload = (payload: any, col: string, value: any): void => {
  if (Array.isArray(payload)) {
    for (const item of payload) {
      if (item && typeof item === 'object') {
        item[col] = value;
      }
    }
    return;
  }
  if (payload && typeof payload === 'object') {
    payload[col] = value;
  }
};

const getColumnFromPayload = (payload: any, col: string): any => {
  if (Array.isArray(payload)) {
    for (const item of payload) {
      if (item && typeof item === 'object' && col in item) {
        return item[col];
      }
    }
    return undefined;
  }
  if (payload && typeof payload === 'object') {
    return payload[col];
  }
  return undefined;
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

/**
 * Wraps a Supabase mutation builder (.insert, .upsert, .update) so that if PostgREST
 * reports a missing column in the schema cache (e.g., "Could not find the 'download_url'
 * column of 'user_files' in the schema cache"), it automatically strips the missing column
 * and retries transparently.
 */
const createResilientMutationBuilder = (
  rawFrom: (table: string) => any,
  table: string,
  operation: 'insert' | 'upsert' | 'update',
  initialPayload: any,
  options?: any
) => {
  const steps: Array<{ prop: string | symbol; args: any[] }> = [];
  const originalDownloadUrl = getColumnFromPayload(initialPayload, 'download_url');

  const executeWithRetry = async () => {
    const currentPayload = clonePayload(initialPayload);
    const maxAttempts = 10;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      let builder =
        options !== undefined
          ? rawFrom(table)[operation](clonePayload(currentPayload), options)
          : rawFrom(table)[operation](clonePayload(currentPayload));

      for (const step of steps) {
        if (typeof builder[step.prop] === 'function') {
          builder = builder[step.prop](...step.args);
        }
      }

      const result = await builder;
      if (!result?.error) {
        return result;
      }

      const errMsg: string = result.error.message || JSON.stringify(result.error);

      // 1. Check for missing column in PostgREST schema cache or PostgreSQL relation
      const missingColMatch =
        errMsg.match(/Could not find the '([^']+)' column/i) ||
        errMsg.match(/column "([^"]+)" of relation "[^"]+" does not exist/i);

      if (missingColMatch && missingColMatch[1]) {
        const missingCol = missingColMatch[1];
        const stripped = stripColumnFromPayload(currentPayload, missingCol);
        if (stripped && hasAnyKeys(currentPayload)) {
          console.warn(
            `[Supabase Schema Resilience] Column '${missingCol}' not found in '${table}' schema cache; retrying ${operation} without '${missingCol}'.`
          );
          continue;
        }
      }

      // 2. Check if an alternative URL column (e.g. 'file_url' or 'url') has a NOT NULL constraint
      const notNullMatch = errMsg.match(/null value in column "([^"]+)" of relation "[^"]+" violates not-null constraint/i);
      if (notNullMatch && notNullMatch[1] && originalDownloadUrl) {
        const requiredCol = notNullMatch[1];
        if (getColumnFromPayload(currentPayload, requiredCol) === undefined) {
          console.warn(
            `[Supabase Schema Resilience] Populating required column '${requiredCol}' in '${table}' and retrying.`
          );
          setColumnInPayload(currentPayload, requiredCol, originalDownloadUrl);
          continue;
        }
      }

      return result;
    }

    return { data: null, error: null };
  };

  const proxy: any = new Proxy(
    {},
    {
      get(_target, prop) {
        if (prop === 'then') {
          const promise = executeWithRetry();
          return promise.then.bind(promise);
        }
        if (prop === 'catch') {
          const promise = executeWithRetry();
          return promise.catch.bind(promise);
        }
        if (prop === 'finally') {
          const promise = executeWithRetry();
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
            if (qbProp === 'insert' || qbProp === 'upsert' || qbProp === 'update') {
              return (values: any, options?: any) =>
                createResilientMutationBuilder(rawFrom, table, qbProp, values, options);
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

import { withSupabase, createSupabaseContext, type SupabaseContext } from '@supabase/server';
import {
  verifyAuth,
  verifyCredentials,
  createContextClient,
  createAdminClient,
  resolveEnv,
} from '@supabase/server/core';
import { fromSupabaseUrl } from '@supabase/server/oauth-protected-resource';

export const SUPABASE_SERVER_ENV = {
  url:
    (typeof process !== 'undefined' && process.env?.SUPABASE_URL) ||
    'https://cgseqxxicdnowawistcr.supabase.co',
  publishableKey:
    (typeof process !== 'undefined' && process.env?.SUPABASE_PUBLISHABLE_KEY) ||
    'sb_publishable_G-jJFMAgbAm7J1S2WEa3EQ_9KpaAFUG',
  jwksUrl:
    (typeof process !== 'undefined' && process.env?.SUPABASE_JWKS_URL) ||
    'https://cgseqxxicdnowawistcr.supabase.co/auth/v1/.well-known/jwks.json',
};

/**
 * Creates a user-authenticated or publishable-key-authenticated handler using @supabase/server.
 */
export const createVerifiedHandler = (
  handler: (req: Request, ctx: SupabaseContext) => Promise<Response> | Response,
  authMode: 'user' | 'publishable' | 'secret' | 'none' = 'user'
) => {
  return withSupabase(
    {
      auth: authMode,
      issuer: fromSupabaseUrl(SUPABASE_SERVER_ENV.url),
    },
    async (req, ctx) => handler(req, ctx)
  );
};

export {
  withSupabase,
  createSupabaseContext,
  verifyAuth,
  verifyCredentials,
  createContextClient,
  createAdminClient,
  resolveEnv,
  fromSupabaseUrl,
  type SupabaseContext,
};

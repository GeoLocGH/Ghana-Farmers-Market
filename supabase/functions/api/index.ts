import { withSupabase } from '@supabase/server';
import { fromSupabaseUrl } from '@supabase/server/oauth-protected-resource';

const projectUrl =
  (typeof process !== 'undefined' && process.env?.SUPABASE_URL) ||
  'https://cgseqxxicdnowawistcr.supabase.co';

export default {
  fetch: withSupabase(
    {
      auth: ['user', 'publishable'],
      issuer: fromSupabaseUrl(projectUrl),
    },
    async (req: Request, ctx) => {
      const url = new URL(req.url);

      if (url.pathname.endsWith('/health')) {
        return Response.json({
          status: 'ok',
          authMode: ctx.authMode,
          project: projectUrl,
        });
      }

      if (url.pathname.endsWith('/me')) {
        if (ctx.authMode !== 'user' || !ctx.userClaims) {
          return Response.json({ error: 'Authentication required' }, { status: 401 });
        }
        return Response.json({
          user: ctx.userClaims,
          jwtClaims: ctx.jwtClaims,
          authMode: ctx.authMode,
        });
      }

      if (url.pathname.endsWith('/marketplace')) {
        const { data, error } = await ctx.supabase
          .from('marketplace')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          return Response.json({ error: error.message }, { status: 500 });
        }
        return Response.json({ data });
      }

      return Response.json({
        status: 'ready',
        authMode: ctx.authMode,
        user: ctx.userClaims ?? null,
      });
    }
  ),
};

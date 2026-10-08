import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    const geminiKey = (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'PLACEHOLDER_API_KEY')
      ? process.env.GEMINI_API_KEY
      : (env.GEMINI_API_KEY && env.GEMINI_API_KEY !== 'PLACEHOLDER_API_KEY')
        ? env.GEMINI_API_KEY
        : process.env.API_KEY || env.API_KEY || '';

    const supabaseUrl = process.env.SUPABASE_URL || env.SUPABASE_URL || env.VITE_SUPABASE_URL || 'https://cgseqxxicdnowawistcr.supabase.co';
    const supabasePublishableKey = process.env.SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_G-jJFMAgbAm7J1S2WEa3EQ_9KpaAFUG';
    const supabaseJwksUrl = process.env.SUPABASE_JWKS_URL || env.SUPABASE_JWKS_URL || env.VITE_SUPABASE_JWKS_URL || 'https://cgseqxxicdnowawistcr.supabase.co/auth/v1/.well-known/jwks.json';

    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      envPrefix: ['VITE_', 'SUPABASE_'],
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(geminiKey),
        'process.env.GEMINI_API_KEY': JSON.stringify(geminiKey),
        'process.env.SUPABASE_URL': JSON.stringify(supabaseUrl),
        'process.env.SUPABASE_PUBLISHABLE_KEY': JSON.stringify(supabasePublishableKey),
        'process.env.SUPABASE_JWKS_URL': JSON.stringify(supabaseJwksUrl),
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});

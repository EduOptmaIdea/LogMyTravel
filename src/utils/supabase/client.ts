import { createClient } from '@supabase/supabase-js';

// Usar apenas variáveis de ambiente
let SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
let SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

// Sem fallback: exigir configuração

export const SUPABASE_CONFIGURED = !!(SUPABASE_URL && SUPABASE_ANON_KEY);

// Só criar cliente se as credenciais estiverem disponíveis
export const supabase = SUPABASE_CONFIGURED 
  ? createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

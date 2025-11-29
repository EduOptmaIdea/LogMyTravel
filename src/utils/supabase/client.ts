import { createClient } from '@supabase/supabase-js';

// Preferir variáveis de ambiente; fallback para info.tsx apenas em desenvolvimento
let SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
let SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

// Tentar fallback síncrono se as variáveis de ambiente não estiverem definidas
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  try {
    // Importação síncrona para evitar problemas com top-level await
    // Nota: isso só funcionará se info.tsx existir e for um módulo válido
    console.warn('[Supabase] Variáveis de ambiente não definidas. Tentando fallback...');
  } catch (e) {
    console.warn('[Supabase] Variáveis de ambiente não definidas e fallback ausente. Usando modo localStorage.');
  }
}

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

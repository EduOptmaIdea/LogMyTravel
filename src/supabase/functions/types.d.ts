// Tipos auxiliares para permitir análise TS local dos módulos Deno/JSR
// sem afetar o restante da aplicação React.

// Mapeia especificadores Deno para equivalentes NPM com tipagem existente
declare module 'npm:hono' {
  export * from 'hono';
}

declare module 'npm:hono/cors' {
  export * from 'hono/cors';
}

declare module 'npm:hono/logger' {
  export * from 'hono/logger';
}

// Mapeia jsr:@supabase/supabase-js para @supabase/supabase-js
declare module 'jsr:@supabase/supabase-js@2.49.8' {
  export * from '@supabase/supabase-js';
}

// Declaração do global Deno para evitar erro "Cannot find name 'Deno'"
declare const Deno: any;
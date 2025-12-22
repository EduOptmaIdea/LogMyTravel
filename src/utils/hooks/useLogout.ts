import { supabase } from "../../utils/supabase/client";
import { useOnlineStatus } from "../offline/useOnlineStatus";

export function useLogout() {
  const { online } = useOnlineStatus();
  const logout = async () => {
    try {
      if (supabase) {
        try { await supabase.auth.signOut({ scope: 'global' } as any); } catch { await supabase.auth.signOut(); }
      }
    } catch {}
    try {
      const preserveKeys = new Set(['trips_cache', 'vehicles_cache', 'offline_queue_v1']);
      Object.keys(localStorage).forEach((k) => {
        try {
          if (online) {
            localStorage.removeItem(k);
          } else {
            // offline: remove apenas tokens do supabase e estados voláteis
            if (k.startsWith('sb-')) localStorage.removeItem(k);
            if (!preserveKeys.has(k) && !k.startsWith('sb-')) {
              // keep app caches; remove other non-essential keys
              localStorage.removeItem(k);
            }
          }
        } catch {}
      });
      try { sessionStorage.clear(); } catch {}
      if (online) {
        try {
          if ('caches' in window) {
            const keys = await caches.keys();
            await Promise.all(keys.map((k) => caches.delete(k)));
          }
        } catch {}
      } else {
        try { localStorage.setItem('logout_pending', '1'); } catch {}
      }
      try { window.location.hash = ''; } catch {}
      try { window.location.href = '/'; } catch { window.location.reload(); }
    } catch {
      try { window.location.reload(); } catch {}
    }
  };
  return { logout };
}

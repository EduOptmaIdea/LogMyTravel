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
      try { localStorage.clear(); } catch {}
      try { sessionStorage.clear(); } catch {}
      try {
        if ('caches' in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map((k) => caches.delete(k)));
        }
      } catch {}
      try { window.location.hash = ''; } catch {}
      try { window.location.replace('/'); } catch {}
      try { setTimeout(() => { try { window.location.reload(); } catch {} }, 50); } catch {}
    } catch {
      try { window.location.reload(); } catch {}
    }
  };
  return { logout };
}

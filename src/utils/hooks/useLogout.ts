import { supabase } from "../../utils/supabase/client";

export function useLogout() {
  const logout = async () => {
    try {
      if (supabase) {
        try { await supabase.auth.signOut({ scope: 'global' } as any); } catch { await supabase.auth.signOut(); }
      }
    } catch {}
    try {
      Object.keys(localStorage).forEach((k) => {
        try { localStorage.removeItem(k); } catch {}
      });
      try { sessionStorage.clear(); } catch {}
      try {
        if ('caches' in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map((k) => caches.delete(k)));
        }
      } catch {}
      try { window.location.hash = ''; } catch {}
      try { window.location.href = '/'; } catch { window.location.reload(); }
    } catch {
      try { window.location.reload(); } catch {}
    }
  };
  return { logout };
}

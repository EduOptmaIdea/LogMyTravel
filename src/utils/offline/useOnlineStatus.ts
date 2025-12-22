import { useEffect, useState } from "react";

export function useOnlineStatus() {
  const [online, setOnline] = useState<boolean>(() => {
    try { return typeof navigator !== 'undefined' ? navigator.onLine : true; } catch { return true; }
  });
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    try {
      window.addEventListener('online', on);
      window.addEventListener('offline', off);
    } catch {}
    return () => {
      try {
        window.removeEventListener('online', on);
        window.removeEventListener('offline', off);
      } catch {}
    };
  }, []);
  return { online };
}

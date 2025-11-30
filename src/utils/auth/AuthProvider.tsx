import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "../../utils/supabase/client";
import type { Session, User } from "@supabase/supabase-js";

type AuthContextValue = {
  initializing: boolean;
  session: Session | null;
  user: User | null;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, metadata?: Record<string, any>) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  setNickname: (nickname: string) => Promise<{ error: string | null }>;
  deleteAccountCascade: (password: string) => Promise<{ error: string | null }>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [initializing, setInitializing] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    let mounted = true;
    // Se Supabase não estiver configurado, finalize inicialização e não registre listeners
    if (!supabase) {
      setInitializing(false);
      return () => { mounted = false; };
    }

    // Carrega sessão atual
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session ?? null);
      setUser(data.session?.user ?? null);
      setInitializing(false);
    });

    // Ouve mudanças de auth
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession ?? null);
      setUser(newSession?.user ?? null);
    });

    return () => {
      mounted = false;
      sub?.subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    if (!supabase) return { error: "Auth indisponível (Supabase não configurado)" };
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    let msg = error?.message ?? null;
    if (msg) {
      const normalized = msg.toLowerCase();
      if (normalized.includes("invalid login credentials")) {
        msg = "E-mail e/ou senha inválidos";
      }
    }
    return { error: msg };
  };

  const signUp = async (email: string, password: string, metadata?: Record<string, any>) => {
    if (!supabase) return { error: "Auth indisponível (Supabase não configurado)" };
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: metadata ? { data: metadata } : undefined,
    } as any);
    return { error: error?.message ?? null };
  };

  const signOut = async () => {
    try {
      if (supabase) {
        await supabase.auth.signOut();
      }
    } catch (e) {
      // Em caso de erro na chamada HTTP, limpamos o estado local
      // para garantir que a UI reflita o logout.
      console.warn("SignOut falhou, limpando estado local.");
    } finally {
      setSession(null);
      setUser(null);
    }
  };

  const setNickname = async (nickname: string) => {
    if (!supabase) return { error: "Auth indisponível (Supabase não configurado)" };
    const { data, error } = await supabase.auth.updateUser({
      data: { nickname, display_name: nickname },
    });
    if (!error && data?.user) {
      setUser(data.user);
    }
    return { error: error?.message ?? null };
  };

  const deleteAccountCascade = async (password: string) => {
    try {
      // Fallback: limpar dados locais sempre
      try {
        localStorage.removeItem("trips");
        localStorage.removeItem("vehicles");
        localStorage.removeItem("trip_vehicle_segments");
      } catch {}

      if (!supabase || !user?.email) {
        // Sem Supabase ou sem usuário: apenas limpar estado local
        setSession(null);
        setUser(null);
        return { error: null };
      }

      // Revalida senha do usuário antes de proceder
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: user.email!,
        password,
      });
      if (authError) {
        return { error: "Senha incorreta. Tente novamente." };
      }

      // Solicita exclusão imediata no servidor (service role) usando o token atual
      const { data: sess } = await supabase.auth.getSession();
      const accessToken = sess?.session?.access_token;
      if (!accessToken) {
        return { error: "Sessão ausente ao confirmar exclusão" };
      }
      const res = await fetch(
        import.meta.env.DEV
          ? "/accounts/delete-account-immediately"
          : "/.netlify/functions/accounts-delete-account-immediately",
        {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      });
      const json = await res.json().catch(() => ({ ok: false, error: "Falha ao excluir" }));
      if (!json?.ok) {
        return { error: json?.error || "Falha ao excluir conta" };
      }

      try { await supabase.auth.signOut(); } catch {}
      setSession(null);
      setUser(null);
      return { error: null };
    } catch (e: any) {
      console.error("Erro na exclusão de conta:", e);
      return { error: e?.message || "Falha ao excluir conta" };
    }
  };

  const value = useMemo(
    () => ({ initializing, session, user, signIn, signUp, signOut, setNickname, deleteAccountCascade }),
    [initializing, session, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

import { useState, useEffect } from "react";
import { supabase } from "../utils/supabase/client";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";

export function ResetPassword({ onSuccess }: { onSuccess?: () => void }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    // Garante que a sessão de recovery seja criada a partir dos tokens na URL (hash)
    (async () => {
      try {
        if (!supabase) return;
        const current = await supabase.auth.getSession();
        if (current.data.session) return; // Sessão já ativa
        const href = typeof window !== 'undefined' ? window.location.href : '';
        // Extrair o último segmento após o '#', pois pode existir mais de um (ex.: #reset-password#access_token=...)
        const lastFragment = href.includes('#') ? href.split('#').pop() || '' : '';
        const hashParams = new URLSearchParams(lastFragment);
        const searchParams = (() => { try { return new URL(href).searchParams; } catch { return new URLSearchParams(''); } })();
        let access_token = hashParams.get('access_token') || searchParams.get('access_token') || '';
        let refresh_token = hashParams.get('refresh_token') || searchParams.get('refresh_token') || '';

        if (access_token && refresh_token) {
          await supabase.auth.setSession({ access_token, refresh_token });
        }
      } catch (e) {
        // Não bloquear a UI por falhas de sessão; o updateUser acusará erro se faltar sessão
        console.warn('Falha ao inicializar sessão de recovery:', e);
      }
    })();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!password || password.length < 6) {
      setError("A nova senha deve ter pelo menos 6 caracteres.");
      return;
    }
    if (password !== confirm) {
      setError("As senhas não coincidem.");
      return;
    }
    if (!supabase) {
      setError("Serviço de autenticação indisponível.");
      return;
    }
  try {
      setLoading(true);
      const { data, error } = await supabase.auth.updateUser({ password });
      setLoading(false);
      if (error) {
        if ((error.message || '').toLowerCase().includes('auth session missing')) {
          toast.error('Sessão de recuperação ausente. Abra pelo link do e-mail recente.');
        }
        setError(error.message || "Falha ao redefinir a senha.");
        return;
      }
      if (data?.user) {
        toast.success("Senha atualizada com sucesso.");
        // Enviar e-mail de confirmação de alteração de senha
        try {
          const to = data.user.email || (await supabase.auth.getUser()).data.user?.email || '';
          if (to) {
            await fetch('/accounts/send-password-changed', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ to })
            });
          }
        } catch (e) {
          // Silenciar falhas de notificação por e-mail
          console.warn('Falha ao enviar e-mail de aviso de senha alterada:', e);
        }
      }
      onSuccess?.();
    } catch (e: any) {
      setLoading(false);
      setError(e?.message || "Falha ao redefinir a senha.");
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-8">
      <div className="bg-white rounded-xl shadow-md p-6">
        <h1 className="text-xl font-extrabold text-[#192A56] mb-2">Redefinir senha</h1>
        <p className="text-sm text-gray-600 mb-4">Crie uma nova senha para sua conta.</p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs text-gray-500 block mb-1 font-medium">Nova senha</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-3 py-2 pr-10 text-base transition-colors focus:border-fuchsia-500 focus:ring-1 focus:ring-fuchsia-500 focus:outline-none"
                placeholder="Digite a nova senha"
                autoComplete="new-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                title={showPassword ? "Ocultar senha" : "Mostrar senha"}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1 font-medium">Confirmar nova senha</label>
            <div className="relative">
              <input
                type={showConfirm ? "text" : "password"}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-3 py-2 pr-10 text-base transition-colors focus:border-fuchsia-500 focus:ring-1 focus:ring-fuchsia-500 focus:outline-none"
                placeholder="Repita a nova senha"
                autoComplete="new-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                aria-label={showConfirm ? "Ocultar confirmação" : "Mostrar confirmação"}
                title={showConfirm ? "Ocultar confirmação" : "Mostrar confirmação"}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showConfirm ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">{error}</div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 rounded-full bg-fuchsia-500 hover:bg-fuchsia-600 text-white font-bold transition-colors disabled:opacity-50"
          >
            {loading ? "Atualizando..." : "Atualizar senha"}
          </button>
        </form>
      </div>
    </div>
  );
}

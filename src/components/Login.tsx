import { useState } from "react";
import { useAuth } from "../utils/auth/AuthProvider";
import { supabase } from "../utils/supabase/client";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import logo from "@/assets/logo-do-carrousel.png";

export function Login({ onSuccess, onCancel }: { onSuccess?: () => void; onCancel?: () => void }) {
  const { signIn, signUp, initializing, setNickname } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resetting, setResetting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    let res;
    if (mode === "signin") {
      res = await signIn(email, password);
    } else {
      if (!displayName.trim()) {
        setLoading(false);
        setError("Informe seu nome para o perfil.");
        toast.warning("Nome do usuário é obrigatório.");
        return;
      }
      if (password.length < 6) {
        setLoading(false);
        setError("A senha deve ter pelo menos 6 caracteres.");
        toast.warning("Senha muito curta.");
        return;
      }
      if (password !== confirmPassword) {
        setLoading(false);
        setError("As senhas não coincidem.");
        toast.warning("As senhas não coincidem.");
        return;
      }
      res = await signUp(email, password, { nickname: displayName, display_name: displayName });
    }
    const { error } = res;
    setLoading(false);
    if (error) {
      setError(error);
      if (mode === "signin") {
        toast.error("Falha ao entrar. Verifique o e-mail e a senha.");
      } else {
        toast.error("Falha ao criar conta. Tente novamente.");
      }
      return;
    }
    if (mode === "signup") {
      toast.success("Conta criada com sucesso! Verifique seu e-mail para confirmar.");
      try {
        await fetch(
          import.meta.env.DEV
            ? "/accounts/send-welcome"
            : "/.netlify/functions/accounts-send-welcome",
          { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ to: email }) }
        );
      } catch {}
    } else {
      toast.success("Login realizado com sucesso!");
    }
    onSuccess?.();
  };

  const handleForgotPassword = async () => {
    setError(null);
    const mail = email.trim();
    if (!mail) {
      setError("Informe seu e-mail para recuperar a senha.");
      toast.warning("E-mail é obrigatório para reset de senha.");
      return;
    }
    if (!supabase) {
      toast.error("Serviço de autenticação indisponível.");
      return;
    }
    try {
      // Navega imediatamente para a tela de reset via hash para consistência visual
      if (typeof window !== 'undefined') {
        window.location.hash = 'reset-password';
      }
      setResetting(true);
      const { error } = await supabase.auth.resetPasswordForEmail(mail, {
        // Mantemos a navegação imediata via hash local, mas o link do e-mail
        // vai apenas para a raiz. Os tokens no fragmento serão detectados pelo app
        // e a tela de reset será aberta sem Splash.
        redirectTo: `${window.location.origin}/`,
      } as any);
      setResetting(false);
      if (error) {
        setError(error.message || "Falha ao iniciar reset de senha.");
        toast.error("Não foi possível enviar o e-mail de reset.");
        return;
      }
      toast.success("E-mail de recuperação enviado. Verifique sua caixa de entrada.");
    } catch (e: any) {
      setResetting(false);
      setError(e?.message || "Falha ao iniciar reset de senha.");
      toast.error("Erro ao solicitar reset de senha.");
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-8">
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex items-center gap-2 mb-4">
          <img src={logo} alt="LogMyTravel" className="h-8 w-auto opacity-90" />
          <h1 className="text-xl font-extrabold text-[#192A56]">{mode === "signin" ? "Entrar" : "Criar conta"}</h1>
        </div>
        <p className="text-sm text-gray-600 mb-6">
          {mode === "signin" ? "Use seu e-mail e senha para acessar o app." : "Informe seus dados para criar sua conta."}
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "signup" && (
            <div>
              <label className="text-xs text-gray-500 block mb-1 font-medium">Nome do usuário</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-3 py-2 text-base transition-colors focus:border-fuchsia-500 focus:ring-1 focus:ring-fuchsia-500 focus:outline-none"
                placeholder="Como quer ser chamado"
                autoComplete="name"
                required
              />
            </div>
          )}
          <div>
            <label className="text-xs text-gray-500 block mb-1 font-medium">E-mail</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-3 py-2 text-base transition-colors focus:border-fuchsia-500 focus:ring-1 focus:ring-fuchsia-500 focus:outline-none"
              placeholder="voce@exemplo.com"
              autoComplete="email"
              required
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1 font-medium">Senha</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-3 py-2 pr-10 text-base transition-colors focus:border-fuchsia-500 focus:ring-1 focus:ring-fuchsia-500 focus:outline-none"
                placeholder="Sua senha"
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
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
            {mode === "signin" && (
              <div className="mt-2 text-xs">
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={resetting || initializing}
                  className="text-fuchsia-500 hover:text-fuchsia-600 font-medium"
                >
                  {resetting ? "Enviando..." : "Esqueci minha senha"}
                </button>
              </div>
            )}
          </div>
          {mode === "signup" && (
            <div>
              <label className="text-xs text-gray-500 block mb-1 font-medium">Confirmar senha</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 pr-10 text-base transition-colors focus:border-fuchsia-500 focus:ring-1 focus:ring-fuchsia-500 focus:outline-none"
                  placeholder="Repita sua senha"
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  aria-label={showConfirmPassword ? "Ocultar confirmação" : "Mostrar confirmação"}
                  title={showConfirmPassword ? "Ocultar confirmação" : "Mostrar confirmação"}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>
          )}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={loading || initializing}
            className="w-full h-12 rounded-full bg-fuchsia-500 hover:bg-fuchsia-600 text-white font-bold transition-colors disabled:opacity-50"
          >
            {loading ? (mode === "signin" ? "Entrando..." : "Criando...") : (mode === "signin" ? "Entrar" : "Criar conta")}
          </button>
          <button
            type="button"
            onClick={() => onCancel?.()}
            className="w-full h-10 rounded-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium transition-colors"
          >
            Cancelar
          </button>
          <div className="text-xs text-gray-600 text-center">
            {mode === "signin" ? (
              <button
                type="button"
                onClick={() => setMode("signup")}
                className="text-fuchsia-500 hover:text-fuchsia-600 font-medium"
              >
                Não tem conta? Criar uma
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setMode("signin")}
                className="text-fuchsia-500 hover:text-fuchsia-600 font-medium"
              >
                Já tem conta? Entrar
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

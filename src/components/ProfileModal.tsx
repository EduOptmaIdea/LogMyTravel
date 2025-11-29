import { useEffect, useMemo, useState } from "react";
import Modal from "./Modal";
import { useAuth } from "../utils/auth/AuthProvider";
import { useWarningsModal } from "./hooks/useWarningsModal";
import { supabase } from "../utils/supabase/client";
import { X } from "lucide-react";

type ProfileModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export default function ProfileModal({ isOpen, onClose }: ProfileModalProps) {
  const { user, setNickname, deleteAccountCascade } = useAuth();
  const { openModal, element: warningsModal } = useWarningsModal();
  const current =
    (user?.user_metadata as any)?.display_name ||
    (user?.user_metadata as any)?.nickname ||
    "";
  const [nickname, setNicknameInput] = useState(current);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [hasRecords, setHasRecords] = useState<boolean>(false);
  const email = user?.email || "";
  const createdAt = useMemo(() => (user?.created_at ? new Date(user.created_at) : null), [user]);
  const lastAccess = useMemo(() => (user?.last_sign_in_at ? new Date(user.last_sign_in_at) : null), [user]);

  useEffect(() => {
    if (isOpen) {
      setNicknameInput(((user?.user_metadata as any)?.nickname || "") as string);
      setError(null);
      // Verifica se há registros associados ao usuário (trips/vehicles)
      (async () => {
        try {
          if (!supabase || !user?.id) { setHasRecords(false); return; }
          const [vCountRes, tCountRes] = await Promise.all([
            supabase.from("vehicles").select("id", { count: "exact", head: true }).eq("user_id", user.id),
            supabase.from("trips").select("id", { count: "exact", head: true }).eq("user_id", user.id),
          ]);
          const vCount = vCountRes.count ?? 0;
          const tCount = tCountRes.count ?? 0;
          setHasRecords((vCount + tCount) > 0);
        } catch {
          setHasRecords(false);
        }
      })();
    }
  }, [isOpen, user]);

  const onSave = async () => {
    const trimmed = nickname.trim();
    if (!trimmed) {
      setError("Informe um apelido válido.");
      return;
    }
    setSaving(true);
    const { error } = await setNickname(trimmed);
    setSaving(false);
    if (error) {
      setError(error);
      return;
    }
    onClose();
  };

  const confirmDeleteAccount = () => {
    openModal({
      title: "Excluir conta",
      message: "Esta ação é irreversível. Confirme sua senha para prosseguir.",
      confirmText: "Excluir",
      cancelText: "Cancelar",
      onConfirm: async () => {
        const { error } = await deleteAccountCascade(password);
        if (error) {
          openModal({ title: "Erro", message: error, cancelText: "Fechar" });
          return;
        }
        openModal({ title: "Conta excluída", message: "Sua conta foi excluída com sucesso.", cancelText: "Fechar" });
        onClose();
      },
    });
  };

  const confirmDeactivateAccount = () => {
    openModal({
      title: "Desativar conta",
      message: "Ao desativar, seus dados ficarão inacessíveis, mas podem ser recuperados em até 30 dias. Após este prazo, serão excluídos permanentemente.",
      confirmText: "Desativar",
      cancelText: "Cancelar",
      onConfirm: async () => {
        try {
          if (!supabase || !user?.id) throw new Error("Supabase não configurado");
          const { error: upErr } = await supabase
            .from("profiles")
            .update({ deactivated_at: new Date().toISOString() })
            .eq("id", user.id);
          if (upErr) throw new Error(upErr.message);
          // Opcional: disparar e-mail explicativo (stub)
          try {
            await fetch("/accounts/send-deactivation-email", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ to: email }),
            });
          } catch {}
          openModal({ title: "Conta desativada", message: "Sua conta foi desativada. Você pode reativá-la em até 30 dias.", cancelText: "Fechar" });
          onClose();
        } catch (e: any) {
          openModal({ title: "Erro", message: e?.message || "Falha ao desativar conta", cancelText: "Fechar" });
        }
      },
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Perfil do usuário">
      <div className="space-y-4">
        {/* Botão de fechar no canto superior direito */}
        <div className="absolute right-4 top-4">
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 text-gray-700" aria-label="Fechar" title="Fechar">
            <X size={18} />
          </button>
        </div>

        {/* Dados (somente leitura) */}
        <div className="grid grid-cols-1 gap-3">
          <div>
            <p className="text-xs text-gray-500">E-mail</p>
            <p className="text-sm font-medium text-gray-900">{email || "—"}</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-gray-500">Usário desde</p>
              <p className="text-sm font-medium text-gray-900">{createdAt ? createdAt.toLocaleString() : "—"}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Último acesso</p>
              <p className="text-sm font-medium text-gray-900">{lastAccess ? lastAccess.toLocaleString() : "—"}</p>
            </div>
          </div>
        </div>

        {/* Campo editável: Nome de usuário */}
        <div>
          <label className="block text-sm font-medium mb-1">Nome de usuário</label>
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNicknameInput(e.target.value)}
            placeholder="Seu nome de usuário"
            className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-600"
          />
          {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
        </div>

        {/* Ações: Excluir imediatamente (sempre disponível) e Desativar */}
        <div className="flex flex-col gap-4">
          <div className="space-y-2">
            <label className="block text-xs text-gray-500">Confirme sua senha para excluir permanentemente</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Senha"
              className="w-full border rounded-md px-3 py-2"
            />
            <button
              onClick={confirmDeleteAccount}
              className="w-full px-4 py-2 rounded-full bg-red-50 text-red-700 hover:bg-red-100 border border-red-200"
            >
              Excluir conta imediatamente
            </button>
            {hasRecords && (
              <p className="text-xs text-red-600">Você possui dados associados; eles serão apagados junto com a exclusão da conta.</p>
            )}
          </div>

          <div className="space-y-2">
            <button
              onClick={confirmDeactivateAccount}
              className="w-full px-4 py-2 rounded-full bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200"
            >
              Desativar conta (com período de 30 dias)
            </button>
            <p className="text-xs text-gray-600">Ao desativar, seus dados ficam inacessíveis e serão excluídos automaticamente após 30 dias, com avisos por e-mail.</p>
          </div>
        </div>

        {/* Botões principais */}
        <div className="flex justify-end gap-2 sticky bottom-0 bg-white pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
            disabled={saving}
          >
            Fechar
          </button>
          <button
            onClick={onSave}
            className="px-4 py-2 rounded-md bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-60"
            disabled={saving}
          >
            {saving ? "Salvando..." : "Salvar alterações"}
          </button>
        </div>
        {warningsModal}
      </div>
    </Modal>
  );
}

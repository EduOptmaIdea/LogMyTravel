import { useState } from "react";
import { CircleUser, MessageSquare, FileText, Info, LogOut, Car, Wallet } from "lucide-react";
import ProfileModal from "./ProfileModal";
import { useAuth } from "../utils/auth/AuthProvider";
import type { Vehicle } from "./useTrips";
import { useWarningsModal } from "./hooks/useWarningsModal";

type MenuViewProps = {
  vehicles: Vehicle[];
  onViewChange: (view: "new-trip" | "ongoing-trip" | "my-trips" | "dashboard" | "menu" | "login" | "faqs" | "about" | "vehicles") => void;
};

export function MenuView({ vehicles, onViewChange }: MenuViewProps) {
  const { user, signOut } = useAuth();
  const [showProfile, setShowProfile] = useState(false);
  const lastAccess = user?.last_sign_in_at ? new Date(user.last_sign_in_at) : null;
  const currentAccess = new Date();
  const { openModal, element: warningsModal } = useWarningsModal();

  const requireLogin = (action: () => void) => {
    if (!user) {
      openModal({
        title: "Login necessário",
        message: "Entre na sua conta para acessar este item do menu.",
        confirmText: "Entrar agora",
        cancelText: "Cancelar",
        onConfirm: () => onViewChange("login"),
      });
      return;
    }
    action();
  };

  return (
    <div className="px-4 py-6 space-y-4">
      <h2 className="text-xl font-bold text-gray-800">Menu</h2>
      {user && (
        <div className="p-4 bg-white rounded-xl shadow border border-gray-100">
          <div className="text-sm text-gray-700">
            <div><span className="font-semibold">Último acesso:</span> {lastAccess ? lastAccess.toLocaleString("pt-BR") : "—"}</div>
            <div><span className="font-semibold">Acesso atual:</span> {currentAccess.toLocaleString("pt-BR")}</div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow border border-gray-100 divide-y">
        <button
          onClick={() => setShowProfile(true)}
          className="w-full flex items-center gap-3 p-4 hover:bg-gray-50"
        >
          <CircleUser className="text-fuchsia-600" />
          <span className="font-semibold">Perfil</span>
        </button>
        <button
          onClick={() => requireLogin(() => onViewChange("vehicles"))}
          className="w-full flex items-center gap-3 p-4 hover:bg-gray-50"
        >
          <Car className="text-blue-700" />
          <span className="font-semibold">Meus veículos</span>
        </button>
        <button
          onClick={() => openModal({ title: "Custos de viagens", message: "Em breve", cancelText: "Fechar" })}
          className="w-full flex items-center gap-3 p-4 hover:bg-gray-50"
        >
          <Wallet className="text-blue-700" />
          <span className="font-semibold">Custos de viagens</span>
        </button>
        <button
          onClick={() => requireLogin(() => onViewChange("faqs"))}
          className="w-full flex items-center gap-3 p-4 hover:bg-gray-50"
        >
          <MessageSquare className="text-blue-700" />
          <span className="font-semibold">Dúvidas frequentes</span>
        </button>
        <button
          onClick={() => openModal({ title: "Políticas e termos", message: "Em breve", cancelText: "Fechar" })}
          className="w-full flex items-center gap-3 p-4 hover:bg-gray-50"
        >
          <FileText className="text-blue-700" />
          <span className="font-semibold">Políticas e termos</span>
        </button>
        <button
          onClick={() => requireLogin(() => onViewChange("about"))}
          className="w-full flex items-center gap-3 p-4 hover:bg-gray-50"
        >
          <Info className="text-blue-700" />
          <span className="font-semibold">Sobre</span>
        </button>
        <button
          onClick={async () => {
            await signOut();
            onViewChange("login");
          }}
          className="w-full flex items-center gap-3 p-4 hover:bg-gray-50"
        >
          <LogOut className="text-red-600" />
          <span className="font-semibold">Sair</span>
        </button>
      </div>

      <ProfileModal isOpen={showProfile} onClose={() => setShowProfile(false)} />
      {warningsModal}
    </div>
  );
}

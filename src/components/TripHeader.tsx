import { CircleUser, X } from "lucide-react";
import { useAuth } from "../utils/auth/AuthProvider";
import { useLogout } from "../utils/hooks/useLogout";
import logo from "@/assets/logo-do-fundo-branco.png";

export function TripHeader({ onOpenLogin }: { onOpenLogin?: () => void }) {
  const { user } = useAuth();
  const { logout } = useLogout();

  return (
    <>
      <header className="bg-[#192A56] text-white px-4 md:px-6 py-3 fixed top-0 left-0 right-0 w-full z-40 shadow-md">
      <div className="flex items-center gap-3 max-w-lg md:max-w-xl lg:max-w-2xl mx-auto">
        <div className="flex items-center gap-3 flex-1">
          <img src={logo} alt="LogMyTravel" className="h-10 w-auto rounded-md" />
          <div>
            <p className="text-xs opacity-90">Seu diário de bordo pessoal</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-2">
              <div className="flex flex-col leading-tight">
                <span className="text-xs opacity-90">Olá,</span>
                <span className="text-sm font-semibold">
                  {(
                    (user.user_metadata as any)?.display_name ||
                    (user.user_metadata as any)?.nickname ||
                    (user.user_metadata as any)?.full_name ||
                    (user.email || "").split("@")[0]
                  )}
                </span>
              </div>
              <button
                onClick={logout}
                className="p-2 bg-white/10 hover:bg-white/20 rounded-full"
                aria-label="Sair"
                title="Sair"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <CircleUser className="w-9 h-9" />
              <button
                onClick={() => onOpenLogin && onOpenLogin()}
                className="text-xs bg-white/10 hover:bg-white/20 px-3 py-1 rounded-full"
              >
                Entrar
              </button>
            </div>
          )}
        </div>
      </div>
      </header>
    </>
  );
}

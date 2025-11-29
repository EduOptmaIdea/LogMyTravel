import { PlaneTakeoff, Navigation, Luggage, LayoutDashboard, Menu } from "lucide-react";

interface BottomNavProps {
  activeView:
    | "new-trip"
    | "ongoing-trip"
    | "my-trips"
    | "dashboard"
    | "menu"
    | "login"
    | "faqs"
    | "about"
    | "vehicles";
  onViewChange: (
    view:
      | "new-trip"
      | "ongoing-trip"
      | "my-trips"
      | "dashboard"
      | "menu"
      | "login"
      | "faqs"
      | "about"
      | "vehicles",
  ) => void;
  hasOngoingTrip: boolean;
}

export function BottomNav({ activeView, onViewChange, hasOngoingTrip }: BottomNavProps) {
  // Os botões trocam de posição dependendo se há viagem em curso
  // O botão central (posição 3) é sempre o prioritário
  const navItems = hasOngoingTrip
    ? [
        { icon: Luggage, label: "Minhas viagens", view: "my-trips" as const, disabled: false },
        { icon: PlaneTakeoff, label: "Nova viagem", view: "new-trip" as const, disabled: false },
        { icon: Navigation, label: "Viagem atual", view: "ongoing-trip" as const, disabled: false }, // CENTRO - prioritário
        { icon: LayoutDashboard, label: "Dashboard", view: "dashboard" as const, disabled: false },
        { icon: Menu, label: "Menu", view: "menu" as const, disabled: false },
      ]
    : [
        { icon: Luggage, label: "Minhas viagens", view: "my-trips" as const, disabled: false },
        { icon: Navigation, label: "Viagem atual", view: "ongoing-trip" as const, disabled: true },
        { icon: PlaneTakeoff, label: "Nova viagem", view: "new-trip" as const, disabled: false }, // CENTRO - prioritário
        { icon: LayoutDashboard, label: "Dashboard", view: "dashboard" as const, disabled: false },
        { icon: Menu, label: "Menu", view: "menu" as const, disabled: false },
      ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-2 py-3 z-50 shadow-lg">
      <div className="flex items-end justify-around max-w-md mx-auto h-16">
        {navItems.map((item, index) => {
          const Icon = item.icon;
          const isActive = activeView === item.view;
          const isDisabled = item.disabled;

          return (
            <button
              key={index}
              onClick={() => !isDisabled && onViewChange(item.view)}
              disabled={isDisabled}
              className={`flex flex-col items-center gap-1 py-1 px-1 min-w-[60px] transition-all duration-200 font-body ${
                isDisabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
              } ${isActive ? "z-10" : "z-0"}`}
              style={{
                transform: isActive ? "scale(1.18)" : "scale(1)",
                transformOrigin: "bottom center",
              }}
            >
              <div className="flex items-end justify-center w-full mb-1">
                <div
                  className={`rounded-full p-2 ${
                    isActive ? "bg-[#192A56]" : "bg-transparent"
                  }`}
                >
                  <Icon
                    size={20}
                    className={
                      isActive
                        ? "text-white"
                        : isDisabled
                        ? "text-gray-400"
                        : "text-[#8E44AD]"
                    }
                  />
                </div>
              </div>
              <span
                className={`text-[10px] text-center ${
                  isActive 
                    ? "text-[#192A56] font-medium" 
                    : isDisabled 
                    ? "text-gray-400" 
                    : "text-gray-600"
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

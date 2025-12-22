import { useState, useEffect, useRef } from "react";
import { TripHeader } from "./components/TripHeader";
import { PromoCarousel } from "./components/PromoCarousel";
import { TripNew } from "./components/TripNew";
import { BottomNav } from "./components/BottomNav";
import { OngoingTripView } from "./components/OngoingTripView";
import { TripEditModal } from "./components/TripEditModal";
import { Toaster } from "./components/ui/sonner";
import { SplashScreen } from "./components/SplashScreen";
import { TripCard } from "./components/TripCard";
import { DashboardView } from "./components/DashboardView";
import { Login } from "./components/Login";
import { ResetPassword } from "./components/ResetPassword";
import { MenuView } from "./components/MenuView";
import { VehiclesView } from "./components/VehiclesView";
import { FaqsView } from "./components/FaqsView";
import { AboutView } from "./components/AboutView";
import { useAuth } from "./utils/auth/AuthProvider";
import { supabase } from "./utils/supabase/client";
import { toast } from "sonner";
import { useTrips as useTripsHook } from "./components/useTrips";
import type { Trip } from "./components/useTrips";
import { useWarningsModal } from "./components/hooks/useWarningsModal";

export default function App() {
  const { user, initializing } = useAuth();
  const { openModal, element: warningsModal } = useWarningsModal();
  const [selectedOngoingTripId, setSelectedOngoingTripId] =
    useState<string | null>(null);

  const {
    trips: cloudTrips,
    saveTrip,
    updateTrip,
    deleteTrip,
    vehicles,
    saveVehicle,
    updateVehicle,
    deleteVehicle,
    loading: loadingTrips,
    error: tripsError,
    linkVehicleToTrip,
    unlinkVehicleFromTrip,
    unlinkAllVehiclesFromTrip,
    ensureVehicleSynced,
  } = useTripsHook();

  const trips = cloudTrips;
  const ongoingTrips = trips.filter((trip) => trip.status === "ongoing");
  const hasOngoingTrip = ongoingTrips.length > 0;

  // Detecta rota de recuperação (via hash ou query) para iniciar direto na tela de reset
  const isRecoveryRoute = (() => {
    try {
      const href = typeof window !== "undefined" ? window.location.href : "";
      const url = href ? new URL(href) : null;
      const typeQuery = url?.searchParams.get("type")?.toLowerCase();
      const rawHash = typeof window !== "undefined" ? window.location.hash : "";
      const trimmedHash = rawHash.replace("#", "").trim();
      const hashParams = new URLSearchParams(trimmedHash);
      const typeHash = hashParams.get("type")?.toLowerCase();
      const hashIsReset = trimmedHash === "reset-password";
      const hasRecoveryType = typeQuery === "recovery" || typeHash === "recovery";
      return hashIsReset || hasRecoveryType;
    } catch {
      return false;
    }
  })();

  const [activeView, setActiveView] = useState<
    | "new-trip"
    | "ongoing-trip"
    | "my-trips"
    | "dashboard"
    | "menu"
    | "login"
    | "reset-password"
    | "faqs"
    | "about"
    | "vehicles"
  >(() => (isRecoveryRoute ? "reset-password" : hasOngoingTrip ? "ongoing-trip" : "new-trip"));

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [tripToEdit, setTripToEdit] = useState<Trip | null>(null);
  const [showSplash, setShowSplash] = useState(() => {
    try {
      const seen = typeof window !== 'undefined' ? localStorage.getItem('splash_seen') === '1' : false;
      return !isRecoveryRoute && !seen;
    } catch { return !isRecoveryRoute; }
  });
  const [isRecoveryFlow, setIsRecoveryFlow] = useState<boolean>(() => isRecoveryRoute);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "ongoing" | "completed">("all");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const mainContentRef = useRef<HTMLDivElement>(null);
  const [showScrollToTop, setShowScrollToTop] = useState(false);

  const handleScroll = () => {
    if (mainContentRef.current) {
      setShowScrollToTop(mainContentRef.current.scrollTop > 100);
    }
  };

  const scrollToTop = () => {
    mainContentRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  useEffect(() => {
    const mainElement = mainContentRef.current;
    if (mainElement) {
      mainElement.addEventListener("scroll", handleScroll);
      return () => mainElement.removeEventListener("scroll", handleScroll);
    }
    mainContentRef.current?.scrollTo({ top: 0 });
  }, [activeView]);

  // Navegação por hash para fluxo de redefinição de senha
  useEffect(() => {
    const applyHashRoute = () => {
      const hash = window.location.hash.replace('#', '').trim();
      const hashParams = new URLSearchParams(hash);
      const typeHash = hashParams.get('type');
      if (hash === 'reset-password' || (typeHash && typeHash.toLowerCase() === 'recovery')) {
        setIsRecoveryFlow(true);
        setActiveView('reset-password');
        setShowSplash(false);
      }
    };
    applyHashRoute();
    window.addEventListener('hashchange', applyHashRoute);
    return () => window.removeEventListener('hashchange', applyHashRoute);
  }, []);

  // Detecta clique no link de recuperação (type=recovery)
  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      const type = url.searchParams.get('type');
      if (type === 'recovery') {
        setIsRecoveryFlow(true);
        setActiveView('reset-password');
        setShowSplash(false);
      }
    } catch {}
  }, []);

  // Ajusta a view ao evento de recuperação do Supabase
  useEffect(() => {
    if (!supabase) return;
    const { data: subscription } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecoveryFlow(true);
        setActiveView('reset-password');
        setShowSplash(false);
      } else if (event === 'SIGNED_OUT') {
        setActiveView('login');
        setShowSplash(false);
      }
    });
    return () => subscription?.subscription?.unsubscribe();
  }, []);

  // 👇 REMOVIDO: o useEffect com window.location.reload() e limpeza de cache

  useEffect(() => {
    if (initializing || loadingTrips) return;
    if (hasOngoingTrip && (activeView === "new-trip" || activeView === "ongoing-trip")) {
      setActiveView("ongoing-trip");
    } else if (!hasOngoingTrip && activeView === "ongoing-trip") {
      setActiveView("new-trip");
    }
  }, [hasOngoingTrip, initializing, loadingTrips, activeView]);

  useEffect(() => {
    if (user && hasOngoingTrip && !isRecoveryFlow && activeView !== 'reset-password') {
      setActiveView('ongoing-trip');
    }
  }, [user, hasOngoingTrip, isRecoveryFlow]);

  useEffect(() => {
    if (initializing) return;
    if (!user) {
      setSelectedOngoingTripId(null);
      if (!isRecoveryFlow) {
        setActiveView("new-trip");
      }
    }
  }, [user, isRecoveryFlow, initializing]);

  // Primeiro clique → solicitar login/criar conta
  useEffect(() => {
    if (user || isRecoveryFlow) return;
    const handler = () => {
      openModal({
        title: "Bem-vindo",
        message: "Entre ou crie uma conta para salvar suas viagens.",
        confirmText: "Entrar agora",
        cancelText: "Depois",
        onConfirm: () => setActiveView("login"),
      });
      window.removeEventListener('click', handler, true);
    };
    window.addEventListener('click', handler, true);
    return () => window.removeEventListener('click', handler, true);
  }, [user, isRecoveryFlow]);

  // Gate de login para telas protegidas
  useEffect(() => {
    if (initializing) return;
    const protectedViews = new Set(["menu", "faqs", "about", "my-trips", "dashboard", "vehicles"]);
    if (protectedViews.has(activeView) && !user) {
      openModal({
        title: "Login necessário",
        message: "Entre na sua conta para acessar esta área.",
        confirmText: "Entrar agora",
        cancelText: "Cancelar",
        onConfirm: () => setActiveView("login"),
      });
      setActiveView("login");
    }
  }, [activeView, user, initializing]);

  const handleEditEndKm = async (tripId: string, newEndKm: number) => {
    try {
      await updateTrip(tripId, { endKm: newEndKm });
    } catch (e) {
      toast.error("Falha ao atualizar Km final.");
    }
  };

  const handleEditStartKm = async (tripId: string, newStartKm: number) => {
    try {
      await updateTrip(tripId, { startKm: newStartKm });
    } catch (e) {
      toast.error("Falha ao atualizar Km inicial.");
    }
  };

  const handleSaveNewTrip = async (tripData: {
    name: string;
    departureLocation: string;
    departureCoords?: { latitude: number; longitude: number };
    departureDate: string;
    departureTime: string;
    details: string;
    startKm: number;
    hasVehicle: boolean;
    vehicleIds: string[];
    status: "ongoing";
  }) => {
    if (!user) {
      openModal({
        title: "Login necessário",
        message: "Você precisa estar logado para salvar sua viagem.",
        confirmText: "Entrar agora",
        cancelText: "Cancelar",
        onConfirm: () => setActiveView("login"),
      });
      return;
    }

    try {
      const saved = await saveTrip({
        name: tripData.name,
        departureLocation: tripData.departureLocation,
        departureCoords: tripData.departureCoords,
        departureDate: tripData.departureDate,
        departureTime: tripData.departureTime,
        details: tripData.details,
        startKm: tripData.startKm,
        endKm: null,
        status: tripData.status,
        hasVehicle: tripData.hasVehicle,
        vehicleIds: tripData.vehicleIds,
      });
      setSelectedOngoingTripId(saved.id);
      setActiveView("ongoing-trip");
    } catch (e) {
      const message = (e as any)?.message || "Falha ao salvar a viagem. Dados locais foram atualizados.";
      toast.error(message);
      setActiveView("ongoing-trip");
    }
  };

  const handleSaveEditedTrip = async (updatedData: Partial<Trip>) => {
    if (!tripToEdit) return;

    let updatedTrip = { ...tripToEdit, ...updatedData };

    if (
      updatedData.status === "completed" &&
      !updatedTrip.arrivalLocation &&
      !updatedTrip.arrivalCoords &&
      !updatedTrip.arrivalDate &&
      !updatedTrip.arrivalTime
    ) {
      updatedTrip = {
        ...updatedTrip,
        arrivalLocation: "Destino desconhecido",
        arrivalCoords: { latitude: 0, longitude: 0 },
        arrivalDate: new Date().toISOString().split("T")[0],
        arrivalTime: new Date().toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        endKm: updatedTrip.endKm || updatedTrip.startKm || 0,
      };
    }

    try {
      await updateTrip(tripToEdit.id, updatedTrip);
      if (updatedData.status === "completed") {
        setActiveView("my-trips");
      }
    } catch (e) {
      toast.error("Falha ao salvar alterações da viagem.");
    } finally {
      setIsEditModalOpen(false);
    }
  };

  const handleDeleteOngoingTrip = async (tripId: string) => {
    if (!confirm("Deseja excluir esta viagem?")) return;
    try {
      await deleteTrip(tripId);
      const remainingOngoing = trips.filter((t) => t.status === "ongoing");
      if (remainingOngoing.length === 0) {
        setActiveView("new-trip");
      }
    } catch (e) {
      toast.error("Falha ao excluir a viagem.");
    } finally {
      setIsEditModalOpen(false);
    }
  };

  const handleUnlinkVehicleFromTrip = async (tripId: string) => {
    try {
      await updateTrip(tripId, {
        hasVehicle: false,
        vehicleIds: [],
        startKm: null,
        endKm: null,
      });
      await unlinkAllVehiclesFromTrip(tripId);
      toast.success("Veículo removido da viagem. KM inicial/final apagados.");
    } catch (e) {
      toast.error("Falha ao remover veículo da viagem.");
    }
  };

  const handleDetachVehicleFromTrip = async (tripId: string, vehicleId: string) => {
    try {
      const currentTrip = trips.find((t) => t.id === tripId);
      const currentIds = currentTrip?.vehicleIds ?? [];
      const nextIds = currentIds.filter((id) => id !== vehicleId);
      await updateTrip(tripId, {
        hasVehicle: nextIds.length > 0,
        vehicleIds: nextIds,
        startKm: nextIds.length > 0 ? currentTrip?.startKm ?? null : null,
        endKm: nextIds.length > 0 ? currentTrip?.endKm ?? null : null,
      });
      await unlinkVehicleFromTrip(tripId, vehicleId);
      toast.success("Veículo desvinculado da viagem.");
    } catch (e) {
      toast.error("Falha ao desvincular veículo da viagem.");
    }
  };

  const handleAttachVehicleToTrip = async (
    tripId: string,
    vehicleId: string,
    startKm?: number | null,
  ) => {
    try {
      const currentTrip = trips.find((t) => t.id === tripId);
      const currentIds = currentTrip?.vehicleIds ?? [];
      const nextIds = currentIds.includes(vehicleId)
        ? currentIds
        : [...currentIds, vehicleId];

      await updateTrip(tripId, {
        hasVehicle: nextIds.length > 0,
        vehicleIds: nextIds,
        startKm: startKm ?? currentTrip?.startKm ?? null,
        endKm: null,
      });
      await linkVehicleToTrip(tripId, vehicleId, startKm ?? null);
      toast.success("Veículo vinculado à viagem.");
    } catch (e) {
      toast.error("Falha ao vincular veículo.");
    }
  };

  const handleEditTrip = (trip: any) => {
    setTripToEdit(trip);
    setIsEditModalOpen(true);
  };

  const handleSplashComplete = () => {
    try {
      if (typeof window !== 'undefined') localStorage.setItem('splash_seen', '1');
    } catch {}
    setShowSplash(false);
  };

  const parseDateTime = (dateStr: string, timeStr: string): number => {
    const [d, m, y] = dateStr.split("/").map(Number);
    const [h, min] = timeStr.split(":").map(Number);
    if (isNaN(d) || isNaN(m) || isNaN(y) || isNaN(h) || isNaN(min)) {
      return 0;
    }
    return new Date(y, m - 1, d, h, min).getTime();
  };

  const filteredAndSortedTrips = [...trips]
    .filter((trip) => {
      if (filterStatus === "all") return true;
      if (filterStatus === "ongoing") return trip.status === "ongoing";
      if (filterStatus === "completed") return trip.status === "completed";
      return true;
    })
    .filter((trip) => trip.name.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => {
      if (a.status !== b.status) {
        return a.status === "ongoing" ? -1 : 1;
      }
      const timeA = parseDateTime(a.departureDate, a.departureTime);
      const timeB = parseDateTime(b.departureDate, b.departureTime);
      return sortOrder === "asc" ? timeA - timeB : timeB - timeA;
    });

  if (showSplash) {
    return <SplashScreen onReady={handleSplashComplete} />;
  }

  const newTripButtonBottomMyTrips = "bottom-24";
  const scrollToTopButtonBottom = activeView === "my-trips" ? "bottom-36" : "bottom-24";

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <TripHeader onOpenLogin={() => setActiveView("login")} />

      <main ref={mainContentRef} className={`flex-1 overflow-y-auto scroll-smooth`}>
        <div className="max-w-lg md:max-w-xl lg:max-w-2xl mx-auto px-4 md:px-6 pt-[72px] pb-24 lg:pb-28">
          {activeView === "new-trip" && <PromoCarousel />}
          {activeView === "new-trip" && (
            <TripNew
              onSaveTrip={handleSaveNewTrip}
              onRequireLogin={() => setActiveView("login")}
              vehicles={vehicles}
              saveVehicle={saveVehicle}
              updateVehicle={updateVehicle}
            />
          )}

          {activeView === "login" && (
            <Login
              onSuccess={() => setActiveView(hasOngoingTrip ? "ongoing-trip" : "new-trip")}
              onCancel={() => setActiveView(hasOngoingTrip ? "ongoing-trip" : "new-trip")}
            />
          )}

          {activeView === "ongoing-trip" && hasOngoingTrip && (
            <OngoingTripView
              trips={ongoingTrips}
              vehicles={vehicles}
              initialSelectedTripId={selectedOngoingTripId || undefined}
              saveVehicle={saveVehicle}
              updateVehicle={updateVehicle}
              updateTrip={updateTrip}
              onEdit={handleEditTrip}
              onDelete={handleDeleteOngoingTrip}
              onComplete={() => {}}
              onUpdateKm={handleEditEndKm}
              onUpdateStartKm={handleEditStartKm}
              onRemoveVehicleFromTrip={handleUnlinkVehicleFromTrip}
              onAttachVehicleToTrip={handleAttachVehicleToTrip}
              onDetachVehicleFromTrip={handleDetachVehicleFromTrip}
            />
          )}

          {activeView === "my-trips" && (
            <>
              <div className="px-4 py-6 space-y-4">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Minhas viagens</h2>
                <div className="flex gap-2 mb-4">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      placeholder="Buscar viagem..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full p-2 border rounded-md text-sm"
                    />
                    {searchTerm && (
                      <button
                        onClick={() => setSearchTerm("")}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500 hover:text-gray-700"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value as any)}
                    className="p-2 border rounded-md text-sm"
                  >
                    <option value="all">Todas</option>
                    <option value="ongoing">Em andamento</option>
                    <option value="completed">Encerradas</option>
                  </select>
                  <button
                    onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                    className="p-2 border rounded-md text-sm flex items-center gap-1"
                  >
                    {sortOrder === "asc" ? "↑" : "↓"} Data
                  </button>
                </div>

                <div className="space-y-4">
                  {filteredAndSortedTrips.length === 0 ? (
                    <p className="text-gray-500">
                      {trips.length === 0 ? "Nenhuma viagem registrada ainda." : "Nenhuma viagem encontrada."}
                    </p>
                  ) : (
                    filteredAndSortedTrips.map((trip) => (
                      <TripCard
                        key={trip.id}
                        trip={trip as any}
                        onEdit={() => handleEditTrip(trip as any)}
                        onDelete={() => handleDeleteOngoingTrip(trip.id)}
                        vehicles={vehicles}
                        saveVehicle={saveVehicle}
                        updateVehicle={updateVehicle}
                      />
                    ))
                  )}
                </div>
              </div>

              <button
                onClick={() => setActiveView("new-trip")}
                className={`fixed ${newTripButtonBottomMyTrips} right-4 w-12 h-12 rounded-full bg-fuchsia-500 text-white flex items-center justify-center shadow-lg hover:bg-fuchsia-600 transition-colors z-20`}
                aria-label="Nova viagem"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </>
          )}

          {activeView === "dashboard" && <DashboardView trips={trips} />}
          {activeView === "menu" && <MenuView vehicles={vehicles} onViewChange={setActiveView} />}
          {activeView === "reset-password" && <ResetPassword onSuccess={() => setActiveView(hasOngoingTrip ? 'ongoing-trip' : 'new-trip')} />}
          {activeView === "faqs" && <FaqsView />}
          {activeView === "about" && <AboutView />}
          {activeView === "vehicles" && (
            <VehiclesView
              vehicles={vehicles}
              trips={trips}
              loadingVehicles={loadingTrips}
              saveVehicle={saveVehicle}
              updateVehicle={updateVehicle}
              deleteVehicle={deleteVehicle}
              ensureVehicleSynced={ensureVehicleSynced}
            />
          )}
        </div>
      </main>

      {warningsModal}

      {showScrollToTop && (
        <button
          onClick={scrollToTop}
          className={`fixed ${scrollToTopButtonBottom} right-4 w-12 h-12 rounded-full bg-teal-600 text-white flex items-center justify-center shadow-xl hover:bg-teal-800 transition-all duration-300 z-30`}
          aria-label="Voltar ao Topo"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
          </svg>
        </button>
      )}

      {activeView !== 'reset-password' && (
        <BottomNav
          activeView={activeView}
          onViewChange={setActiveView}
          hasOngoingTrip={hasOngoingTrip}
        />
      )}

      {isEditModalOpen && tripToEdit && (
        <TripEditModal
          trip={tripToEdit}
          onSave={handleSaveEditedTrip}
          onClose={() => setIsEditModalOpen(false)}
        />
      )}

      <Toaster position="top-center" />
    </div>
  );
}

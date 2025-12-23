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
import { useOnlineStatus } from "./utils/offline/useOnlineStatus";

export default function App() {
  const { user, initializing } = useAuth();
  const { openModal, element: warningsModal } = useWarningsModal();
  const [selectedOngoingTripId, setSelectedOngoingTripId] = useState<string | null>(null);
  const { online } = useOnlineStatus();

  const {
    trips,
    saveTrip,
    updateTrip,
    deleteTrip,
    vehicles,
    saveVehicle,
    updateVehicle,
    deleteVehicle,
    loading: loadingTrips,
    linkVehicleToTrip,
    unlinkVehicleFromTrip,
    unlinkAllVehiclesFromTrip,
    ensureVehicleSynced,
    syncing,
    syncBackground,
    refresh,
    deleteTripCascade,
  } = useTripsHook();

  const ongoingTrips = trips.filter((trip) => !trip.status);
  const hasOngoingTrip = ongoingTrips.length > 0;

  const [activeView, setActiveView] = useState<any>("new-trip");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [tripToEdit, setTripToEdit] = useState<Trip | null>(null);
  const [showSplash, setShowSplash] = useState(true);
  const mainContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!initializing && !user) {
      setActiveView("login");
      setShowSplash(false);
    } else if (!initializing && user) {
      setActiveView(hasOngoingTrip ? "ongoing-trip" : "new-trip");
      setShowSplash(false);
    }
  }, [user, initializing]);

  useEffect(() => {
    if (!supabase) return;
    const { data: subscription } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        try { localStorage.clear(); } catch {}
        try { sessionStorage.clear(); } catch {}
        try {
          if ('caches' in window) {
            caches.keys().then((keys) => keys.forEach((k) => { try { caches.delete(k); } catch {} }));
          }
        } catch {}
        setActiveView('login');
        try { window.location.replace('/'); } catch {}
        try { setTimeout(() => { try { window.location.reload(); } catch {} }, 50); } catch {}
      }
    });
    return () => subscription?.subscription?.unsubscribe();
  }, []);

  const handleSaveNewTrip = async (tripData: any) => {
    if (!user) return setActiveView("login");
    try {
      const saved = await saveTrip(tripData);
      setSelectedOngoingTripId(saved.id);
      setActiveView("ongoing-trip");
    } catch (e) {
      toast.error("Erro ao salvar viagem.");
    }
  };

  const handleDeleteTripCascade = async (trip: Trip) => {
    if (!trip.status) return; // apenas viagens encerradas
    const pwd = window.prompt('Digite sua senha para confirmar a exclusão permanente:') || '';
    if (!pwd || !user?.email) return;
    try {
      if (supabase) {
        const { error: authError } = await supabase.auth.signInWithPassword({ email: user.email!, password: pwd });
        if (authError) { toast.error("Senha incorreta."); return; }
      }
      await deleteTripCascade(trip.id);
      setActiveView("new-trip");
      toast.success("Viagem excluída.");
    } catch {
      toast.error("Falha ao excluir viagem.");
    }
  };
  const scrollToTop = () => {
    mainContentRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Ensure hooks are invoked consistently before any conditional return
  useEffect(() => {
    if (initializing || loadingTrips) return;
    if (hasOngoingTrip && (activeView === "new-trip" || activeView === "ongoing-trip")) {
      setActiveView("ongoing-trip");
    } else if (!hasOngoingTrip && activeView === "ongoing-trip") {
      setActiveView("new-trip");
    }
  }, [hasOngoingTrip, initializing, loadingTrips, activeView]);

  if (showSplash) return <SplashScreen onReady={() => setShowSplash(false)} />;

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <TripHeader onOpenLogin={() => setActiveView("login")} /> 

      <main ref={mainContentRef} className="flex-1 overflow-y-auto scroll-smooth">
        <div className="max-w-lg md:max-w-xl lg:max-w-2xl mx-auto px-4 pt-[72px] pb-24"> 
          {!online && (
            <div className="mb-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 px-3 py-2 text-sm">
              Você está offline. Alterações serão sincronizadas quando a conexão retornar.
            </div>
          )}
          {syncBackground && online && (
            <div className="mb-3 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-800 px-3 py-2 text-sm">
              Sincronização em segundo plano. Usando dados em cache até estabilizar a conexão.
            </div>
          )}

          {activeView === "login" && <Login onSuccess={() => {}} onCancel={() => {}} />}
          {activeView === "new-trip" && (
            <>
              <PromoCarousel />
              <TripNew onSaveTrip={handleSaveNewTrip} vehicles={vehicles} saveVehicle={saveVehicle} updateVehicle={updateVehicle} />
            </>
          )}
          {activeView === "ongoing-trip" && (
            <OngoingTripView
              trips={ongoingTrips}
              vehicles={vehicles}
              onUpdateKm={(id, km) => updateTrip(id, { endKm: km })}
              onUpdateStartKm={(id, km) => updateTrip(id, { startKm: km })}
              onAttachVehicleToTrip={linkVehicleToTrip}
              onDetachVehicleFromTrip={unlinkVehicleFromTrip}
              onRemoveVehicleFromTrip={unlinkAllVehiclesFromTrip}
              onEdit={(trip) => {
                setTripToEdit(trip);
                setIsEditModalOpen(true);
              }}
              onDelete={(id) => { deleteTrip(id); if (selectedOngoingTripId === id) { setSelectedOngoingTripId(null); } }}
              onComplete={(id) => updateTrip(id, { status: true })}
            />
          )}
          {activeView === "my-trips" && (
             <div className="space-y-4">
               <h2 className="text-xl font-bold p-4">Minhas viagens</h2>
               {trips.map(t => <TripCard key={t.id} trip={t} onEdit={() => {setTripToEdit(t); setIsEditModalOpen(true);}} onDelete={t.status ? () => handleDeleteTripCascade(t) : undefined} />)}
             </div>
          )}
          {activeView === "menu" && <MenuView vehicles={vehicles} onViewChange={setActiveView} />}
          {activeView === "vehicles" && (
            <VehiclesView
              vehicles={vehicles}
              trips={trips}
              saveVehicle={saveVehicle}
              updateVehicle={updateVehicle}
              deleteVehicle={deleteVehicle}
              ensureVehicleSynced={ensureVehicleSynced}
            />
          )}
        </div>
      </main>

      <BottomNav activeView={activeView} onViewChange={setActiveView} hasOngoingTrip={hasOngoingTrip} />
      {isEditModalOpen && tripToEdit && (
        <TripEditModal
          trip={tripToEdit}
          onSave={async (data) => { await updateTrip(tripToEdit.id, data); await refresh(); }}
          onClose={() => setIsEditModalOpen(false)}
        />
      )}
      <Toaster position="top-center" />
      {warningsModal}
      {syncing && online && (
        <div className="fixed inset-0 z-[10000] bg-black/40 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-white rounded-xl shadow px-4 py-3 text-center">
            <div className="text-sm font-semibold">Atualizando banco de dados...</div>
          </div>
        </div>
      )}
    </div>
  );
}

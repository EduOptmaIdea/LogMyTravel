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
  const [selectedOngoingTripId, setSelectedOngoingTripId] = useState<string | null>(null);

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
  } = useTripsHook();

  const ongoingTrips = trips.filter((trip) => trip.status === "ongoing");
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
        localStorage.clear();
        sessionStorage.clear();
        setActiveView('login');
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

  const scrollToTop = () => {
    mainContentRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (showSplash) return <SplashScreen onReady={() => setShowSplash(false)} />;

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <TripHeader onOpenLogin={() => setActiveView("login")} /> 

      <main ref={mainContentRef} className="flex-1 overflow-y-auto scroll-smooth">
        <div className="max-w-lg md:max-w-xl lg:max-w-2xl mx-auto px-4 pt-[72px] pb-24"> 

          {activeView === "login" && <Login onSuccess={() => {}} onCancel={() => {}} />}
          {activeView === "new-trip" && (
            <>
              <PromoCarousel />
              <TripNew onSaveTrip={handleSaveNewTrip} vehicles={vehicles} saveVehicle={saveVehicle} updateVehicle={updateVehicle} />
            </>
          )}
          {activeView === "ongoing-trip" && (
            <OngoingTripView 
              trips={ongoingTrips} vehicles={vehicles} 
              onUpdateKm={(id, km) => updateTrip(id, { endKm: km })}
              onUpdateStartKm={(id, km) => updateTrip(id, { startKm: km })}
              onAttachVehicleToTrip={linkVehicleToTrip}
              onDetachVehicleFromTrip={unlinkVehicleFromTrip}
              onRemoveVehicleFromTrip={unlinkAllVehiclesFromTrip}
            />
          )}
          {activeView === "my-trips" && (
             <div className="space-y-4">
               <h2 className="text-xl font-bold p-4">Minhas viagens</h2>
               {trips.map(t => <TripCard key={t.id} trip={t} onEdit={() => {setTripToEdit(t); setIsEditModalOpen(true);}} />)}
             </div>
          )}
          {activeView === "menu" && <MenuView vehicles={vehicles} onViewChange={setActiveView} />}
          {activeView === "vehicles" && <VehiclesView vehicles={vehicles} saveVehicle={saveVehicle} updateVehicle={updateVehicle} deleteVehicle={deleteVehicle} ensureVehicleSynced={ensureVehicleSynced} />}
        </div>
      </main>

      <BottomNav activeView={activeView} onViewChange={setActiveView} hasOngoingTrip={hasOngoingTrip} />
      {isEditModalOpen && tripToEdit && <TripEditModal trip={tripToEdit} onSave={(data) => updateTrip(tripToEdit.id, data)} onClose={() => setIsEditModalOpen(false)} />}
      <Toaster position="top-center" />
      {warningsModal}
    </div>
  );
}
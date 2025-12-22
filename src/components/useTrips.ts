import { useState, useEffect } from "react";
import { useAuth } from "../utils/auth/AuthProvider";

// Tipos (redeclarados para autonomia)
export interface LocationData {
  latitude: number;
  longitude: number;
}

export interface Trip {
  id: string;
  name: string;
  departureLocation: string;
  departureCoords?: LocationData | null;
  departureDate: string; // dd/MM/yyyy
  departureTime: string; // HH:mm
  arrivalLocation?: string;
  arrivalCoords?: LocationData | null;
  arrivalDate?: string;
  arrivalTime?: string;
  startKm?: number | null;
  endKm?: number | null;
  details?: string;
  status: "ongoing" | "completed";

  isDriving?: boolean;
  hasVehicle?: boolean;
  vehicleIds?: string[];
  created_at?: string;
  updated_at?: string;
  stops?: Stop[];
}

export interface Vehicle {
  id: string;
  nickname: string;
  category:
    | "moto"
    | "carro"
    | "van"
    | "caminhonete"
    | "caminhao"
    | "outros"
    | "";
  make: string;
  model: string;
  color: string;
  year: number;
  licensePlate: string;
  vehicleType:
    | "proprio"
    | "alugado"
    | "trabalho"
    | "outros"
    | "";
  kmInitial: number | null;
  fuels: string[];
  photoUrl?: string | null;
  photoPath?: string | null;
  active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Stop {
  id: string;
  tripId: string; // ID da viagem à qual pertence
  name: string; // Nome da parada: "Posto Ipiranga", "Hotel Central", etc.
  stopType?: "stop" | "destination"; // tipo de parada
  wasDriving?: boolean; // se o trecho antes da parada foi dirigindo
  location?: LocationData | null;
  place?: string; // nome visível do local (cidade/estabelecimento)
  placeDetail?: string; // complemento do local
  arrivalKm?: number | null; // KM ao chegar na parada
  departureKm?: number | null; // KM ao sair da parada
  arrivalDate: string; // dd/MM/yyyy
  arrivalTime: string; // HH:mm
  departureDate?: string; // opcional, se ainda não saiu
  departureTime?: string; // opcional
  reasons: (
    | "rest"
    | "fuel"
    | "food"
    | "photos"
    | "visit"
    | "other"
  )[];
  otherReason?: string; // se "other" estiver em reasons
  cost: number; // valor gasto (0 por padrão)
  notes?: string; // relato/diário
  photoUrls?: string[]; // URLs das fotos (simulado por agora)
  // Gastos categorizados (persistidos em jsonb: cost_details)
  costDetails?: Array<{ category: "fuel" | "food" | "lodging" | "workshop" | "other"; amount: number; note?: string }>;
  createdAt: string;
}

// Segmentos de KM por veículo em uma viagem
export interface TripVehicleSegment {
  id: string;
  tripId: string;
  vehicleId: string;
  segmentDate: string; // yyyy-MM-dd
  initialKm: number;
  currentKm: number;
  // Indica se o tanque estava cheio neste trecho
  tankFull?: boolean;
  // Indica se este é o trecho inicial do veículo na viagem
  isInitial?: boolean;
  created_at?: string;
  updated_at?: string;
}

// Cliente Supabase
import { supabase, SUPABASE_CONFIGURED } from "../utils/supabase/client";
import { safeRandomUUID } from "../utils/uuid";

const getSupabase = () => {
  return supabase; // Já é null se não configurado
};

// Função para salvar no localStorage (fallback)
const saveToLocalStorage = (key: string, data: any[]) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    // Dispara um evento para sincronizar outros hooks/visões no mesmo app
    if (typeof window !== "undefined") {
      try {
        const evt: any = new CustomEvent("ls:update", { detail: { key } });
        window.dispatchEvent(evt);
      } catch (_) {
        window.dispatchEvent(new Event("ls:update"));
      }
    }
  } catch (e) {
    console.error("Erro ao salvar no localStorage", e);
  }
};

// Função para carregar do localStorage
const loadFromLocalStorage = (key: string): any[] => {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    // Se os dados estiverem corrompidos (JSON inválido), limpamos a chave para evitar erros recorrentes
    try {
      localStorage.removeItem(key);
    } catch (_) {
      // Ignora falha ao remover
    }
    console.error("Erro ao carregar do localStorage", e);
    return [];
  }
};

export function useTrips() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  // Carregar dados ao montar e quando o usuário mudar
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const supabase = getSupabase();
      if (!supabase) {
        setError('Supabase não configurado. Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.');
        setTrips(loadFromLocalStorage("trips"));
        setVehicles([]);
        setLoading(false);
        return;
      }

      // Helper para detectar ausência da coluna user_id
      const missingUserId = (err: any) =>
        !!err && (err.code === "42703" || String(err.message || "").includes("user_id"));

      try {
        // Usuário não autenticado → priorizar dados locais
        if (!user?.id) {
          setTrips(loadFromLocalStorage("trips"));
          setVehicles([]);
          setLoading(false);
          return;
        }
        // Carregar viagens
        const baseTripsReq = supabase
          .from("trips")
          .select("*")
          .order("created_at", { ascending: false });
        let tripsData: any[] | null = null;
        let tripsError: any = null;
        if (user?.id) {
          const res = await baseTripsReq.eq("user_id", user.id);
          tripsData = res.data;
          tripsError = res.error;
          if (tripsError && missingUserId(tripsError)) {
            // Fallback sem filtro por usuário
            const retry = await baseTripsReq;
            tripsData = retry.data;
            tripsError = retry.error;
          }
        } else {
          const res = await baseTripsReq;
          tripsData = res.data;
          tripsError = res.error;
        }

        if (tripsError) throw tripsError;

        // Carregar paradas para cada viagem e converter snake_case para camelCase
        const tripsWithStops = await Promise.all(
          (tripsData || []).map(async (tripData: any) => {
            const { data: stops, error: stopsError } =
              await supabase
                .from("stops")
                .select("*")
                .eq("trip_id", tripData.id)
                .order("arrival_date", { ascending: true })
                .order("arrival_time", { ascending: true });

            if (stopsError)
              console.warn(
                "Erro ao carregar paradas:",
                stopsError,
              );
            
            // Converter snake_case para camelCase
            const trip: Trip = {
              id: tripData.id,
              name: tripData.name,
              departureLocation: tripData.departure_location,
              departureCoords: tripData.departure_coords,
              departureDate: tripData.departure_date,
              departureTime: tripData.departure_time,
              arrivalLocation: tripData.arrival_location,
              arrivalCoords: tripData.arrival_coords,
              arrivalDate: tripData.arrival_date,
              arrivalTime: tripData.arrival_time,
              startKm: tripData.start_km,
              endKm: tripData.end_km,
              details: tripData.details,
              status: tripData.status,
              isDriving: tripData.is_driving ?? false,
              hasVehicle: tripData.has_vehicle,
              vehicleIds: tripData.vehicle_ids,
              created_at: tripData.created_at,
              updated_at: tripData.updated_at,
              stops: (stops || []).map((s: any) => ({
                id: s.id,
                tripId: s.trip_id,
                name: s.name,
                stopType: s.stop_type,
                wasDriving: s.was_driving,
                location: s.location,
                place: s.place,
                placeDetail: s.place_detail,
                arrivalKm: s.arrival_km,
                departureKm: s.departure_km,
                arrivalDate: s.arrival_date,
                arrivalTime: s.arrival_time,
                departureDate: s.departure_date,
                departureTime: s.departure_time,
                reasons: s.reasons,
                otherReason: s.other_reason,
                cost: s.cost / 100, // Converter centavos para reais
                notes: s.notes,
                photoUrls: s.photo_urls,
                costDetails: s.cost_details || [],
                createdAt: s.created_at,
              }))
            };
            return trip;
          }),
        );

        // Carregar veículos e converter snake_case para camelCase
        const baseVehiclesReq = supabase
          .from("vehicles")
          .select("*")
          .order("created_at", { ascending: false });
        let vehiclesData: any[] | null = null;
        let vehiclesError: any = null;
        if (user?.id) {
          const resV = await baseVehiclesReq.eq("user_id", user.id);
          vehiclesData = resV.data;
          vehiclesError = resV.error;
          if (vehiclesError && missingUserId(vehiclesError)) {
            // Fallback sem filtro apenas se a coluna não existir
            const retryV = await baseVehiclesReq;
            vehiclesData = retryV.data;
            vehiclesError = retryV.error;
          }
        } else {
          // Usuário não autenticado: não carregar veículos (apenas nuvem)
          vehiclesData = [];
          vehiclesError = null;
        }

        if (vehiclesError) throw vehiclesError;

        const vehicles: Vehicle[] = (vehiclesData || []).map((v: any) => ({
          id: v.id,
          nickname: v.nickname,
          category: v.category,
          make: v.make,
          model: v.model,
          color: v.color,
          year: v.year,
          licensePlate: v.license_plate,
          vehicleType: v.vehicle_type,
          kmInitial: v.km_initial,
          fuels: v.fuels,
          photoUrl: v.photo_url ?? null,
          photoPath: v.photo_path ?? null,
          active: (typeof v.active === 'boolean') ? v.active : true,
          created_at: v.created_at,
          updated_at: v.updated_at,
        }));

        // Exibir dados independente de autenticação quando coluna user_id não existir
        // Se autenticado e coluna existir, dados já vieram filtrados acima.
        setTrips(tripsWithStops || []);
        setVehicles(vehicles || []);
      } catch (err: any) {
        console.error("Erro ao carregar do Supabase:", err);
        setTrips(loadFromLocalStorage("trips"));
        setVehicles([]);
        setError(
          "Falha ao carregar dados da nuvem. Usando dados locais.",
        );
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user?.id]);

  // Ouvir atualizações de localStorage para sincronizar listas sem reload
  useEffect(() => {
    const handler = (e: any) => {
      const key = e?.detail?.key;
      if (key === "trips") {
        setTrips(loadFromLocalStorage("trips"));
      }
    };
    window.addEventListener("ls:update", handler as EventListener);
    return () => window.removeEventListener("ls:update", handler as EventListener);
  }, []);

  // Salvar viagem
  const saveTrip = async (
    trip: Omit<Trip, "id">,
  ): Promise<Trip> => {
    const supabase = getSupabase();
    const newTrip = { ...trip, id: safeRandomUUID() };
    if (!supabase) throw new Error('Serviço indisponível. Supabase não configurado.');

    try {
      // Se autenticado, tentamos salvar com user_id; caso contrário tentamos sem
      // Converter camelCase para snake_case
      const tripData = {
        id: newTrip.id,
        ...(user?.id ? { user_id: user.id } : {}),
        name: newTrip.name,
        departure_location: newTrip.departureLocation,
        departure_coords: newTrip.departureCoords,
        departure_date: newTrip.departureDate,
        departure_time: newTrip.departureTime,
        arrival_location: newTrip.arrivalLocation,
        arrival_coords: newTrip.arrivalCoords,
        arrival_date: newTrip.arrivalDate,
        arrival_time: newTrip.arrivalTime,
        start_km: newTrip.startKm,
        end_km: newTrip.endKm,
        details: newTrip.details,
        status: newTrip.status,
        has_vehicle: newTrip.hasVehicle,
        vehicle_ids: newTrip.vehicleIds,
      };
      // Tenta inserir; se a coluna user_id não existir, reenvia sem ela
      let ins = await supabase
        .from("trips")
        .insert([tripData])
        .select()
        .single();
      if (ins.error && (ins.error.code === "42703" || String(ins.error.message || "").includes("user_id"))) {
        const { user_id, ...noUser } = tripData as any;
        ins = await supabase
          .from("trips")
          .insert([noUser])
          .select()
          .single();
      }

      if (ins.error) throw ins.error;

      // Converter resposta de volta para camelCase
      const savedTrip: Trip = {
        id: ins.data.id,
        name: ins.data.name,
        departureLocation: ins.data.departure_location,
        departureCoords: ins.data.departure_coords,
        departureDate: ins.data.departure_date,
        departureTime: ins.data.departure_time,
        arrivalLocation: ins.data.arrival_location,
        arrivalCoords: ins.data.arrival_coords,
        arrivalDate: ins.data.arrival_date,
        arrivalTime: ins.data.arrival_time,
        startKm: ins.data.start_km,
        endKm: ins.data.end_km,
        details: ins.data.details,
        status: ins.data.status,
        hasVehicle: ins.data.has_vehicle,
        vehicleIds: ins.data.vehicle_ids,
        created_at: ins.data.created_at,
        updated_at: ins.data.updated_at,
        stops: [],
      };

      const updatedTrips = [savedTrip, ...trips];
      setTrips(updatedTrips);
      // Não escrever em localStorage após sucesso no Supabase para evitar redundância
      return savedTrip;
    } catch (err: any) {
      console.error("Erro ao salvar viagem no Supabase:", err);
      throw new Error("Falha ao salvar viagem na nuvem.");
    }
  };

  // Atualizar viagem
  const updateTrip = async (
    id: string,
    updates: Partial<Trip>,
  ): Promise<Trip> => {
    const supabase = getSupabase();

    if (!supabase) throw new Error('Serviço indisponível. Supabase não configurado.');

    try {
      // Converter camelCase para snake_case
      const updateData: any = {};
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.departureLocation !== undefined) updateData.departure_location = updates.departureLocation;
      if (updates.departureCoords !== undefined) updateData.departure_coords = updates.departureCoords;
      if (updates.departureDate !== undefined) updateData.departure_date = updates.departureDate;
      if (updates.departureTime !== undefined) updateData.departure_time = updates.departureTime;
      if (updates.arrivalLocation !== undefined) updateData.arrival_location = updates.arrivalLocation;
      if (updates.arrivalCoords !== undefined) updateData.arrival_coords = updates.arrivalCoords;
      if (updates.arrivalDate !== undefined) updateData.arrival_date = updates.arrivalDate;
      if (updates.arrivalTime !== undefined) updateData.arrival_time = updates.arrivalTime;
      if (updates.startKm !== undefined) updateData.start_km = updates.startKm;
      if (updates.endKm !== undefined) updateData.end_km = updates.endKm;
      if (updates.details !== undefined) updateData.details = updates.details;
      if (updates.status !== undefined) updateData.status = updates.status;
      if (updates.isDriving !== undefined) updateData.is_driving = updates.isDriving;
      if (updates.hasVehicle !== undefined) updateData.has_vehicle = updates.hasVehicle;
      if (updates.vehicleIds !== undefined) updateData.vehicle_ids = updates.vehicleIds;

      const baseUpdateTripsReq = supabase
        .from("trips")
        .update(updateData)
        .eq("id", id);
      let updRes = await (user?.id
        ? baseUpdateTripsReq.eq("user_id", user.id).select().single()
        : baseUpdateTripsReq.select().single());
      if (updRes.error && (updRes.error.code === "42703" || String(updRes.error.message || "").includes("user_id"))) {
        // Fallback sem filtro por user_id
        updRes = await baseUpdateTripsReq.select().single();
      }

      if (updRes.error) throw updRes.error;

      // Converter resposta de volta para camelCase
      const updatedTrip: Trip = {
        id: updRes.data.id,
        name: updRes.data.name,
        departureLocation: updRes.data.departure_location,
        departureCoords: updRes.data.departure_coords,
        departureDate: updRes.data.departure_date,
        departureTime: updRes.data.departure_time,
        arrivalLocation: updRes.data.arrival_location,
        arrivalCoords: updRes.data.arrival_coords,
        arrivalDate: updRes.data.arrival_date,
        arrivalTime: updRes.data.arrival_time,
        startKm: updRes.data.start_km,
        endKm: updRes.data.end_km,
        details: updRes.data.details,
        status: updRes.data.status,
        isDriving: updRes.data.is_driving ?? false,
        hasVehicle: updRes.data.has_vehicle,
        vehicleIds: updRes.data.vehicle_ids,
        created_at: updRes.data.created_at,
        updated_at: updRes.data.updated_at,
        stops: trips.find(t => t.id === id)?.stops || [],
      };

      const updatedTrips = trips.map((t) =>
        t.id === id ? updatedTrip : t,
      );
      setTrips(updatedTrips);
      return updatedTrip;
    } catch (err: any) {
      console.error(
        "Erro ao atualizar viagem no Supabase:",
        err,
      );
      throw new Error("Falha ao atualizar viagem na nuvem.");
    }
  };

  // Deletar viagem
  const deleteTrip = async (id: string): Promise<void> => {
    const supabase = getSupabase();

    if (!supabase) throw new Error('Serviço indisponível. Supabase não configurado.');

    try {
      const { error } = await supabase
        .from("trips")
        .delete()
        .eq("id", id);
      if (error) throw error;

      const updatedTrips = trips.filter((t) => t.id !== id);
      setTrips(updatedTrips);
    } catch (err: any) {
      console.error("Erro ao deletar viagem no Supabase:", err);
      throw new Error("Falha ao deletar viagem na nuvem.");
    }
  };

  // Salvar veículo
  const saveVehicle = async (
    vehicle: Omit<Vehicle, "id">,
  ): Promise<Vehicle> => {
    const supabase = getSupabase();
      const newVehicle = { ...vehicle, id: safeRandomUUID(), active: vehicle.active ?? true };

    if (!supabase || !user?.id) throw new Error('É necessário estar autenticado e com Supabase configurado para salvar veículos.');

    try {
      // Converter camelCase para snake_case
      const vehicleData = {
        id: newVehicle.id,
        user_id: user.id,
        nickname: newVehicle.nickname,
        category: newVehicle.category,
        make: newVehicle.make,
        model: newVehicle.model,
        color: newVehicle.color,
        year: newVehicle.year,
        license_plate: newVehicle.licensePlate,
        vehicle_type: newVehicle.vehicleType,
        km_initial: newVehicle.kmInitial,
        fuels: newVehicle.fuels,
        photo_url: newVehicle.photoUrl ?? null,
        photo_path: newVehicle.photoPath ?? null,
        active: newVehicle.active ?? true,
      };
      let vins = await supabase
        .from("vehicles")
        .insert([vehicleData])
        .select()
        .single();

      if (vins.error) throw vins.error;

      // Converter resposta de volta para camelCase
      const savedVehicle: Vehicle = {
        id: vins.data.id,
        nickname: vins.data.nickname,
        category: vins.data.category,
        make: vins.data.make,
        model: vins.data.model,
        color: vins.data.color,
        year: vins.data.year,
        licensePlate: vins.data.license_plate,
        vehicleType: vins.data.vehicle_type,
        kmInitial: vins.data.km_initial,
        fuels: vins.data.fuels,
        photoUrl: vins.data.photo_url ?? null,
        photoPath: vins.data.photo_path ?? null,
        active: (typeof vins.data.active === 'boolean') ? vins.data.active : true,
        created_at: vins.data.created_at,
        updated_at: vins.data.updated_at,
      };

      const updatedVehicles = [savedVehicle, ...vehicles];
      setVehicles(updatedVehicles);
      return savedVehicle;
    } catch (err: any) {
      console.error("Erro ao salvar veículo no Supabase:", err);
      throw new Error('Falha ao salvar veículo na nuvem.');
    }
  };

  // Atualizar veículo
  const updateVehicle = async (
    id: string,
    updates: Partial<Vehicle>,
  ): Promise<Vehicle> => {
    const supabase = getSupabase();
    if (!supabase) {
      throw new Error("Serviço indisponível. Supabase não configurado.");
    }
    if (!user?.id) {
      throw new Error("É necessário estar autenticado para atualizar veículos.");
    }

    try {
      const updateData: any = {};
      if (updates.nickname !== undefined) updateData.nickname = updates.nickname;
      if (updates.category !== undefined) updateData.category = updates.category;
      if (updates.make !== undefined) updateData.make = updates.make;
      if (updates.model !== undefined) updateData.model = updates.model;
      if (updates.color !== undefined) updateData.color = updates.color;
      if (updates.year !== undefined) updateData.year = updates.year;
      if (updates.licensePlate !== undefined) updateData.license_plate = updates.licensePlate;
      if (updates.vehicleType !== undefined) updateData.vehicle_type = updates.vehicleType;
      if (updates.kmInitial !== undefined) updateData.km_initial = updates.kmInitial;
      if (updates.fuels !== undefined) updateData.fuels = updates.fuels;
      if (updates.photoUrl !== undefined) updateData.photo_url = updates.photoUrl;
      if (updates.photoPath !== undefined) updateData.photo_path = updates.photoPath;
      if (updates.active !== undefined) updateData.active = updates.active;

      const baseUpdateVehiclesReq = supabase
        .from("vehicles")
        .update(updateData)
        .eq("id", id);
      let vupd = await (user?.id
        ? baseUpdateVehiclesReq.eq("user_id", user.id).select().single()
        : baseUpdateVehiclesReq.select().single());
      if (vupd.error && (vupd.error.code === "42703" || String(vupd.error.message || "").includes("user_id"))) {
        vupd = await baseUpdateVehiclesReq.select().single();
      }

      if (vupd.error) throw vupd.error;

      const updatedVehicle: Vehicle = {
        id: vupd.data.id,
        nickname: vupd.data.nickname,
        category: vupd.data.category,
        make: vupd.data.make,
        model: vupd.data.model,
        color: vupd.data.color,
        year: vupd.data.year,
        licensePlate: vupd.data.license_plate,
        vehicleType: vupd.data.vehicle_type,
        kmInitial: vupd.data.km_initial,
        fuels: vupd.data.fuels,
        photoUrl: vupd.data.photo_url ?? null,
        photoPath: vupd.data.photo_path ?? null,
        active: (typeof vupd.data.active === 'boolean') ? vupd.data.active : true,
        created_at: vupd.data.created_at,
        updated_at: vupd.data.updated_at,
      };

      const updatedVehicles = vehicles.map((v) =>
        v.id === id ? updatedVehicle : v,
      );
      setVehicles(updatedVehicles);
      return updatedVehicle;
    } catch (err: any) {
      console.error("Erro ao atualizar veículo no Supabase:", err);
      throw new Error("Falha ao atualizar veículo na nuvem.");
    }
  };

  // Deletar veículo
  const deleteVehicle = async (id: string): Promise<void> => {
    // Guardas de negócio: não permitir exclusão se veículo estiver vinculado a viagens/paradas
    const linkedTrips = trips.filter((t) => (t.vehicleIds || []).includes(id));
    const hasDrivingStops = linkedTrips.some((t) => (t.stops || []).some((s) => Boolean(s.wasDriving)));
    const segments = loadFromLocalStorage("trip_vehicle_segments") || [];
    const hasSegments = segments.some((seg: any) => seg.vehicleId === id);
    if (linkedTrips.length > 0 && (hasDrivingStops || hasSegments)) {
      throw new Error(
        "Não é possível excluir o veículo: há viagens/paradas vinculadas a ele. Remova o vínculo e ajuste as paradas antes."
      );
    }

    const supabase = getSupabase();

    // Tenta remover a foto do Storage se houver caminho salvo
    try {
      if (supabase) {
        const v = vehicles.find((vv) => vv.id === id);
        const path = v?.photoPath || null;
        if (path && user?.id) {
          const { error: rmError } = await supabase.storage
            .from("trip-photos")
            .remove([path]);
          if (rmError) {
            console.warn("Falha ao remover foto do Storage:", rmError);
          }
        }
      }
    } catch (e) {
      console.warn("Exceção ao remover foto do Storage:", e);
    }

    if (!supabase) {
      throw new Error("Serviço indisponível. Supabase não configurado.");
    }

    try {
      const baseDeleteReq = supabase.from("vehicles").delete().eq("id", id);
      let delRes = await (user?.id ? baseDeleteReq.eq("user_id", user.id) : baseDeleteReq);
      if (delRes.error && (delRes.error.code === "42703" || String(delRes.error.message || "").includes("user_id"))) {
        delRes = await baseDeleteReq;
      }
      if (delRes.error) throw delRes.error;

      const updated = vehicles.filter((v) => v.id !== id);
      setVehicles(updated);
    } catch (err: any) {
      console.error("Erro ao deletar veículo no Supabase:", err);
      throw new Error("Falha ao deletar veículo na nuvem.");
    }
  };

  // 👇 Nova função: salvar parada
  const saveStop = async (
    stop: Omit<Stop, "id" | "createdAt">,
  ): Promise<Stop> => {
    const supabase = getSupabase();
    const newStop = {
      ...stop,
      id: safeRandomUUID(),
      createdAt: new Date().toISOString(),
    };

    if (!supabase) {
      // Fallback: atualizar no localStorage (preservar costDetails no cliente)
      const updatedTrips = trips.map((trip) =>
        trip.id === stop.tripId
          ? { ...trip, stops: [...(trip.stops || []), { ...newStop, costDetails: (stop as any).costDetails || [] }] }
          : trip,
      );
      saveToLocalStorage("trips", updatedTrips);
      setTrips(updatedTrips);
      return { ...newStop, costDetails: (stop as any).costDetails || [] } as Stop;
    }

    try {
      // Converter custo de reais (cliente) para centavos (persistência)
      const costInCents = Math.round((stop.cost ?? 0) * 100);

      // Encontrar viagem e calcular impactos de dirigir/quilometragem
      const trip = trips.find((t) => t.id === stop.tripId);
      const wasDriving = !!stop.wasDriving;
      const effectiveArrivalKm = stop.arrivalKm ?? null;
      const effectiveDepartureKm = stop.departureKm ?? null;
      const latestKmForUpdate = effectiveDepartureKm ?? effectiveArrivalKm ?? null;

      // Se marcou "Dirigindo?" e a viagem ainda não está como dirigindo, ativar
      if (wasDriving && trip && !trip.isDriving) {
        try {
          await updateTrip(trip.id, { isDriving: true });
        } catch (e) {
          console.warn("Falha ao ativar isDriving na viagem:", e);
        }
      }

      // Payload completo com colunas novas (place, place_detail, stop_type, was_driving)
      const fullPayload: any = {
        trip_id: stop.tripId,
        name: stop.name,
        stop_type: stop.stopType ?? "stop",
        was_driving: wasDriving,
        location: stop.location,
        place: stop.place,
        place_detail: stop.placeDetail,
        arrival_km: stop.arrivalKm,
        departure_km: stop.departureKm,
        arrival_date: stop.arrivalDate,
        arrival_time: stop.arrivalTime,
        departure_date: stop.departureDate,
        departure_time: stop.departureTime,
        reasons: stop.reasons,
        other_reason: stop.otherReason,
        cost: costInCents,
        notes: stop.notes,
        photo_urls: stop.photoUrls,
        cost_details: (stop as any).costDetails || null,
      };

      // Payload base compatível com schema antigo (sem colunas novas)
      const basePayload: any = {
        trip_id: stop.tripId,
        name: stop.name,
        location: stop.location,
        arrival_km: stop.arrivalKm,
        departure_km: stop.departureKm,
        arrival_date: stop.arrivalDate,
        arrival_time: stop.arrivalTime,
        departure_date: stop.departureDate,
        departure_time: stop.departureTime,
        reasons: stop.reasons,
        other_reason: stop.otherReason,
        cost: costInCents,
        notes: stop.notes,
        photo_urls: stop.photoUrls,
      };

      let insRes = await supabase
        .from("stops")
        .insert([fullPayload])
        .select()
        .single();

      // Fallback se coluna não existir no schema (PGRST204 / 42703)
      if (insRes.error && (
        insRes.error.code === "PGRST204" ||
        insRes.error.code === "42703" ||
        insRes.error.code === "400" ||
        String(insRes.error.message || "").toLowerCase().includes("schema cache") ||
        String(insRes.error.message || "").toLowerCase().includes("column") ||
        String(insRes.error.message || "").toLowerCase().includes("bad request")
      )) {
        console.warn("Schema de stops sem colunas novas. Tentando com payload base.", insRes.error);
        insRes = await supabase
          .from("stops")
          .insert([basePayload])
          .select()
          .single();
      }

      if (insRes.error) throw insRes.error;

      // Atualizar estado local (converter snake_case -> camelCase e manter custo em centavos)
      const toCamelStop = (row: any): Stop => ({
        id: row.id,
        tripId: row.trip_id,
        name: row.name,
        stopType: row.stop_type ?? undefined,
        wasDriving: row.was_driving ?? false,
        location: row.location ?? null,
        place: row.place ?? undefined,
        placeDetail: row.place_detail ?? undefined,
        arrivalKm: row.arrival_km ?? null,
        departureKm: row.departure_km ?? null,
        arrivalDate: row.arrival_date,
        arrivalTime: row.arrival_time,
        departureDate: row.departure_date ?? undefined,
        departureTime: row.departure_time ?? undefined,
        reasons: row.reasons ?? [],
        otherReason: row.other_reason ?? undefined,
        // Converter centavos (persistência) para reais (cliente)
        cost: (typeof row.cost === 'number' ? row.cost / 100 : 0),
        notes: row.notes ?? undefined,
        photoUrls: row.photo_urls ?? [],
        costDetails: row.cost_details || [],
        createdAt: row.created_at ?? new Date().toISOString(),
      });

      const newStopCamel = toCamelStop(insRes.data);
      // Preservar detalhes de custo no cliente
      (newStopCamel as any).costDetails = (stop as any).costDetails || [];

      const updatedTrips = trips.map((trip) =>
        trip.id === stop.tripId
          ? {
              ...trip,
              stops: [ ...(trip.stops || []), newStopCamel ],
            }
          : trip,
      );

      // Se foi dirigindo: garantir veículo vinculado e atualizar Km atual do segmento
      if (wasDriving && latestKmForUpdate !== null) {
        const currentTrip = updatedTrips.find((t) => t.id === stop.tripId);
        const candidateVehicleId = (currentTrip?.vehicleIds && currentTrip.vehicleIds[0]) || (vehicles[0]?.id ?? null);
        if (candidateVehicleId) {
          try {
            // Vincular se não estiver vinculado
            const alreadyLinked = !!currentTrip?.vehicleIds?.includes(candidateVehicleId);
            if (!alreadyLinked) {
              await linkVehicleToTrip(stop.tripId, candidateVehicleId, currentTrip?.startKm ?? latestKmForUpdate);
              // Atualiza estado local: adiciona veículo vinculado
              const tripIdx = updatedTrips.findIndex((t) => t.id === stop.tripId);
              if (tripIdx >= 0) {
                const vt = updatedTrips[tripIdx];
                updatedTrips[tripIdx] = {
                  ...vt,
                  vehicleIds: [...(vt.vehicleIds || []), candidateVehicleId],
                  hasVehicle: true,
                };
              }
            }
            await updateTripVehicleCurrentKm(stop.tripId, candidateVehicleId, Number(latestKmForUpdate));
          } catch (e) {
            console.warn("Falha ao atualizar Km do segmento:", e);
          }
        }
      }

      setTrips(updatedTrips);
      saveToLocalStorage("trips", updatedTrips);
      return newStopCamel;
    } catch (err: any) {
      console.error("Erro ao salvar parada:", err);
      const updatedTrips = trips.map((trip) =>
        trip.id === stop.tripId
          ? { ...trip, stops: [...(trip.stops || []), newStop] }
          : trip,
      );
      saveToLocalStorage("trips", updatedTrips);
      setTrips(updatedTrips);
      throw new Error(
        "Falha ao salvar parada. Dados salvos localmente.",
      );
    }
  };

  // 👇 Nova função: atualizar parada
  const updateStop = async (
    id: string,
    updates: Partial<Stop>,
  ): Promise<Stop> => {
    const supabase = getSupabase();

    if (!supabase) {
      const updatedTrips = trips.map((trip) => ({
        ...trip,
        stops: (trip.stops || []).map((stop) =>
          stop.id === id
            ? {
                ...stop,
                ...updates,
                // Preservar/atualizar costDetails localmente
                costDetails:
                  (updates as any).costDetails !== undefined
                    ? (updates as any).costDetails
                    : (stop as any).costDetails || [],
              }
            : stop,
        ),
      }));
      saveToLocalStorage("trips", updatedTrips);
      setTrips(updatedTrips);
      // Recalcular KM atual do veículo (offline) após editar parada
      try {
        const tripOfStop = updatedTrips.find((t) => (t.stops || []).some((s) => s.id === id));
        if (tripOfStop) {
          const nextStops = [...(tripOfStop.stops || [])].sort((a: any, b: any) => {
            const parse = (s: any) => {
              const d = s.arrivalDate;
              const t = s.arrivalTime;
              if (d && t) {
                const [yyyy, mm, dd] = d.includes('/') ? d.split('/').reverse().map(Number) : d.split('-').map(Number);
                const [hh, mi] = String(t).split(':').map(Number);
                return new Date(yyyy, (mm - 1), dd, hh, mi).getTime();
              }
              return s.created_at ? new Date(s.created_at).getTime() : 0;
            };
            return parse(a) - parse(b);
          });
          let prevKm = tripOfStop.startKm ?? 0;
          for (const s of nextStops) {
            const arr = typeof s.arrivalKm === 'number' ? s.arrivalKm : prevKm;
            const dep = typeof s.departureKm === 'number' ? s.departureKm : null;
            prevKm = dep !== null && typeof dep === 'number' && dep >= (arr ?? prevKm) ? dep : (arr ?? prevKm);
          }
          const vehicleId = (tripOfStop.vehicleIds && tripOfStop.vehicleIds[0]) || (vehicles[0]?.id ?? null);
          if (vehicleId) {
            await updateTripVehicleCurrentKm(tripOfStop.id, vehicleId, Number(prevKm ?? 0));
          }
        }
      } catch (e) {
        console.warn('Falha ao recalcular KM atual do veículo (offline) após editar parada:', e);
      }
      return updatedTrips
        .flatMap((t) => t.stops || [])
        .find((s) => s.id === id)!;
    }

    try {
      // Converter custo de reais (cliente) para centavos (persistência)
      const costInCents = updates.cost !== undefined ? Math.round(updates.cost * 100) : undefined;

      // Montar payload completo (colunas novas) e payload base (compatível com schema antigo)
      const fullPayload: any = {
        name: updates.name,
        stop_type: updates.stopType,
        was_driving: updates.wasDriving,
        location: updates.location,
        place: updates.place,
        place_detail: updates.placeDetail,
        arrival_km: updates.arrivalKm,
        departure_km: updates.departureKm,
        arrival_date: updates.arrivalDate,
        arrival_time: updates.arrivalTime,
        departure_date: updates.departureDate,
        departure_time: updates.departureTime,
        reasons: updates.reasons,
        other_reason: updates.otherReason,
        cost: costInCents,
        notes: updates.notes,
        photo_urls: updates.photoUrls,
        cost_details: (updates as any).costDetails,
      };

      const basePayload: any = {
        name: updates.name,
        location: updates.location,
        arrival_km: updates.arrivalKm,
        departure_km: updates.departureKm,
        arrival_date: updates.arrivalDate,
        arrival_time: updates.arrivalTime,
        departure_date: updates.departureDate,
        departure_time: updates.departureTime,
        reasons: updates.reasons,
        other_reason: updates.otherReason,
        cost: costInCents,
        notes: updates.notes,
        photo_urls: updates.photoUrls,
      };

      // Primeiro tenta com o payload completo; se o schema remoto não tiver colunas novas,
      // a API do PostgREST/Supabase pode retornar PGRST204 / 42703. Nesse caso, re-tentamos
      // com o payload base para manter compatibilidade com versões antigas do schema.
      let updRes = await supabase
        .from("stops")
        .update(fullPayload)
        .eq("id", id)
        .select()
        .single();

      if (updRes.error && (
        updRes.error.code === "PGRST204" ||
        updRes.error.code === "42703" ||
        updRes.error.code === "400" ||
        String(updRes.error.message || "").toLowerCase().includes("schema cache") ||
        String(updRes.error.message || "").toLowerCase().includes("column") ||
        String(updRes.error.message || "").toLowerCase().includes("bad request")
      )) {
        console.warn("Schema de stops sem colunas novas. Retentando update com payload compatível.", updRes.error);
        updRes = await supabase
          .from("stops")
          .update(basePayload)
          .eq("id", id)
          .select()
          .single();
      }

      if (updRes.error) throw updRes.error;
      const data = updRes.data;

      // Se foi dirigindo e tem KM, atualizar segmento
      const latestKmForUpdate = (updates.departureKm ?? updates.arrivalKm);
      if (updates.wasDriving && latestKmForUpdate !== undefined && latestKmForUpdate !== null) {
        try {
          const tr = trips.find((t) => (t.stops || []).some((s) => s.id === id));
          const tripId = tr?.id;
          if (tripId) {
            const candidateVehicleId = (tr?.vehicleIds && tr.vehicleIds[0]) || (vehicles[0]?.id ?? null);
            if (candidateVehicleId) {
              await updateTripVehicleCurrentKm(tripId, candidateVehicleId, Number(latestKmForUpdate));
            }
          }
        } catch (e) {
          console.warn("Falha ao atualizar Km do segmento na edição:", e);
        }
      }

      const toCamelStopUpd = (row: any): Stop => ({
        id: row.id,
        tripId: row.trip_id,
        name: row.name,
        stopType: row.stop_type ?? undefined,
        wasDriving: row.was_driving ?? false,
        location: row.location ?? null,
        place: row.place ?? undefined,
        placeDetail: row.place_detail ?? undefined,
        arrivalKm: row.arrival_km ?? null,
        departureKm: row.departure_km ?? null,
        arrivalDate: row.arrival_date,
        arrivalTime: row.arrival_time,
        departureDate: row.departure_date ?? undefined,
        departureTime: row.departure_time ?? undefined,
        reasons: row.reasons ?? [],
        otherReason: row.other_reason ?? undefined,
        // Converter centavos (persistência) para reais (cliente)
        cost: (typeof row.cost === 'number' ? row.cost / 100 : 0),
        notes: row.notes ?? undefined,
        photoUrls: row.photo_urls ?? [],
        costDetails: row.cost_details || [],
        createdAt: row.created_at ?? new Date().toISOString(),
      });

      const updatedTrips = trips.map((trip) => ({
        ...trip,
        stops: (trip.stops || []).map((stop) =>
          stop.id === id
            ? {
                ...(toCamelStopUpd(data) as any),
                costDetails:
                  (updates as any).costDetails !== undefined
                    ? (updates as any).costDetails
                    : (stop as any).costDetails || [],
              }
            : stop,
        ),
      }));

      setTrips(updatedTrips);
      saveToLocalStorage("trips", updatedTrips);
      // Recalcular KM atual do veículo após editar parada (online)
      try {
        const tripOfStop = updatedTrips.find((t) => (t.stops || []).some((s) => s.id === id));
        if (tripOfStop) {
          const nextStops = [...(tripOfStop.stops || [])].sort((a: any, b: any) => {
            const parse = (s: any) => {
              const d = s.arrivalDate;
              const t = s.arrivalTime;
              if (d && t) {
                const [yyyy, mm, dd] = d.includes('/') ? d.split('/').reverse().map(Number) : d.split('-').map(Number);
                const [hh, mi] = String(t).split(':').map(Number);
                return new Date(yyyy, (mm - 1), dd, hh, mi).getTime();
              }
              return s.created_at ? new Date(s.created_at).getTime() : 0;
            };
            return parse(a) - parse(b);
          });
          let prevKm = tripOfStop.startKm ?? 0;
          for (const s of nextStops) {
            const arr = typeof s.arrivalKm === 'number' ? s.arrivalKm : prevKm;
            const dep = typeof s.departureKm === 'number' ? s.departureKm : null;
            prevKm = dep !== null && typeof dep === 'number' && dep >= (arr ?? prevKm) ? dep : (arr ?? prevKm);
          }
          const vehicleId = (tripOfStop.vehicleIds && tripOfStop.vehicleIds[0]) || (vehicles[0]?.id ?? null);
          if (vehicleId) {
            await updateTripVehicleCurrentKm(tripOfStop.id, vehicleId, Number(prevKm ?? 0));
          }
        }
      } catch (e) {
        console.warn('Falha ao recalcular KM atual do veículo após editar parada:', e);
      }
      return toCamelStopUpd(data);
    } catch (err: any) {
      console.error("Erro ao atualizar parada:", err);
      const updatedTrips = trips.map((trip) => ({
        ...trip,
        stops: (trip.stops || []).map((stop) =>
          stop.id === id ? { ...stop, ...updates } : stop,
        ),
      }));
      saveToLocalStorage("trips", updatedTrips);
      setTrips(updatedTrips);
      throw new Error(
        "Falha ao atualizar parada. Alterações salvas localmente.",
      );
    }
  };

  // 👇 Nova função: deletar parada
  const deleteStop = async (id: string): Promise<void> => {
    const supabase = getSupabase();

    if (!supabase) {
      // Remover localmente
      // Identificar viagem e veículo principal para restaurar KM atual do segmento
      const tripOfStop = trips.find((t) => (t.stops || []).some((s) => s.id === id));
      const updatedTrips = trips.map((trip) => ({
        ...trip,
        stops: (trip.stops || []).filter((s) => s.id !== id),
      }));
      if (tripOfStop) {
        try {
          const remainingStops = (tripOfStop.stops || []).filter((s) => s.id !== id);
          remainingStops.sort((a: any, b: any) => {
            const parse = (s: any) => {
              const d = s.arrivalDate;
              const t = s.arrivalTime;
              if (d && t) {
                const [yyyy, mm, dd] = d.includes('/') ? d.split('/').reverse().map(Number) : d.split('-').map(Number);
                const [hh, mi] = String(t).split(':').map(Number);
                return new Date(yyyy, (mm - 1), dd, hh, mi).getTime();
              }
              return s.created_at ? new Date(s.created_at).getTime() : 0;
            };
            return parse(a) - parse(b);
          });
          let prevKm = tripOfStop.startKm ?? 0;
          for (const s of remainingStops) {
            const arr = typeof s.arrivalKm === 'number' ? s.arrivalKm : prevKm;
            const dep = typeof s.departureKm === 'number' ? s.departureKm : null;
            prevKm = dep !== null && typeof dep === 'number' && dep >= (arr ?? prevKm) ? dep : (arr ?? prevKm);
          }
          const vehicleId = (tripOfStop.vehicleIds && tripOfStop.vehicleIds[0]) || (vehicles[0]?.id ?? null);
          if (vehicleId) {
            await updateTripVehicleCurrentKm(tripOfStop.id, vehicleId, Number(prevKm ?? 0));
          }
        } catch (e) {
          console.warn('Falha ao restaurar KM atual do segmento após deletar parada:', e);
        }
      }
      saveToLocalStorage("trips", updatedTrips);
      setTrips(updatedTrips);
      return;
    }

    try {
      const { error } = await supabase
        .from("stops")
        .delete()
        .eq("id", id);
      if (error) throw error;

      const updatedTrips = trips.map((trip) => ({
        ...trip,
        stops: (trip.stops || []).filter((s) => s.id !== id),
      }));
      saveToLocalStorage("trips", updatedTrips);
      setTrips(updatedTrips);
    } catch (err: any) {
      console.error("Erro ao deletar parada:", err);
      // Remover localmente mesmo assim
      const updatedTrips = trips.map((trip) => ({
        ...trip,
        stops: (trip.stops || []).filter((s) => s.id !== id),
      }));
      saveToLocalStorage("trips", updatedTrips);
      setTrips(updatedTrips);
      throw new Error("Falha ao deletar parada. Alterações salvas localmente.");
    }
  };

  // Carregar segmentos por viagem (Supabase -> fallback localStorage)
  const getTripVehicleSegments = async (
    tripId: string,
  ): Promise<TripVehicleSegment[]> => {
    const supabase = getSupabase();
    if (!tripId) return [];

    if (!supabase) {
      const all: TripVehicleSegment[] = loadFromLocalStorage(
        "trip_vehicle_segments",
      );
      return all.filter((s) => s.tripId === tripId);
    }

    try {
      const columnsBasic = `id, trip_id, vehicle_id, segment_date, initial_km, current_km, created_at, updated_at`;

      // Seleciona apenas colunas básicas para evitar 400 quando colunas opcionais não existem
      const basicReq = supabase
        .from("trip_vehicle_segments")
        .select(columnsBasic)
        .eq("trip_id", tripId);
      let res: any = await (user?.id ? basicReq.eq("user_id", user.id) : basicReq);
      // Fallback de filtro user_id ausente (caso coluna não exista)
      if (res?.error && (res.error.code === "42703" || String(res.error.message || "").includes("user_id"))) {
        res = await basicReq;
      }

      if (res?.error) throw res.error;

      let data = (res.data || []).map((row: any) => ({
        id: row.id,
        tripId: row.trip_id,
        vehicleId: row.vehicle_id,
        segmentDate: row.segment_date,
        initialKm: row.initial_km,
        currentKm: row.current_km,
        tankFull: typeof row.tank_full === "boolean" ? row.tank_full : undefined,
        isInitial: typeof row.is_initial === "boolean" ? row.is_initial : undefined,
        created_at: row.created_at,
        updated_at: row.updated_at,
      }));

      // Mescla flags do localStorage se existir (coerência em ambientes sem coluna Supabase)
      const localAll: TripVehicleSegment[] = loadFromLocalStorage(
        "trip_vehicle_segments",
      );
      let merged = (data as TripVehicleSegment[]).map((seg) => {
        const localMatch = localAll.find((s) => s.id === seg.id);
        let next = seg;
        if (localMatch && typeof localMatch.tankFull === "boolean") {
          next = { ...next, tankFull: localMatch.tankFull };
        }
        if (localMatch && typeof localMatch.isInitial === "boolean") {
          next = { ...next, isInitial: localMatch.isInitial };
        }
        return next;
      });
      // Fallback: marcar primeiro segmento de cada veículo como inicial, se nenhum marcado
      const byVehicle = new Map<string, TripVehicleSegment[]>();
      merged.forEach((s) => {
        const arr = byVehicle.get(s.vehicleId) || [];
        arr.push(s);
        byVehicle.set(s.vehicleId, arr);
      });
      byVehicle.forEach((arr) => {
        arr.sort((a, b) => {
          const da = new Date(a.segmentDate).getTime();
          const db = new Date(b.segmentDate).getTime();
          if (da !== db) return da - db;
          const ca = a.created_at ? new Date(a.created_at).getTime() : 0;
          const cb = b.created_at ? new Date(b.created_at).getTime() : 0;
          return ca - cb;
        });
        if (!arr.some((s) => s.isInitial === true) && arr.length > 0) {
          arr[0].isInitial = true;
        }
      });
      merged = Array.from(byVehicle.values()).flat();
      return merged;
    } catch (err) {
      console.warn("Falha ao carregar segmentos. Usando localStorage.", err);
      const all: TripVehicleSegment[] = loadFromLocalStorage(
        "trip_vehicle_segments",
      );
      const segs = all.filter((s) => s.tripId === tripId);
      const byVehicleLocal = new Map<string, TripVehicleSegment[]>();
      segs.forEach((s) => {
        const arr = byVehicleLocal.get(s.vehicleId) || [];
        arr.push(s);
        byVehicleLocal.set(s.vehicleId, arr);
      });
      byVehicleLocal.forEach((arr) => {
        arr.sort((a, b) => {
          const da = new Date(a.segmentDate).getTime();
          const db = new Date(b.segmentDate).getTime();
          if (da !== db) return da - db;
          const ca = a.created_at ? new Date(a.created_at).getTime() : 0;
          const cb = b.created_at ? new Date(b.created_at).getTime() : 0;
          return ca - cb;
        });
        if (!arr.some((s) => s.isInitial === true) && arr.length > 0) {
          arr[0].isInitial = true;
        }
      });
      return Array.from(byVehicleLocal.values()).flat();
    }
  };

  // Salvar novo segmento de KM por veículo
  const saveTripVehicleSegment = async (
    input: {
      tripId: string;
      vehicleId: string;
      segmentDate: string; // yyyy-MM-dd
      initialKm: number;
      currentKm: number;
      tankFull?: boolean;
      isInitial?: boolean;
    },
  ): Promise<TripVehicleSegment> => {
    const supabase = getSupabase();
    const newSegment: TripVehicleSegment = {
      id: safeRandomUUID(),
      tripId: input.tripId,
      vehicleId: input.vehicleId,
      segmentDate: input.segmentDate,
      initialKm: input.initialKm,
      currentKm: input.currentKm,
      tankFull: input.tankFull,
      isInitial: input.isInitial,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (!supabase) {
      const all: TripVehicleSegment[] = loadFromLocalStorage(
        "trip_vehicle_segments",
      );
      const updated = [...all, newSegment];
      saveToLocalStorage("trip_vehicle_segments", updated);
      return newSegment;
    }

    try {
      // Primeiro tenta inserir com tank_full e is_initial; se as colunas não existirem, faz fallback sem elas
      let insertObj: any = {
        trip_id: input.tripId,
        vehicle_id: input.vehicleId,
        user_id: user?.id ?? null,
        segment_date: input.segmentDate,
        initial_km: input.initialKm,
        current_km: input.currentKm,
      };
      if (typeof input.tankFull === 'boolean') {
        insertObj.tank_full = input.tankFull;
      }
      if (typeof input.isInitial === 'boolean') {
        insertObj.is_initial = input.isInitial;
      }
      let req = supabase.from("trip_vehicle_segments").insert([insertObj]).select().single();
      let { data, error } = await req;
      if (error && (error.code === '42703' || String(error.message || '').includes('tank_full') || String(error.message || '').includes('is_initial'))) {
        // Fallback sem tank_full/is_initial
        const altReq = supabase.from("trip_vehicle_segments").insert([
          {
            trip_id: input.tripId,
            vehicle_id: input.vehicleId,
            user_id: user?.id ?? null,
            segment_date: input.segmentDate,
            initial_km: input.initialKm,
            current_km: input.currentKm,
          }
        ]).select().single();
        const alt = await altReq;
        data = alt.data;
        error = alt.error;
      }
      
      if (error) throw error;

      const saved: TripVehicleSegment = {
        id: data.id,
        tripId: data.trip_id,
        vehicleId: data.vehicle_id,
        segmentDate: data.segment_date,
        initialKm: data.initial_km,
        currentKm: data.current_km,
        tankFull: typeof insertObj.tank_full === 'boolean' ? insertObj.tank_full : undefined,
        isInitial: typeof data.is_initial === 'boolean' ? data.is_initial : input.isInitial,
        created_at: data.created_at,
        updated_at: data.updated_at,
      };

      // Atualiza fallback local para coerência
      const all: TripVehicleSegment[] = loadFromLocalStorage(
        "trip_vehicle_segments",
      );
      saveToLocalStorage("trip_vehicle_segments", [...all, saved]);

      return saved;
    } catch (err: any) {
      console.error("Erro ao salvar segmento no Supabase:", err);
      // Fallback: salvar localmente
      const all: TripVehicleSegment[] = loadFromLocalStorage(
        "trip_vehicle_segments",
      );
      const updated = [...all, newSegment];
      saveToLocalStorage("trip_vehicle_segments", updated);
      return newSegment;
    }
  };

  // Excluir todos os segmentos de um veículo em uma viagem (cascata)
  const deleteTripVehicleSegments = async (
    tripId: string,
    vehicleId: string,
  ): Promise<void> => {
    const supabase = getSupabase();
    try {
      if (supabase && user?.id) {
        await supabase
          .from("trip_vehicle_segments")
          .delete()
          .eq("trip_id", tripId)
          .eq("vehicle_id", vehicleId)
          .eq("user_id", user.id);
      }
    } catch (e) {
      console.warn("Falha ao excluir segmentos no Supabase. Continuando com local.", e);
    } finally {
      // Atualiza localStorage removendo segmentos desse veículo
      const all: TripVehicleSegment[] = loadFromLocalStorage(
        "trip_vehicle_segments",
      );
      const filtered = all.filter(
        (s) => !(s.tripId === tripId && s.vehicleId === vehicleId),
      );
      saveToLocalStorage("trip_vehicle_segments", filtered);
    }
  };

  // Vincular veículo à viagem (cria registro em trip_vehicles e opcionalmente inicializa KM)
  const linkVehicleToTrip = async (
    tripId: string,
    vehicleId: string,
    initialKm?: number | null,
  ): Promise<void> => {
    const supabase = getSupabase();
    if (!supabase) return; // Sem Supabase, nada a fazer aqui (App já mantém vehicleIds)

    const missingUserId = (err: any) =>
      !!err && (err.code === "42703" || String(err.message || "").includes("user_id"));

    try {
      // 1) Verificar se já existe vínculo (sem filtrar por user_id para evitar 409 por duplicidade)
      const sel = await supabase
        .from("trip_vehicles")
        .select("id")
        .eq("trip_id", tripId)
        .eq("vehicle_id", vehicleId)
        .maybeSingle();

      const existingId = sel.data?.id ?? null;

      // 2) Inserir somente se não existir
      if (!existingId) {
        const insertData: any = {
          trip_id: tripId,
          vehicle_id: vehicleId,
          user_id: user?.id ?? null,
        };
        if (initialKm !== undefined && initialKm !== null) {
          insertData.initial_km = Number(initialKm);
        }
        const ins = await supabase
          .from("trip_vehicles")
          .insert(insertData)
          .select("id")
          .single();
        if (ins.error) throw ins.error;
      } else if (initialKm !== undefined && initialKm !== null) {
        // 3) Se já existe, tentar atualizar initial_km (pode falhar por RLS se o registro não pertencer ao usuário)
        try {
          await supabase
            .from("trip_vehicles")
            .update({ initial_km: Number(initialKm) })
            .eq("id", existingId)
            .select("id")
            .single();
        } catch (e) {
          // Ignorar falha de atualização do campo inicial_km; segmento será inicializado abaixo
          console.warn("Falha ao atualizar initial_km no vínculo existente:", e);
        }
      }

      // Inicializar segmento de KM no dia, se fornecido initialKm
      if (initialKm !== undefined && initialKm !== null) {
        try {
          await updateTripVehicleInitialKm(tripId, vehicleId, Number(initialKm));
        } catch (e) {
          console.warn("Falha ao inicializar segmento de KM:", e);
        }
      }
    } catch (err) {
      console.error("Erro ao vincular veículo à viagem no Supabase:", err);
    }
  };

  // Desvincular veículo da viagem (remove trip_vehicles e segmentos relacionados)
  const unlinkVehicleFromTrip = async (
    tripId: string,
    vehicleId: string,
  ): Promise<void> => {
    const supabase = getSupabase();
    try {
      if (supabase && user?.id) {
        await supabase
          .from("trip_vehicles")
          .delete()
          .eq("trip_id", tripId)
          .eq("vehicle_id", vehicleId)
          .eq("user_id", user.id);
      }
    } catch (e) {
      console.warn("Falha ao remover vínculo trip_vehicles no Supabase:", e);
    } finally {
      // Sempre remover segmentos locais e tentar na nuvem
      await deleteTripVehicleSegments(tripId, vehicleId);
    }
  };

  // Desvincular todos os veículos da viagem (remove todos os trip_vehicles e segmentos)
  const unlinkAllVehiclesFromTrip = async (tripId: string): Promise<void> => {
    const supabase = getSupabase();
    try {
      if (supabase && user?.id) {
        // Remove todos os vínculos desta viagem do usuário
        await supabase
          .from("trip_vehicles")
          .delete()
          .eq("trip_id", tripId)
          .eq("user_id", user.id);
        // Remove todos os segmentos desta viagem do usuário
        await supabase
          .from("trip_vehicle_segments")
          .delete()
          .eq("trip_id", tripId)
          .eq("user_id", user.id);
      }
    } catch (e) {
      console.warn("Falha ao remover todos vínculos trip_vehicles no Supabase:", e);
    }
  };

  // Atualizar Km inicial do veículo na viagem (atualiza o primeiro segmento ou cria)
  const updateTripVehicleInitialKm = async (
    tripId: string,
    vehicleId: string,
    newInitialKm: number,
  ): Promise<void> => {
    const supabase = getSupabase();
    if (!supabase) {
      // Fallback local: atualizar o primeiro segmento ou criar novo
      const all: TripVehicleSegment[] = loadFromLocalStorage(
        "trip_vehicle_segments",
      );
      const sv = all
        .filter((s) => s.tripId === tripId && s.vehicleId === vehicleId)
        .sort((a, b) => {
          const da = new Date(a.segmentDate).getTime();
          const db = new Date(b.segmentDate).getTime();
          if (da !== db) return da - db;
          const ca = a.created_at ? new Date(a.created_at).getTime() : 0;
          const cb = b.created_at ? new Date(b.created_at).getTime() : 0;
          return ca - cb;
        });
      if (sv.length > 0) {
        const firstId = sv[0].id;
        const updated = all.map((s) =>
          s.id === firstId ? { ...s, initialKm: newInitialKm } : s,
        );
        saveToLocalStorage("trip_vehicle_segments", updated);
      } else {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, "0");
        const dd = String(today.getDate()).padStart(2, "0");
        const defaultDate = `${yyyy}-${mm}-${dd}`;
        const newSeg: TripVehicleSegment = {
          id: safeRandomUUID(),
          tripId,
          vehicleId,
          segmentDate: defaultDate,
          initialKm: newInitialKm,
          currentKm: newInitialKm,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        saveToLocalStorage("trip_vehicle_segments", [
          ...all,
          newSeg,
        ]);
      }
      return;
    }

    try {
      // Buscar o primeiro segmento
      const { data, error } = await supabase
        .from("trip_vehicle_segments")
        .select("id")
        .eq("trip_id", tripId)
        .eq("vehicle_id", vehicleId)
        .eq("user_id", user?.id ?? null)
        .order("segment_date", { ascending: true })
        .order("created_at", { ascending: true })
        .limit(1);
      if (error) throw error;
      if (data && data.length > 0) {
        const firstId = data[0].id;
        const upd = await supabase
          .from("trip_vehicle_segments")
          .update({ initial_km: newInitialKm })
          .eq("id", firstId)
          .eq("user_id", user?.id ?? null)
          .select()
          .single();
        if (upd.error) throw upd.error;
      } else {
        // Criar novo segmento com initial=current
        const ins = await supabase
          .from("trip_vehicle_segments")
          .insert([
            {
              trip_id: tripId,
              vehicle_id: vehicleId,
              user_id: user?.id ?? null,
              segment_date: new Date().toISOString().slice(0, 10),
              initial_km: newInitialKm,
              current_km: newInitialKm,
            },
          ]);
        if (ins.error) throw ins.error;
      }
      // Atualiza local para coerência
      const all: TripVehicleSegment[] = loadFromLocalStorage(
        "trip_vehicle_segments",
      );
      const sv = all
        .filter((s) => s.tripId === tripId && s.vehicleId === vehicleId)
        .sort((a, b) => {
          const da = new Date(a.segmentDate).getTime();
          const db = new Date(b.segmentDate).getTime();
          if (da !== db) return da - db;
          const ca = a.created_at ? new Date(a.created_at).getTime() : 0;
          const cb = b.created_at ? new Date(b.created_at).getTime() : 0;
          return ca - cb;
        });
      if (sv.length > 0) {
        const firstId = sv[0].id;
        saveToLocalStorage(
          "trip_vehicle_segments",
          all.map((s) => (s.id === firstId ? { ...s, initialKm: newInitialKm } : s)),
        );
      } else {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, "0");
        const dd = String(today.getDate()).padStart(2, "0");
        const defaultDate = `${yyyy}-${mm}-${dd}`;
        const newSeg: TripVehicleSegment = {
          id: safeRandomUUID(),
          tripId,
          vehicleId,
          segmentDate: defaultDate,
          initialKm: newInitialKm,
          currentKm: newInitialKm,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        saveToLocalStorage("trip_vehicle_segments", [...all, newSeg]);
      }
    } catch (e) {
      console.warn("Falha ao atualizar initial_km no Supabase, salvando local.", e);
      // Fallback para local já tratado acima
    }
  };

  // Atualizar Km atual do veículo na viagem (atualiza o último segmento ou cria)
  const updateTripVehicleCurrentKm = async (
    tripId: string,
    vehicleId: string,
    newCurrentKm: number,
  ): Promise<void> => {
    const supabase = getSupabase();
    if (!supabase) {
      const all: TripVehicleSegment[] = loadFromLocalStorage(
        "trip_vehicle_segments",
      );
      const sv = all
        .filter((s) => s.tripId === tripId && s.vehicleId === vehicleId)
        .sort((a, b) => {
          const da = new Date(a.segmentDate).getTime();
          const db = new Date(b.segmentDate).getTime();
          if (da !== db) return da - db;
          const ca = a.created_at ? new Date(a.created_at).getTime() : 0;
          const cb = b.created_at ? new Date(b.created_at).getTime() : 0;
          return ca - cb;
        });
      if (sv.length > 0) {
        const lastId = sv[sv.length - 1].id;
        const updated = all.map((s) =>
          s.id === lastId ? { ...s, currentKm: newCurrentKm } : s,
        );
        saveToLocalStorage("trip_vehicle_segments", updated);
      } else {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, "0");
        const dd = String(today.getDate()).padStart(2, "0");
        const defaultDate = `${yyyy}-${mm}-${dd}`;
        const newSeg: TripVehicleSegment = {
          id: safeRandomUUID(),
          tripId,
          vehicleId,
          segmentDate: defaultDate,
          initialKm: newCurrentKm,
          currentKm: newCurrentKm,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        saveToLocalStorage("trip_vehicle_segments", [...all, newSeg]);
      }
      return;
    }

    try {
      const { data, error } = await supabase
        .from("trip_vehicle_segments")
        .select("id")
        .eq("trip_id", tripId)
        .eq("vehicle_id", vehicleId)
        .eq("user_id", user?.id ?? null)
        .order("segment_date", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      if (data && data.length > 0) {
        const lastId = data[data.length - 1].id;
        const upd = await supabase
          .from("trip_vehicle_segments")
          .update({ current_km: newCurrentKm })
          .eq("id", lastId)
          .eq("user_id", user?.id ?? null)
          .select()
          .single();
        if (upd.error) throw upd.error;
      } else {
        const ins = await supabase
          .from("trip_vehicle_segments")
          .insert([
            {
              trip_id: tripId,
              vehicle_id: vehicleId,
              user_id: user?.id ?? null,
              segment_date: new Date().toISOString().slice(0, 10),
              initial_km: newCurrentKm,
              current_km: newCurrentKm,
            },
          ]);
        if (ins.error) throw ins.error;
      }
      // Atualiza local
      const all: TripVehicleSegment[] = loadFromLocalStorage(
        "trip_vehicle_segments",
      );
      const sv = all
        .filter((s) => s.tripId === tripId && s.vehicleId === vehicleId)
        .sort((a, b) => {
          const da = new Date(a.segmentDate).getTime();
          const db = new Date(b.segmentDate).getTime();
          if (da !== db) return da - db;
          const ca = a.created_at ? new Date(a.created_at).getTime() : 0;
          const cb = b.created_at ? new Date(b.created_at).getTime() : 0;
          return ca - cb;
        });
      if (sv.length > 0) {
        const lastId = sv[sv.length - 1].id;
        saveToLocalStorage(
          "trip_vehicle_segments",
          all.map((s) => (s.id === lastId ? { ...s, currentKm: newCurrentKm } : s)),
        );
      } else {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, "0");
        const dd = String(today.getDate()).padStart(2, "0");
        const defaultDate = `${yyyy}-${mm}-${dd}`;
        const newSeg: TripVehicleSegment = {
          id: safeRandomUUID(),
          tripId,
          vehicleId,
          segmentDate: defaultDate,
          initialKm: newCurrentKm,
          currentKm: newCurrentKm,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        saveToLocalStorage("trip_vehicle_segments", [...all, newSeg]);
      }
    } catch (e) {
      console.warn("Falha ao atualizar current_km no Supabase, salvando local.", e);
      // Fallback para local já tratado acima
    }
  };

  return {
    trips,
    vehicles,
    loading,
    error,
    saveTrip,
    updateTrip,
    deleteTrip,
    saveVehicle,
    updateVehicle,
    deleteVehicle,
    saveStop, // 👈 exportado
    updateStop, // 👈 exportado
    deleteStop, // 👈 exportado
    getTripVehicleSegments, // 👈 exportado
    saveTripVehicleSegment, // 👈 exportado
    deleteTripVehicleSegments,
    updateTripVehicleInitialKm,
    updateTripVehicleCurrentKm,
    linkVehicleToTrip,
    unlinkVehicleFromTrip,
    unlinkAllVehiclesFromTrip,
  };
}

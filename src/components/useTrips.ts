import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../utils/auth/AuthProvider";
import { supabase } from "../utils/supabase/client";
import { useOnlineStatus } from "../utils/offline/useOnlineStatus";
import { safeRandomUUID } from "../utils/uuid";

export interface Trip {
  id: string;
  name: string;
  departureDate: string;
  departureTime: string;
  departureLocation: string;
  startKm?: number | null;
  endKm?: number | null;
  status: "ongoing" | "completed";
  hasVehicle?: boolean;
  vehicleIds?: string[];
  [key: string]: any; 
}

export interface Vehicle {
  id: string;
  nickname?: string;
  licensePlate?: string;
  photoUrl?: string | null;
  photoPath?: string | null;
  active?: boolean;
  category?: string;
  make?: string;
  model?: string;
  color?: string;
  year?: number;
  vehicleType?: string;
  kmInitial?: number | null;
  fuels?: string[];
  syncStatus?: 'synced' | 'pending' | 'error';
}

export interface Segment {
  id: string;
  tripId: string;
  vehicleId: string;
  initialKm?: number | null;
  currentKm?: number | null;
  segmentDate?: string | null;
  created_at?: string | null;
}

export function useTrips() {
  const { user } = useAuth();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const { online } = useOnlineStatus();
  const [syncing, setSyncing] = useState(false);
  const [syncBackground, setSyncBackground] = useState(false);

  const TRIPS_CACHE = "trips_cache";
  const VEHICLES_CACHE = "vehicles_cache";
  const QUEUE_KEY = "offline_queue_v1";

  type QueueItem =
    | { kind: "trip_insert"; localId: string; payload: any }
    | { kind: "trip_update"; id: string; payload: any }
    | { kind: "trip_delete"; id: string }
    | { kind: "vehicle_insert"; localId: string; payload: any }
    | { kind: "vehicle_update"; id: string; payload: any }
    | { kind: "vehicle_delete"; id: string };

  const readQueue = (): QueueItem[] => {
    try {
      const raw = localStorage.getItem(QUEUE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  };
  const writeQueue = (items: QueueItem[]) => {
    try { localStorage.setItem(QUEUE_KEY, JSON.stringify(items)); } catch {}
  };
  const enqueue = (item: QueueItem) => {
    const items = readQueue();
    items.push(item);
    writeQueue(items);
  };

  const saveCaches = (t: Trip[], v: Vehicle[]) => {
    try { localStorage.setItem(TRIPS_CACHE, JSON.stringify(t)); } catch {}
    try { localStorage.setItem(VEHICLES_CACHE, JSON.stringify(v)); } catch {}
  };
  const loadCaches = () => {
    try {
      const t = JSON.parse(localStorage.getItem(TRIPS_CACHE) || "[]");
      const v = JSON.parse(localStorage.getItem(VEHICLES_CACHE) || "[]");
      if (Array.isArray(t)) setTrips(t);
      if (Array.isArray(v)) setVehicles(v);
    } catch {}
  };

  const fetchData = useCallback(async () => {
    if (!user) { loadCaches(); return; }
    if (!supabase) { loadCaches(); return; }
    setLoading(true);
    try {
      const { data: t } = await supabase
        .from("trips")
        .select("*")
        .order("created_at", { ascending: false })
        .eq("user_id", user.id);
      const { data: v } = await supabase
        .from("vehicles")
        .select("*")
        .eq("user_id", user.id);
      if (t) {
        const mapped: Trip[] = (t as any[]).map((row) => ({
          id: row.id,
          name: row.name,
          departureDate: row.departure_date,
          departureTime: row.departure_time,
          departureLocation: row.departure_location,
          startKm: row.start_km,
          endKm: row.end_km,
          status: row.status,
          hasVehicle: row.has_vehicle,
          vehicleIds: row.vehicle_ids,
        }));
        setTrips(mapped);
      }
      if (v) {
        const mappedV: Vehicle[] = (v as any[]).map((row) => ({
          id: row.id,
          nickname: row.nickname,
          licensePlate: row.license_plate,
          photoUrl: row.photo_url ?? null,
          photoPath: row.photo_path ?? null,
          active: typeof row.active === "boolean" ? row.active : true,
          category: row.category ?? undefined,
          make: row.make ?? undefined,
          model: row.model ?? undefined,
          color: row.color ?? undefined,
          year: typeof row.year === "number" ? row.year : undefined,
          vehicleType: row.vehicle_type ?? undefined,
          kmInitial: typeof row.km_initial === "number" ? row.km_initial : null,
          fuels: Array.isArray(row.fuels) ? row.fuels : [],
          syncStatus: row.sync_status ?? undefined,
        }));
        setVehicles(mappedV);
        saveCaches(trips.length ? trips : [], mappedV);
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
    if (user && supabase) {
      const channel = supabase
        .channel('db_changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'trips' }, () => fetchData())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'vehicles' }, () => fetchData())
        .subscribe();

      return () => {
        if (supabase) supabase.removeChannel(channel);
      };
    }
  }, [user, fetchData]);

  const flushQueue = useCallback(async () => {
    if (!supabase || !user) return;
    const items = readQueue();
    if (!items.length) return;
    const remaining: QueueItem[] = [];
    for (const item of items) {
      try {
        if (item.kind === "trip_insert") {
          const { data } = await supabase.from("trips").insert([{ ...item.payload, user_id: user.id }]).select().single();
          if (data?.id) {
            setTrips((prev) => prev.map((t) => t.id === item.localId ? { ...t, id: data.id } : t));
          }
        } else if (item.kind === "trip_update") {
          await supabase.from("trips").update(item.payload).eq("id", item.id);
        } else if (item.kind === "trip_delete") {
          await supabase.from("trips").delete().eq("id", item.id);
        } else if (item.kind === "vehicle_insert") {
          const { data } = await supabase.from("vehicles").insert([{ ...item.payload, user_id: user.id }]).select().single();
          if (data?.id) {
            setVehicles((prev) => prev.map((vv) => vv.id === item.localId ? { ...vv, id: data.id, syncStatus: 'synced' } : vv));
          }
        } else if (item.kind === "vehicle_update") {
          await supabase.from("vehicles").update(item.payload).eq("id", item.id);
        } else if (item.kind === "vehicle_delete") {
          await supabase.from("vehicles").delete().eq("id", item.id);
        }
      } catch {
        remaining.push(item);
      }
    }
    writeQueue(remaining);
    saveCaches(trips, vehicles);
  }, [user, trips, vehicles]);

  useEffect(() => {
    const startSync = async (timeoutMs = 8000) => {
      setSyncBackground(false);
      setSyncing(true);
      let finished = false;
      const flush = (async () => {
        try {
          await flushQueue();
          await fetchData();
        } finally {
          finished = true;
          setSyncing(false);
          setSyncBackground(false);
        }
      })();
      await Promise.race([flush, new Promise((resolve) => setTimeout(resolve, timeoutMs))]);
      if (!finished) {
        setSyncing(false);
        setSyncBackground(true);
        flush.catch(() => { setSyncBackground(false); });
      }
    };
    if (online) startSync().catch(() => {});
    else {
      try { if (localStorage.getItem('logout_pending') === '1') {} } catch {}
    }
  }, [online]);

  const saveTrip = async (trip: any): Promise<Trip> => {
    if (supabase && online) {
      const { data, error } = await supabase.from("trips").insert([{ ...trip, user_id: user?.id }]).select().single();
      if (error) throw error;
      return data as Trip;
    }
    const localId = `local-${safeRandomUUID()}`;
    const localTrip: Trip = { ...trip, id: localId };
    setTrips((prev) => [localTrip, ...prev]);
    enqueue({ kind: "trip_insert", localId, payload: trip });
    saveCaches([localTrip, ...trips], vehicles);
    return localTrip;
  };

  const updateTrip = async (id: string, updates: Partial<Trip>): Promise<Trip> => {
    if (supabase && online) {
      const { data, error } = await supabase.from("trips").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data as Trip;
    }
    setTrips((prev) => prev.map((t) => t.id === id ? { ...t, ...updates } : t));
    enqueue({ kind: "trip_update", id, payload: updates });
    const updated = trips.find((t) => t.id === id);
    if (updated) saveCaches(trips.map((t) => t.id === id ? { ...t, ...updates } : t), vehicles);
    return { ...(updated || { id } as any), ...(updates || {}) } as Trip;
  };

  const deleteTrip = async (id: string) => {
    if (supabase && online) {
      await supabase.from("trips").delete().eq("id", id);
      setTrips((prev) => prev.filter((t) => t.id !== id));
      saveCaches(trips.filter((t) => t.id !== id), vehicles);
      return;
    }
    setTrips((prev) => prev.filter((t) => t.id !== id));
    enqueue({ kind: "trip_delete", id });
    saveCaches(trips.filter((t) => t.id !== id), vehicles);
  };

  return {
    trips, vehicles, loading, syncing, syncBackground,
    saveTrip, updateTrip, deleteTrip,
    saveVehicle: async (v: Omit<Vehicle, "id">): Promise<Vehicle> => {
      if (supabase && online) {
        const { data, error } = await supabase
          .from("vehicles")
          .insert([{...v, user_id: user?.id}])
          .select()
          .single();
        if (error) throw error;
        return data as Vehicle;
      }
      const localId = `local-${safeRandomUUID()}`;
      const localV: Vehicle = { ...v, id: localId, syncStatus: 'pending' } as Vehicle;
      setVehicles((prev) => [localV, ...prev]);
      enqueue({ kind: "vehicle_insert", localId, payload: v });
      saveCaches(trips, [localV, ...vehicles]);
      return localV;
    },
    updateVehicle: async (id: string, v: Partial<Vehicle>): Promise<Vehicle> => {
      if (supabase && online) {
        const { data, error } = await supabase
          .from("vehicles")
          .update(v)
          .eq("id", id)
          .select()
          .single();
        if (error) throw error;
        return data as Vehicle;
      }
      setVehicles((prev) => prev.map((vv) => vv.id === id ? { ...vv, ...v, syncStatus: 'pending' } : vv));
      enqueue({ kind: "vehicle_update", id, payload: v });
      const updated = vehicles.find((vv) => vv.id === id);
      if (updated) saveCaches(trips, vehicles.map((vv) => vv.id === id ? { ...vv, ...v } : vv));
      return { ...(updated || { id } as any), ...(v || {}) } as Vehicle;
    },
    deleteVehicle: async (id: string) => {
      if (supabase && online) {
        await supabase.from("vehicles").delete().eq("id", id);
        setVehicles((prev) => prev.filter((vv) => vv.id !== id));
        saveCaches(trips, vehicles.filter((vv) => vv.id !== id));
        return;
      }
      setVehicles((prev) => prev.filter((vv) => vv.id !== id));
      enqueue({ kind: "vehicle_delete", id });
      saveCaches(trips, vehicles.filter((vv) => vv.id !== id));
    },
    linkVehicleToTrip: async (tId: string, vId: string, startKm?: number | null) => {
      if (supabase && online) {
        await supabase.from("trip_vehicles").insert([{ trip_id: tId, vehicle_id: vId, initial_km: startKm ?? null, user_id: user?.id }]);
        return;
      }
      enqueue({ kind: "trip_update", id: tId, payload: { vehicleIds: (trips.find(t => t.id === tId)?.vehicleIds || []).concat([vId]) } });
    },
    unlinkVehicleFromTrip: async (tId: string, vId: string) => {
      if (supabase && online) {
        await supabase.from("trip_vehicles").delete().eq("trip_id", tId).eq("vehicle_id", vId);
        return;
      }
      const cur = trips.find((t) => t.id === tId)?.vehicleIds || [];
      enqueue({ kind: "trip_update", id: tId, payload: { vehicleIds: cur.filter((id) => id !== vId) } });
    },
    unlinkAllVehiclesFromTrip: async (tId: string) => {
      if (supabase && online) {
        await supabase.from("trip_vehicles").delete().eq("trip_id", tId);
        return;
      }
      enqueue({ kind: "trip_update", id: tId, payload: { vehicleIds: [] } });
    },
    ensureVehicleSynced: async () => true,
    getTripVehicleSegments: async (tripId: string): Promise<Segment[]> => {
      try {
        if (!supabase || !tripId) return [];
        const { data } = await supabase
          .from("trip_vehicle_segments")
          .select("*")
          .eq("trip_id", tripId)
          .order("segment_date", { ascending: true })
          .order("created_at", { ascending: true });
        const segs: Segment[] = (data as any[] | null | undefined)?.map((row: any) => ({
          id: row.id,
          tripId: row.trip_id,
          vehicleId: row.vehicle_id,
          initialKm: row.initial_km ?? null,
          currentKm: row.current_km ?? null,
          segmentDate: row.segment_date ?? null,
          created_at: row.created_at ?? null,
        })) ?? [];
        return segs;
      } catch {
        return [];
      }
    },
    deleteTripVehicleSegments: async (tripId: string, vehicleId: string): Promise<void> => {
      if (!supabase) return;
      await supabase
        .from("trip_vehicle_segments")
        .delete()
        .eq("trip_id", tripId)
        .eq("vehicle_id", vehicleId);
    },
    updateTripVehicleInitialKm: async (tripId: string, vehicleId: string, value: number): Promise<void> => {
      if (!supabase) return;
      await supabase
        .from("trip_vehicles")
        .update({ initial_km: value })
        .eq("trip_id", tripId)
        .eq("vehicle_id", vehicleId);
    },
    updateTripVehicleCurrentKm: async (tripId: string, vehicleId: string, value: number): Promise<void> => {
      if (!supabase) return;
      // Atualiza ou insere segmento com data de hoje
      const today = new Date();
      const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      await supabase
        .from("trip_vehicle_segments")
        .insert([{ trip_id: tripId, vehicle_id: vehicleId, current_km: value, segment_date: dateStr }]);
    },
    saveTripVehicleSegment: async (payload: { tripId: string; vehicleId: string; initialKm?: number | null; currentKm?: number | null; segmentDate?: string | null }): Promise<Segment | null> => {
      if (!supabase) return null;
      const insert = {
        trip_id: payload.tripId,
        vehicle_id: payload.vehicleId,
        initial_km: payload.initialKm ?? null,
        current_km: payload.currentKm ?? null,
        segment_date: payload.segmentDate ?? null,
      };
      const { data, error } = await supabase
        .from("trip_vehicle_segments")
        .insert([insert])
        .select()
        .single();
      if (error) return null;
      return {
        id: data.id,
        tripId: data.trip_id,
        vehicleId: data.vehicle_id,
        initialKm: data.initial_km ?? null,
        currentKm: data.current_km ?? null,
        segmentDate: data.segment_date ?? null,
        created_at: data.created_at ?? null,
      };
    }
  };
}

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
  departureCoords?: { latitude: number; longitude: number } | null;
  startKm?: number | null;
  endKm?: number | null;
  trip_completed: boolean;
  isDriving?: boolean;
  hasVehicle?: boolean;
  vehicleIds?: string[];
  arrivalLocation?: string;
  arrivalCoords?: { latitude: number; longitude: number } | null;
  arrivalDate?: string;
  arrivalTime?: string;
  details?: string;
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

export type TripVehicleSegment = Segment;

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

  // KM helpers: store scaled int in DB, show with one decimal in UI
  const toDbKm = (v: number | null | undefined): number | null => {
    if (typeof v !== "number" || isNaN(v)) return null;
    return Math.round(v * 10);
  };
  const fromDbKm = (v: number | null | undefined): number | null => {
    if (typeof v !== "number" || isNaN(v)) return null;
    return Number((v / 10).toFixed(1));
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
          departureCoords: row.departure_coords ?? null,
          startKm: row.start_km,
          endKm: row.end_km,
          trip_completed: typeof row.trip_completed === 'boolean'
            ? row.trip_completed
            : (typeof row.status === 'boolean' ? row.status : row.status === 'completed'),
          hasVehicle: row.has_vehicle,
          vehicleIds: row.vehicle_ids,
          arrivalLocation: row.arrival_location ?? undefined,
          arrivalCoords: row.arrival_coords ?? null,
          arrivalDate: row.arrival_date ?? undefined,
          arrivalTime: row.arrival_time ?? undefined,
          details: row.details ?? undefined,
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
          const base = toSnakeTrip(item.payload);
          const payloadBool = { ...base, trip_completed: !!item.payload.trip_completed, user_id: user.id };
          const payloadStr = { ...base, status: item.payload.trip_completed ? 'completed' : 'ongoing', user_id: user.id };
          let data: any | null = null;
          try {
            ({ data } = await supabase.from("trips").insert([payloadBool]).select('*').single());
          } catch {
            const retryPayload = { ...payloadStr };
            delete (retryPayload as any).is_driving;
            ({ data } = await supabase.from("trips").insert([retryPayload]).select('*').single());
          }
          if (data?.id) {
            const mapped = mapRowToTrip(data);
            setTrips((prev) => prev.map((t) => t.id === item.localId ? mapped : t));
          }
        } else if (item.kind === "trip_update") {
          const base = toSnakeTrip(item.payload);
          const payloadBool = { ...base };
          if (typeof item.payload.trip_completed === 'boolean') payloadBool.trip_completed = item.payload.trip_completed;
          const payloadStr = { ...base };
          if (typeof item.payload.trip_completed === 'boolean') payloadStr.status = item.payload.trip_completed ? 'completed' : 'ongoing';
          try {
            await supabase.from("trips").update(payloadBool).eq("id", item.id).select('*');
          } catch {
            const retryPayload = { ...payloadStr };
            delete (retryPayload as any).is_driving;
            await supabase.from("trips").update(retryPayload).eq("id", item.id).select('*');
          }
        } else if (item.kind === "trip_delete") {
          await supabase.from("trips").delete().eq("id", item.id);
        } else if (item.kind === "vehicle_insert") {
          const { data } = await supabase.from("vehicles").insert([{ ...toSnakeVehicle(item.payload), user_id: user.id }]).select('*').single();
          if (data?.id) {
            setVehicles((prev) => prev.map((vv) => vv.id === item.localId ? { ...vv, id: data.id, syncStatus: 'synced' } : vv));
          }
        } else if (item.kind === "vehicle_update") {
          await supabase.from("vehicles").update(toSnakeVehicle(item.payload)).eq("id", item.id).select('*');
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

  const toSnakeTrip = (obj: Record<string, any>) => {
    const map: Record<string, string> = {
      departureDate: "departure_date",
      departureTime: "departure_time",
      departureLocation: "departure_location",
      departureCoords: "departure_coords",
      startKm: "start_km",
      endKm: "end_km",
      hasVehicle: "has_vehicle",
      vehicleIds: "vehicle_ids",
      arrivalLocation: "arrival_location",
      arrivalCoords: "arrival_coords",
      arrivalDate: "arrival_date",
      arrivalTime: "arrival_time",
      details: "details",
      trip_completed: "trip_completed",
      isDriving: "is_driving",
      name: "name",
    };
    const out: Record<string, any> = {};
    Object.keys(obj).forEach((k) => {
      const nk = map[k] || k;
      out[nk] = obj[k];
    });
    return out;
  };

  const mapRowToTrip = (row: any): Trip => ({
    id: row.id,
    name: row.name,
    departureDate: row.departure_date,
    departureTime: row.departure_time,
    departureLocation: row.departure_location,
    departureCoords: row.departure_coords ?? null,
    startKm: row.start_km,
    endKm: row.end_km,
    trip_completed: typeof row.trip_completed === 'boolean'
      ? row.trip_completed
      : (typeof row.status === 'boolean' ? row.status : row.status === 'completed'),
    isDriving: !!row.is_driving,
    hasVehicle: row.has_vehicle,
    vehicleIds: row.vehicle_ids,
    arrivalLocation: row.arrival_location ?? undefined,
    arrivalCoords: row.arrival_coords ?? null,
    arrivalDate: row.arrival_date ?? undefined,
    arrivalTime: row.arrival_time ?? undefined,
    details: row.details ?? undefined,
  });

  const saveTrip = async (trip: any): Promise<Trip> => {
    if (supabase && online) {
      try {
        const base = toSnakeTrip(trip);
        const payloadBool = { ...base, trip_completed: !!trip.trip_completed, is_driving: !!trip.isDriving, user_id: user?.id };
        const payloadStr = { ...base, status: trip.trip_completed ? 'completed' : 'ongoing', user_id: user?.id };
        let data: any | null = null;
        let error: any | null = null;
        try {
          ({ data, error } = await supabase.from("trips").insert([payloadBool]).select('*').single());
          if (error) throw error;
        } catch {
          // Remover campos não existentes e tentar novamente
          const retryPayload = { ...payloadStr };
          delete (retryPayload as any).is_driving;
          const res = await supabase.from("trips").insert([retryPayload]).select('*').single();
          data = res.data;
          error = res.error;
          if (error) throw error;
        }
        const mapped = mapRowToTrip(data);
        setTrips((prev) => [mapped, ...prev]);
        saveCaches([mapped, ...trips], vehicles);
        return mapped;
      } catch {
        // fallback para fila offline
        const localId = `local-${safeRandomUUID()}`;
        const localTrip: Trip = { ...trip, id: localId };
        setTrips((prev) => [localTrip, ...prev]);
        enqueue({ kind: "trip_insert", localId, payload: trip });
        saveCaches([localTrip, ...trips], vehicles);
        return localTrip;
      }
    } else {
      const localId = `local-${safeRandomUUID()}`;
      const localTrip: Trip = { ...trip, id: localId };
      setTrips((prev) => [localTrip, ...prev]);
      enqueue({ kind: "trip_insert", localId, payload: trip });
      saveCaches([localTrip, ...trips], vehicles);
      return localTrip;
    }
  };

  const toSnakeVehicle = (obj: Record<string, any>) => {
    const map: Record<string, string> = {
      nickname: "nickname",
      licensePlate: "license_plate",
      photoUrl: "photo_url",
      photoPath: "photo_path",
      active: "active",
      category: "category",
      make: "make",
      model: "model",
      color: "color",
      year: "year",
      vehicleType: "vehicle_type",
      kmInitial: "km_initial",
      fuels: "fuels",
      syncStatus: "sync_status",
    };
    const out: Record<string, any> = {};
    Object.keys(obj).forEach((k) => {
      const nk = map[k] || k;
      out[nk] = obj[k];
    });
    return out;
  };

  const mapRowToVehicle = (row: any): Vehicle => ({
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
  });

  const updateTrip = async (id: string, updates: Partial<Trip>): Promise<Trip> => {
    // Converte camelCase para snake_case conforme schema do banco
    const toSnake = (obj: Record<string, any>) => {
      const map: Record<string, string> = {
        departureDate: "departure_date",
        departureTime: "departure_time",
        departureLocation: "departure_location",
        departureCoords: "departure_coords",
        startKm: "start_km",
        endKm: "end_km",
        hasVehicle: "has_vehicle",
        vehicleIds: "vehicle_ids",
        arrivalLocation: "arrival_location",
        arrivalCoords: "arrival_coords",
        arrivalDate: "arrival_date",
        arrivalTime: "arrival_time",
        isDriving: "is_driving",
        trip_completed: "trip_completed",
      };
      const out: Record<string, any> = {};
      Object.keys(obj).forEach((k) => {
        const nk = map[k] || k;
        out[nk] = obj[k];
      });
      return out;
    };
    const base = toSnake(updates as Record<string, any>);
    if (supabase && online) {
      const { data, error } = await supabase.from("trips").update(base).eq("id", id).select('*').single();
      if (error) throw error;
      setTrips((prev) => prev.map((t) => t.id === id ? { ...t, ...updates } : t));
      return data as Trip;
    }
    setTrips((prev) => prev.map((t) => t.id === id ? { ...t, ...updates } : t));
    enqueue({ kind: "trip_update", id, payload: updates });
    const updated = trips.find((t) => t.id === id);
    if (updated) saveCaches(trips.map((t) => t.id === id ? { ...t, ...updates } : t), vehicles);
    return { ...(updated || { id } as any), ...(updates || {}) } as Trip;
  };

  const reopenTrip = async (id: string): Promise<Trip> => {
    const updates: Partial<Trip> = {
      trip_completed: false,
      arrivalLocation: null as any,
      arrivalCoords: null,
      arrivalDate: null as any,
      arrivalTime: null as any,
      details: "",
    };
    return updateTrip(id, updates);
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

  const deleteTripCascade = async (id: string) => {
    if (supabase && online) {
      await supabase.from("stops").delete().eq("trip_id", id);
      await supabase.from("trip_vehicles").delete().eq("trip_id", id);
      await supabase.from("trip_vehicle_segments").delete().eq("trip_id", id);
      await supabase.from("trips").delete().eq("id", id);
    }
    setTrips((prev) => prev.filter((t) => t.id !== id));
    saveCaches(trips.filter((t) => t.id !== id), vehicles);
  };

  const saveStop = async (stop: any): Promise<any> => {
    const toSnake = (obj: Record<string, any>) => {
      const map: Record<string, string> = {
        tripId: "trip_id",
        name: "name",
        stopType: "stop_type",
        wasDriving: "was_driving",
        location: "location",
        placeDetail: "place_detail",
        arrivalKm: "arrival_km",
        departureKm: "departure_km",
        arrivalDate: "arrival_date",
        arrivalTime: "arrival_time",
        departureDate: "departure_date",
        departureTime: "departure_time",
        reasons: "reasons",
        otherReason: "other_reason",
        cost: "cost",
        notes: "notes",
        photoUrls: "photo_urls",
        tankFull: "tank_full",
      };
      const out: Record<string, any> = {};
      Object.keys(obj).forEach((k) => {
        const nk = map[k] || k;
        out[nk] = obj[k];
      });
      return out;
    };
    if (supabase && online) {
      const payload = { ...toSnake(stop), user_id: user?.id };
      const { data, error } = await supabase.from("stops").insert([payload]).select().single();
      if (error) throw error;
      return data;
    }
    // offline: append to trip in memory
    setTrips((prev) => prev.map((t) => t.id === stop.tripId ? { ...t, stops: [...(t.stops || []), { id: `local-${safeRandomUUID()}`, ...stop }] } : t));
    enqueue({ kind: "trip_update", id: stop.tripId, payload: { stops: [] } }); // marker for sync
    return stop;
  };

  const updateStop = async (id: string, updates: Record<string, any>): Promise<any> => {
    const toSnake = (obj: Record<string, any>) => {
      const map: Record<string, string> = {
        name: "name",
        stopType: "stop_type",
        wasDriving: "was_driving",
        location: "location",
        placeDetail: "place_detail",
        arrivalKm: "arrival_km",
        departureKm: "departure_km",
        arrivalDate: "arrival_date",
        arrivalTime: "arrival_time",
        departureDate: "departure_date",
        departureTime: "departure_time",
        reasons: "reasons",
        otherReason: "other_reason",
        cost: "cost",
        costDetails: "cost_details",
        notes: "notes",
        photoUrls: "photo_urls",
        tankFull: "tank_full",
      };
      const out: Record<string, any> = {};
      Object.keys(obj).forEach((k) => {
        const nk = map[k] || k;
        out[nk] = obj[k];
      });
      return out;
    };
    if (supabase && online) {
      const payload = toSnake(updates);
      const { data, error } = await supabase.from("stops").update(payload).eq("id", id).select().single();
      if (error) throw error;
      return data;
    }
    // offline noop for now
    return { id, ...updates };
  };

  const deleteStop = async (id: string): Promise<void> => {
    if (supabase && online) {
      await supabase.from("stops").delete().eq("id", id);
      return;
    }
  };

  return {
    trips, vehicles, loading, syncing, syncBackground,
    refresh: fetchData,
    saveTrip, updateTrip, deleteTrip, deleteTripCascade,
    saveStop, updateStop, deleteStop,
    saveVehicle: async (v: Omit<Vehicle, "id">): Promise<Vehicle> => {
      if (supabase && online) {
        try {
          const { data, error } = await supabase
            .from("vehicles")
            .insert([{...toSnakeVehicle(v), user_id: user?.id}])
            .select('*')
            .single();
          if (error) throw error;
          const saved = mapRowToVehicle(data);
          setVehicles((prev) => [saved, ...prev]);
          saveCaches(trips, [saved, ...vehicles]);
          return saved;
        } catch {
          const localId = `local-${safeRandomUUID()}`;
          const localV: Vehicle = { ...v, id: localId, syncStatus: 'pending' } as Vehicle;
          setVehicles((prev) => [localV, ...prev]);
          enqueue({ kind: "vehicle_insert", localId, payload: v });
          saveCaches(trips, [localV, ...vehicles]);
          return localV;
        }
      } else {
        const localId = `local-${safeRandomUUID()}`;
        const localV: Vehicle = { ...v, id: localId, syncStatus: 'pending' } as Vehicle;
        setVehicles((prev) => [localV, ...prev]);
        enqueue({ kind: "vehicle_insert", localId, payload: v });
        saveCaches(trips, [localV, ...vehicles]);
        return localV;
      }
    },
    updateVehicle: async (id: string, v: Partial<Vehicle>): Promise<Vehicle> => {
      if (supabase && online) {
        const { data, error } = await supabase
          .from("vehicles")
          .update(toSnakeVehicle(v))
          .eq("id", id)
          .select('*')
          .single();
        if (error) throw error;
        const updated = mapRowToVehicle(data);
        setVehicles((prev) => prev.map((vv) => vv.id === id ? updated : vv));
        saveCaches(trips, vehicles.map((vv) => vv.id === id ? updated : vv));
        return updated;
      }
      setVehicles((prev) => prev.map((vv) => vv.id === id ? { ...vv, ...v, syncStatus: 'pending' } : vv));
      enqueue({ kind: "vehicle_update", id, payload: v });
      const updated = vehicles.find((vv) => vv.id === id);
      if (updated) saveCaches(trips, vehicles.map((vv) => vv.id === id ? { ...vv, ...v } : vv));
      return { ...(updated || { id } as any), ...(v || {}) } as Vehicle;
    },
    deleteVehicle: async (id: string) => {
      const v = vehicles.find((vv) => vv.id === id);
      const userId = (user as any)?.id;
      if (supabase && online) {
        try {
          // remove fotos no storage (path direto e todas dentro da pasta do veículo)
          const baseDir = userId ? `${userId}/vehicles/${id}` : null;
          if (v?.photoPath) {
            try { await supabase.storage.from('trip-photos').remove([v.photoPath]); } catch {}
          }
          if (baseDir) {
            try {
              const { data: files } = await supabase.storage.from('trip-photos').list(baseDir, { limit: 100 });
              const toDelete = (files || []).map((f: any) => `${baseDir}/${f.name}`);
              if (toDelete.length) {
                await supabase.storage.from('trip-photos').remove(toDelete);
              }
            } catch {}
          }
        } catch {}
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
        await supabase
          .from("trip_vehicles")
          .upsert(
            [{ trip_id: tId, vehicle_id: vId, initial_km: toDbKm(startKm ?? null), user_id: user?.id }],
            { onConflict: "trip_id,vehicle_id", ignoreDuplicates: true }
          );
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
    reopenTrip,
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
          initialKm: fromDbKm(row.initial_km ?? null),
          currentKm: fromDbKm(row.current_km ?? null),
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
        .update({ initial_km: toDbKm(value) })
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
        .insert([{ trip_id: tripId, vehicle_id: vehicleId, current_km: toDbKm(value), segment_date: dateStr, user_id: user?.id }]);
    },
    saveTripVehicleSegment: async (payload: { tripId: string; vehicleId: string; initialKm?: number | null; currentKm?: number | null; segmentDate?: string | null }): Promise<Segment | null> => {
      if (!supabase) return null;
      const insert = {
        trip_id: payload.tripId,
        vehicle_id: payload.vehicleId,
        initial_km: toDbKm(payload.initialKm ?? null),
        current_km: toDbKm(payload.currentKm ?? null),
        segment_date: payload.segmentDate ?? null,
        user_id: user?.id,
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
        initialKm: fromDbKm(data.initial_km ?? null),
        currentKm: fromDbKm(data.current_km ?? null),
        segmentDate: data.segment_date ?? null,
        created_at: data.created_at ?? null,
      };
    }
  };
}

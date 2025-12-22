import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../utils/auth/AuthProvider";
import { supabase } from "../utils/supabase/client";

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
}

export function useTrips() {
  const { user } = useAuth();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!user || !supabase) return;
    setLoading(true);
    try {
      const { data: t } = await supabase.from("trips").select("*").order("created_at", { ascending: false });
      const { data: v } = await supabase.from("vehicles").select("*");
      if (t) setTrips(t as Trip[]);
      if (v) setVehicles(v as Vehicle[]);
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

  const saveTrip = async (trip: any): Promise<Trip> => {
    if (!supabase) throw new Error("Supabase não disponível");
    const { data, error } = await supabase.from("trips").insert([{ ...trip, user_id: user?.id }]).select().single();
    if (error) throw error;
    return data as Trip;
  };

  const updateTrip = async (id: string, updates: Partial<Trip>): Promise<Trip> => {
    if (!supabase) throw new Error("Supabase não disponível");
    const { data, error } = await supabase.from("trips").update(updates).eq("id", id).select().single();
    if (error) throw error;
    return data as Trip;
  };

  const deleteTrip = async (id: string) => {
    if (!supabase) return;
    await supabase.from("trips").delete().eq("id", id);
  };

  return {
    trips, vehicles, loading,
    saveTrip, updateTrip, deleteTrip,
    saveVehicle: async (v: any) => {
      if (!supabase) return;
      return await supabase.from("vehicles").insert([{...v, user_id: user?.id}]).select().single();
    },
    updateVehicle: async (id: string, v: any) => {
      if (!supabase) return;
      return await supabase.from("vehicles").update(v).eq("id", id).select().single();
    },
    deleteVehicle: async (id: string) => {
      if (supabase) await supabase.from("vehicles").delete().eq("id", id);
    },
    linkVehicleToTrip: async (tId: string, vId: string, startKm?: number | null) => {
      if (supabase) await supabase.from("trip_vehicles").insert([{ trip_id: tId, vehicle_id: vId, initial_km: startKm ?? null, user_id: user?.id }]);
    },
    unlinkVehicleFromTrip: async (tId: string, vId: string) => {
      if (supabase) await supabase.from("trip_vehicles").delete().eq("trip_id", tId).eq("vehicle_id", vId);
    },
    unlinkAllVehiclesFromTrip: async (tId: string) => {
      if (supabase) await supabase.from("trip_vehicles").delete().eq("trip_id", tId);
    },
    ensureVehicleSynced: async () => true
  };
}
import { useState, useEffect } from "react";
import { MapPin, Map, X } from "lucide-react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Switch } from "./ui/switch";
import { toast } from "sonner";
import { getAccuratePosition } from "../utils/offline/useGeoAccurate";
import type { Trip } from "./useTrips";

interface LocationData {
  latitude: number;
  longitude: number;
}

interface TripEndModalProps {
  trip: Trip;
  onClose: () => void;
  onSave?: (updates: Partial<Trip>) => Promise<void>;
}

function getBrasiliaDateTime() {
  const now = new Date();
  const offset = -180; // GMT-3
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utc + offset * 60000);
}

function formatDateForInput(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatDateForDisplay(dateStr: string): string {
  if (!dateStr) return "";
  if (dateStr.match(/^\d{2}\/\d{2}\/\d{4}$/)) return dateStr;
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

export default function TripEndModal({ trip, onClose, onSave }: TripEndModalProps) {

  const now = getBrasiliaDateTime();

  const [arrivalLocation, setArrivalLocation] = useState<string>(trip.arrivalLocation || "");
  const [arrivalCoords, setArrivalCoords] = useState<LocationData | null | undefined>(trip.arrivalCoords);
  const [arrivalDate, setArrivalDate] = useState<string>(
    trip.arrivalDate ? trip.arrivalDate.split("/").reverse().join("-") : formatDateForInput(now)
  );
  const [arrivalTime, setArrivalTime] = useState<string>(trip.arrivalTime || now.toTimeString().slice(0, 5));
  const [details, setDetails] = useState<string>(trip.details || "");
  const [sameLocation, setSameLocation] = useState<boolean>(false);

  // Sincronizar chegada com partida quando toggle estiver ativo
  useEffect(() => {
    if (sameLocation) {
      setArrivalLocation(trip.departureLocation || "");
      setArrivalCoords(trip.departureCoords || null);
    }
  }, [sameLocation, trip.departureLocation, trip.departureCoords]);

  const captureLocation = () => {
    try {
      if (!navigator?.geolocation) {
        const raw = localStorage.getItem('last_location');
        const last = raw ? JSON.parse(raw) as LocationData : (trip.departureCoords || null);
        if (last) {
          setArrivalCoords(last);
          toast.error("Sem GPS. Usando última localização disponível. Você pode editar depois.");
        } else {
          toast.error("Sem GPS e sem última localização disponível.");
        }
        return;
      }
      getAccuratePosition(50, 12000).then((fix) => {
        const loc = { latitude: fix.latitude, longitude: fix.longitude };
        try { localStorage.setItem('last_location', JSON.stringify(loc)); } catch {}
        setArrivalCoords(loc);
        toast.success("Localização salva!");
      }).catch(() => {
        const raw = localStorage.getItem('last_location');
        const last = raw ? JSON.parse(raw) as LocationData : (trip.departureCoords || null);
        if (last) {
          setArrivalCoords(last);
          toast.error("Falha no GPS. Usando última localização. Você pode editar depois.");
        } else {
          toast.error("Falha no GPS e sem última localização.");
        }
      });
    } catch {
      const raw = localStorage.getItem('last_location');
      const last = raw ? JSON.parse(raw) as LocationData : (trip.departureCoords || null);
      if (last) {
        setArrivalCoords(last);
        toast.error("Erro ao capturar. Usando última localização disponível.");
      } else {
        toast.error("Erro ao capturar localização.");
      }
    }
  };

  const openInMaps = (coords: LocationData) => {
    window.open(`https://www.google.com/maps?q=${coords.latitude},${coords.longitude}`, "_blank");
  };

  const handleSave = async () => {
    const formattedArrivalDate = formatDateForDisplay(arrivalDate);

    // Se usuário não preencher chegada, assumir mesmo local da partida
    const finalArrivalLocation = (sameLocation || !arrivalLocation?.trim()) ? (trip.departureLocation || "") : arrivalLocation;
    const finalArrivalCoords = (sameLocation || !arrivalLocation?.trim()) ? (trip.departureCoords || null) : arrivalCoords;

    try {
      const updates: Partial<Trip> = {
        trip_completed: true,
        arrivalLocation: finalArrivalLocation,
        arrivalCoords: finalArrivalCoords,
        arrivalDate: formattedArrivalDate,
        arrivalTime,
        details,
      };
      if (onSave) await onSave(updates);
      toast.success("Viagem finalizada!");
      onClose();
    } catch (err) {
      console.error("Falha ao encerrar viagem", err);
      toast.error("Não foi possível encerrar. Alterações locais aplicadas.");
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-lg font-semibold">Encerrar viagem</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 space-y-5">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Mesmo local?</span>
            <Switch checked={sameLocation} onCheckedChange={setSameLocation} />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Local de chegada</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-red-600" size={18} />
              <Input
                value={arrivalLocation}
                onChange={(e) => setArrivalLocation(e.target.value)}
                className="pl-10"
              />
              {arrivalCoords && (
                <button
                  onClick={() => openInMaps(arrivalCoords)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-fuchsia-500"
                >
                  <Map size={16} />
                </button>
              )}
            </div>
            <button onClick={captureLocation} className="text-xs text-fuchsia-500 hover:underline mt-1">
              📍 Usar localização atual
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Data de chegada</label>
              <Input type="date" value={arrivalDate} onChange={(e) => setArrivalDate(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Hora de chegada</label>
              <Input type="time" value={arrivalTime} onChange={(e) => setArrivalTime(e.target.value)} />
            </div>
          </div>

          {/* Campos de KM removidos conforme especificação */}

          <div>
            <label className="text-xs text-gray-500 block mb-1">Detalhes finais (opcional)</label>
            <Input
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Resumo, gastos, experiências..."
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={onClose} className="flex-1">Cancelar</Button>
            <Button
              onClick={async () => {
                try {
                  const updates = {
                    trip_completed: false,
                    arrivalLocation: null as any,
                    arrivalCoords: null,
                    arrivalDate: null as any,
                    arrivalTime: null as any,
                    details: "",
                  } as Partial<Trip>;
                  if (onSave) await onSave(updates);
                } catch {}
                onClose();
              }}
              className="flex-1 bg-yellow-500 hover:bg-yellow-600"
            >
              Cancelar encerramento
            </Button>
            <Button onClick={handleSave} className="flex-1 bg-green-600 hover:bg-green-700">Salvar</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

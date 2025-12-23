import { useState, useEffect } from "react";
import { MapPin, Flag, Map, X } from "lucide-react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Switch } from "./ui/switch";
import { toast } from "sonner";

interface LocationData {
  latitude: number;
  longitude: number;
}

interface TripEditModalProps {
  trip: {
    id: string;
    name: string;
    departureLocation: string;
    departureCoords?: LocationData | null;
    departureDate: string;
    departureTime: string;
    details?: string;
    trip_completed: boolean;
    arrivalLocation?: string;
    arrivalCoords?: LocationData | null;
    arrivalDate?: string;
    arrivalTime?: string;
    finalDetails?: string;
    startKm?: number | null;
    endKm?: number | null;
  };
  onSave: (updatedTrip: {
    name: string;
    departureLocation: string;
    departureCoords?: LocationData | null;
    departureDate: string;
    departureTime: string;
    details?: string;
    arrivalLocation?: string;
    arrivalCoords?: LocationData | null;
    arrivalDate?: string;
    arrivalTime?: string;
    finalDetails?: string;
    trip_completed: boolean;
    startKm?: number | null;
    endKm?: number | null;
  }) => Promise<void>;
  onClose: () => void;
}

// Função para data/hora em GMT-3
function getBrasiliaDateTime() {
  const now = new Date();
  const offset = -180;
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

export function TripEditModal({ trip, onSave, onClose }: TripEditModalProps) {
  const [name, setName] = useState(trip.name);
  const [departureLocation, setDepartureLocation] = useState(trip.departureLocation);
  const [departureCoords, setDepartureCoords] = useState<LocationData | null | undefined>(trip.departureCoords);
  const [departureDate, setDepartureDate] = useState(
    trip.departureDate.split("/").reverse().join("-")
  );
  const [departureTime, setDepartureTime] = useState(trip.departureTime);
  const [details, setDetails] = useState<string>(trip.details || "");

  const [isCompleting, setIsCompleting] = useState(!!trip.trip_completed);
  const [sameLocation, setSameLocation] = useState(false);
  const [arrivalLocation, setArrivalLocation] = useState(trip.arrivalLocation || "");
  const [arrivalCoords, setArrivalCoords] = useState<LocationData | null | undefined>(trip.arrivalCoords);
  const initialArrival = trip.arrivalDate
    ? trip.arrivalDate.split("/").reverse().join("-")
    : formatDateForInput(getBrasiliaDateTime());
  const [arrivalDate, setArrivalDate] = useState(initialArrival);
  const [arrivalTime, setArrivalTime] = useState(trip.arrivalTime || getBrasiliaDateTime().toTimeString().slice(0, 5));
  const [finalDetails, setFinalDetails] = useState(trip.finalDetails || "");


  useEffect(() => {
    if (sameLocation) {
      setArrivalLocation(departureLocation);
      setArrivalCoords(departureCoords);
    }
  }, [sameLocation, departureLocation, departureCoords]);

  const captureLocation = (type: "departure" | "arrival") => {
    const simulated: LocationData = { latitude: -16.6542947, longitude: -49.2942842 };
    if (type === "departure") {
      setDepartureCoords(simulated);
    } else {
      setArrivalCoords(simulated);
    }
    toast.success("Localização salva!");
  };

  const openInMaps = (coords: LocationData) => {
    window.open(`https://www.google.com/maps?q=${coords.latitude},${coords.longitude}`, "_blank");
  };

  const handleSubmit = async (): Promise<void> => {

    // Formatar datas
    const [y1, m1, d1] = departureDate.split("-");
    const formattedDepartureDate = `${d1}/${m1}/${y1}`;

    let formattedArrivalDate = "";
    if (isCompleting) {
      if (!arrivalLocation.trim() && !sameLocation) {
        toast.error("Preencha o local de chegada");
        return;
      }
      const [y2, m2, d2] = arrivalDate.split("-");
      formattedArrivalDate = `${d2}/${m2}/${y2}`;
    }

    try {
      await onSave({
        name,
        departureLocation,
        departureCoords,
        departureDate: formattedDepartureDate,
        departureTime,
        details,
        ...(isCompleting && {
          arrivalLocation: sameLocation ? departureLocation : arrivalLocation,
          arrivalCoords: sameLocation ? departureCoords : arrivalCoords,
          arrivalDate: formattedArrivalDate,
          arrivalTime,
          trip_completed: true,
        }),
        ...(isCompleting
          ? { trip_completed: true }
          : {
              trip_completed: false,
              arrivalLocation: "",
              arrivalCoords: null,
              arrivalDate: "",
              arrivalTime: "",
              finalDetails: "",
            }),
      });
      onClose();
    } catch (err) {
      console.error("Falha ao salvar alterações da viagem.", err);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-lg font-semibold">Editar viagem</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 space-y-5">
          <div>
            <label className="text-xs text-gray-500 block mb-1">Nome da viagem</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div>
            <label className="text-xs text-gray-500 block mb-1">Local de partida</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-green-600" size={18} />
              <Input
                value={departureLocation}
                onChange={(e) => setDepartureLocation(e.target.value)}
                className="pl-10"
              />
              {departureCoords && (
                <button
                  onClick={() => openInMaps(departureCoords)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-fuchsia-500"
                >
                  <Map size={16} />
                </button>
              )}
            </div>
            <button
              onClick={() => captureLocation("departure")}
              className="text-xs text-fuchsia-500 hover:underline mt-1"
            >
              📍 Usar localização atual
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Data de partida</label>
              <Input type="date" value={departureDate} onChange={(e) => setDepartureDate(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Hora de partida</label>
              <Input type="time" value={departureTime} onChange={(e) => setDepartureTime(e.target.value)} />
            </div>
          </div>

          {/* Campos de KM removidos conforme especificação */}

          <div>
            <label className="text-xs text-gray-500 block mb-1">Detalhes da viagem</label>
            <Input
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Hotéis, roteiro..."
            />
          </div>

          <div className="pt-2 border-t">
            <div className="flex items-center justify-between">
            <span className="text-gray-600">Viagem encerrada</span>
            <Switch checked={isCompleting} onCheckedChange={setIsCompleting} />
          </div>
          </div>

          {isCompleting && (
            <>
              <div className="flex items-center justify-between py-1">
                <span className="text-gray-600">Mesmo local?</span>
                <Switch checked={sameLocation} onCheckedChange={setSameLocation} />
              </div>

              {!sameLocation && (
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Local de chegada</label>
                  <div className="relative">
                    <Flag className="absolute left-3 top-1/2 -translate-y-1/2 text-red-600" size={18} />
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
                  <button
                    onClick={() => captureLocation("arrival")}
                    className="text-xs text-fuchsia-500 hover:underline mt-1"
                  >
                    📍 Usar localização atual
                  </button>
                </div>
              )}

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

              <div>
                <label className="text-xs text-gray-500 block mb-1">Detalhes finais (opcional)</label>
                <Input
                  value={finalDetails}
                  onChange={(e) => setFinalDetails(e.target.value)}
                  placeholder="Resumo, gastos, experiências..."
                />
              </div>
            </>
          )}

          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>
              Cancelar
            </Button>
            <Button className="flex-1 bg-fuchsia-500 hover:bg-fuchsia-600" onClick={handleSubmit}>
              Salvar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

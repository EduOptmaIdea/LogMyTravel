import { useState, useRef, useEffect } from "react";
import type { ChangeEvent, ReactNode, ButtonHTMLAttributes, InputHTMLAttributes } from "react";
import { MapPin, Map } from "lucide-react";
import type { Vehicle } from "./useTrips";
import { useAuth } from "../utils/auth/AuthProvider";
import { useWarningsModal } from "./hooks/useWarningsModal";

const toast = {
  success: (message: string) => console.log("SUCCESS:", message),
  error: (message: string) => console.log("ERROR:", message),
  warning: (message: string) => console.log("WARNING:", message),
};

type InputProps = InputHTMLAttributes<HTMLInputElement> & { className?: string };
const Input = ({ className = "", ...props }: InputProps) => (
  <input
    className={`w-full rounded-xl border border-gray-300 px-3 py-2 text-base transition-colors focus:border-fuchsia-500 focus:ring-1 focus:ring-fuchsia-500 focus:outline-none ${className}`}
    {...props}
  />
);

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode };
const Button = ({ children, onClick, className = "", disabled = false, ...props }: ButtonProps) => (
  <button
    onClick={onClick}
    className={`flex items-center justify-center rounded-full font-bold transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    disabled={disabled}
    {...props}
  >
    {children}
  </button>
);

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

function formatDateForDisplay(date: Date): string {
  const d = String(date.getDate()).padStart(2, "0");
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}

interface LocationData {
  latitude: number;
  longitude: number;
}

interface TripData {
  name: string;
  departureLocation: string;
  departureCoords?: LocationData;
  departureDate: string;
  departureTime: string;
  details: string;
  startKm: number;
  hasVehicle: boolean;
  vehicleIds: string[];
  status: "ongoing";
}

interface TripNewProps {
  onSaveTrip: (trip: TripData) => Promise<void>;
  vehicles: Vehicle[];
  saveVehicle: (vehicle: Omit<Vehicle, "id">) => Promise<Vehicle>;
  updateVehicle: (id: string, updates: Partial<Vehicle>) => Promise<Vehicle>;
  deleteVehicle?: (id: string) => Promise<void>;
  onRequireLogin?: () => void;
}

export function TripNew({ onSaveTrip, onRequireLogin }: TripNewProps) {
  const { user } = useAuth();
  const continueButtonRef = useRef<HTMLDivElement>(null);

  const [name, setName] = useState("");
  const [departureText, setDepartureText] = useState("");
  const [details, setDetails] = useState("");

  const initialDateTime = getBrasiliaDateTime();
  const [departureDate, setDepartureDate] = useState(formatDateForInput(initialDateTime));
  const [departureTime, setDepartureTime] = useState(initialDateTime.toTimeString().slice(0, 5));

  const [departureLocation, setDepartureLocation] = useState<LocationData | null>(null);
  const [departureMessage, setDepartureMessage] = useState("");
  const [loadingDeparture, setLoadingDeparture] = useState(false);
  const { openModal, element: warningsModal } = useWarningsModal();
  const tipForField = (field: string) => {
    switch (field) {
      case "Nome da viagem":
        return "Use um nome claro. Ex.: ‘Viagem ao litoral’.";
      case "Local de partida":
        return "Você pode capturar a localização ou digitar bairro/cidade.";
      case "Início da viagem (data)":
        return "Escolha no calendário; hoje costuma ser o ideal.";
      case "Horário de início":
        return "Use o horário atual (formato 24h, ex.: 08:30).";
      default:
        return "Campo obrigatório.";
    }
  };

  const resetForm = () => {
    setName("");
    setDepartureText("");
    setDetails("");
    const dt = getBrasiliaDateTime();
    setDepartureDate(formatDateForInput(dt));
    setDepartureTime(dt.toTimeString().slice(0, 5));
    setDepartureLocation(null);
    setDepartureMessage("");
    setLoadingDeparture(false);
  };

  useEffect(() => {
    if (!user) {
      resetForm();
    }
  }, [user]);

  const captureLocation = () => {
    setLoadingDeparture(true);
    setDepartureMessage("");
    const simulatedLocation: LocationData = {
      latitude: -16.6542947,
      longitude: -49.2942842,
    };
    setTimeout(() => {
      setDepartureLocation(simulatedLocation);
      setDepartureMessage("Localização salva com sucesso");
      setLoadingDeparture(false);
      setTimeout(() => setDepartureMessage(""), 3000);
    }, 1000);
  };

  const openInMaps = (location: LocationData) => {
    window.open(`https://www.google.com/maps?q=${location.latitude},${location.longitude}`, "_blank");
  };

  const handleContinue = async () => {
    // Checar login antes da validação de campos obrigatórios
    if (!user) {
      openModal({
        title: "Login necessário",
        message: "Você precisa estar logado para iniciar uma viagem.",
        confirmText: "Entrar agora",
        cancelText: "Cancelar",
        onConfirm: () => onRequireLogin?.(),
      });
      return;
    }

    const missing: string[] = [];
    if (!name.trim()) missing.push("Nome da viagem");
    if (!departureText.trim()) missing.push("Local de partida");
    if (!departureDate?.trim()) missing.push("Início da viagem (data)");
    if (!departureTime?.trim()) missing.push("Horário de início");

    if (missing.length > 0) {
      openModal({
        title: "Campos obrigatórios",
        message:
          "Para iniciar a viagem, preencha os seguintes campos. Dicas rápidas para te ajudar:",
        items: missing.map((f) => ({ label: f, tip: tipForField(f) })),
        cancelText: "Ok, vou preencher",
      });
      return;
    }

    let finalDepartureLocation = departureLocation;
    if (!finalDepartureLocation) {
      setLoadingDeparture(true);
      finalDepartureLocation = { latitude: -16.6542947, longitude: -49.2942842 };
      setDepartureLocation(finalDepartureLocation);
      setDepartureMessage("Localização salva automaticamente");
      setLoadingDeparture(false);
      setTimeout(() => setDepartureMessage(""), 3000);
    }

    const [y, m, d] = departureDate.split("-").map(Number);
    const formattedDate = formatDateForDisplay(new Date(y, m - 1, d));

    const parsedStartKm: number = 0;

    try {
      await onSaveTrip({
        name,
        departureLocation: departureText,
        departureCoords: finalDepartureLocation || undefined,
        departureDate: formattedDate,
        departureTime,
        details,
        startKm: parsedStartKm,
        hasVehicle: false,
        vehicleIds: [],
        status: "ongoing",
      });
      toast.success("Viagem iniciada com sucesso!");
      resetForm();
    } catch (err) {
      toast.error("Falha ao iniciar a viagem. Tente novamente.");
    }
  };

  // Sem rolagem automática; manter interação direta do usuário

  return (
    <div className="p-4 md:p-6 lg:p-8">
      {warningsModal}
      <h2 className="text-2xl font-extrabold text-[#192A56] mb-6 font-heading">Comece sua próxima jornada</h2>

      <div className="space-y-6">
        <div>
          <label className="text-xs text-gray-500 block mb-1 font-medium">Nome da viagem</label>
          <Input
            placeholder="Ex: Viagem para a vovó em 2024"
            value={name}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
            required
            className="h-12 bg-white border-gray-200 rounded-xl"
          />
        </div>

        <div>
          <label className="text-xs text-gray-500 block mb-1 font-medium">Local de partida</label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-teal-600" size={20} />
            <Input
              placeholder="Ex: Casa, Goiânia, Aeroporto"
              className={`pl-10 h-12 bg-white border-gray-200 rounded-xl ${departureLocation ? "pr-12" : ""}`}
              value={departureText}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setDepartureText(e.target.value)}
              required
            />
            {departureLocation && (
              <button
                onClick={() => openInMaps(departureLocation)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-fuchsia-500 hover:text-fuchsia-600 transition-colors bg-fuchsia-50 rounded-full p-1.5"
                title="Abrir no Google Maps"
              >
                <Map size={18} />
              </button>
            )}
          </div>
          <div className="mt-1 min-h-[20px] flex items-center gap-3">
            <button onClick={captureLocation} disabled={loadingDeparture} className="text-xs text-fuchsia-500 hover:underline disabled:opacity-50 font-medium">
              {loadingDeparture ? "Capturando..." : "📍 Usar minha localização atual"}
            </button>
            {departureLocation && (
              <span className="text-xs text-teal-600 flex items-center gap-1 font-medium">Coordenadas Salvas</span>
            )}
            {departureMessage && (
              <p className={`text-xs font-medium ${departureMessage.includes("sucesso") ? "text-teal-600" : "text-red-600"}`}>{departureMessage}</p>
            )}
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="text-xs text-gray-500 block mb-1 font-medium">Início da viagem</label>
              <Input required type="date" value={departureDate} onChange={(e: ChangeEvent<HTMLInputElement>) => setDepartureDate(e.target.value)} className="h-12 bg-white border-gray-200 rounded-xl text-sm" />
            </div>
            <div className="flex-1">
              <label className="text-xs text-gray-500 block mb-1 font-medium">Horário de início</label>
              <Input required type="time" value={departureTime} onChange={(e: ChangeEvent<HTMLInputElement>) => setDepartureTime(e.target.value)} className="h-12 bg-white border-gray-200 rounded-xl text-sm" />
            </div>
          </div>
        </div>

        {/* Campo de KM inicial não é utilizado na criação da nova viagem */}

        <div>
          <label className="text-xs text-gray-500 block mb-1 font-medium">Visão geral</label>
          <Input
            placeholder="Faça uma descrição rápida da sua viagem 🙂🙂"
            value={details}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setDetails(e.target.value)}
            className="h-12 bg-white border-gray-200 rounded-xl"
          />
        </div>

        <div ref={continueButtonRef} className="pt-4 pb-16">
          <Button onClick={handleContinue} disabled={loadingDeparture} className="w-full h-14 bg-fuchsia-500 hover:bg-fuchsia-600 text-white rounded-xl text-lg shadow-lg">
            {loadingDeparture ? "Preparando..." : "Iniciar viagem"}
          </Button>
        </div>
      </div>
    </div>
  );
}

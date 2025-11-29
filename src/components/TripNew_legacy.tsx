import { useState, useRef, useEffect } from "react";
import type { ChangeEvent, FormEvent, ReactNode, ButtonHTMLAttributes, InputHTMLAttributes } from "react";
import { MapPin, Map, Car, Bus, ArrowUp } from "lucide-react";
import VehiclesOnTrip from "./VehiclesOnTrip";
import type { Vehicle } from "./useTrips";
import { useAuth } from "../utils/auth/AuthProvider";

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
const Button = ({
  children,
  onClick,
  className = "",
  disabled = false,
  ...props
}: ButtonProps) => (
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
  vehicleIds: string[]; // 👈 vínculo explícito
  status: "ongoing";
}

interface TripNewProps {
  onSaveTrip: (trip: TripData) => Promise<void>;
  vehicles: Vehicle[];
  saveVehicle: (vehicle: Omit<Vehicle, "id">) => Promise<Vehicle>;
  updateVehicle: (
    id: string,
    updates: Partial<Vehicle>
  ) => Promise<Vehicle>;
  deleteVehicle?: (id: string) => Promise<void>;
}

export function TripNew({ onSaveTrip, vehicles, saveVehicle, updateVehicle, deleteVehicle }: TripNewProps) {
  const { user } = useAuth();
  const continueButtonRef = useRef<HTMLDivElement>(null);

  const [name, setName] = useState("");
  const [departureText, setDepartureText] = useState("");
  const [details, setDetails] = useState("");
  const [startKm, setStartKm] = useState<number | string>(0);

  const initialDateTime = getBrasiliaDateTime();
  const [departureDate, setDepartureDate] = useState(
    formatDateForInput(initialDateTime),
  );
  const [departureTime, setDepartureTime] = useState(
    initialDateTime.toTimeString().slice(0, 5),
  );

  const [departureLocation, setDepartureLocation] =
    useState<LocationData | null>(null);
  const [departureMessage, setDepartureMessage] = useState("");
  const [loadingDeparture, setLoadingDeparture] =
    useState(false);

  const [hasVehicle, setHasVehicle] = useState(true);
  const [showVehicleModal, setShowVehicleModal] =
    useState(false);
  const [selectedVehicleIds, setSelectedVehicleIds] = useState<
    string[]
  >([]); // 👈 IDs selecionados

  // Função para resetar o formulário ao estado inicial
  const resetForm = () => {
    setName("");
    setDepartureText("");
    setDetails("");
    setStartKm(0);
    
    const initialDateTime = getBrasiliaDateTime();
    setDepartureDate(formatDateForInput(initialDateTime));
    setDepartureTime(initialDateTime.toTimeString().slice(0, 5));
    
    setDepartureLocation(null);
    setDepartureMessage("");
    setLoadingDeparture(false);
    setHasVehicle(true);
    setShowVehicleModal(false);
    setSelectedVehicleIds([]);
  };

  // Resetar formulário quando usuário fizer logout
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
    window.open(
      `https://www.google.com/maps?q=${location.latitude},${location.longitude}`,
      "_blank",
    );
  };

  // 👇 Nova função para o toggle com confirmação
  const handleToggleVehicle = () => {
    if (!hasVehicle) {
      // Está desligado → quer ligar
      const shouldOpen = window.confirm(
        "Deseja vincular um veículo a esta viagem agora?",
      );
      setHasVehicle(true);
      if (shouldOpen) {
        setShowVehicleModal(true);
      }
    } else {
      // Está ligado → quer desligar
      setHasVehicle(false);
      setSelectedVehicleIds([]);
    }
  };

  const handleContinue = async () => {
    if (!name.trim()) {
      toast.error("O nome da viagem é obrigatório.");
      return;
    }
    if (!departureText.trim()) {
      toast.error("O local de partida é obrigatório.");
      return;
    }

    let parsedStartKm = 0;
    if (hasVehicle) {
      parsedStartKm =
        typeof startKm === "string"
          ? parseFloat(startKm.toString().replace(",", "."))
          : startKm;
      if (isNaN(parsedStartKm) || parsedStartKm < 0) {
        toast.error(
          "O Km inicial deve ser um número positivo e válido.",
        );
        return;
      }
    }

    let finalDepartureLocation = departureLocation;
    if (!finalDepartureLocation) {
      setLoadingDeparture(true);
      finalDepartureLocation = {
        latitude: -16.6542947,
        longitude: -49.2942842,
      };
      setDepartureLocation(finalDepartureLocation);
      setDepartureMessage("Localização salva automaticamente");
      setLoadingDeparture(false);
      setTimeout(() => setDepartureMessage(""), 3000);
    }

    const [y, m, d] = departureDate.split("-").map(Number);
    const formattedDate = formatDateForDisplay(
      new Date(y, m - 1, d),
    );

    // 👇 Bloqueio e aviso se hasVehicle mas nenhum veículo vinculado
    if (hasVehicle && selectedVehicleIds.length === 0) {
      toast.error(
        "Escolha um dos veículos cadastrados ou cadastre um novo antes de iniciar.",
      );
      setShowVehicleModal(true);
      return;
    }

    try {
      await onSaveTrip({
        name,
        departureLocation: departureText,
        departureCoords: finalDepartureLocation || undefined,
        departureDate: formattedDate,
        departureTime,
        details,
        startKm: hasVehicle ? Math.round(parsedStartKm) : 0,
        hasVehicle,
        vehicleIds: selectedVehicleIds, // 👈 salva os IDs
        status: "ongoing",
      });
      toast.success("Viagem iniciada com sucesso!");
      resetForm();
    } catch (err) {
      toast.error("Falha ao iniciar a viagem. Tente novamente.");
    }
  };

  // Removido auto-scroll para evitar saltos indesejados na interface
  const scrollToContinue = () => {};

const renderVehicleModal = () => {
  if (!showVehicleModal) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[70vh] overflow-y-auto flex flex-col">
        <div className="sticky top-0 bg-white p-4 border-b flex justify-between items-center z-10">
          <h3 className="text-xl font-bold text-gray-900">Gerenciar Veículos</h3>
          <button
            onClick={() => setShowVehicleModal(false)}
            className="text-gray-500 hover:text-gray-800 text-2xl"
            aria-label="Fechar"
          >
            &times;
          </button>
        </div>
        <div className="flex-grow p-4">
          <VehiclesOnTrip
            allowSelection={true}
            selectedVehicleIds={selectedVehicleIds}
            onSelectionChange={setSelectedVehicleIds}
            vehicles={vehicles}
            saveVehicle={saveVehicle}
            updateVehicle={updateVehicle}
            deleteVehicle={deleteVehicle}
            onEditComplete={() => setShowVehicleModal(false)} // Fecha após cadastro/edição
          />
        </div>
        {/* Botão flutuante "Voltar ao Topo" */}
        <button
          onClick={() => {
            document.querySelector('.scrollable-content')?.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="fixed bottom-20 right-4 bg-teal-600 text-white p-3 rounded-full shadow-lg hover:bg-teal-700 z-50"
          aria-label="Voltar ao topo"
        >
          <ArrowUp size={20} />
        </button>
      </div>
    </div>
  );
};

  return (
    <div className="p-4 md:p-6 lg:p-8">
      {renderVehicleModal()}

      <h2 className="text-2xl font-extrabold text-[#192A56] mb-6 font-heading">
        Comece sua próxima jornada
      </h2>

      <div className="space-y-6">
        <div>
          <label className="text-xs text-gray-500 block mb-1 font-medium">
            Nome da viagem
          </label>
          <Input
            placeholder="Ex: Viagem para a vovó em 2024"
            value={name}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
            className="h-12 bg-white border-gray-200 rounded-xl"
            // removido auto-scroll
          />
        </div>

        <div>
          <label className="text-xs text-gray-500 block mb-1 font-medium">
            Local de partida
          </label>
          <div className="relative">
            <MapPin
              className="absolute left-3 top-1/2 -translate-y-1/2 text-teal-600"
              size={20}
            />
            <Input
              placeholder="Ex: Casa, Goiânia, Aeroporto"
              className={`pl-10 h-12 bg-white border-gray-200 rounded-xl ${departureLocation ? "pr-12" : ""}`}
              value={departureText}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setDepartureText(e.target.value)}
              // removido auto-scroll
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
            <button
              onClick={captureLocation}
              disabled={loadingDeparture}
              className="text-xs text-fuchsia-500 hover:underline disabled:opacity-50 font-medium"
            >
              {loadingDeparture
                ? "Capturando..."
                : "📍 Usar minha localização atual"}
            </button>
            {departureLocation && (
              <span className="text-xs text-teal-600 flex items-center gap-1 font-medium">
                <Map size={12} /> Coordenadas Salvas
              </span>
            )}
            {departureMessage && (
              <p
                className={`text-xs font-medium ${departureMessage.includes("sucesso") ? "text-teal-600" : "text-red-600"}`}
              >
                {departureMessage}
              </p>
            )}
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="text-xs text-gray-500 block mb-1 font-medium">
                Data de saída
              </label>
              <Input
                type="date"
                value={departureDate}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setDepartureDate(e.target.value)
                }
                className="h-12 bg-white border-gray-200 rounded-xl text-sm"
                // removido auto-scroll
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-gray-500 block mb-1 font-medium">
                Hora de saída
              </label>
              <Input
                type="time"
                value={departureTime}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setDepartureTime(e.target.value)
                }
                className="h-12 bg-white border-gray-200 rounded-xl text-sm"
                // removido auto-scroll
              />
            </div>
          </div>
        </div>

        {/* Toggle atualizado */}
        <div className="flex items-center justify-between p-4 bg-gray-100 rounded-xl border border-gray-200">
          <label
            htmlFor="vehicle-toggle"
            className="flex items-center gap-3 cursor-pointer select-none"
          >
            {hasVehicle ? (
              <Car size={24} className="text-teal-600" />
            ) : (
              <Bus size={24} className="text-gray-500" />
            )}
            <div className="flex flex-col">
              <span className="font-semibold text-gray-800">
                Vai iniciar a viagem dirigindo?
              </span>
              <span className="text-xs text-gray-500">
                Para quem for viajar conduzindo ou anotando os dados de um veículo.
              </span>
            </div>
          </label>
          <button
            id="vehicle-toggle"
            onClick={handleToggleVehicle} // 👈 nova função
            className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors duration-300 ${hasVehicle ? "bg-teal-600 justify-end" : "bg-gray-300 justify-start"}`}
            role="switch"
            aria-checked={hasVehicle}
            aria-label={
              hasVehicle
                ? "Desativar veículo próprio"
                : "Ativar veículo próprio"
            }
          >
            <span className="block w-4 h-4 bg-white rounded-full shadow-md"></span>
          </button>
        </div>

        {hasVehicle && (
          <div className="border border-green-200 p-4 rounded-xl bg-green-50/50 space-y-4">
            {/* KM Inicial */}
            <div>
              <label className="text-xs text-gray-700 block mb-1 font-bold">
                KM inicial (Hodômetro)
              </label>
              <Input
                type="number"
                value={startKm}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setStartKm(e.target.value.replace(",", "."))
                }
                min="0"
                step="1"
                placeholder="Quilometragem no painel ao sair"
                className="h-12 bg-white border-gray-300 rounded-xl text-lg font-bold text-center"
                // removido auto-scroll
              />
            </div>

            {/* Lista de Veículos Cadastrados */}
            <div>
              <div className="flex justify-between items-center">
                <label className="text-xs text-gray-700 block mb-1 font-bold">
                  Veículo para esta viagem
                </label>
                <button
                  onClick={() => setShowVehicleModal(true)}
                  className="text-xs text-teal-600 hover:text-green-700 transition-colors flex items-center font-medium"
                >
                  + Cadastrar Novo
                </button>
              </div>

              {vehicles.length > 0 ? (
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {vehicles.map((vehicle) => (
                    <label
                      key={vehicle.id}
                      className="flex items-center p-2 bg-white rounded-lg border hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedVehicleIds.includes(vehicle.id)}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => {
                          if (e.target.checked) {
                            setSelectedVehicleIds([...selectedVehicleIds, vehicle.id]);
                          } else {
                            setSelectedVehicleIds(selectedVehicleIds.filter((id) => id !== vehicle.id));
                          }
                        }}
                        className="h-4 w-4 text-teal-600 focus:ring-green-500"
                      />
                      <div className="ml-3 min-w-0">
                        <p className="font-medium text-gray-800 truncate">
                          {vehicle.nickname}
                        </p>
                        <p className="text-xs text-gray-600 truncate">
                          {vehicle.make} {vehicle.model} • {vehicle.licensePlate}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-500 italic">
                  Nenhum veículo cadastrado. Clique em "Cadastrar Novo" para adicionar.
                </p>
              )}
            </div>
          </div>
        )}
        <div>
          <label className="text-xs text-gray-500 block mb-1 font-medium">
            Visão geral
          </label>
          <Input
            placeholder="Faça uma descrição rápida da sua viagem 🙂🙂"
            value={details}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setDetails(e.target.value)}
            className="h-12 bg-white border-gray-200 rounded-xl"
            // removido auto-scroll
          />
        </div>

        <div ref={continueButtonRef} className="pt-4 pb-16">
          <Button
            onClick={handleContinue}
            disabled={loadingDeparture}
            className="w-full h-14 bg-fuchsia-500 hover:bg-fuchsia-600 text-white rounded-xl text-lg shadow-lg"
          >
            {loadingDeparture
              ? "Preparando..."
              : "Iniciar viagem"}
          </Button>
        </div>
      </div>
    </div>
  );
}
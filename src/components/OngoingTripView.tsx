import React, { useState, useEffect, useMemo } from "react";
import { StopForm } from "./StopForm";
import { useTrips } from "./useTrips";
// Componentes UI implementados diretamente com Tailwind para evitar erros de importação

type ButtonProps = {
  children: React.ReactNode;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  className?: string;
  variant?: "default" | "outline";
  disabled?: boolean;
} & React.ButtonHTMLAttributes<HTMLButtonElement>;

const Button: React.FC<ButtonProps> = ({
  children,
  onClick,
  className = "",
  variant = "default",
  disabled = false,
  ...props
}) => {
  let baseClasses =
    "flex items-center justify-center rounded-xl font-bold transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed";

  if (variant === "default") {
    baseClasses +=
      " bg-green-600 hover:bg-green-700 text-white";
  } else if (variant === "outline") {
    baseClasses +=
      " bg-white border border-gray-300 text-gray-700 hover:bg-gray-50";
  }

  return (
    <button
      onClick={onClick}
      className={`${baseClasses} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};

const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = ({ className = "", ...props }) => {
  return (
    <input
      className={`w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm transition-colors focus:border-fuchsia-500 focus:ring-1 focus:ring-fuchsia-500 focus:outline-none ${className}`}
      {...props}
    />
  );
};

type SelectItemProps = { value: string; children: React.ReactNode; onSelect?: (value: string) => void };
const SelectItem: React.FC<SelectItemProps> = ({ value, children, onSelect }) => (
  <div
    onClick={() => onSelect?.(value)}
    className="py-2 px-3 hover:bg-gray-100 cursor-pointer text-sm"
  >
    {children}
  </div>
);

type SelectTriggerProps = { children?: React.ReactNode; placeholder?: string; value?: string; onClick?: () => void };
const SelectTrigger: React.FC<SelectTriggerProps> = ({
  children,
  placeholder,
  value,
  onClick,
}) => (
  <div
    onClick={onClick}
    className="flex justify-between items-center w-full bg-white shadow-sm border border-gray-300 rounded-xl px-4 py-2 cursor-pointer text-sm text-left"
  >
    <span
      className={!value ? "text-gray-500" : "text-gray-900"}
    >
      {children || placeholder}
    </span>
    <svg
      className="w-4 h-4 text-gray-500 ml-2"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M19 9l-7 7-7-7"
      ></path>
    </svg>
  </div>
);

type SelectContentProps = { children: React.ReactNode; isVisible: boolean };
const SelectContent: React.FC<SelectContentProps> = ({ children, isVisible }) => {
  if (!isVisible) return null;
  return (
    <div className="absolute z-10 mt-1 w-full rounded-xl bg-white shadow-lg border border-gray-200 max-h-60 overflow-y-auto">
      {children}
    </div>
  );
};

type SelectProps = {
  value?: string;
  onValueChange: (value: string) => void;
  children: React.ReactElement<SelectItemProps>[] | React.ReactElement<SelectItemProps>;
  placeholder?: string;
};
const Select: React.FC<SelectProps> = ({
  value,
  onValueChange,
  children,
  placeholder,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const childArray = Array.isArray(children) ? children : [children];
  const selectedItem = childArray.find((child) => child.props.value === value);

  const handleSelect = (newValue: string) => {
    onValueChange(newValue);
    setIsOpen(false);
  };

  const clonedChildren = React.Children.map(childArray, (child) =>
    React.cloneElement(child, { onSelect: handleSelect } as Partial<SelectItemProps>),
  );

  return (
    <div className="relative">
      <SelectTrigger
        onClick={() => setIsOpen(!isOpen)}
        value={value}
        placeholder={placeholder}
      >
        {selectedItem?.props?.children}
      </SelectTrigger>
      <SelectContent isVisible={isOpen}>
        {clonedChildren}
      </SelectContent>
    </div>
  );
};

// Ícones
import { MapPin, Edit, Trash, LogOut, Car, Book, Link as LinkIcon, AlertTriangle, Search, Eye, ChevronUp, ChevronDown } from "lucide-react"; // 👈 adiciona Eye e setas
import StopDetailsModal from "./StopDetailsModal";
import Modal from "./Modal";
import { Switch } from "./ui/switch";
import { toast } from "sonner";

// Tipos
import type { Trip, Vehicle, TripVehicleSegment } from "./useTrips";

  interface OngoingTripViewProps {
    trips: Trip[];
    vehicles?: Vehicle[]; // 👈 receber veículos do App para reatividade
    initialSelectedTripId?: string; // ID inicial para seleção de viagem
    onEdit: (trip: Trip) => void;
    onDelete: (id: string) => void;
    onComplete: (tripId: string) => void;
    onUpdateKm?: (tripId: string, newKm: number) => void;
    onUpdateStartKm?: (tripId: string, newStartKm: number) => void;
    onRemoveVehicleFromTrip?: (tripId: string) => void; // 👈 ação de desvincular veículo
    onAttachVehicleToTrip?: (tripId: string, vehicleId: string, startKm?: number | null) => void; // 👈 ação de vincular
    onDetachVehicleFromTrip?: (tripId: string, vehicleId: string) => void; // 👈 ação de desvincular individual
    saveVehicle?: (vehicle: Omit<Vehicle, 'id'>) => Promise<Vehicle>;
    updateVehicle?: (id: string, updates: Partial<Vehicle>) => Promise<Vehicle>;
    updateTrip?: (id: string, updates: Partial<Trip>) => Promise<Trip>;
  }

  export function OngoingTripView({
    trips,
    vehicles: vehiclesProp,
    initialSelectedTripId,
    onEdit,
    onDelete,
    onComplete,
    onUpdateKm,
    onUpdateStartKm,
    onRemoveVehicleFromTrip,
    onAttachVehicleToTrip,
    onDetachVehicleFromTrip,
    saveVehicle: saveVehicleProp,
    updateVehicle: updateVehicleProp,
    updateTrip: updateTripProp,
  }: OngoingTripViewProps) {
  // Preferir veículos vindos do App para evitar instância duplicada do hook
  const {
    vehicles: vehiclesFromHook,
    saveStop,
    updateStop,
    deleteStop,
    getTripVehicleSegments,
    deleteTripVehicleSegments,
    updateTripVehicleInitialKm,
    updateTripVehicleCurrentKm,
    // 👇 usar para criar segmento ao vincular veículo
    saveTripVehicleSegment,
    deleteVehicle,
    saveVehicle: hookSaveVehicle,
    updateVehicle: hookUpdateVehicle,
  } = useTrips();
  const vehicles = React.useMemo(() => {
    const map = new Map<string, Vehicle>();
    (vehiclesFromHook || []).forEach((v) => map.set(v.id, v));
    (vehiclesProp || []).forEach((v) => map.set(v.id, v)); // props prevalecem para IDs já existentes
    return Array.from(map.values());
  }, [vehiclesProp, vehiclesFromHook]);
  const sortedTrips = useMemo(() => {
    return [...trips].sort((a, b) => {
      const parseDateTime = (
        dateStr: string,
        timeStr: string,
      ) => {
        const [d, m, y] = dateStr.split("/").map(Number);
        const [h, min] = timeStr.split(":").map(Number);
        return new Date(y, m - 1, d, h, min);
      };
      const dateA = parseDateTime(a.departureDate, a.departureTime);
      const dateB = parseDateTime(b.departureDate, b.departureTime);
      // Ordenar por mais recente primeiro
      return dateB.getTime() - dateA.getTime();
    });
  }, [trips]);

  const [selectedTripId, setSelectedTripId] = useState<string>(sortedTrips[0]?.id || "");
  const [showStopModal, setShowStopModal] = useState(false);
  const [editingStop, setEditingStop] = useState<any | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewingStop, setViewingStop] = useState<any | null>(null);
  // Aviso quando tentar adicionar/editar parada sem veículo selecionado
  const [showVehicleWarning, setShowVehicleWarning] = useState(false);
  const [vehicleWarningText, setVehicleWarningText] = useState<string>(
    "Para adicionar paradas a esta viagem, selecione um dos seus veículos ou cadastre um novo, clicando em ‘Não encontrou o seu veículo?’ e refaça a adição da parada."
  );
  const listRefVehicles = React.useRef<HTMLDivElement | null>(null);
  const [showDeleteStopConfirm, setShowDeleteStopConfirm] = useState(false);
  const [stopToDelete, setStopToDelete] = useState<any | null>(null);
  const [isDriving, setIsDriving] = useState(false);
  const [segments, setSegments] = useState<TripVehicleSegment[]>([]);
  const [initialKmInputs, setInitialKmInputs] = useState<Record<string, string>>({});
  const [isEnding, setIsEnding] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] =
    useState(false);
  const [showCompleteConfirm, setShowCompleteConfirm] =
    useState(false);
  const [showEndModal, setShowEndModal] = useState(false);
  const [timeTick, setTimeTick] = useState(0);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [showRodizioModal, setShowRodizioModal] = useState(false);
  const [rodizioText, setRodizioText] = useState<string>("");
  // Confirmação de exclusão de veículo (Seus veículos)
  const [showDeleteVehicleConfirm, setShowDeleteVehicleConfirm] = useState(false);
  const [vehicleToDeleteId, setVehicleToDeleteId] = useState<string | null>(null);

  // 👇 Estados para o modal de veículo
  const [showVehicleModal, setShowVehicleModal] =
    useState(false);
  const [editingVehicleId, setEditingVehicleId] = useState<
    string | null
  >(null);
  // Modal de vincular veículo: odômetro atual + tanque cheio
  const [showAttachModal, setShowAttachModal] = useState(false);
  const [vehicleToAttachId, setVehicleToAttachId] = useState<string>("");
  const [attachOdometer, setAttachOdometer] = useState<string>("");

  useEffect(() => {
    // Preferir ID inicial vindo do App, se existir na lista
    if (initialSelectedTripId && sortedTrips.some((t) => t.id === initialSelectedTripId)) {
      setSelectedTripId(initialSelectedTripId);
      return;
    }
    // Caso contrário, manter seleção atual se ainda existir; senão selecionar a mais recente
    if (sortedTrips.length > 0 && (!selectedTripId || !sortedTrips.find((t) => t.id === selectedTripId))) {
      setSelectedTripId(sortedTrips[0].id);
    } else if (sortedTrips.length === 0) {
      setSelectedTripId("");
    }
  }, [sortedTrips, selectedTripId, initialSelectedTripId]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeTick((prev) => prev + 1);
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // 👇 Resolve veículo pelo estado do hook; fallback para localStorage
  const getVehicleById = (id: string): Vehicle | null => {
    // 1) Tenta pelo estado recebido por props (App)
    const found = vehicles.find((v) => v.id === id);
    if (found) return found;
    // 2) Fallback: tentar na chave localStorage atual
    try {
      const storedNew = localStorage.getItem("vehicles");
      if (storedNew) {
        const vehiclesNew: Vehicle[] = JSON.parse(storedNew);
        const byNew = vehiclesNew.find((v) => v.id === id);
        if (byNew) return byNew;
      }
    } catch (e) {
      console.error("Erro ao carregar veículo (vehicles):", e);
    }
    // 3) Fallback legado: chave antiga
    try {
      const storedOld = localStorage.getItem("trip_vehicles_v2");
      if (storedOld) {
        const vehiclesOld: Vehicle[] = JSON.parse(storedOld);
        return vehiclesOld.find((v) => v.id === id) || null;
      }
    } catch (e) {
      console.error("Erro ao carregar veículo (trip_vehicles_v2):", e);
    }
    return null;
  };

  const selectedTrip =
    sortedTrips.find((t) => t.id === selectedTripId) ||
    sortedTrips[0];

  // Sincroniza o toggle "Vai dirigir" com o dado da viagem selecionada
  useEffect(() => {
    setIsDriving(Boolean(selectedTrip?.isDriving));
  }, [selectedTrip?.id, selectedTrip?.isDriving]);

  // Calcular duração corrigida - formato: "X dias, Y horas e Z minutos"
  const getDuration = () => {
    try {
      const [d, m, y] = selectedTrip.departureDate
        .split("/")
        .map(Number);
      const [h, min] = selectedTrip.departureTime
        .split(":")
        .map(Number);

      if (
        isNaN(d) ||
        isNaN(m) ||
        isNaN(y) ||
        isNaN(h) ||
        isNaN(min)
      ) {
        return "—";
      }

      // Nota: O mês no construtor de Date é baseado em 0 (janeiro é 0), por isso 'm - 1'.
      const startDate = new Date(y, m - 1, d, h, min);

      if (isNaN(startDate.getTime())) {
        return "—";
      }

      const now = new Date();
      let diffMs = now.getTime() - startDate.getTime();

      // Se a diferença for negativa (data futura), mostrar 0m
      if (diffMs < 0) {
        return "0m";
      }

      // Arredonda para o minuto anterior
      diffMs = Math.floor(diffMs / (1000 * 60)) * (1000 * 60);

      // --- Cálculo da Duração (Dias, Horas, Minutos) ---

      const diffDays = Math.floor(
        diffMs / (1000 * 60 * 60 * 24),
      );

      const remainingMsAfterDays =
        diffMs % (1000 * 60 * 60 * 24);

      const diffHours = Math.floor(
        remainingMsAfterDays / (1000 * 60 * 60),
      );

      const remainingMsAfterHours =
        remainingMsAfterDays % (1000 * 60 * 60);

      const diffMinutes = Math.floor(
        remainingMsAfterHours / (1000 * 60),
      );

      // Se a duração for 0, mas o cronômetro estiver ativo (após 1 tick)
      if (
        diffDays === 0 &&
        diffHours === 0 &&
        diffMinutes === 0 &&
        timeTick > 0
      ) {
        return "1m";
      }

      const parts: string[] = [];

      if (diffDays > 0) parts.push(`${diffDays} dias`);
      if (diffHours > 0) parts.push(`${diffHours} h`);
      if (diffMinutes > 0) parts.push(`${diffMinutes} min`);

      if (parts.length === 0) {
        return "Aguardando...";
      }

      // Formatação final curta: "Xd, Yh, Zm"
      return parts.join(", ");
    } catch (error) {
      console.error("Erro ao calcular duração:", error);
      return "—";
    }
  };

  const openInMaps = () => {
    if (!selectedTrip.departureCoords) {
      toast.error("Localização não disponível");
      return;
    }
    window.open(
      `https://www.google.com/maps?q=${selectedTrip.departureCoords.latitude},${selectedTrip.departureCoords.longitude}`,
      "_blank",
    );
  };

  // Removido fluxo de edição de KM aqui; KM será atualizado via paradas.

  // Helper para abrir modal de vínculo já com veículo selecionado
  const openAttachModalForVehicle = (id: string) => {
    setVehicleToAttachId(id);
    const preset = getVehicleById(id)?.kmInitial ?? 0;
    setAttachOdometer(String(Math.round(preset)));
    setShowAttachModal(true);
  };



  // Sem edição inline de KM: handlers removidos.

  const handleDelete = () => {
    onDelete(selectedTrip.id);
    toast.success("Viagem excluída!");
    setShowDeleteConfirm(false);
  };

  const handleComplete = () => {
    setShowEndModal(true);
    setShowCompleteConfirm(false);
  };

  const currentKm = Math.round(
    (selectedTrip?.endKm ?? selectedTrip?.startKm ?? 0),
  );

  // Carregar segmentos desta viagem quando selecionada
  useEffect(() => {
    (async () => {
      if (!selectedTrip?.id) return;
      try {
        const data = await getTripVehicleSegments(selectedTrip.id);
        setSegments(data || []);
      } catch (e) {
        console.warn("Falha ao carregar segmentos", e);
        setSegments([]);
      }
    })();
  }, [selectedTrip?.id]);

  // Estatísticas por veículo da viagem
  const perVehicleStats = useMemo(() => {
    const stats = new Map<string, { initial: number; current: number; total: number }>();
    const ids = selectedTrip?.vehicleIds || [];
    ids.forEach((vid) => {
      const segs = segments
        .filter((s) => s.vehicleId === vid)
        .sort((a, b) => {
          const da = new Date(a.segmentDate).getTime();
          const db = new Date(b.segmentDate).getTime();
          if (da !== db) return da - db;
          const ca = a.created_at ? new Date(a.created_at).getTime() : 0;
          const cb = b.created_at ? new Date(b.created_at).getTime() : 0;
          return ca - cb;
        });
      const v = getVehicleById(vid);
      const initial = segs.length > 0 ? (segs[0].initialKm ?? 0) : (v?.kmInitial ?? 0);
      const current = segs.length > 0 ? (segs[segs.length - 1].currentKm ?? initial) : initial;
      const total = Math.max(0, (current ?? 0) - (initial ?? 0));
      stats.set(vid, { initial, current, total });
    });
    return stats;
  }, [selectedTrip?.vehicleIds, segments, vehicles]);

  const tripTotalKm = useMemo(() => {
    // Recalcular o total rodado somando o delta por parada
    const stops = [...(selectedTrip?.stops || [])];
    // Ordenação consistente com stopEntries
    stops.sort((a, b) => {
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
    // Base inicial: KM inicial do veículo principal ou startKm da viagem
    const primaryVehicleId = selectedTrip?.vehicleIds?.[0] ?? null;
    const primaryStats = primaryVehicleId ? perVehicleStats.get(primaryVehicleId) : undefined;
    const initialKmBase = (primaryStats?.initial ?? selectedTrip?.startKm ?? 0);
    let prevKm = initialKmBase;
    let total = 0;
    for (const s of stops) {
      const dep = (typeof s.departureKm === 'number') ? s.departureKm : null;
      const arr = (typeof s.arrivalKm === 'number') ? s.arrivalKm : null;
      // Delta da parada: saída - anterior; se não houver saída, usar chegada
      const base = dep !== null ? dep : (arr !== null ? arr : prevKm);
      const delta = Math.max(0, (base ?? prevKm) - (prevKm ?? initialKmBase));
      total += delta;
      // Atualizar prevKm para próxima parada de forma robusta
      prevKm = dep !== null && typeof dep === 'number' && (arr === null || dep >= (arr ?? prevKm))
        ? dep
        : (arr ?? prevKm);
    }
    return Math.round(total);
  }, [selectedTrip?.stops, selectedTrip?.startKm, selectedTrip?.vehicleIds, perVehicleStats]);

  // Total de gastos das paradas
  const tripCostTotal = useMemo(() => {
    // Somar diretamente valores em reais (sem dividir por 100)
    const totalReais = (selectedTrip?.stops || []).reduce((acc, s) => acc + (Number(s.cost) || 0), 0);
    return totalReais;
  }, [selectedTrip?.stops]);

  const formatBRL = (reais: number) => {
    const val = Number(reais || 0);
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  // Lista de paradas com cálculo de "Km até a parada" = acumulado dos deltas de chegada + variação da parada anterior
  const stopEntries = useMemo(() => {
    const stops = [...(selectedTrip?.stops || [])];
    // Ordenar por data/hora de chegada (se disponível), fallback created_at
    stops.sort((a, b) => {
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
    // Base: KM inicial do veículo vinculado (ou startKm da viagem)
    const primaryVehicleId = selectedTrip?.vehicleIds?.[0] ?? null;
    const primaryStats = primaryVehicleId ? perVehicleStats.get(primaryVehicleId) : undefined;
    const initialKmBase = (primaryStats?.initial ?? selectedTrip?.startKm ?? 0);
    let prevKm = initialKmBase;
    let cumulativeSoFar = 0;
    let lastVariation = 0; // variação da parada anterior (saída - chegada)
    return stops.map((s, idx) => {
      const arr = typeof s.arrivalKm === 'number' ? s.arrivalKm : prevKm;
      const dep = typeof s.departureKm === 'number' ? s.departureKm : null;
      const distanceToStop = idx === 0 ? 0 : Math.max(0, (typeof arr === 'number' ? arr : prevKm) - (prevKm ?? initialKmBase));
      // Km até a parada (acumulado): km anterior acumulado + variação da parada anterior + distância até a parada
      cumulativeSoFar = Math.max(0, cumulativeSoFar + (lastVariation || 0) + distanceToStop);
      // Calcula variação da parada atual para próxima iteração
      const variationAtStop = (dep !== null && typeof dep === 'number' && typeof arr === 'number')
        ? Math.max(0, dep - arr)
        : 0;
      lastVariation = variationAtStop;
      // Atualiza prevKm para próxima parada: usa saída (se válida), senão chegada
      prevKm = dep !== null && typeof dep === 'number' && dep >= (arr ?? prevKm) ? dep : (arr ?? prevKm);
      return {
        id: s.id,
        arrivalDateTime: s.arrivalDate && s.arrivalTime ? `${s.arrivalDate}, ${s.arrivalTime}` : '—',
        place: s.name || '—',
        cumulativeKm: Math.round(cumulativeSoFar),
        raw: s,
      };
    });
  }, [selectedTrip?.stops, selectedTrip?.startKm, selectedTrip?.vehicleIds, perVehicleStats]);
  // Calcula o KM anterior para um stop específico (ou para nova parada)
  const computePreviousKmForStop = (targetStopId?: string | null): number => {
    const stops = [...(selectedTrip?.stops || [])];
    stops.sort((a, b) => {
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
    // Base correta: KM inicial do veículo/viagem (não o atual), para manter a parada inicial com anterior=chegada=saída
    const primaryVehicleId = selectedTrip?.vehicleIds?.[0] ?? null;
    const primaryStats = primaryVehicleId ? perVehicleStats.get(primaryVehicleId) : undefined;
    let prevKm = (primaryStats?.initial ?? selectedTrip?.startKm ?? 0);
    for (const s of stops) {
      if (targetStopId && s.id === targetStopId) return prevKm ?? 0;
      const arr = typeof s.arrivalKm === 'number' ? s.arrivalKm : prevKm;
      const dep = typeof s.departureKm === 'number' ? s.departureKm : null;
      prevKm = dep !== null && typeof dep === 'number' && dep >= (arr ?? prevKm) ? dep : (arr ?? prevKm);
    }
    return prevKm ?? 0;
  };

  // Calcula data/hora de saída da parada anterior
  const computePreviousDepartureForStop = (targetStopId?: string | null): { date?: string; time?: string } => {
    const stops = [...(selectedTrip?.stops || [])];
    stops.sort((a, b) => {
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
    let previous: any | null = null;
    for (const s of stops) {
      if (targetStopId && s.id === targetStopId) {
        // Usa saída da parada imediatamente anterior, se existir
        if (previous?.departureDate && previous?.departureTime) {
          return { date: previous.departureDate, time: previous.departureTime };
        }
        return {};
      }
      previous = s;
    }
    // Caso seja nova parada (sem id), usa última parada cadastrada
    const last = stops.length > 0 ? stops[stops.length - 1] : null;
    if (last?.departureDate && last?.departureTime) {
      return { date: last.departureDate, time: last.departureTime };
    }
    return {};
  };

  // Atualiza mapa de inputs de KM inicial quando segmentos ou veículos mudam
  useEffect(() => {
    const ids = selectedTrip?.vehicleIds || [];
    const next: Record<string, string> = {};
    ids.forEach((vid) => {
      const stat = perVehicleStats.get(vid);
      const initial = Math.round(stat?.initial ?? (getVehicleById(vid)?.kmInitial ?? 0));
      next[vid] = String(initial);
    });
    setInitialKmInputs(next);
  }, [selectedTrip?.vehicleIds, segments, vehicles]);

  const handleDetachVehicleCascade = async (vehicleId: string) => {
    try {
      // Regra: não desvincular se houver paradas ativas (dirigindo)
      const hasActiveStops = (selectedTrip?.stops || []).some((s: any) => Boolean(s.wasDriving));
      if (hasActiveStops) {
        toast.warning("Não é possível desvincular com paradas ativas. Remova/edite as paradas primeiro.");
        return;
      }
      // Se existirem segmentos para este veículo, remover automaticamente com confirmação implícita
      const allSegs = segments.length > 0 ? segments : await getTripVehicleSegments(selectedTrip.id);
      const segsForVehicle = (allSegs || []).filter((s) => s.vehicleId === vehicleId);
      if (segsForVehicle.length > 0) {
        toast.info("Removendo trechos antes de desvincular o veículo...");
        await deleteTripVehicleSegments(selectedTrip.id, vehicleId);
      }
      await onDetachVehicleFromTrip?.(selectedTrip.id, vehicleId);
      const data = await getTripVehicleSegments(selectedTrip.id);
      setSegments(data || []);
      toast.success("Veículo removido.");
    } catch (e) {
      console.warn("Erro ao remover veículo", e);
      toast.error("Falha ao remover veículo.");
    }
  };

  const handleUpdateInitialKm = async (vehicleId: string) => {
    const text = initialKmInputs[vehicleId];
    const value = Number(text);
    if (isNaN(value) || value < 0) {
      toast.error("Informe um KM inicial válido.");
      return;
    }
    try {
      await updateTripVehicleInitialKm(selectedTrip.id, vehicleId, value);
      // Ajuste solicitado: assumir KM final (atual) provisoriamente igual ao inicial
      await updateTripVehicleCurrentKm(selectedTrip.id, vehicleId, value);
      // Recarregar segmentos para refletir a alteração
      const data = await getTripVehicleSegments(selectedTrip.id);
      setSegments(data || []);
      toast.success("Km inicial atualizado.");
    } catch (e) {
      toast.error("Falha ao atualizar Km inicial.");
    }
  };

  useEffect(() => {
    setShowDeleteConfirm(false);
    setShowCompleteConfirm(false);
  }, [selectedTripId]);

  if (trips.length === 0 || !selectedTrip) {
    return (
      <div className="p-8 text-center bg-gray-50 min-h-full flex items-center justify-center">
        <p className="text-gray-500 font-medium text-lg">
          Nenhuma viagem em andamento.
        </p>
      </div>
    );
  }

  // 👇 Adicione logo após os outros useState/useEffect
  

  const renderConfirmationModal = (
    isVisible: boolean,
    title: string,
    message: string,
    onConfirm: () => void,
    onCancel: () => void,
  ) => {
    if (!isVisible) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 space-y-5">
          <div className="flex items-center gap-2">
            {title === "Aviso" && (
              <AlertTriangle className="text-yellow-500" size={20} />
            )}
            <h3 className="text-xl font-bold text-gray-900">
              {title}
            </h3>
          </div>
          <p className="text-gray-600 whitespace-pre-line">{message}</p>
          {title === "Aviso" ? (
            <div className="flex justify-end gap-3">
              <Button
                onClick={onCancel}
                className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white py-2 px-4"
              >
                OK
              </Button>
            </div>
          ) : (
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={onCancel}
                className="w-full sm:w-auto border-gray-300 text-gray-700 hover:bg-gray-50 py-2 px-4"
              >
                Cancelar
              </Button>
              <Button
                onClick={onConfirm}
                className={`w-full sm:w-auto font-semibold py-2 px-4 ${title.includes("Excluir") ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"}`}
              >
                {title.includes("Excluir")
                  ? "Excluir"
                  : "Confirmar"}
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  };

  // 👇 Import dinâmico para evitar erro se VehiclesOnTrip não estiver disponível
  const VehiclesOnTrip = React.lazy(
    () => import("./VehiclesOnTrip"),
  );

  // Rodízio SP: dia por final da placa
  const getRodizioDay = (plate: string): number | null => {
    const digits = plate.replace(/[^0-9]/g, "");
    const last = digits ? Number(digits[digits.length - 1]) : NaN;
    if (isNaN(last)) return null;
    // 0=domingo,1=segunda,...,6=sábado
    if ([1, 2].includes(last)) return 1; // segunda
    if ([3, 4].includes(last)) return 2; // terça
    if ([5, 6].includes(last)) return 3; // quarta
    if ([7, 8].includes(last)) return 4; // quinta
    if ([9, 0].includes(last)) return 5; // sexta
    return null;
  };

  const dayNamePt = (d: number) =>
    ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"][d] || "";

  const getRodizioWarning = (plate?: string | null) => {
    if (!plate) return "";
    const now = new Date();
    const today = now.getDay();
    const hour = now.getHours();
    const rodizioDay = getRodizioDay(plate);
    if (rodizioDay == null) return "";
    const schedule = "das 7h às 10h e das 17h às 20h";
    // Mostrar alerta no dia do rodízio
    if (today === rodizioDay) {
      return `Rodízio desta placa ${dayNamePt(rodizioDay)} ${schedule}`;
    }
    // Alerta antecipado: a partir de 00:01 do dia anterior ao rodízio
    const minute = now.getMinutes();
    const prevDay = (rodizioDay + 6) % 7; // dia anterior
    if (today === prevDay && (hour > 0 || minute >= 1)) {
      return `Alerta antecipado: rodízio desta placa ${dayNamePt(rodizioDay)} ${schedule}`;
    }
    return "";
  };
  const getRodizioDetails = (plate?: string | null) => {
    if (!plate) return "";
    const digits = plate.replace(/[^0-9]/g, "");
    const last = digits ? Number(digits[digits.length - 1]) : NaN;
    const d = getRodizioDay(plate);
    if (isNaN(last) || d == null) return "";
    const schedule = "das 7h às 10h e das 17h às 20h";
    return `Alerta de rodízio:\nplaca final ${last} não pode trafegar em São Paulo as ${dayNamePt(d)} ${schedule}. Evite multas.`;
  };
  const TripEndModal = React.lazy(
    () => import("./TripEndModal"),
  );

  return (
    <div className="bg-gray-50 min-h-screen pb-24 relative">
      {renderConfirmationModal(
        showDeleteConfirm,
        "Excluir Viagem",
        `Tem certeza que deseja excluir permanentemente a viagem "${selectedTrip.name}"? Esta ação não pode ser desfeita.`,
        handleDelete,
        () => setShowDeleteConfirm(false),
      )}

      {renderConfirmationModal(
        showCompleteConfirm,
        "Encerrar viagem",
        `Abrir modal de encerramento para "${selectedTrip.name}"?`,
        handleComplete,
        () => setShowCompleteConfirm(false),
      )}

      <div className="pt-4 px-4">
        {sortedTrips.length > 1 && (
          <div className="pb-4">
            <label className="text-xs text-gray-500 block mb-2">
              Selecione a viagem
            </label>
            <Select
              value={selectedTripId}
              onValueChange={setSelectedTripId}
              placeholder="Selecione uma viagem"
            >
              {sortedTrips.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name} • {t.departureDate} {t.departureTime}
                </SelectItem>
              ))}
            </Select>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-lg p-4 space-y-4 border border-gray-100">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0 pr-4">
              <span className="bg-green-600 text-white text-xs px-2 py-0.5 rounded-full font-medium">
                Em andamento
              </span>
              <h2 className="text-xl font-extrabold text-gray-900 truncate mt-1">
                {selectedTrip.name}
              </h2>
            </div>
            <div className="flex gap-2 items-center flex-shrink-0 pt-1">
              <button
                onClick={() => onEdit(selectedTrip)}
                className="text-[#192A56] hover:bg-blue-50 p-2 rounded-xl transition-colors"
                title="Editar"
              >
                <Edit size={20} />
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="text-red-500 hover:bg-red-50 p-2 rounded-xl transition-colors"
                title="Excluir"
              >
                <Trash size={20} />
              </button>
              <div className="flex items-center gap-1">
                <span className="text-xs text-gray-600">Encerrar?</span>
                <Switch
                  checked={isEnding}
                  onCheckedChange={(val) => {
                    setIsEnding(val);
                    if (val) {
                      setShowEndModal(true);
                    } else {
                      setShowEndModal(false);
                    }
                  }}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 border-t border-gray-200 pt-4">
            <div className="text-left">
              <p className="text-xs text-gray-500 mb-1 font-medium">Local de partida</p>
              <button
                onClick={openInMaps}
                disabled={!selectedTrip.departureCoords}
                className="inline-flex items-center gap-2 min-w-0 disabled:cursor-default"
              >
                <MapPin className="text-green-600 flex-shrink-0" size={16} />
                <span className={`text-sm truncate font-medium ${selectedTrip.departureCoords ? "text-fuchsia-500 hover:underline" : "text-gray-600"}`}>
                  {selectedTrip.departureLocation || "Coordenadas não registradas"}
                </span>
              </button>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500 mb-1 font-medium">Início</p>
              <p className="text-sm font-semibold text-gray-900">
                {selectedTrip.departureDate}, {selectedTrip.departureTime}
              </p>
            </div>

            <div className="col-span-2 border-t border-dashed border-gray-200 pt-4">
              {isDriving ? (
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-1 font-medium">Duração</p>
                    <p className="text-sm font-semibold text-gray-900">{getDuration()}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-500 mb-1 font-medium">Distância percorrida</p>
                    <p className="text-sm font-semibold text-gray-900">{tripTotalKm} km</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500 mb-1 font-medium">Gastos da viagem</p>
                    <p className="text-sm font-semibold text-gray-900">{formatBRL(tripCostTotal)}</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-1 font-medium">Duração</p>
                    <p className="text-sm font-semibold text-gray-900">{getDuration()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500 mb-1 font-medium">Gastos da viagem</p>
                    <p className="text-sm font-semibold text-gray-900">{formatBRL(tripCostTotal)}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
          {/* Lista simples de paradas movida para após os botões */}
          {showStopModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] overflow-y-auto">
                <StopForm
                  tripId={selectedTrip.id}
                  currentKm={currentKm}
                  initialIsDriving={isDriving}
                  initialData={editingStop || undefined}
                  previousKm={computePreviousKmForStop(editingStop?.id ?? null)}
                  previousStopDepartureDate={computePreviousDepartureForStop(editingStop?.id ?? null).date}
                  previousStopDepartureTime={computePreviousDepartureForStop(editingStop?.id ?? null).time}
                  vehicleInUseName={(selectedTrip.vehicleIds?.[0] ? (getVehicleById(selectedTrip.vehicleIds[0])?.nickname ?? '') : undefined)}
                  onSave={async (stopData) => {
                    try {
                      const saved = editingStop?.id
                        ? await updateStop(editingStop.id, stopData)
                        : await saveStop(stopData);
                      // Recarrega segmentos para refletir KM atual do veículo
                      try {
                        const data = await getTripVehicleSegments(selectedTrip.id);
                        setSegments(data || []);
                      } catch (e) {
                        console.warn("Falha ao recarregar segmentos após salvar/editar parada", e);
                      }
                      // Manter modal aberto para preencher dados de saída
                      setEditingStop(saved);
                      setShowStopModal(true);
                    } catch (e) {
                      console.warn("Falha ao salvar/editar parada", e);
                    }
                  }}
                  onDepartNow={async (updates) => {
                    try {
                      if (!editingStop?.id) return;
                      const saved = await updateStop(editingStop.id, updates);
                      // Recarrega segmentos após registrar saída
                      try {
                        const data = await getTripVehicleSegments(selectedTrip.id);
                        setSegments(data || []);
                      } catch (e) {
                        console.warn("Falha ao recarregar segmentos após saída", e);
                      }
                      // Fechar modal ao concluir saída
                      setEditingStop(saved);
                      setShowStopModal(false);
                    } catch (e) {
                      console.warn("Falha ao registrar saída agora", e);
                    }
                  }}
                  onCancel={() => setShowStopModal(false)}
                />
              </div>
            </div>
          )}
          {showViewModal && viewingStop && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] overflow-y-auto">
                <StopDetailsModal
                  stop={viewingStop}
                  onClose={() => { setShowViewModal(false); setViewingStop(null); }}
                  onEdit={() => { setEditingStop(viewingStop); setShowViewModal(false); setShowStopModal(true); }}
                />
              </div>
            </div>
          )}
          {showDeleteStopConfirm && stopToDelete && renderConfirmationModal(
            true,
            "Excluir Parada",
            `Tem certeza que deseja excluir a parada "${stopToDelete.name || ''}"?`,
            async () => {
              try {
                // Bloquear exclusão da parada inicial se houver posteriores
                const orderedStops = [...(selectedTrip?.stops || [])].sort((a, b) => {
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
                const firstStop = orderedStops[0] || null;
                const hasLaterStops = orderedStops.length > 1;
                if (firstStop && firstStop.id === stopToDelete.id && hasLaterStops) {
                  toast.error("A parada inicial não pode ser excluída enquanto houver paradas posteriores.");
                  return;
                }
                await deleteStop(stopToDelete.id);
                // Aguarda o estado atualizar para evitar condições de corrida entre exclusão de parada e atualização da viagem
                await new Promise((resolve) => setTimeout(resolve, 100));
                // Reavalia a viagem e paradas já atualizadas
                const latestTrip = trips.find((t) => t.id === selectedTrip.id) || selectedTrip;
                const remainingStops = (latestTrip?.stops || []);
                const hasDrivingStops = remainingStops.some((s: any) => Boolean(s.wasDriving));
                const primaryVehicleId = latestTrip?.vehicleIds?.[0] ?? null;
                if (!hasDrivingStops && primaryVehicleId) {
                  try {
                    // Apaga segmentos do veículo primário
                    await deleteTripVehicleSegments(latestTrip.id, primaryVehicleId);
                    // Remove vínculo do veículo da viagem (trip_vehicles)
                    await onDetachVehicleFromTrip?.(latestTrip.id, primaryVehicleId);
                  } catch (e) {
                    console.warn('Falha ao apagar segmentos/desvincular veículo após remover última parada dirigindo', e);
                  }
                }
                const data = await getTripVehicleSegments(selectedTrip.id);
                setSegments(data || []);
                toast.success("Parada excluída.");
              } catch (e) {
                toast.error("Falha ao excluir a parada.");
              } finally {
                setShowDeleteStopConfirm(false);
                setStopToDelete(null);
              }
            },
            () => { setShowDeleteStopConfirm(false); setStopToDelete(null); }
          )}
          {/* Toggle de direção: movido para cima da seção de veículos */}
          {showDeleteVehicleConfirm && vehicleToDeleteId && renderConfirmationModal(
            true,
            "Excluir Veículo",
            `Tem certeza que deseja excluir o veículo "${getVehicleById(vehicleToDeleteId)?.nickname || 'Veículo'}"?`,
            async () => {
              try {
                await deleteVehicle(vehicleToDeleteId);
                toast.success('Veículo excluído.');
              } catch (e) {
                const msg = e instanceof Error ? e.message : 'Falha ao excluir veículo.';
                toast.error(msg);
              } finally {
                setShowDeleteVehicleConfirm(false);
                setVehicleToDeleteId(null);
              }
            },
            () => { setShowDeleteVehicleConfirm(false); setVehicleToDeleteId(null); }
          )}
          <div className="border-t border-gray-200 pt-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Vai dirigir nesta viagem?</span>
              <Switch
                checked={isDriving}
                onCheckedChange={(val) => {
                   // Bloquear mudança para false se houver paradas com Dirigindo=true
                   if (!val) {
                     const hasDrivingStops = (selectedTrip?.stops || []).some((s) => Boolean(s.wasDriving));
                     if (hasDrivingStops) {
                       toast.error(
                         "Não é possível mudar esta viagem para trechos sem veículos a dirigir, pois existem paradas registradas com veículos vinculados. Para essa alteração, modifique a condição das paradas para ‘Dirigindo: Não’ e refaça esta ação."
                       );
                       // Reverter o toggle visual
                       setIsDriving(true);
                       return;
                     }
                   }

                   setIsDriving(val);
                   // Persistir estado na viagem (Supabase ou localStorage via hook)
                   (updateTripProp ? updateTripProp : async (id: string, updates: Partial<Trip>) => Promise.resolve(updates as any))(selectedTrip.id, { isDriving: val }).catch((e) => {
                     console.warn("Falha ao atualizar isDriving", e);
                   });
                   if (!val) {
                     // Ao desativar dirigir: remover veículos e zerar KM inicial
                     onRemoveVehicleFromTrip?.(selectedTrip.id);
                     onUpdateStartKm?.(selectedTrip.id, 0);
                   }
                 }}
              />
            </div>
          </div>

          {/* 👇 Seção de Veículo */}
          {(isDriving) && (
            <div className="border-t border-gray-200 pt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Car size={16} className="text-green-600" />
                  <p className="text-sm font-bold text-gray-700">
                    {(() => {
                      const count = selectedTrip.vehicleIds?.length || 0;
                      return count <= 1 ? "Veículo desta viagem" : "Veículos desta viagem";
                    })()}
                  </p>
                </div>
                {/* Botão "Gerenciar" removido conforme requisito */}
              </div>
              <div className="text-sm text-gray-600 mt-1 space-y-3">
                {selectedTrip.vehicleIds?.length ? (
                  selectedTrip.vehicleIds.map((vid) => {
                    const v = getVehicleById(vid);
                    const warning = getRodizioWarning(v?.licensePlate || null);
                    const s = perVehicleStats.get(vid);
                    const initial = Math.round(s?.initial ?? 0);
                    const current = Math.round(s?.current ?? initial);
                    const total = Math.round(s?.total ?? 0);
                    return (
                      <div key={vid} className="space-y-1">
                        {/* Linha superior: foto | nome (link) | botões */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <button
                              className="h-8 w-8 rounded border overflow-hidden bg-gray-100 flex items-center justify-center"
                              onClick={() => {
                                if (v?.photoUrl) {
                                  setImagePreviewUrl(v.photoUrl);
                                  setShowImageModal(true);
                                }
                              }}
                              title="Ver imagem ampliada"
                              aria-label="Ver imagem ampliada"
                            >
                              {v?.photoUrl ? (
                                <img src={v.photoUrl} alt={v?.nickname || "Veículo"} className="h-full w-full object-cover" />
                              ) : (
                                <Car size={16} className="text-gray-400" />
                              )}
                            </button>
                            <button
                              onClick={() => {
                                setEditingVehicleId(vid);
                                setShowVehicleModal(true);
                              }}
                              className="text-fuchsia-600 hover:underline"
                              title="Editar veículo"
                              aria-label="Abrir edição do veículo"
                            >
                              {v?.nickname || "Veículo"}
                            </button>
                            <button
                              onClick={() => {
                                const q = v?.licensePlate ? `rodízio SP placa ${v.licensePlate}` : "rodízio SP veículos";
                                window.open(`https://www.google.com/search?q=${encodeURIComponent(q)}`, "_blank");
                              }}
                              className="p-1 text-slate-600 hover:bg-slate-100 rounded"
                              title="Pesquisar rodízio"
                              aria-label="Pesquisar rodízio"
                            >
                              <Search size={14} />
                            </button>
                          </div>
                          <div className="flex items-center gap-2">
                            {warning ? (
                              <button
                                onClick={() => {
                                  setRodizioText(getRodizioDetails(v?.licensePlate || null));
                                  setShowRodizioModal(true);
                                }}
                                className="inline-flex items-center gap-2 bg-orange-500 text-white text-xs px-3 py-1 rounded-md font-medium shadow-sm hover:bg-orange-600"
                                title="Alerta de rodízio"
                                aria-label="Abrir alerta de rodízio"
                              >
                                <AlertTriangle size={14} />
                                <span>Alerta de rodízio</span>
                              </button>
                            ) : null}
                            <button
                              onClick={() => {
                                setEditingVehicleId(vid);
                                setShowVehicleModal(true);
                              }}
                              className="p-1 text-teal-700 hover:bg-teal-50 rounded"
                              title="Editar veículo"
                              aria-label="Editar veículo"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              onClick={() => handleDetachVehicleCascade(vid)}
                              className="p-1 text-red-600 hover:bg-red-50 rounded"
                              title="Remover veículo (cascata)"
                              aria-label="Remover veículo (cascata)"
                            >
                              <Trash size={16} />
                            </button>
                          </div>
                        </div>
                        {/* Linha inferior: Km inicial | Km atual | Total */}
                        <div className="grid grid-cols-3 gap-4 items-start">
                          <div className="text-right">
                            <p className="text-xs text-gray-500 mb-1 font-medium text-right">Km inicial</p>
                            <p className="text-sm font-semibold text-gray-900 text-right">{initial}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-gray-500 mb-1 font-medium text-center">Km atual</p>
                            <p className="text-sm font-semibold text-gray-900 text-center">{current}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-gray-500 mb-1 font-medium text-right">Distância percorrida</p>
                            <p className="text-sm font-semibold text-gray-900 text-right">{total} km</p>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <span className="text-orange-600">
                    Nenhum veículo vinculado
                  </span>
                )}
              </div>

              {/* Informação de quantidade vinculada removida conforme requisito */}

              {/* Lista de veículos cadastrados e seleção interativa - SEM CHECKBOXES */}
              {vehicles.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs text-gray-500 mb-1">Seus veículos</p>
                  <div className="relative">
                    <div ref={listRefVehicles} className="max-h-[168px] overflow-y-auto space-y-1 pr-1">
                      {vehicles
                        .filter((v) => (v.active ?? true))
                        .filter((v) => !selectedTrip.vehicleIds?.includes(v.id))
                        .map((v) => {
                      const linked = false;
                      const hasPreviousTrip = (() => {
                        const parseDT = (t: Trip) => {
                          const d = t.departureDate;
                          const ti = t.departureTime;
                          if (d && ti) {
                            const [dd, mm, yy] = d.includes('/') ? d.split('/').map(Number) : d.split('-').reverse().map(Number);
                            const [hh, mi] = ti.split(':').map(Number);
                            return new Date(yy, (mm - 1), dd, hh, mi).getTime();
                          }
                          return t.created_at ? new Date(t.created_at).getTime() : 0;
                        };
                        const currentTime = parseDT(selectedTrip);
                        return trips.some((tp) => tp.id !== selectedTrip.id && (tp.vehicleIds || []).includes(v.id) && parseDT(tp) < currentTime);
                      })();
                      return (
                        <div key={v.id} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <button
                              className="h-6 w-6 rounded border overflow-hidden bg-gray-100 flex items-center justify-center"
                              onClick={() => {
                                if (v.photoUrl) {
                                  setImagePreviewUrl(v.photoUrl);
                                  setShowImageModal(true);
                                }
                              }}
                              title="Ver imagem ampliada"
                              aria-label="Ver imagem ampliada"
                            >
                              {v.photoUrl ? (
                                <img src={v.photoUrl} alt={v.nickname} className="h-full w-full object-cover" />
                              ) : (
                                <Car size={14} className="text-gray-400" />
                              )}
                            </button>
                            <span className="text-gray-700 truncate">{v.nickname}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {
                              <button
                                onClick={() => openAttachModalForVehicle(v.id)}
                                className="p-1 text-teal-700 hover:bg-teal-50 rounded"
                                title="Vincular"
                                aria-label="Vincular"
                              >
                                <LinkIcon size={14} />
                              </button>
                            }
                            <button
                              onClick={() => { setEditingVehicleId(v.id); setShowVehicleModal(true); }}
                              className="p-1 text-slate-700 hover:bg-slate-100 rounded"
                              title="Editar veículo"
                              aria-label="Editar veículo"
                            >
                              <Edit size={14} />
                            </button>
                            <button
                              onClick={() => {
                                if (hasPreviousTrip) {
                                  toast.error('Exclusão indisponível: o veículo pertence a viagens anteriores.');
                                  return;
                                }
                                setVehicleToDeleteId(v.id);
                                setShowDeleteVehicleConfirm(true);
                              }}
                              className={`p-1 rounded ${hasPreviousTrip ? 'text-gray-300 cursor-not-allowed' : 'text-red-600 hover:bg-red-50'}`}
                              title={hasPreviousTrip ? 'Não pode excluir: em viagens anteriores' : 'Excluir veículo'}
                              aria-label="Excluir veículo"
                              disabled={hasPreviousTrip}
                            >
                              <Trash size={14} />
                            </button>
                          </div>
                        </div>
                      );
                      })}
                    </div>
                    <div className="absolute right-1 top-0 flex flex-col gap-1">
                      <button
                        type="button"
                        className="p-1 bg-white/80 border border-gray-200 rounded shadow hover:bg-white"
                        onClick={() => {
                          if (listRefVehicles.current) listRefVehicles.current.scrollBy({ top: -64, behavior: 'smooth' });
                        }}
                        title="Rolagem para cima"
                        aria-label="Rolagem para cima"
                      >
                        <ChevronUp size={16} className="text-gray-600" />
                      </button>
                      <button
                        type="button"
                        className="p-1 bg-white/80 border border-gray-200 rounded shadow hover:bg-white"
                        onClick={() => {
                          if (listRefVehicles.current) listRefVehicles.current.scrollBy({ top: 64, behavior: 'smooth' });
                        }}
                        title="Rolagem para baixo"
                        aria-label="Rolagem para baixo"
                      >
                        <ChevronDown size={16} className="text-gray-600" />
                      </button>
                    </div>
                    </div>
                </div>
              )}

              {/* Link para cadastrar novo veículo — sempre visível */}
              <div className="mt-2 text-center">
                <button
                  onClick={() => setShowVehicleModal(true)}
                  className="text-xs text-fuchsia-500 hover:underline font-medium"
                >
                  Não encontrou seu veículo? Clique aqui
                </button>
              </div>

              {/* Detalhes de KM abaixo de "Não encontrou" removidos conforme requisito */}
            </div>
          )}

           <div className="border-t border-gray-200 pt-4">
            <p className="text-xs text-gray-500 mb-1 font-medium flex items-center gap-2">
              <Book className="text-fuchsia-600" size={14} />
              Visão geral da viagem
            </p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">
              {selectedTrip.details || "Nenhuma informação."}
            </p>
          </div>
          <div className="flex items-center justify-between">
            <button
              onClick={() => {
                if (isDriving && !(selectedTrip?.vehicleIds?.length)) {
                  setShowVehicleWarning(true);
                  return;
                }
                setEditingStop(null);
                setShowStopModal(true);
              }}
              className="bg-teal-600 hover:bg-teal-700 text-white py-2 px-4 rounded-lg"
            >
              + Adicionar Parada
            </button>
            <button
              onClick={() => toast.info("Funcionalidade de gastos em breve")}
              className="bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-lg"
            >
              + Adicionar gastos
            </button>
          </div>
          {/* Lista simples de paradas — agora posicionada abaixo dos botões */}
          <div className="border-t border-gray-200 pt-4 mt-4">
            <p className="text-xs text-gray-500 mb-1 font-medium">Paradas</p>
            {(stopEntries.length === 0) ? (
              <p className="text-sm text-gray-600">Nenhuma parada registrada ainda.</p>
            ) : (
              <ul className="divide-y divide-dashed divide-gray-200">
                {stopEntries.map((e) => (
                  <li key={e.id}>
                    <div className={`w-full py-2 flex items-center justify-between ${e.raw?.stopType === 'destination' ? 'bg-teal-50 rounded-md px-2' : ''}`}>
                      <div className="text-left flex-1 inline-flex items-center gap-2">
                        {/* Botão para visualizar detalhes da parada */}
                        <button
                          className="p-1 rounded hover:bg-gray-100"
                          onClick={() => { setViewingStop(e.raw); setShowViewModal(true); }}
                          title="Visualizar parada"
                          aria-label="Visualizar parada"
                        >
                          <Eye size={14} className="text-gray-600" />
                        </button>
                        <span className="inline-flex items-center gap-1 text-sm text-gray-800">
                          {/* Nome da parada (link para Google Maps) */}
                          <a
                            href={(function() {
                              const loc = e.raw?.location;
                              if (loc && typeof loc.latitude === 'number' && typeof loc.longitude === 'number') {
                                return `https://www.google.com/maps?q=${loc.latitude},${loc.longitude}`;
                              }
                              const q = encodeURIComponent(e.raw?.name || 'Local');
                              return `https://www.google.com/maps/search?q=${q}`;
                            })()}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-gray-800 hover:text-teal-700 hover:underline"
                            title="Abrir no Google Maps"
                          >
                            {e.raw?.name || '—'}
                          </a>
                        </span>
                        <span className="text-xs text-gray-500 flex-shrink-0">| {(() => {
                          const dt = e.arrivalDateTime || '';
                          if (dt.includes('-')) {
                            const [datePart, timePart] = dt.split(',');
                            const [y, m, d] = datePart.trim().split('-');
                            return `${d}/${m}/${y}, ${timePart?.trim() || ''}`;
                          }
                          return dt;
                        })()}</span>
                        <span className="text-xs text-gray-500 flex-shrink-0">| {(selectedTrip.vehicleIds?.length ? (getVehicleById(selectedTrip.vehicleIds[0])?.nickname || 'Veículo') : '—')}</span>
                        {e.raw?.stopType === 'destination' && (
                          <span className="text-[10px] font-semibold bg-teal-600 text-white px-2 py-0.5 rounded flex-shrink-0">Destino</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className="text-sm font-semibold text-gray-900">{`${e.cumulativeKm} km`}</span>
                        {null /* badge removido por sobreposição visual */}
                        <button title="Editar" className="text-gray-600 hover:text-gray-900" onClick={() => {
                          // Permitir editar sempre, mesmo sem veículo vinculado.
                          // O usuário pode ajustar "Dirigindo?" ou KM sem bloquear a edição.
                          setEditingStop(e.raw);
                          setShowStopModal(true);
                        }}>
                          <Edit size={16} />
                        </button>
                        <button title="Excluir" className="text-red-600 hover:text-red-800" onClick={() => { setStopToDelete(e.raw); setShowDeleteStopConfirm(true); }}>
                          <Trash size={16} />
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200 shadow-xl z-40">
        <Button
          onClick={() => setShowCompleteConfirm(true)}
          className="w-full bg-green-600 hover:bg-green-700 text-lg font-bold py-3.5 rounded-xl shadow-lg transition-all"
        >
          <Book size={20} className="mr-2" />
          Encerrar viagem
        </Button>
      </div>

      {/* Modal de Gerenciamento de Veículo */}
      {showEndModal && (
        <React.Suspense
          fallback={<div className="p-4 text-center">Carregando...</div>}
        >
          <TripEndModal
            trip={selectedTrip}
            onClose={() => {
              setShowEndModal(false);
              setIsEnding(false);
            }}
          />
        </React.Suspense>
      )}
      {/* Aviso modal para seleção de veículo antes de adicionar/editar parada */}
      {showVehicleWarning && renderConfirmationModal(
        true,
        "Aviso",
        vehicleWarningText,
        () => setShowVehicleWarning(false),
        () => setShowVehicleWarning(false)
      )}
      {showVehicleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-y-auto flex flex-col">
            <div className="sticky top-0 bg-white p-4 border-b flex justify-between items-center z-10">
              <h3 className="text-xl font-bold text-gray-900">
                {editingVehicleId
                  ? "Editar Veículo"
                  : "Gerenciar Veículos"}
              </h3>
              <button
                onClick={() => setShowVehicleModal(false)}
                className="text-gray-500 hover:text-gray-800 text-2xl"
                aria-label="Fechar"
              >
                &times;
              </button>
            </div>
            <div className="flex-grow p-4">
              <React.Suspense
                fallback={
                  <div className="p-4 text-center">
                    Carregando...
                  </div>
                }
              >
                <VehiclesOnTrip
                  allowSelection={false}
                  editingVehicleId={editingVehicleId}
                  onEditComplete={() => {
                    setShowVehicleModal(false);
                    // Opcional: recarregar a viagem para atualizar o apelido
                  }}
                  vehicles={vehicles}
                  saveVehicle={saveVehicleProp ?? hookSaveVehicle}
                  updateVehicle={updateVehicleProp ?? hookUpdateVehicle}
                />
              </React.Suspense>
            </div>
          </div>
        </div>
      )}
      {showAttachModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">Vincular veículo</h3>
              <button
                onClick={() => setShowAttachModal(false)}
                className="text-gray-500 hover:text-gray-800 text-2xl"
                aria-label="Fechar"
              >
                &times;
              </button>
            </div>
            <div className="p-4 space-y-3">
              <p className="text-sm text-gray-700">Insira a quilometragem atual do veículo mostrada no painel.</p>
              <div>
              <label className="block text-xs text-gray-500 mb-1 font-medium">Odômetro atual</label>
              {/* Exibir o veículo selecionado para confirmação visual */}
              {vehicleToAttachId && (
                <p className="text-xs text-gray-600 mb-2">Veículo selecionado: {getVehicleById(vehicleToAttachId)?.nickname || vehicleToAttachId}</p>
              )}
              <Input
                type="text"
                value={attachOdometer}
                onChange={(e) => setAttachOdometer(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="Ex: 12345"
                className="w-full"
              />
              </div>
              {/* Campo "Tanque cheio" removido do modal conforme requisito */}
              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setShowAttachModal(false)}
                  className="flex-1"
                >Cancelar</Button>
                <Button
                  onClick={async () => {
                    const kmNum = Number(attachOdometer);
                    if (!vehicleToAttachId) {
                      toast.error("Selecione um veículo.");
                      return;
                    }
                    if (isNaN(kmNum) || kmNum < 0) {
                      toast.error("Informe um odômetro válido.");
                      return;
                    }
                    try {
                      // Vincula veículo à viagem com KM inicial
                      onAttachVehicleToTrip?.(selectedTrip.id, vehicleToAttachId, kmNum);
                      // Cria segmento inicial
                      const today = new Date();
                      const yyyy = today.getFullYear();
                      const mm = String(today.getMonth() + 1).padStart(2, '0');
                      const dd = String(today.getDate()).padStart(2, '0');
                      const dateStr = `${yyyy}-${mm}-${dd}`;
                      await saveTripVehicleSegment({
                        tripId: selectedTrip.id,
                        vehicleId: vehicleToAttachId,
                        segmentDate: dateStr,
                        initialKm: Math.round(kmNum),
                        currentKm: Math.round(kmNum),
                        isInitial: true,
                      });
                      // Cria parada automática "Início"
                      const timeStr = new Date().toTimeString().slice(0, 5);
                      const autoStop = {
                        tripId: selectedTrip.id,
                        name: 'Início',
                        stopType: 'stop',
                        wasDriving: true,
                        location: selectedTrip.departureCoords ?? null,
                        // Usar somente "Local de parada" (name); manter place opcional
                        place: undefined,
                        placeDetail: undefined,
                        arrivalKm: Math.round(kmNum),
                        departureKm: Math.round(kmNum),
                        arrivalDate: dateStr,
                        arrivalTime: timeStr,
                        reasons: [],
                        otherReason: undefined,
                        cost: 0,
                        costDetails: [ { category: 'other', amount: 0, note: 'Aluguel de veículo' } ],
                        notes: `Início da viagem`,
                        photoUrls: [],
                      } as any;
                      await saveStop(autoStop);
                      // Atualiza segmentos na UI
                      try {
                        const data = await getTripVehicleSegments(selectedTrip.id);
                        setSegments(data || []);
                      } catch (e) {
                        console.warn('Falha ao recarregar segmentos após vincular e criar parada', e);
                      }
                      toast.success('Veículo vinculado e ponto inicial criado.');
                      setShowAttachModal(false);
                      setVehicleToAttachId("");
                      setAttachOdometer("");
                    } catch (e) {
                      console.error(e);
                      toast.error('Falha ao concluir vínculo.');
                    }
                  }}
                  className="flex-1 bg-teal-600 hover:bg-teal-700"
                >OK</Button>
              </div>
            </div>
          </div>
        </div>
      )}
      {showImageModal && (
        <Modal
          isOpen={showImageModal}
          onClose={() => setShowImageModal(false)}
          title="Foto do veículo"
        >
          {imagePreviewUrl ? (
            <img
              src={imagePreviewUrl}
              alt="Foto do veículo"
              className="max-h-[70vh] w-auto mx-auto object-contain"
            />
          ) : null}
        </Modal>
      )}
      {showRodizioModal && (
        <Modal
          isOpen={showRodizioModal}
          onClose={() => setShowRodizioModal(false)}
          title="Alerta de rodízio"
        >
          <div className="flex items-start gap-3 p-2">
            <AlertTriangle className="text-red-600 flex-shrink-0" size={24} />
            <div>
              <p className="text-red-600 font-semibold mb-1">Alerta de rodízio:</p>
              <p className="text-gray-700 whitespace-pre-line">{rodizioText}</p>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

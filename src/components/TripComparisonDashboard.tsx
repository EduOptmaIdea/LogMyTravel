import { useEffect, useState } from "react";
import { useTrips } from "./useTrips";
import type { Trip } from "./useTrips";

// --- Interfaces ---
// Trip interface now imported from useTrips to avoid type conflicts
export type { Trip };

type Metric = "duration" | "distance" | "cost";

// --- Funções Auxiliares de Cálculo ---
const parseDateTime = (dateStr: string, timeStr: string): Date | null => {
    if (!dateStr || !timeStr) return null;
    const [d, m, y] = dateStr.split("/").map(Number);
    const [h, min] = timeStr.split(":").map(Number);
    if (isNaN(d) || isNaN(m) || isNaN(y) || isNaN(h) || isNaN(min)) return null;
    // Mês é baseado em 0, por isso (m - 1)
    return new Date(y, m - 1, d, h, min); 
};

const getDurationMs = (trip: Trip): number => {
    const startDate = parseDateTime(trip.departureDate, trip.departureTime);
    if (!startDate) return 0;
    let endDate: Date | null = (trip.status === "completed" && trip.arrivalDate && trip.arrivalTime)
        ? parseDateTime(trip.arrivalDate, trip.arrivalTime)
        : new Date();
    if (!endDate) return 0;
    const duration = endDate.getTime() - startDate.getTime();
    return duration > 0 ? duration : 0;
};

// Distância baseada em segmentos agregados
const getDistanceFromSegments = (
    trip: Trip,
    totalsByTrip: Map<string, number>,
): number => {
    const v = totalsByTrip.get(trip.id);
    return typeof v === "number" ? v : 0;
};

const getCost = (trip: Trip, totalsByTrip: Map<string, number>): number => {
    const distance = getDistanceFromSegments(trip, totalsByTrip);
    const durationMs = getDurationMs(trip);
    const hours = durationMs / (1000 * 60 * 60);
    // Exemplo de cálculo: R$0.50/km + R$10/hora
    // Nota: O custo é sempre calculado, mesmo que os Km não estejam disponíveis (usando apenas o tempo).
    // Usamos Math.round para evitar centavos flutuantes em nosso mock.
    return Math.round(distance * 0.5 + hours * 10); 
};

// --- Funções Auxiliares de Exibição ---

const formatDuration = (ms: number): string => {
    if (ms <= 0) return "—";
    const totalMinutes = Math.floor(ms / (1000 * 60));
    if (totalMinutes < 1) return "< 1 min";
    const days = Math.floor(ms / (1000 * 60 * 60 * 24));
    const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    let result = "";
    if (days > 0) result += `${days}d `;
    if (hours > 0 || (days === 0 && minutes === 0)) result += `${hours}h `;
    result += `${minutes}min`;
    return result.trim();
};

const formatValue = (val: number, type: Metric): string => {
    if (type === "duration") return formatDuration(val);
    if (type === "distance") return `${val.toFixed(0)} km`;
    // Garante que o custo seja formatado com duas casas decimais
    return `R$ ${val.toFixed(2)}`; 
};

const getMetricValue = (
    trip: Trip,
    metric: Metric,
    totalsByTrip: Map<string, number>,
): number => {
    if (metric === "duration") return getDurationMs(trip);
    if (metric === "distance") return getDistanceFromSegments(trip, totalsByTrip);
    return getCost(trip, totalsByTrip);
};


// --- Componente Auxiliar: TripDropdown ---

interface TripDropdownProps {
    currentTripId: string;
    availableTrips: Trip[];
    onChange: (id: string) => void;
    placeholder: string;
    baseColorClass: string; 
}

const TripDropdown = ({ currentTripId, availableTrips, onChange, placeholder, baseColorClass }: TripDropdownProps) => {
    const selectedTrip = availableTrips.find(t => t.id === currentTripId);

    const colorMap = {
        "bg-orange-500": { bg: "bg-orange-500", hover: "hover:bg-orange-600" },
        "bg-blue-500": { bg: "bg-blue-500", hover: "hover:bg-blue-600" },
        "bg-purple-500": { bg: "bg-purple-500", hover: "hover:bg-purple-600" },
        "bg-teal-500": { bg: "bg-teal-500", hover: "hover:bg-teal-600" },
        "bg-green-500": { bg: "bg-green-500", hover: "hover:bg-green-600" },
        "bg-gray-500": { bg: "bg-gray-500", hover: "hover:bg-gray-600" },
    };
    
    const { bg, hover } = colorMap[baseColorClass as keyof typeof colorMap] || colorMap["bg-gray-500"];
    
    const value = selectedTrip ? currentTripId : "";

    const options = availableTrips.map(trip => (
        <option key={trip.id} value={trip.id}>
            {trip.name}
        </option>
    ));

    return (
        <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={`
                appearance-none w-full p-2 rounded-t-xl font-bold text-white text-base
                cursor-pointer transition-colors focus:ring-2 focus:ring-opacity-50
                ${bg} ${hover}
                h-auto min-h-[4rem] flex items-center 
            `}
            style={{
                backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='white'%3e%3cpath fill-rule='evenodd' d='M4.293 6.293a1 1 0 011.414 0L8 8.586l2.293-2.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z' clip-rule='evenodd'/%3e%3c/svg%3e")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 0.5rem top 1.5rem', 
                backgroundSize: '1rem',
                paddingRight: '2.5rem',
                whiteSpace: 'normal',
                overflow: 'hidden',
                textOverflow: 'clip',
            }}
        >
            <option value="" disabled hidden>{placeholder}</option>
            {options}
        </select>
    );
};

// --- Componente Core: TripComparisonDashboard ---

interface TripComparisonDashboardProps {
    trips: Trip[];
    initialTrip1Id: string;
    initialTrip2Id: string;
    setTrip1Id: (id: string) => void;
    setTrip2Id: (id: string) => void;
    availableTrips1: Trip[];
    availableTrips2: Trip[];
    visibleSlotCount: number;
    allVisibleTripIds: string[];
    isSlot3?: boolean;
    isSlot4?: boolean;
    metric: Metric; 
    setMetric: (metric: Metric) => void;
    totalsByTrip: Map<string, number>;
}

export function TripComparisonDashboard({ 
    trips, 
    initialTrip1Id, 
    initialTrip2Id, 
    setTrip1Id, 
    setTrip2Id,
    availableTrips1,
    availableTrips2,
    visibleSlotCount,
    allVisibleTripIds,
    isSlot3 = false,
    isSlot4 = false,
    metric, 
    setMetric,
    totalsByTrip,
}: TripComparisonDashboardProps) {
    
    // --- Funções Auxiliares de Exibição ---
    
    const getMetricTitle = (metric: Metric): string => {
        if (metric === "distance") return "Distância percorrida";
        if (metric === "cost") return "Custo da viagem";
        return "Duração da viagem"; // Padrão
    };

    const getTotalValueForMetric = () => {
        return trips.reduce((sum, trip) => sum + getMetricValue(trip, metric, totalsByTrip), 0);
    };

    const getStatusLabel = (status: "ongoing" | "completed"): string => {
        return status === "ongoing" ? "Em andamento" : "Encerrada";
    };
    
    const getSlotColors = (slotIndex: 1 | 2 | 3 | 4) => {
        if (slotIndex === 1) return { main: "border-orange-500", text: "text-orange-700", bg: "bg-orange-500", hex: "#f97316" };
        if (slotIndex === 2) return { main: "border-blue-500", text: "text-blue-700", bg: "bg-blue-500", hex: "#3b82f6" };
        if (slotIndex === 3) return { main: "border-purple-500", text: "text-purple-700", bg: "bg-purple-500", hex: "#9333ea" };
        if (slotIndex === 4) return { main: "border-teal-500", text: "text-teal-700", bg: "bg-teal-500", hex: "#14b8a6" };
        return { main: "border-gray-500", text: "text-gray-700", bg: "bg-gray-500", hex: "#6b7280" };
    };
    
    // Obter viagens selecionadas
    const trip1 = trips.find(t => t.id === initialTrip1Id) || null;
    const trip2 = trips.find(t => t.id === initialTrip2Id) || null;
    
    // Qual slot está sendo renderizado?
    const slot1Index = isSlot3 ? 3 : 1;
    const slot2Index = isSlot3 ? 4 : 2; 

    // Cálculos de Valores
    const value1 = trip1 ? getMetricValue(trip1, metric, totalsByTrip) : 0;
    const value2 = trip2 ? getMetricValue(trip2, metric, totalsByTrip) : 0;

    // CÁLCULO 1: Porcentagem em relação a TODAS as viagens
    const totalAll = getTotalValueForMetric();
    const percent1Total = totalAll > 0 ? (value1 / totalAll) * 100 : 0;
    const percent2Total = totalAll > 0 ? (value2 / totalAll) * 100 : 0;
    
    // CÁLCULO 2: Porcentagem em relação a APENAS as viagens VISÍVEIS
    const visibleTrips = trips.filter(t => allVisibleTripIds.includes(t.id));
    
    const totalVisible = visibleTrips.reduce((sum, trip) => sum + getMetricValue(trip, metric, totalsByTrip), 0);
    
    const percent1Selected = totalVisible > 0 ? (value1 / totalVisible) * 100 : 0;
    const percent2Selected = totalVisible > 0 ? (value2 / totalVisible) * 100 : 0;

    // Lógica de Layout
    const isThreeMode = isSlot3 && visibleSlotCount === 3; 
    
    // --- Lógica Viagem Mais/Menos ---
    const allVisibleValues = visibleTrips.map(trip => getMetricValue(trip, metric, totalsByTrip));
    
    const maxValue = allVisibleValues.length > 0 ? Math.max(...allVisibleValues) : 0;
    const minValue = allVisibleValues.length > 0 ? Math.min(...allVisibleValues) : 0;

    const isLongest = (value: number) => value === maxValue && maxValue > 0;
    const isShortest = (value: number) => value === minValue && minValue > 0 && maxValue !== minValue;

    const getRankLabel = (isMax: boolean, currentMetric: Metric): string => {
        if (isMax) {
            if (currentMetric === "duration") return "Viagem mais demorada";
            if (currentMetric === "distance") return "Viagem mais longa";
            if (currentMetric === "cost") return "Viagem mais cara";
        } else {
            if (currentMetric === "duration") return "Viagem menos demorada";
            if (currentMetric === "distance") return "Viagem mais curta";
            if (currentMetric === "cost") return "Viagem mais econômica";
        }
        return "";
    };


    // Função para Renderizar Gráfico e Legendas
    const renderChart = (percent: number, type: "total" | "selected", slotIndex: 1 | 2 | 3 | 4, currentValue: number, currentTrip: Trip | null) => {
        
        const slotColor = getSlotColors(slotIndex);
        
        // Título do Gráfico Superior
        const totalTitle = metric === "duration" ? "do tempo total viajado" : metric === "distance" ? "da distância total" : "do custo total";
        
        // CÁLCULO DA PORCENTAGEM RESTANTE
        const otherValue = totalVisible - currentValue;
        const otherPercent = totalVisible > 0 ? ((otherValue / totalVisible) * 100) : 0;

        const strokeColor = slotColor.hex;
        
        return (
            <div className="mt-4">
                <p className="text-xs text-gray-500 mb-1">
                    {type === "total" ? "Esta viagem corresponde a" : `Comparando às ${visibleSlotCount} viagens`}
                </p>
                <div className="flex items-center gap-2">
                    {/* SVG do Gráfico Circular */}
                    <div className="relative w-16 h-16 flex-shrink-0">
                        <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 36 36">
                            {/* Fundo (100%) */}
                            <circle cx="18" cy="18" r="16" fill="none" stroke="#e5e7eb" strokeWidth="2" />
                            {/* Preenchimento (Percentual) */}
                            <circle
                                cx="18" cy="18" r="16" fill="none"
                                stroke={strokeColor} 
                                strokeWidth="2" strokeDasharray={`${percent}, 100`} strokeLinecap="round"
                            />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <span className={`text-sm font-bold ${slotColor.text}`}>
                                {percent.toFixed(0)}%
                            </span>
                        </div>
                    </div>
                    {/* Texto Explicativo / Legendas */}
                    <div className="flex-1 pt-1">
                        {type === "total" ? (
                            <p className="text-sm text-gray-500 leading-tight">{totalTitle}</p>
                        ) : (
                            <div className="text-xs space-y-1"> 
                                {/* Legenda da Viagem Atual (Cor do Card) */}
                                <div className="flex items-center gap-1">
                                    <span className={`h-2 w-2 rounded-full ${slotColor.bg} flex-shrink-0`}></span>
                                    <span className="font-semibold text-gray-700 leading-none">
                                        {currentTrip?.name || `Viagem ${slotIndex}`} ({percent.toFixed(0)}%)
                                    </span>
                                </div>
                                {/* Legenda das Outras Viagens (Cinza) */}
                                <div className="flex items-center gap-1">
                                    <span className="h-2 w-2 rounded-full bg-gray-300 flex-shrink-0"></span>
                                    <span className="text-gray-500 leading-none">
                                        Demais viagens ({otherPercent.toFixed(0)}%)
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };


    // --- JSX de Renderização ---

    return (
        <div className="space-y-4"> 
            
            {/* Botões de Métrica (Aparece SOMENTE na primeira instância do Dashboard) */}
            {!isSlot3 && (
                 <div className="flex flex-wrap justify-center gap-2 mb-4">
                    <button
                        onClick={() => setMetric("duration")}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${metric === "duration" ? "bg-orange-100 text-orange-700 border border-orange-200" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
                    >Duração</button>
                    <button
                        onClick={() => setMetric("distance")}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${metric === "distance" ? "bg-blue-100 text-blue-700 border border-blue-200" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
                    >Distância</button>
                    <button
                        onClick={() => setMetric("cost")}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${metric === "cost" ? "bg-green-100 text-green-700 border border-green-200" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
                    >Custo</button>
                </div>
            )}


            {/* Layout FIXO em Duas Colunas (grid-cols-2) */}
            <div
                 className="grid gap-4 grid-cols-2" 
            >
                
                {/* Card 1 (ou Card 3) */}
                <div
                    className={`
                        bg-white rounded-xl shadow-sm border-l-4 
                        ${getSlotColors(slot1Index).main}
                        transition-all hover:shadow-md
                        col-span-1 
                    `}
                >
                    <TripDropdown
                        currentTripId={initialTrip1Id}
                        availableTrips={availableTrips1}
                        onChange={setTrip1Id}
                        placeholder={isSlot3 ? "Selecione a Viagem 3" : "Selecione a Viagem 1"}
                        baseColorClass={getSlotColors(slot1Index).bg} 
                    />
                    
                    {/* Conteúdo do Card 1/3 */}
                    {trip1 ? (
                        <div className="p-4">
                            {/* Valor Principal Dinâmico */}
                            <div className="mt-2 text-center">
                                <p className="text-xs text-gray-500 mb-1">{getMetricTitle(metric)}</p>
                                <p className={`text-xl font-bold ${getSlotColors(slot1Index).text}`}>
                                    {formatValue(value1, metric)}
                                </p>
                            </div>
                            
                            {/* Gráfico Superior - % do Total de TODAS as Viagens */}
                            {renderChart(percent1Total, "total", slot1Index, value1, trip1)}
                            
                            {/* Gráfico Inferior - % da Viagem Selecionada (Comparação N Viagens) */}
                            {totalVisible > 0 && (
                                renderChart(percent1Selected, "selected", slot1Index, value1, trip1)
                            )}

                            {/* Status e Ranqueamento Dinâmico */}
                            <div className="mt-4 flex flex-col items-start gap-1">
                                <span className={`text-xs px-2 py-1 rounded-full font-medium ${trip1.status === "ongoing" ? "bg-blue-100 text-blue-700" : "bg-red-100 text-red-700"}`}>
                                    {getStatusLabel(trip1.status)}
                                </span>
                                {/* Ranqueamento Dinâmico */}
                                {visibleSlotCount > 1 && (
                                    <>
                                        {isLongest(value1) && <span className="text-xs text-red-500 mt-1">{getRankLabel(true, metric)}</span>}
                                        {isShortest(value1) && <span className="text-xs text-green-500 mt-1">{getRankLabel(false, metric)}</span>}
                                    </>
                                )}
                            </div>
                        </div>
                    ) : (
                         <div className="p-4 text-center text-gray-400">Selecione a viagem {isSlot3 ? '3' : '1'}</div>
                    )}
                </div>

                {/* Card 2 (ou Card 4) */}
                <div
                    className={`
                        bg-white rounded-xl shadow-sm border-l-4 
                        ${getSlotColors(slot2Index).main}
                        transition-all hover:shadow-md
                        col-span-1
                        ${isThreeMode ? "hidden" : ""} 
                    `}
                >
                    
                    <TripDropdown
                        currentTripId={initialTrip2Id}
                        availableTrips={availableTrips2}
                        onChange={setTrip2Id}
                        placeholder={isSlot4 ? "Selecione a Viagem 4" : "Selecione a Viagem 2"}
                        baseColorClass={getSlotColors(slot2Index).bg}
                    />
                    

                    {/* Conteúdo do Card 2/4 */}
                    {trip2 ? (
                        <div className="p-4">
                             {/* Valor Principal Dinâmico */}
                             <div className="mt-2 text-center">
                                <p className="text-xs text-gray-500 mb-1">{getMetricTitle(metric)}</p>
                                <p className={`text-xl font-bold ${getSlotColors(slot2Index).text}`}>
                                    {formatValue(value2, metric)}
                                </p>
                            </div>
                            
                            {/* Gráfico Superior - % do Total de TODAS as Viagens */}
                            {renderChart(percent2Total, "total", slot2Index, value2, trip2)}
                            
                            {/* Gráfico Inferior - % da Viagem Selecionada (Comparação N Viagens) */}
                            {totalVisible > 0 && (
                                renderChart(percent2Selected, "selected", slot2Index, value2, trip2)
                            )}

                            {/* Status e Ranqueamento Dinâmico */}
                            <div className="mt-4 flex flex-col items-start gap-1">
                                <span className={`text-xs px-2 py-1 rounded-full font-medium ${trip2.status === "ongoing" ? "bg-blue-100 text-blue-700" : "bg-red-100 text-red-700"}`}>
                                    {getStatusLabel(trip2.status)}
                                </span>
                                {/* Ranqueamento Dinâmico */}
                                {visibleSlotCount > 1 && (
                                    <>
                                        {isLongest(value2) && <span className="text-xs text-red-500 mt-1">{getRankLabel(true, metric)}</span>}
                                        {isShortest(value2) && <span className="text-xs text-green-500 mt-1">{getRankLabel(false, metric)}</span>}
                                    </>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="p-4 text-center text-gray-400">Selecione a viagem {isSlot4 ? '4' : '2'}</div>
                    )}
                </div>
            </div>
        </div>
    );
}

// --- Componente Wrapper: TripComparisonWrapper ---

interface TripComparisonWrapperProps {
    trips: Trip[];
}

export function TripComparisonWrapper({ trips }: TripComparisonWrapperProps) {
    const { getTripVehicleSegments } = useTrips();
    const [totalsByTrip, setTotalsByTrip] = useState<Map<string, number>>(new Map());

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const entries: Array<[string, number]> = [];
                for (const t of trips) {
                    const segs = await getTripVehicleSegments(t.id);
                    const byVehicle = new Map<string, { initial: number; current: number }>();
                    (t.vehicleIds || []).forEach((vid) => {
                        const sv = segs
                            .filter((s) => s.vehicleId === vid)
                            .sort((a, b) => {
                                const da = new Date(a.segmentDate).getTime();
                                const db = new Date(b.segmentDate).getTime();
                                if (da !== db) return da - db;
                                const ca = a.created_at ? new Date(a.created_at).getTime() : 0;
                                const cb = b.created_at ? new Date(b.created_at).getTime() : 0;
                                return ca - cb;
                            });
                        if (sv.length > 0) {
                            byVehicle.set(vid, {
                                initial: sv[0].initialKm ?? 0,
                                current: sv[sv.length - 1].currentKm ?? sv[0].initialKm ?? 0,
                            });
                        }
                    });
                    const totalForTrip = Array.from(byVehicle.values()).reduce(
                        (acc, v) => acc + Math.max(0, (v.current ?? 0) - (v.initial ?? 0)),
                        0,
                    );
                    entries.push([t.id, Math.round(totalForTrip)]);
                }
                if (!cancelled) setTotalsByTrip(new Map(entries));
            } catch (e) {
                if (!cancelled) setTotalsByTrip(new Map());
            }
        })();
        return () => { cancelled = true; };
    }, [trips]);

    // Métrica centralizada no Wrapper (Pai)
    const [metric, setMetric] = useState<Metric>("duration");
    
    // 1. Lógica de Ordenação e Inicialização
    const sortedTrips = [...trips].sort((a, b) => {
        const dateA = parseDateTime(a.departureDate, a.departureTime);
        const dateB = parseDateTime(b.departureDate, b.departureTime);
        return (dateB?.getTime() || 0) - (dateA?.getTime() || 0); 
    });

    const initialTrips = [
        sortedTrips[0]?.id || "",
        sortedTrips[1]?.id || "",
        sortedTrips[2]?.id || "",
        sortedTrips[3]?.id || "",
    ];
    
    const modeOptions: (2 | 3 | 4)[] = [2];
    if (trips.length >= 3) modeOptions.push(3);
    if (trips.length >= 4) modeOptions.push(4);
    
    const [comparisonMode, setComparisonMode] = useState<2 | 3 | 4>(
        modeOptions.includes(2) ? 2 : modeOptions[0]
    );
    
    const [selectedTrips, setSelectedTrips] = useState<string[]>(initialTrips);
    
    // 2. Lógica de Atualização de Seleção
    const updateTrip = (index: number, newId: string) => {
        setSelectedTrips(prev => {
            const newSelections = [...prev];
            const visibleIds = newSelections.slice(0, comparisonMode);

            if (
                visibleIds.some((id, i) => i !== index && id === newId && id !== "")
            ) {
                 alert("Esta viagem já está selecionada em outro slot. Por favor, escolha outra.");
                 return prev;
            }

            newSelections[index] = newId;
            return newSelections;
        });
    };
    
    const getAllAvailableTrips = (): Trip[] => {
        return trips;
    }

    const allVisibleTripIds = selectedTrips.slice(0, comparisonMode).filter(id => id !== "");

    return (
        <div className="space-y-6 pb-20"> 
            <h3 className="text-center text-lg font-bold text-gray-800">
                Comparação Detalhada de Viagens
            </h3>
            <div className="flex justify-center gap-4 border-b pb-4 items-center">
                
                <label htmlFor="mode-select" className="text-sm font-medium text-gray-700">Comparar:</label>
                <select
                    id="mode-select"
                    value={comparisonMode}
                    onChange={(e) => setComparisonMode(Number(e.target.value) as 2 | 3 | 4)}
                    className="bg-purple-100 border border-purple-300 text-purple-800 text-sm rounded-lg focus:ring-purple-500 focus:border-purple-500 block p-2.5 shadow-sm"
                >
                    {modeOptions.map(mode => (
                        <option key={mode} value={mode}>
                            {mode} Viagens
                        </option>
                    ))}
                </select>
            </div>

            {/* Renderiza a primeira linha (Viagem 1 e 2) */}
            <TripComparisonDashboard 
                trips={trips}
                initialTrip1Id={selectedTrips[0]}
                initialTrip2Id={selectedTrips[1]}
                setTrip1Id={(id) => updateTrip(0, id)}
                setTrip2Id={(id) => updateTrip(1, id)}
                availableTrips1={getAllAvailableTrips()} 
                availableTrips2={getAllAvailableTrips()}
                visibleSlotCount={comparisonMode}
                allVisibleTripIds={allVisibleTripIds}
                
                metric={metric} 
                setMetric={setMetric}
                totalsByTrip={totalsByTrip}
                
            />

            {/* Renderiza a segunda linha (Viagem 3 e 4) */}
            {(comparisonMode === 3 || comparisonMode === 4) && (
                <TripComparisonDashboard 
                    trips={trips}
                    initialTrip1Id={selectedTrips[2]} // Slot 3
                    initialTrip2Id={selectedTrips[3]} // Slot 4
                    setTrip1Id={(id) => updateTrip(2, id)}
                    setTrip2Id={(id) => updateTrip(3, id)}
                    availableTrips1={getAllAvailableTrips()} 
                    availableTrips2={getAllAvailableTrips()}
                    visibleSlotCount={comparisonMode}
                    allVisibleTripIds={allVisibleTripIds}
                    
                    isSlot3={true}
                    isSlot4={comparisonMode === 4}
                    
                    metric={metric} 
                    setMetric={setMetric}
                    totalsByTrip={totalsByTrip}
                />
            )}
        </div>
    );
}
import { useEffect, useMemo, useState } from "react";
// Importa Trip (interface) e TripComparisonWrapper (componente)
import { Trip, TripComparisonWrapper } from "./TripComparisonDashboard"; 
import { useTrips } from "./useTrips";
import type { Segment } from "./useTrips";


// --- Componente Auxiliar: Modal (Estrutura do Pop-up) ---

interface ModalProps {
    children: React.ReactNode;
    onClose: () => void;
}

const Modal: React.FC<ModalProps> = ({ children, onClose }) => {
    return (
        // Fundo escuro fixo
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50">
            {/* Conteúdo principal do modal */}
            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto transform transition-all">
                
                {/* Cabeçalho Fixo do Modal */}
                <div className="sticky top-0 bg-white p-4 border-b flex justify-between items-center z-10">
                    <h3 className="text-xl font-bold text-gray-800">Comparação Detalhada de Viagens</h3>
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-700 transition-colors"
                        aria-label="Fechar Modal"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                
                {/* Área de rolagem do conteúdo */}
                <div className="p-4">
                    {children}
                </div>
            </div>
        </div>
    );
};

// --- Componente Principal: DashboardView ---

interface DashboardViewProps {
    trips: Trip[];
}

export function DashboardView({ trips }: DashboardViewProps) {
    // ESTADO: Controla a visibilidade do Modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const { getTripVehicleSegments } = useTrips();
    const [totalKmFromSegments, setTotalKmFromSegments] = useState<number>(0);

    // --- Lógica de Funções Auxiliares (mantidas) ---
    const parseDateTime = (
        dateStr: string,
        timeStr: string,
    ): Date | null => {
        if (!dateStr || !timeStr) return null;
        const [d, m, y] = dateStr.split("/").map(Number);
        const [h, min] = timeStr.split(":").map(Number);
        if (
            isNaN(d) ||
            isNaN(m) ||
            isNaN(y) ||
            isNaN(h) ||
            isNaN(min)
        ) {
            return null;
        }
        return new Date(y, m - 1, d, h, min);
    };

    // 1. Total de viagens
    const totalTrips = trips.length;

    // 2. Total rodado (km) via segmentos
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const all = await Promise.all(
                    trips.map(async (t) => {
                        const segs = await getTripVehicleSegments(t.id);
                        // Soma por veículo dentro da viagem
                        const byVehicle = new Map<string, { initial: number; current: number }>();
                        (t.vehicleIds || []).forEach((vid) => {
                            const sv = segs
                                .filter((s: Segment) => s.vehicleId === vid)
                                .sort((a: Segment, b: Segment) => {
                                    const da = new Date(a.segmentDate || 0).getTime();
                                    const db = new Date(b.segmentDate || 0).getTime();
                                    if (da !== db) return da - db;
                                    const ca = new Date(a.created_at || 0).getTime();
                                    const cb = new Date(b.created_at || 0).getTime();
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
                        return totalForTrip;
                    })
                );
                const sum = all.reduce((acc, v) => acc + v, 0);
                if (!cancelled) setTotalKmFromSegments(Math.round(sum));
            } catch (e) {
                if (!cancelled) setTotalKmFromSegments(0);
            }
        })();
        return () => { cancelled = true; };
    }, [trips]);

    // 3. Duração total (em milissegundos)
    const totalDurationMs = trips.reduce((sum, trip) => {
        const startDate = parseDateTime(
            trip.departureDate,
            trip.departureTime,
        );
        if (!startDate) return sum;

        let endDate: Date | null = null;
        if (
            trip.status &&
            trip.arrivalDate &&
            trip.arrivalTime
        ) {
            endDate = parseDateTime(
                trip.arrivalDate,
                trip.arrivalTime,
            );
        } else {
            endDate = new Date(); // em andamento → até agora
        }

        if (!endDate) return sum;
        const diff = endDate.getTime() - startDate.getTime();
        return diff > 0 ? sum + diff : sum;
    }, 0);

    // Converter duração total para dias, horas, minutos
    const totalDays = Math.floor(
        totalDurationMs / (1000 * 60 * 60 * 24),
    );
    const totalHours = Math.floor(
        (totalDurationMs % (1000 * 60 * 60 * 24)) /
        (1000 * 60 * 60),
    );

    // 4. Última viagem iniciada
    const lastTrip = trips.reduce((latest, trip) => {
        const tripDate = parseDateTime(
            trip.departureDate,
            trip.departureTime,
        );
        const latestDate = latest
            ? parseDateTime(latest.departureDate, latest.departureTime)
            : null;
            
        return tripDate && (!latestDate || tripDate > latestDate)
            ? trip
            : latest;
    }, trips[0] || null);

    // Formatar data para exibição
    const formatDate = (dateStr: string) => {
        if (!dateStr) return "—";
        if (dateStr.match(/^\d{2}\/\d{2}\/\d{4}$/)) return dateStr;
        const [y, m, d] = dateStr.split("-");
        return `${d}/${m}/${y}`;
    };

    return (
        <div className="px-4 py-6 space-y-6">
            <h2 className="text-xl font-bold text-gray-800">
                Dashboard
            </h2>

            {/* Resumo principal */}
            <div className="grid grid-cols-3 gap-2">
                <div className="bg-white rounded-lg p-4 text-center shadow-sm">
                    <p className="text-xs text-gray-500">Viagens</p>
                    <p className="text-lg font-bold text-gray-800">
                        {totalTrips}
                    </p>
                </div>

                <div className="bg-white rounded-lg p-4 text-center shadow-sm">
                    <p className="text-xs text-gray-500">Distância percorrida</p>
                    <p className="text-lg font-bold text-gray-800">
                        {totalKmFromSegments.toFixed(0)} km
                    </p>
                </div>

                <div className="bg-white rounded-lg p-4 text-center shadow-sm">
                    <p className="text-xs text-gray-500">Duração</p>
                    <p className="text-lg font-bold text-gray-800">
                        {totalDays > 0 ? `${totalDays}d ` : ""}
                        {totalHours}h
                    </p>
                </div>
            </div>

            {/* Última viagem */}
            {lastTrip && (
                <div className="bg-white rounded-lg p-4 shadow-sm">
                    <p className="text-xs text-gray-500 mb-1">
                        Última viagem iniciada
                    </p>
                    <p className="font-medium text-gray-800">
                        {lastTrip.name}
                    </p>
                    <p className="text-sm text-gray-600">
                        {formatDate(lastTrip.departureDate)} •{" "}
                        {lastTrip.departureTime}
                    </p>
                    {(() => {
                        const completed = typeof (lastTrip as any).trip_completed === 'boolean'
                          ? (lastTrip as any).trip_completed
                          : ((lastTrip as any).status === 'completed');
                        return (
                            <span
                                className={`text-xs px-2 py-1 rounded-full mt-2 inline-block ${
                                    !completed
                                        ? "bg-blue-100 text-blue-700"
                                        : "bg-green-100 text-green-700"
                                }`}
                            >
                                {!completed ? "Em andamento" : "Encerrada"}
                            </span>
                        );
                    })()}
                </div>
            )}

            {/* BOTÃO PARA ABRIR O MODAL DE COMPARAÇÃO */}
            {trips.length >= 2 && (
                <div className="pt-4 text-center">
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition-colors flex items-center justify-center mx-auto"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v4a1 1 0 01-1 1h-3a1 1 0 00-1 1v2a1 1 0 001 1h3a1 1 0 011 1v4a1 1 0 01-1 1H4a1 1 0 01-1-1v-4a1 1 0 011-1h3a1 1 0 001-1v-2a1 1 0 00-1-1H4a1 1 0 01-1-1V4z" clipRule="evenodd" />
                        </svg>
                        Comparar Viagens
                    </button>
                </div>
            )}
            
            {/* MENSAGENS DE ESTADO */}
            {trips.length < 2 && trips.length > 0 && (
                <p className="text-gray-500 text-center py-8">
                    Você precisa de pelo menos 2 viagens para comparar.
                </p>
            )}

            {trips.length === 0 && (
                <p className="text-gray-500 text-center py-8">
                    Nenhuma viagem registrada ainda. Comece sua primeira
                    viagem!
                </p>
            )}

            {/* RENDERIZAÇÃO CONDICIONAL DO MODAL */}
            {isModalOpen && trips.length >= 2 && (
                <Modal onClose={() => setIsModalOpen(false)}>
                    {/* Chama o componente Wrapper que gerencia o modo 2/4 */}
                    <TripComparisonWrapper trips={trips} /> 
                </Modal>
            )}
        </div>
    );
}

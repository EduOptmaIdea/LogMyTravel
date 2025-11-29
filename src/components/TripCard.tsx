import type { Trip, Vehicle } from "./useTrips";
import { MapPin, Edit, Trash, Car } from "lucide-react";
import React, { useState } from "react";
import { toast } from "sonner";

// Import dinâmico para evitar erro
const VehiclesOnTrip = React.lazy(() => import("./VehiclesOnTrip"));

interface TripCardProps {
  trip: Trip;
  onEdit?: () => void;
  onDelete?: () => void;
  vehicles?: Vehicle[];
  saveVehicle?: (vehicle: Omit<Vehicle, 'id'>) => Promise<Vehicle>;
  updateVehicle?: (id: string, updates: Partial<Vehicle>) => Promise<Vehicle>;
}

export const TripCard = ({
  trip,
  onEdit,
  onDelete,
  vehicles,
  saveVehicle,
  updateVehicle,
}: TripCardProps) => {
  const formatDateOnly = (dateStr: string) => {
    try {
      if (!dateStr) return "—";
      if (dateStr.match(/^\d{2}\/\d{2}\/\d{4}$/)) return dateStr;
      const [y, m, d] = dateStr.split("-");
      return `${d}/${m}/${y}`;
    } catch {
      return "Data inválida";
    }
  };

  const getDuration = () => {
    try {
      const [d, m, y] = trip.departureDate.split("/").map(Number);
      const [h, min] = trip.departureTime.split(":").map(Number);
      if (isNaN(d) || isNaN(m) || isNaN(y) || isNaN(h) || isNaN(min)) {
        return "—";
      }
      const startDate = new Date(y, m - 1, d, h, min);
      if (isNaN(startDate.getTime())) return "—";

      if (trip.status === "completed" && trip.arrivalDate && trip.arrivalTime) {
        const [ad, am, ay] = trip.arrivalDate.split("/").map(Number);
        const [ah, amin] = trip.arrivalTime.split(":").map(Number);
        if (isNaN(ad) || isNaN(am) || isNaN(ay) || isNaN(ah) || isNaN(amin)) {
          return "—";
        }
        const endDate = new Date(ay, am - 1, ad, ah, amin);
        if (isNaN(endDate.getTime())) return "—";
        const diffMs = endDate.getTime() - startDate.getTime();
        if (diffMs < 0) return "—";

        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

        const parts = [];
        if (diffDays > 0) parts.push(`${diffDays}d`);
        if (diffHours > 0) parts.push(`${diffHours}h`);
        if (diffMinutes > 0) parts.push(`${diffMinutes}min`);
        return parts.length ? parts.join(" ") : "0min";
      } else {
        const now = new Date();
        const diffMs = now.getTime() - startDate.getTime();
        if (diffMs < 0) return "0min";

        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

        const parts = [];
        if (diffDays > 0) parts.push(`${diffDays}d`);
        if (diffHours > 0) parts.push(`${diffHours}h`);
        if (diffMinutes > 0) parts.push(`${diffMinutes}min`);
        return parts.length ? parts.join(" ") : "Aguardando...";
      }
    } catch (error) {
      return "—";
    }
  };

  const getDistance = () => {
    try {
      const raw = localStorage.getItem("trip_vehicle_segments");
      const segments: Array<{
        id: string;
        tripId: string;
        vehicleId: string;
        segmentDate: string;
        initialKm: number;
        currentKm: number;
        created_at?: string;
      }> = raw ? JSON.parse(raw) : [];

      const segsForTrip = segments.filter((s) => s.tripId === trip.id);
      if (segsForTrip.length === 0 || !trip.vehicleIds || trip.vehicleIds.length === 0) {
        return "—";
      }

      // Agrupar por veículo e ordenar por data
      const byVehicle = new Map<string, { initial: number; current: number }>();
      for (const vid of trip.vehicleIds) {
        const segs = segsForTrip
          .filter((s) => s.vehicleId === vid)
          .sort((a, b) => {
            const da = new Date(a.segmentDate).getTime();
            const db = new Date(b.segmentDate).getTime();
            if (da !== db) return da - db;
            const ca = a.created_at ? new Date(a.created_at).getTime() : 0;
            const cb = b.created_at ? new Date(b.created_at).getTime() : 0;
            return ca - cb;
          });
        if (segs.length > 0) {
          byVehicle.set(vid, {
            initial: segs[0].initialKm ?? 0,
            current: segs[segs.length - 1].currentKm ?? segs[0].initialKm ?? 0,
          });
        }
      }

      if (byVehicle.size === 0) return "—";

      if (trip.status === "completed") {
        // Mostrar apenas KM final (soma dos atuais por veículo)
        const sumFinal = Array.from(byVehicle.values()).reduce((acc, v) => acc + (v.current ?? 0), 0);
        return `${Math.round(sumFinal)} km`;
      }

      // Em andamento: somatório dos totais por veículo
      const sumTotals = Array.from(byVehicle.values()).reduce((acc, v) => acc + Math.max(0, (v.current ?? 0) - (v.initial ?? 0)), 0);
      return sumTotals > 0 ? `${Math.round(sumTotals)} km` : "—";
    } catch (e) {
      return "—";
    }
  };

  const getGoogleMapsLink = (coords?: { latitude: number; longitude: number }) => {
    if (!coords) return "#";
    return `https://www.google.com/maps?q=${coords.latitude},${coords.longitude}`;
  };

  const isCompleted = trip.status === "completed";

  // 👇 Resolve veículo pelo estado vindo por props; fallback para localStorage
  const getVehicleById = (id: string): Vehicle | null => {
    const found = (vehicles || []).find((v) => v.id === id);
    if (found) return found as Vehicle;
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

  // 👇 Estados para o modal de veículo
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [editingVehicleId, setEditingVehicleId] = useState<string | null>(null);

  const handleOpenVehicleModal = () => {
    if (trip.vehicleIds?.[0]) {
      setEditingVehicleId(trip.vehicleIds[0]);
      setShowVehicleModal(true);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-4 space-y-4 border border-gray-100 mb-4"> {/* 👈 p-4 + mb-4 */}
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0 pr-4">
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              isCompleted
                ? "bg-red-700 text-white"
                : "bg-teal-600 text-white"
            }`}
          >
            {isCompleted ? "Encerrada" : "Em andamento"}
          </span>
          <h3 className="text-xl font-extrabold text-gray-900 truncate mt-1">
            {trip.name}
          </h3>
        </div>
        <div className="flex gap-1 flex-shrink-0 pt-1">
          {onEdit && (
            <button
              onClick={onEdit}
              className="text-[#192A56] hover:bg-blue-50 p-2 rounded-xl transition-colors"
              title="Editar viagem"
              aria-label="Editar viagem"
            >
              <Edit size={20} />
            </button>
          )}
          {onDelete && (
            <button
              onClick={onDelete}
              className="text-red-500 hover:bg-red-50 p-2 rounded-xl transition-colors"
              title="Excluir viagem"
              aria-label="Excluir viagem"
            >
              <Trash size={20} />
            </button>
          )}
        </div>
      </div>

      {/* Cabeçalho: Local de partida | Início | Duração */}
      <div className="grid grid-cols-3 gap-4 border-t border-gray-200 pt-4">
        <div>
          <p className="text-xs text-gray-500 mb-1 font-medium">Local de partida</p>
          {trip.departureCoords ? (
            <a
              href={getGoogleMapsLink(trip.departureCoords)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 min-w-0 w-full text-left text-fuchsia-500 hover:underline"
            >
              <MapPin className="text-green-600 flex-shrink-0" size={16} />
              <span className="text-sm truncate font-semibold text-gray-900">
                {trip.departureLocation}
              </span>
            </a>
          ) : (
            <div className="flex items-center gap-2">
              <MapPin className="text-green-600 flex-shrink-0" size={16} />
              <span className="text-sm font-semibold text-gray-900">{trip.departureLocation}</span>
            </div>
          )}
        </div>

        <div>
          <p className="text-xs text-gray-500 mb-1 font-medium">Início</p>
          <p className="text-sm font-semibold text-gray-900">
            {formatDateOnly(trip.departureDate)} {trip.departureTime}
          </p>
        </div>

        <div className="text-right">
          <p className="text-xs text-gray-500 mb-1 font-medium">Duração</p>
          <p className="text-sm font-semibold text-gray-900">{getDuration()}</p>
        </div>

        {isCompleted && (
          <div className="col-span-2 border-t border-dashed border-gray-200 pt-4 flex items-start justify-between gap-4">
            {/* Coluna: Local de chegada (esquerda) */}
            <div className="min-w-0 flex-1">
              <p className="text-xs text-gray-500 mb-1 font-medium">Local de chegada</p>
              {trip.arrivalCoords ? (
                <a
                  href={getGoogleMapsLink(trip.arrivalCoords)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 min-w-0 w-full text-left text-fuchsia-500 hover:underline"
                >
                  <MapPin className="text-red-600 flex-shrink-0" size={16} />
                  <span className="text-sm font-semibold text-gray-900 break-words">
                    {trip.arrivalLocation}
                  </span>
                </a>
              ) : (
                <div className="flex items-center gap-2 min-w-0">
                  <MapPin className="text-red-600 flex-shrink-0" size={16} />
                  <span className="text-sm font-semibold text-gray-900 break-words">{trip.arrivalLocation || "—"}</span>
                </div>
              )}
            </div>

            {/* Coluna: Momento da chegada (direita) */}
            <div className="text-right flex-shrink-0">
              <p className="text-xs text-gray-500 mb-1 font-medium whitespace-nowrap">Momento da chegada</p>
              <p className="text-sm font-semibold text-gray-900 whitespace-nowrap">
                {trip.arrivalDate && trip.arrivalTime
                  ? `${formatDateOnly(trip.arrivalDate)} ${trip.arrivalTime}`
                  : "—"}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 👇 Seção de Veículo (se aplicável) */}
      {trip.hasVehicle && (
        <div className="border-t border-gray-200 pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Car size={16} className="text-green-600" />
              <p className="text-sm font-bold text-gray-700">Veículo</p>
            </div>
            {trip.vehicleIds?.length ? (
              <button
                onClick={handleOpenVehicleModal}
                className="text-xs text-fuchsia-500 hover:underline font-medium"
              >
                Gerenciar
              </button>
            ) : null}
          </div>
          <p className="text-sm text-gray-600 mt-1">
            {trip.vehicleIds?.length ? (
              getVehicleById(trip.vehicleIds[0])?.nickname || "Veículo não encontrado"
            ) : (
              <span className="text-orange-600">Nenhum veículo vinculado</span>
            )}
          </p>
        </div>
      )}

      {/* Detalhes — remover referências a KM temporariamente */}
      {/* seção desativada conforme especificação */}

      {/* Visão geral da viagem */}
      {trip.details && (
        <div className="border-t border-gray-200 pt-4">
          <p className="text-xs text-gray-500 mb-1 font-medium">Visão geral da viagem</p>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{trip.details}</p>
        </div>
      )}

      {/* Modal de Gerenciamento de Veículo */}
      {showVehicleModal && editingVehicleId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-y-auto flex flex-col">
            <div className="sticky top-0 bg-white p-4 border-b flex justify-between items-center z-10">
              <h3 className="text-xl font-bold text-gray-900">Editar Veículo</h3>
              <button
                onClick={() => setShowVehicleModal(false)}
                className="text-gray-500 hover:text-gray-800 text-2xl"
                aria-label="Fechar"
              >
                &times;
              </button>
            </div>
            <div className="flex-grow p-4">
              <React.Suspense fallback={<div className="p-4 text-center">Carregando...</div>}>
                <VehiclesOnTrip
                  allowSelection={false}
                  editingVehicleId={editingVehicleId}
                  onEditComplete={() => setShowVehicleModal(false)}
                  vehicles={vehicles}
                  saveVehicle={saveVehicle}
                  updateVehicle={updateVehicle}
                />
              </React.Suspense>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
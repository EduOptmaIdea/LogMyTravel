import React, { useState, useEffect } from "react";
import { PlusCircle, ChevronRight } from "lucide-react";
import VehicleDetailsModal from "./VehicleDetailsModal";
import VehiclesOnTrip from "./VehiclesOnTrip";
import type { Vehicle, Trip } from "./useTrips";
import { useWarningsModal } from "./hooks/useWarningsModal";
import { supabase } from "../utils/supabase/client";

type VehiclesViewProps = {
  vehicles: Vehicle[];
  trips: Trip[];
  loadingVehicles?: boolean;
  saveVehicle: (vehicle: Omit<Vehicle, "id">) => Promise<Vehicle>;
  updateVehicle: (id: string, updates: Partial<Vehicle>) => Promise<Vehicle>;
  deleteVehicle: (id: string) => Promise<void>;
  ensureVehicleSynced?: (id: string) => Promise<boolean>;
};

export function VehiclesView({ 
  vehicles, 
  trips, 
  loadingVehicles, 
  saveVehicle, 
  updateVehicle, 
  deleteVehicle, 
  ensureVehicleSynced 
}: VehiclesViewProps) {
  const [adding, setAdding] = useState<boolean>(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [viewing, setViewing] = useState<Vehicle | null>(null);
  const { openModal, element: warningsModal } = useWarningsModal();
  const [signedMap, setSignedMap] = useState<Record<string, string>>({});
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  // Efeito para carregar as fotos assinadas do Supabase
  React.useEffect(() => {
    (async () => {
      try {
        if (!supabase) return;
        const entries = vehicles.filter(v => !v.photoUrl && v.photoPath).slice(0, 20);
        const next: Record<string, string> = {};
        for (const v of entries) {
          try {
            const { data } = await supabase.storage.from('trip-photos').createSignedUrl(String(v.photoPath), 3600);
            if (data?.signedUrl) next[v.id] = data.signedUrl;
          } catch {}
        }
        setSignedMap(next);
      } catch {}
    })();
  }, [vehicles]);

  const isVehicleUsed = (vehicleId: string) => {
    return trips.some((t) => Array.isArray(t.vehicleIds) && t.vehicleIds.includes(vehicleId));
  };

  // 1. TELA DE VISUALIZAÇÃO DETALHADA
  // Movido para o topo para evitar o erro de tipagem 'never' no final do arquivo
  if (viewing) {
    return (
      <div className="px-4 py-6 pb-24 space-y-6">
        {warningsModal}
        <VehicleDetailsModal
          vehicle={viewing}
          onClose={() => setViewing(null)}
          onUpdate={async (id, updates) => {
            const updated = await updateVehicle(id, updates);
            openModal({ title: "Sucesso", message: "Veículo atualizado", cancelText: "Fechar" });
            return updated;
          }}
          onDelete={async (id) => {
            await deleteVehicle(id);
            openModal({ title: "Excluído", message: "Veículo excluído com sucesso", cancelText: "Fechar" });
            setViewing(null);
          }}
          isVehicleUsed={isVehicleUsed(viewing.id)}
        />
      </div>
    );
  }

  // 2. LISTAGEM E CADASTRO
  return (
    <div className="px-4 py-6 pb-24 space-y-6">
      {warningsModal}
      <h2 className="text-xl font-bold text-gray-800">Meus veículos</h2>

      {/* Filtros */}
      <div className="flex items-center gap-2">
        {(
          [
            { key: 'all', label: 'Todos' },
            { key: 'active', label: 'Ativos' },
            { key: 'inactive', label: 'Inativos' },
          ] as const
        ).map((opt) => (
          <button
            key={opt.key}
            onClick={() => setFilter(opt.key)}
            className={`px-3 py-1.5 rounded-full text-sm font-semibold border transition-colors ${
              filter === opt.key
                ? 'bg-teal-600 text-white border-teal-600'
                : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Formulário de Adição Inline */}
      {adding && (
        <div className="bg-white rounded-xl shadow border border-gray-100 p-4 space-y-3">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg font-bold text-gray-900">Novo Veículo</h3>
          </div>
          <VehiclesOnTrip
            allowSelection={false}
            hideList={true}
            vehicles={vehicles}
            saveVehicle={saveVehicle}
            updateVehicle={updateVehicle}
            onEditComplete={() => setAdding(false)}
          />
          <div className="flex justify-end mt-3">
            <button
              onClick={() => setAdding(false)}
              className="px-4 py-2 rounded-full border bg-white text-gray-800 hover:bg-gray-100 font-bold"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Lista de Veículos */}
      <div className="bg-white rounded-xl shadow border border-gray-100 divide-y">
        {vehicles
          .filter((v) =>
            filter === 'all' ? true : filter === 'active' ? (v.active !== false) : (v.active === false)
          )
          .sort((a, b) => (a.nickname || "").localeCompare(b.nickname || ""))
          .map((v) => (
            <div
              key={v.id}
              className={`p-4 flex items-center justify-between ${v.active === false ? "opacity-60" : ""} cursor-pointer hover:bg-gray-50`}
              onClick={() => setViewing(v)}
              role="button"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded overflow-hidden bg-gray-100 flex items-center justify-center">
                  {(() => {
                    const url = v.photoUrl || signedMap[v.id] || null;
                    if (url) return <img src={url} alt={v.nickname} className="h-full w-full object-cover cursor-zoom-in" onClick={(e) => { e.stopPropagation(); setLightboxUrl(url); }} />;
                    return <span className="text-xs text-gray-400">sem foto</span>;
                  })()}
                </div>
                <div>
                  <div className="font-semibold text-[#192A56]">{v.nickname || v.make || v.licensePlate}</div>
                  <div className="text-xs text-gray-600">{v.model || "—"}</div>
                </div>
              </div>
              <ChevronRight size={18} className="text-gray-400" />
            </div>
        ))}

        {loadingVehicles && (
          <div className="p-4 text-center text-gray-500">Carregando veículos...</div>
        )}

        {!loadingVehicles && vehicles.length === 0 && (
          <div className="p-8 text-center space-y-4">
            <p className="text-gray-500">Nenhum veículo cadastrado.</p>
            <button
              onClick={() => setAdding(true)}
              className="inline-flex items-center gap-2 bg-teal-600 text-white px-6 py-2 rounded-full font-bold"
            >
              <PlusCircle size={18} /> Cadastrar agora
            </button>
          </div>
        )}
      </div>

      {/* Botão Flutuante (apenas se não estiver adicionando/vendo) */}
      {!adding && !viewing && (
        <button
          onClick={() => setAdding(true)}
          className="fixed bottom-24 right-6 h-14 w-14 rounded-full bg-teal-600 text-white shadow-2xl flex items-center justify-center z-30 hover:bg-teal-700 transition-transform active:scale-90"
          title="Adicionar veículo"
        >
          <PlusCircle size={28} />
        </button>
      )}
      {!!lightboxUrl && (
        <div className="fixed inset-0 z-[10000] bg-black/80 flex items-center justify-center" onClick={() => setLightboxUrl(null)}>
          <img src={lightboxUrl} className="max-h-[85vh] max-w-[90vw] object-contain rounded-lg" />
        </div>
      )}
    </div>
  );
}

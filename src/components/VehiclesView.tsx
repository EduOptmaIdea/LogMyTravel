import { useState } from "react";
import { PlusCircle, ChevronRight } from "lucide-react";
import VehicleDetailsModal from "./VehicleDetailsModal";
import VehiclesOnTrip from "./VehiclesOnTrip";
import type { Vehicle } from "./useTrips";
import type { Trip } from "./useTrips";
import { useWarningsModal } from "./hooks/useWarningsModal";

type VehiclesViewProps = {
  vehicles: Vehicle[];
  trips: Trip[];
  loadingVehicles?: boolean;
  saveVehicle: (vehicle: Omit<Vehicle, "id">) => Promise<Vehicle>;
  updateVehicle: (id: string, updates: Partial<Vehicle>) => Promise<Vehicle>;
  deleteVehicle: (id: string) => Promise<void>;
};

export function VehiclesView({ vehicles, trips, loadingVehicles, saveVehicle, updateVehicle, deleteVehicle }: VehiclesViewProps) {
  const [editing, setEditing] = useState<Vehicle | null>(null);
  const [adding, setAdding] = useState<boolean>(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [form, setForm] = useState<Omit<Vehicle, "id">>({
    nickname: "",
    category: "",
    make: "",
    model: "",
    color: "",
    year: new Date().getFullYear(),
    licensePlate: "",
    vehicleType: "",
    kmInitial: 0,
    fuels: [],
    photoUrl: null,
    photoPath: null,
    active: true,
  });
  const [viewing, setViewing] = useState<Vehicle | null>(null);
  const { openModal, element: warningsModal } = useWarningsModal();

  const isVehicleUsed = (vehicleId: string) => {
    return trips.some((t) => Array.isArray(t.vehicleIds) && t.vehicleIds.includes(vehicleId));
  };

  const handleSubmit = async () => {
    try {
      if (editing) {
        await updateVehicle(editing.id, { ...form, licensePlate: (form.licensePlate || "").toUpperCase() });
        setEditing(null);
      } else {
        await saveVehicle({ ...form, licensePlate: (form.licensePlate || "").toUpperCase() });
      }
      setForm({ ...form, nickname: "", licensePlate: "", make: "", model: "", color: "", year: new Date().getFullYear(), kmInitial: 0, fuels: [] });
      openModal({ title: "Sucesso", message: "Veículo salvo com sucesso", cancelText: "Fechar" });
    } catch (e: any) {
      openModal({ title: "Erro", message: e?.message || "Falha ao salvar veículo", cancelText: "Fechar" });
    }
  };

  const handleDelete = async (id: string) => {
    if (isVehicleUsed(id)) {
      openModal({
        title: "Exclusão não permitida",
        message: "Este veículo está vinculado a uma viagem. Desvincule antes de excluir.",
        cancelText: "Entendi",
      });
      return;
    }
    openModal({
      title: "Confirmar exclusão",
      message: "Esta ação não poderá ser desfeita. Deseja realmente excluir?",
      confirmText: "Excluir",
      cancelText: "Cancelar",
      onConfirm: async () => {
        try {
          await deleteVehicle(id);
          openModal({ title: "Excluído", message: "Veículo excluído com sucesso", cancelText: "Fechar" });
        } catch (e: any) {
          openModal({ title: "Erro", message: e?.message || "Falha ao excluir veículo", cancelText: "Fechar" });
        }
      },
    });
  };

  const startEdit = (v: Vehicle) => {
    setEditing(v);
    setForm({
      nickname: v.nickname || "",
      category: v.category || "",
      make: v.make || "",
      model: v.model || "",
      color: v.color || "",
      year: Number(v.year) || new Date().getFullYear(),
      licensePlate: v.licensePlate || "",
      vehicleType: v.vehicleType || "",
      kmInitial: Number(v.kmInitial) || 0,
      fuels: Array.isArray(v.fuels) ? v.fuels : [],
      photoUrl: v.photoUrl ?? null,
      photoPath: v.photoPath ?? null,
      active: (v.active ?? true),
    });
  };

  // Quando estiver visualizando um veículo, mostramos uma "página" dedicada entre o header e o bottom
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

  return (
    <div className="px-4 py-6 pb-24 space-y-6">
      {warningsModal}
      <h2 className="text-xl font-bold text-gray-800">Meus veículos</h2>

      {/* Filtros: Todos | Ativos | Inativos */}
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

      {/* Cadastro inline no body (sem modal) usando VehiclesOnTrip */}
      {adding && (
        <div className="bg-white rounded-xl shadow border border-gray-100 p-4 space-y-3">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg font-bold text-gray-900">Cadastrar Novo Veículo</h3>
            <button onClick={() => setAdding(false)} className="px-3 py-1 rounded-full border bg-white text-gray-700 hover:bg-gray-50">Cancelar</button>
          </div>
          <VehiclesOnTrip
            allowSelection={false}
            hideList={true}
            vehicles={vehicles}
            saveVehicle={saveVehicle}
            updateVehicle={updateVehicle}
            onEditComplete={() => setAdding(false)}
          />
          {/* Botão de cancelar também no rodapé para facilitar em formulários longos */}
          <div className="flex justify-end mt-3">
            <button
              type="button"
              onClick={() => setAdding(false)}
              className="px-4 py-2 rounded-full border bg-white text-gray-800 hover:bg-gray-100 font-bold"
              aria-label="Cancelar cadastro de veículo"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {editing && (
      <div className="bg-white rounded-xl shadow border border-gray-100 p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input className="border rounded-xl px-3 py-2" placeholder="Apelido" value={form.nickname} onChange={(e) => setForm({ ...form, nickname: e.target.value })} />
          <input
            className="border rounded-xl px-3 py-2"
            placeholder="Placa"
            value={form.licensePlate}
            onChange={(e) => {
              let v = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
              if (v.length > 7) v = v.slice(0, 7);
              setForm({ ...form, licensePlate: v });
            }}
            maxLength={7}
          />
          <input className="border rounded-xl px-3 py-2" placeholder="Marca" value={form.make} onChange={(e) => setForm({ ...form, make: e.target.value })} />
          <input className="border rounded-xl px-3 py-2" placeholder="Modelo" value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} />
          <input className="border rounded-xl px-3 py-2" placeholder="Cor" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} />
          <input className="border rounded-xl px-3 py-2" placeholder="Ano" type="number" value={form.year} onChange={(e) => setForm({ ...form, year: Number(e.target.value) })} />
          <select
            className="border rounded-xl px-3 py-2"
            value={form.vehicleType}
            onChange={(e) => setForm({ ...form, vehicleType: e.target.value as Vehicle["vehicleType"] })}
          >
            <option value="">Tipo de veículo</option>
            <option value="proprio">Próprio</option>
            <option value="alugado">Alugado</option>
            <option value="trabalho">Trabalho</option>
            <option value="outros">Outros</option>
          </select>
          {/** KM inicial oculto: controlado por segmentos/viagens **/}
          <div className="flex items-center gap-2">
            <input id="active" type="checkbox" checked={form.active ?? true} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
            <label htmlFor="active" className="text-sm text-gray-700">Ativo</label>
          </div>
        </div>
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex flex-wrap gap-2">
            {["gasolina","etanol","diesel","eletrico","gnv"].map((fuel) => (
              <label key={fuel} className="flex items-center gap-1 text-sm">
                <input
                  type="checkbox"
                  checked={Array.isArray(form.fuels) && form.fuels.includes(fuel)}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    const prev = Array.isArray(form.fuels) ? form.fuels : [];
                    const next = checked ? [...prev, fuel] : prev.filter((f) => f !== fuel);
                    setForm({ ...form, fuels: next });
                  }}
                />
                <span>{fuel.charAt(0).toUpperCase() + fuel.slice(1)}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="flex gap-2 mt-3">
          <button onClick={handleSubmit} className="w-full h-14 bg-fuchsia-500 hover:bg-fuchsia-600 text-white rounded-xl text-lg shadow-lg">
            {editing ? "Salvar alterações" : "Adicionar veículo"}
          </button>
          {editing && (
            <button onClick={() => setEditing(null)} className="w-full h-14 bg-fuchsia-500 hover:bg-fuchsia-600 text-white rounded-xl text-lg shadow-lg">Cancelar</button>
          )}
        </div>
      </div>
      )}

      <div className="bg-white rounded-xl shadow border border-gray-100 divide-y">
        {vehicles
          .filter((v) =>
            filter === 'all' ? true : filter === 'active' ? (v.active !== false) : (v.active === false)
          )
          .slice()
          .sort((a, b) => (a.nickname || "").localeCompare(b.nickname || ""))
          .map((v) => (
            <div
              key={v.id}
              className={`p-4 flex items-center justify-between ${v.active === false ? "opacity-60" : ""} cursor-pointer hover:bg-gray-50`}
              onClick={() => setViewing(v)}
              role="button"
              aria-label={`Ver veículo ${v.nickname || v.model || v.licensePlate || ""}`}
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded overflow-hidden bg-gray-100 flex items-center justify-center">
                  {v.photoUrl ? (
                    <img src={v.photoUrl} alt={v.nickname || v.model || ''} className="h-full w-full object-cover" />
                  ) : v.photoPath ? (
                    <span className="text-[10px] text-gray-400">foto não pública</span>
                  ) : (
                    <span className="text-xs text-gray-400">sem foto</span>
                  )}
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
          <div className="p-4 text-gray-700 space-y-3">
            <div>Carregando veículos...</div>
          </div>
        )}
        {!loadingVehicles && vehicles.length === 0 && (
          <div className="p-4 text-gray-700 space-y-3">
            <div>Nenhum veículo cadastrado ainda.</div>
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="w-full inline-flex items-center justify-center gap-2 bg-fuchsia-600 text-white font-bold px-5 py-3 rounded-full shadow-lg focus-visible:ring-2 focus-visible:ring-fuchsia-400 active:bg-fuchsia-700"
              aria-label="Adicionar veículo"
            >
              <PlusCircle size={18} className="text-white" />
              <span>Adicionar veículo</span>
            </button>
          </div>
        )}
      </div>

      <div className="text-sm text-gray-600">
        Histórico por veículo: a ser construído. Nesta tela aparecerão trechos e viagens associados.
      </div>

      {viewing && (
        <VehicleDetailsModal
          vehicle={viewing}
          onClose={() => setViewing(null)}
          onUpdate={async (id, updates) => {
            const updated = await updateVehicle(id, updates);
            // Feedback visual
            openModal({ title: "Sucesso", message: "Veículo atualizado", cancelText: "Fechar" });
            return updated;
          }}
          onDelete={async (id) => {
            await deleteVehicle(id);
            openModal({ title: "Excluído", message: "Veículo excluído com sucesso", cancelText: "Fechar" });
          }}
          isVehicleUsed={isVehicleUsed(viewing.id)}
        />
      )}

      {/* Botão flutuante para adicionar veículo (oculto durante adicionar/visualizar) */}
      {!adding && !viewing && (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="fixed bottom-6 right-6 h-12 w-12 rounded-full bg-teal-600 hover:bg-teal-700 text-white shadow-lg flex items-center justify-center z-30"
          aria-label="Adicionar veículo"
          title="Adicionar veículo"
        >
          <PlusCircle size={22} className="text-white" />
        </button>
      )}
    </div>
  );
}
  // Modal de cadastro pode ser aberto automaticamente via estado inicial (localStorage)

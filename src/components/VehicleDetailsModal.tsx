import React, { useMemo, useState, useRef } from "react";
import { X, Pencil, Trash2, Tag } from "lucide-react";
import { supabase } from "../utils/supabase/client";
import { useAuth } from "../utils/auth/AuthProvider";
import { safeRandomUUID } from "../utils/uuid";
import type { Vehicle } from "./useTrips";

type VehicleDetailsModalProps = {
  vehicle: Vehicle;
  onClose: () => void;
  onUpdate: (id: string, updates: Partial<Vehicle>) => Promise<Vehicle>;
  onDelete: (id: string) => Promise<void>;
  isVehicleUsed?: boolean;
};

export default function VehicleDetailsModal({ vehicle, onClose, onUpdate, onDelete, isVehicleUsed = false }: VehicleDetailsModalProps) {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<Partial<Vehicle>>({
    nickname: vehicle.nickname || "",
    category: vehicle.category || "",
    make: vehicle.make || "",
    model: vehicle.model || "",
    color: vehicle.color || "",
    year: vehicle.year || new Date().getFullYear(),
    licensePlate: vehicle.licensePlate || "",
    vehicleType: vehicle.vehicleType || "",
    kmInitial: vehicle.kmInitial ?? null,
    fuels: Array.isArray(vehicle.fuels) ? vehicle.fuels : [],
    photoUrl: vehicle.photoUrl ?? null,
    photoPath: vehicle.photoPath ?? null,
    active: vehicle.active ?? true,
  });

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [clearPhoto, setClearPhoto] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const title = useMemo(() => {
    return (vehicle.nickname || vehicle.make || vehicle.licensePlate || "Veículo");
  }, [vehicle]);

  const uploadVehiclePhoto = async (
    vehicleId: string,
    file: File,
  ): Promise<{ url: string | null; path: string | null }> => {
    try {
      if (!supabase || !user?.id) return { url: null, path: null };
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const filename = `${safeRandomUUID()}.${ext}`;
      const path = `${user.id}/vehicles/${vehicleId}/${filename}`;
      const { error: upErr } = await supabase.storage
        .from("trip-photos")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) {
        console.warn("Falha ao subir imagem no Storage:", upErr.message || upErr);
        return { url: null, path: null };
      }
      const { data: signed } = await supabase.storage
        .from("trip-photos")
        .createSignedUrl(path, 60 * 60 * 24 * 365);
      return { url: signed?.signedUrl || null, path };
    } catch (e) {
      console.warn("Upload exception:", e);
      return { url: null, path: null };
    }
  };

  const removeExistingPhoto = async (path: string | null | undefined) => {
    try {
      if (supabase && user?.id && path) {
        const { error: rmError } = await supabase.storage
          .from("trip-photos")
          .remove([path]);
        if (rmError) console.warn("Falha ao remover foto do Storage:", rmError);
      }
    } catch (e) {
      console.warn("Exceção ao remover foto do Storage:", e);
    }
  };

  const handleSave = async () => {
    setError(null);
    // Validações simples
    const mandatory = [form.nickname, form.model, form.licensePlate];
    if (mandatory.some((v) => !String(v || "").trim())) {
      setError("Preencha apelido, modelo e placa.");
      return;
    }
    setSaving(true);
    try {
      let finalPhotoUrl: string | undefined = undefined;
      let finalPhotoPath: string | undefined = undefined;

      if (clearPhoto && !imageFile) {
        await removeExistingPhoto(vehicle.photoPath || null);
        finalPhotoUrl = null as any;
        finalPhotoPath = null as any;
      }
      if (imageFile) {
        await removeExistingPhoto(vehicle.photoPath || null);
        const uploaded = await uploadVehiclePhoto(vehicle.id, imageFile);
        finalPhotoUrl = uploaded.url || imagePreview || undefined;
        finalPhotoPath = uploaded.path || undefined;
      }

      const updates: Partial<Vehicle> = {
        ...form,
        licensePlate: String(form.licensePlate || "").toUpperCase(),
        fuels: Array.isArray(form.fuels) ? [...form.fuels] : [],
        ...(finalPhotoUrl !== undefined ? { photoUrl: finalPhotoUrl } : {}),
        ...(finalPhotoPath !== undefined ? { photoPath: finalPhotoPath } : {}),
      } as Partial<Vehicle>;
      await onUpdate(vehicle.id, updates);
      setIsEditing(false);
      setImageFile(null);
      setImagePreview(null);
      setClearPhoto(false);
    } catch (e: any) {
      setError(e?.message || "Falha ao salvar alterações");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (isVehicleUsed) {
      setError("Este veículo está vinculado a viagens/segmentos e não pode ser excluído. Desvincule antes.");
      return;
    }
    if (!window.confirm("Tem certeza que deseja excluir este veículo? Esta ação não pode ser desfeita.")) {
      return;
    }
    try {
      await onDelete(vehicle.id);
      onClose();
    } catch (e: any) {
      setError(e?.message || "Falha ao excluir veículo");
    }
  };

  return (
    <>
      {/* Backdrop removido para comportamento de página */}
      <div className="hidden" aria-hidden="true" />
      <div
        className="relative z-10 bg-white rounded-xl shadow border border-gray-200 flex flex-col"
        aria-modal="true"
        role="dialog"
      >
      {/* Cabeçalho fixo (não rolável) */}
      <div className="sticky top-0 z-[1001] bg-white border-b border-gray-200">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center gap-3 justify-between">
          <div className="flex-1 flex items-center gap-3 justify-start">
            <div className="h-16 w-16 rounded-xl overflow-hidden bg-gray-100 shadow-sm flex items-center justify-center">
              {vehicle.photoUrl ? (
                <img src={vehicle.photoUrl} alt={title} className="h-full w-full object-cover" />
              ) : (
                <div className="text-[10px] text-gray-400">sem foto</div>
              )}
            </div>
            <div className="flex-1">
              <div className="text-[#192A56] font-bold text-lg leading-tight text-ellipsis overflow-hidden whitespace-nowrap">
                {title}
              </div>
              <div className="text-xs text-gray-600">{vehicle.model || "—"}</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-white shadow hover:bg-gray-100 text-gray-700 border absolute right-4 top-4"
            aria-label="Fechar"
            title="Fechar"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Conteúdo da página */}
      <div className="max-w-md mx-auto px-4 py-3 pb-24 space-y-4">
        <div className="space-y-2">
            <div className="text-sm text-gray-700">
              <span className="inline-flex items-center gap-1 text-gray-500 text-xs"><Tag size={12} /> Placa</span>
              <div className="font-semibold">{vehicle.licensePlate || "—"}</div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-gray-500">Marca</p>
                <p className="text-sm text-gray-800 font-medium">{vehicle.make || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Modelo</p>
                <p className="text-sm text-gray-800 font-medium">{vehicle.model || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Cor</p>
                <p className="text-sm text-gray-800 font-medium">{vehicle.color || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Ano</p>
                <p className="text-sm text-gray-800 font-medium">{vehicle.year || "—"}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-gray-500">Tipo</p>
                <p className="text-sm text-gray-800 font-medium">{vehicle.vehicleType || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Combustíveis</p>
                <p className="text-sm text-gray-800 font-medium">{Array.isArray(vehicle.fuels) && vehicle.fuels.length > 0 ? vehicle.fuels.map((f) => f.charAt(0).toUpperCase() + f.slice(1)).join(", ") : "—"}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-gray-500">KM Inicial</p>
                <p className="text-sm text-gray-800 font-medium">{vehicle.kmInitial ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Status</p>
                <p className={`text-sm font-semibold ${vehicle.active === false ? 'text-red-600' : 'text-green-700'}`}>{vehicle.active === false ? "Inativo" : "Ativo"}</p>
              </div>
            </div>
          </div>
        {isEditing && (
            <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Nome (apelido)</label>
              <input
                value={form.nickname as any}
                onChange={(e) => setForm({ ...form, nickname: e.target.value })}
                className="w-full border rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 block mb-1">Marca</label>
                <input value={form.make as any} onChange={(e) => setForm({ ...form, make: e.target.value })} className="w-full border rounded-md px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Modelo</label>
                <input value={form.model as any} onChange={(e) => setForm({ ...form, model: e.target.value })} className="w-full border rounded-md px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Cor</label>
                <input value={form.color as any} onChange={(e) => setForm({ ...form, color: e.target.value })} className="w-full border rounded-md px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Ano</label>
                <input type="number" value={Number(form.year || 0)} onChange={(e) => setForm({ ...form, year: Number(e.target.value) })} className="w-full border rounded-md px-3 py-2 text-sm" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 block mb-1">Placa</label>
                <input value={form.licensePlate as any} onChange={(e) => setForm({ ...form, licensePlate: e.target.value })} className="w-full border rounded-md px-3 py-2 text-sm uppercase" />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Tipo</label>
                <select
                  value={(form.vehicleType ?? "") as string}
                  onChange={(e) => setForm({ ...form, vehicleType: (e.target.value as Vehicle["vehicleType"]) })}
                  className="w-full border rounded-md px-3 py-2 text-sm"
                >
                  <option value="">Selecione</option>
                  <option value="proprio">Próprio</option>
                  <option value="alugado">Alugado</option>
                  <option value="trabalho">Trabalho</option>
                  <option value="outros">Outros</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Combustíveis</label>
              <div className="flex flex-wrap gap-2">
                {(["gasolina","etanol","diesel","eletrico","gnv"] as string[]).map((fuel) => (
                  <label key={fuel} className="flex items-center gap-1 text-xs">
                    <input
                      type="checkbox"
                      checked={Array.isArray(form.fuels) && form.fuels.includes(fuel)}
                      onChange={(e) => {
                        const prev = Array.isArray(form.fuels) ? form.fuels : [];
                        const next = e.target.checked ? [...prev, fuel] : prev.filter((f) => f !== fuel);
                        setForm({ ...form, fuels: next });
                      }}
                    />
                    <span>{fuel.charAt(0).toUpperCase() + fuel.slice(1)}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="inline-flex items-center gap-2 text-xs">
                <input type="checkbox" checked={form.active !== false} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
                <span>Ativo</span>
              </label>
            </div>

            {/* Upload/Substituição/Remoção de foto */}
            <div className="space-y-2">
              <label className="text-xs text-gray-500 block">Foto do veículo</label>
              <div className="flex items-center gap-3">
                <div className="h-20 w-20 rounded-xl overflow-hidden bg-gray-100 flex items-center justify-center cursor-zoom-in" onClick={() => {
                  const url = (imagePreview || vehicle.photoUrl) as string | null;
                  if (url) setLightboxUrl(url);
                }}>
                  {(imagePreview || vehicle.photoUrl) ? (
                    <img src={(imagePreview || vehicle.photoUrl) as string} alt="Pré-visualização" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-[10px] text-gray-400">sem foto</span>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    setImageFile(file);
                    setClearPhoto(false);
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = () => setImagePreview(String(reader.result || ""));
                      reader.readAsDataURL(file);
                    } else {
                      setImagePreview(null);
                    }
                  }}
                />
                {(imagePreview || vehicle.photoUrl) ? (
                  <button
                    type="button"
                    onClick={() => { setClearPhoto(true); setImageFile(null); setImagePreview(null); }}
                    className="px-3 py-2 rounded-full border bg-white text-gray-700 hover:bg-gray-50"
                  >
                    Remover foto
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-2 rounded-full bg-teal-600 text-white hover:bg-teal-700"
                  >
                    Adicionar foto
                  </button>
                )}
              </div>
              {clearPhoto && <p className="text-xs text-red-600">A foto atual será apagada do storage.</p>}
            </div>

            {error && <p className="text-xs text-red-600">{error}</p>}
            <div className="flex justify-end gap-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-teal-600 hover:bg-teal-700 text-white shadow disabled:opacity-60"
              >
                {saving ? "Salvando..." : "Salvar"}
              </button>
              <button onClick={() => setIsEditing(false)} className="px-4 py-2 rounded-full border bg-white text-gray-700 hover:bg-gray-50">Cancelar</button>
            </div>
          </div>
        )}
      </div>
      {!!lightboxUrl && (
        <div className="fixed inset-0 z-[10000] bg-black/80 flex items-center justify-center" onClick={() => setLightboxUrl(null)}>
          <img src={lightboxUrl} className="max-h-[85vh] max-w-[90vw] object-contain rounded-lg" />
        </div>
      )}
      {/* Barra de ações inferior da página */}
        <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex gap-3 mr-2">
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-fuchsia-600 text-white shadow"
              title="Editar"
            >
              <Pencil size={16} />
              <span>Editar</span>
            </button>
          )}
          {isEditing && (
            <>
              <button
                onClick={() => { setIsEditing(false); setImageFile(null); setImagePreview(null); setClearPhoto(false); }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full border bg-white text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-teal-600 hover:bg-teal-700 text-white shadow disabled:opacity-60"
              >
                {saving ? "Salvando..." : "Salvar"}
              </button>
            </>
          )}
        </div>
        <div className="ml-2">
          {isEditing ? (
            <button
              disabled
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-50 text-red-700 border border-red-200 opacity-60 cursor-not-allowed"
            >
              <Trash2 size={16} />
              <span>Excluir</span>
            </button>
          ) : (
            <button
              onClick={confirmDelete}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-50 text-red-700 hover:bg-red-100 border border-red-200"
            >
              <Trash2 size={16} />
              <span>Excluir</span>
            </button>
          )}
        </div>
      </div>
      </div>
    </>
  );
}


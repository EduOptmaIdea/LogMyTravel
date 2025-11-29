import React, { useState, useEffect, useCallback } from 'react';
import { useTrips } from './useTrips';
import type { Vehicle } from './useTrips';
import { supabase } from '../utils/supabase/client';
import { useAuth } from '../utils/auth/AuthProvider';
import { Car, ChevronUp, ChevronDown } from 'lucide-react';
import { safeRandomUUID } from '../utils/uuid';

  interface VehiclesOnTripProps {
    selectedVehicleIds?: string[];
    onSelectionChange?: (ids: string[]) => void;
    allowSelection?: boolean;
    hideList?: boolean;               // 👈 opcional: esconder lista interna
    editingVehicleId?: string | null; // 👈 novo: ID do veículo a ser editado
    onEditComplete?: () => void;       // 👈 novo: callback após salvar edição
    vehicles?: Vehicle[];              // 👈 injeção opcional
    saveVehicle?: (vehicle: Omit<Vehicle, 'id'>) => Promise<Vehicle>;
    updateVehicle?: (id: string, updates: Partial<Vehicle>) => Promise<Vehicle>;
    deleteVehicle?: (id: string) => Promise<void>;
  }

const initialFormData: Omit<Vehicle, 'id'> = {
  nickname: '',
  category: '',
  make: '',
  model: '',
  color: '',
  year: new Date().getFullYear(),
  licensePlate: '',
  vehicleType: '',
  kmInitial: null,
  fuels: [],
  photoUrl: null,
  photoPath: null,
};

  const VehiclesOnTrip: React.FC<VehiclesOnTripProps> = ({
    selectedVehicleIds = [],
    onSelectionChange,
    allowSelection = false,
    hideList = false,
    editingVehicleId = null,
    onEditComplete,
    vehicles: injectedVehicles,
    saveVehicle: injectedSaveVehicle,
    updateVehicle: injectedUpdateVehicle,
  }) => {
  const { user } = useAuth();
  const {
    vehicles: hookVehicles,
    saveVehicle: hookSaveVehicle,
    updateVehicle: hookUpdateVehicle,
    deleteVehicle: hookDeleteVehicle,
  } = useTrips();
  const effectiveVehicles = injectedVehicles ?? hookVehicles;
  const effectiveSaveVehicle = injectedSaveVehicle ?? hookSaveVehicle;
  const effectiveUpdateVehicle = injectedUpdateVehicle ?? hookUpdateVehicle;
  const effectiveDeleteVehicle = hookDeleteVehicle;
  const [vehicleToDelete, setVehicleToDelete] = useState<Vehicle | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [formData, setFormData] = useState(initialFormData);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | '' }>({ text: '', type: '' });
  const [restrictionWarning, setRestrictionWarning] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false); // 👈 modo edição ativo
  const [imagePreview, setImagePreview] = useState<string>('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [clearPhoto, setClearPhoto] = useState(false); // 👈 remover imagem existente
  const listRefAllVehicles = React.useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (editingVehicleId) {
      const vehicleToEdit = effectiveVehicles.find(v => v.id === editingVehicleId);
      if (vehicleToEdit) {
        setFormData({
          nickname: vehicleToEdit.nickname,
          category: vehicleToEdit.category,
          make: vehicleToEdit.make,
          model: vehicleToEdit.model,
          color: vehicleToEdit.color,
          year: vehicleToEdit.year,
          licensePlate: vehicleToEdit.licensePlate,
          vehicleType: vehicleToEdit.vehicleType,
          kmInitial: vehicleToEdit.kmInitial,
          fuels: [...vehicleToEdit.fuels],
          photoUrl: vehicleToEdit.photoUrl ?? null,
          photoPath: vehicleToEdit.photoPath ?? null,
        });
        setImagePreview(vehicleToEdit.photoUrl || '');
        setIsEditing(true);
      }
    } else {
      setIsEditing(false);
      setFormData(initialFormData);
      setImagePreview('');
      setImageFile(null);
      setClearPhoto(false);
    }
  }, [editingVehicleId, effectiveVehicles]);

  const showMessage = (text: string, type: 'success' | 'error') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 5000);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (name === 'kmInitial') {
      setFormData(prev => ({ ...prev, [name]: value === '' ? null : parseInt(value, 10) }));
      return;
    }
    if (name === 'vehicleType') {
      const isProprio = value === 'proprio';
      setFormData(prev => ({
        ...prev,
        [name]: value as Vehicle['vehicleType'],
        kmInitial: isProprio ? (prev.kmInitial ?? 0) : null,
      }));
      return;
    }
    const processed = type === 'number' && value ? parseInt(value, 10) : value;
    setFormData(prev => ({ ...prev, [name]: processed }));
  };

  const handleFuelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      fuels: checked ? [...prev.fuels, value] : prev.fuels.filter(f => f !== value),
    }));
  };

  const checkPlateRestriction = useCallback(() => {
    const plate = formData.licensePlate.trim().toUpperCase();
    if (plate.length < 4) {
      setRestrictionWarning('Digite uma placa válida.');
      return;
    }
    const last = plate.slice(-1);
    const days: Record<string, string> = {
      '1': 'Segunda-feira', '2': 'Segunda-feira',
      '3': 'Terça-feira', '4': 'Terça-feira',
      '5': 'Quarta-feira', '6': 'Quarta-feira',
      '7': 'Quinta-feira', '8': 'Quinta-feira',
      '9': 'Sexta-feira', '0': 'Sexta-feira',
    };
    const day = days[last];
    setRestrictionWarning(
      day
        ? `Placa termina em ${last}. Rodízio em ${day}s.`
        : `Placa ${plate} verificada.`
    );
  }, [formData.licensePlate]);

  const uploadVehiclePhoto = async (
    vehicleId: string,
    file: File,
  ): Promise<{ url: string | null; path: string | null }> => {
    try {
      if (!supabase || !user?.id) return { url: null, path: null };
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
      const filename = `${safeRandomUUID()}.${ext}`;
      const path = `${user.id}/vehicles/${vehicleId}/${filename}`;
      const { error } = await supabase.storage
        .from('trip-photos')
        .upload(path, file, { upsert: true, contentType: file.type });
      if (error) {
        console.warn('Falha ao subir imagem no Storage:', error.message || error);
        return { url: null, path: null };
      }
      const { data: signed } = await supabase.storage
        .from('trip-photos')
        .createSignedUrl(path, 60 * 60 * 24 * 365); // ~1 ano
      return { url: signed?.signedUrl || null, path };
    } catch (e) {
      console.warn('Upload exception:', e);
      return { url: null, path: null };
    }
  };

  // 👇 Função para CADASTRAR novo veículo
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nickname || !formData.model || !formData.licensePlate || formData.fuels.length === 0) {
      showMessage('Preencha todos os campos obrigatórios (*).', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const payload: Omit<Vehicle, 'id'> = {
        ...formData,
        licensePlate: formData.licensePlate.toUpperCase(),
        kmInitial: formData.vehicleType === 'proprio' ? (formData.kmInitial ?? 0) : null,
        fuels: [...formData.fuels],
        nickname: formData.nickname,
        category: formData.category,
        make: formData.make,
        model: formData.model,
        color: formData.color,
        year: formData.year,
        vehicleType: formData.vehicleType,
        photoUrl: null,
        active: true,
      };
      const saved = await effectiveSaveVehicle(payload);
      // Se houver imagem, subir para Storage no bucket correto e atualizar veículo com URL e path
      if (imageFile) {
        const uploaded = await uploadVehiclePhoto(saved.id, imageFile);
        if (uploaded.url && uploaded.path) {
          await effectiveUpdateVehicle(saved.id, { photoUrl: uploaded.url, photoPath: uploaded.path });
        } else {
          // feedback explícito quando o upload falhar
          showMessage('Veículo salvo. Falha ao subir a imagem.', 'error');
        }
      }
      // feedback explícito: online vs offline
      if (supabase && user?.id) {
        showMessage(`"${saved.nickname}" cadastrado na nuvem!`, 'success');
      } else {
        showMessage(`"${saved.nickname}" salvo localmente. Faça login para sincronizar.`, 'success');
      }
      // Se a seleção de veículo estiver ativa, selecionar automaticamente o recém-criado
      if (allowSelection && onSelectionChange) {
        const alreadySelected = selectedVehicleIds.includes(saved.id);
        if (!alreadySelected) {
          onSelectionChange([...selectedVehicleIds, saved.id]);
        }
      }
      setFormData(initialFormData);
      setImagePreview('');
      setImageFile(null);
      if (onEditComplete) onEditComplete();
    } catch (err: any) {
      // Mesmo que o Supabase falhe, a função de fallback local retorna o veículo;
      // reforçamos a mensagem para o usuário com detalhe do erro
      console.warn('Falha no cadastro de veículo:', err?.message || err);
      showMessage('Falha na nuvem. Salvo localmente para sincronizar depois.', 'error');
      if (onEditComplete) onEditComplete();
    } finally {
      setIsLoading(false);
    }
  };

  // 👇 Função para EDITAR veículo existente
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nickname || !formData.model || !formData.licensePlate || formData.fuels.length === 0) {
      showMessage('Preencha todos os campos obrigatórios (*).', 'error');
      return;
    }

    if (!editingVehicleId) return;

    setIsLoading(true);
    try {
      let finalPhotoUrl: string | undefined = undefined;
      let finalPhotoPath: string | undefined = undefined;
      if (imageFile) {
        const uploaded = await uploadVehiclePhoto(editingVehicleId, imageFile);
        finalPhotoUrl = uploaded.url || imagePreview || undefined;
        finalPhotoPath = uploaded.path || undefined;
      }
      // Se o usuário escolheu remover a imagem e não enviou uma nova
      if (clearPhoto && !imageFile) {
        finalPhotoUrl = null as any; // força remoção
        finalPhotoPath = null as any;
      }
      const updates: Partial<Vehicle> = {
        nickname: formData.nickname,
        category: formData.category,
        make: formData.make,
        model: formData.model,
        color: formData.color,
        year: formData.year,
        licensePlate: formData.licensePlate.toUpperCase(),
        vehicleType: formData.vehicleType,
        kmInitial: formData.vehicleType === 'proprio' ? (formData.kmInitial ?? 0) : null,
        fuels: [...formData.fuels],
        ...(finalPhotoUrl !== undefined ? { photoUrl: finalPhotoUrl } : {}),
        ...(finalPhotoPath !== undefined ? { photoPath: finalPhotoPath } : {}),
      };
      const saved = await effectiveUpdateVehicle(editingVehicleId, updates);
      showMessage(`"${saved.nickname}" atualizado!`, 'success');
      if (onEditComplete) onEditComplete();
    } catch (err) {
      showMessage('Erro ao atualizar.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const VehicleCard: React.FC<{ vehicle: Vehicle }> = ({ vehicle }) => (
    <div className="flex items-start bg-white p-3 shadow rounded-lg border hover:shadow-md transition">
      {allowSelection && (
        <input
          type="checkbox"
          checked={selectedVehicleIds.includes(vehicle.id)}
          onChange={(e) => onSelectionChange?.(
            e.target.checked
              ? [...selectedVehicleIds, vehicle.id]
              : selectedVehicleIds.filter(id => id !== vehicle.id)
          )}
          className="mr-3 mt-1 h-5 w-5 text-indigo-600 rounded focus:ring-indigo-500"
        />
      )}
      <div className="mr-3 h-12 w-12 rounded border overflow-hidden flex items-center justify-center bg-gray-100">
        {vehicle.photoUrl ? (
          <img src={vehicle.photoUrl} alt={vehicle.nickname} className="h-full w-full object-cover" />
        ) : (
          <Car size={20} className="text-gray-400" />
        )}
      </div>
      <div className="flex-grow min-w-0">
        <h3 className="font-bold text-indigo-700 truncate">{vehicle.nickname}</h3>
        <p className="text-sm text-gray-600">{vehicle.make} {vehicle.model} ({vehicle.year})</p>
        <p className="text-xs text-gray-500">
          Placa: {vehicle.licensePlate} • {vehicle.fuels.map(f => f.charAt(0).toUpperCase() + f.slice(1)).join(', ')}
        </p>
      </div>
      <button
        type="button"
        className="ml-3 text-red-600 hover:text-red-800 text-xs"
        onClick={() => {
          setVehicleToDelete(vehicle);
          setShowDeleteConfirm(true);
        }}
        aria-label="Excluir veículo"
      >
        Excluir
      </button>
    </div>
  );

  return (
    <div className="w-full pb-20">
      {/* Seção: Veículos Cadastrados (se não estiver em modo edição) */}
      {!isEditing && !hideList && (
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-3">Seus Veículos</h2>
          <div className="relative">
            <div ref={listRefAllVehicles} className="max-h-[168px] overflow-y-auto space-y-2 pr-1">
              {effectiveVehicles.length === 0 ? (
                <p className="text-gray-500 text-sm">Nenhum veículo cadastrado.</p>
              ) : (
                effectiveVehicles.map(v => <VehicleCard key={v.id} vehicle={v} />)
              )}
            </div>
            <div className="absolute right-1 top-0 flex flex-col gap-1">
              <button
                type="button"
                className="p-1 bg-white/80 border border-gray-200 rounded shadow hover:bg-white"
                onClick={() => { if (listRefAllVehicles.current) listRefAllVehicles.current.scrollBy({ top: -64, behavior: 'smooth' }); }}
                title="Rolagem para cima"
                aria-label="Rolagem para cima"
              >
                <ChevronUp size={16} className="text-gray-600" />
              </button>
              <button
                type="button"
                className="p-1 bg-white/80 border border-gray-200 rounded shadow hover:bg-white"
                onClick={() => { if (listRefAllVehicles.current) listRefAllVehicles.current.scrollBy({ top: 64, behavior: 'smooth' }); }}
                title="Rolagem para baixo"
                aria-label="Rolagem para baixo"
              >
                <ChevronDown size={16} className="text-gray-600" />
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteConfirm && vehicleToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 space-y-5">
            <h3 className="text-xl font-bold text-gray-900">Excluir Veículo</h3>
            <p className="text-gray-600">Tem certeza que deseja excluir "{vehicleToDelete.nickname}"?</p>
            <div className="flex justify-end gap-3">
              <button
                className="px-4 py-2 border rounded text-gray-700"
                onClick={() => { setShowDeleteConfirm(false); setVehicleToDelete(null); }}
              >
                Cancelar
              </button>
              <button
                className="px-4 py-2 bg-red-600 text-white rounded"
                onClick={async () => {
                  // Bloquear exclusão se veículo estiver selecionado nesta viagem
                  if (selectedVehicleIds.includes(vehicleToDelete.id)) {
                    showMessage('Remova o veículo da seleção da viagem antes de excluir.', 'error');
                    setShowDeleteConfirm(false);
                    setVehicleToDelete(null);
                    return;
                  }
                  try {
                    await effectiveDeleteVehicle(vehicleToDelete.id);
                    showMessage('Veículo excluído.', 'success');
                    if (onSelectionChange) {
                      onSelectionChange(selectedVehicleIds.filter(id => id !== vehicleToDelete.id));
                    }
                  } catch (e) {
                    const msg = e instanceof Error ? e.message : 'Erro ao excluir.';
                    showMessage(msg, 'error');
                  } finally {
                    setShowDeleteConfirm(false);
                    setVehicleToDelete(null);
                  }
                }}
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Seção: Formulário */}
      <div className={isEditing ? "" : "border-t pt-4"}>
        <h2 className="text-lg font-semibold text-gray-800 mb-3">
          {isEditing ? "Editar Veículo" : "Cadastrar Novo Veículo"}
        </h2>
        <form onSubmit={isEditing ? handleUpdate : handleCreate} className="space-y-4 text-sm">

          <div>
            <label className="block text-gray-700 mb-1">Apelido *</label>
            <input
              type="text"
              name="nickname"
              required
              value={formData.nickname}
              onChange={handleChange}
              className="w-full border rounded p-2"
            />
          </div>

          <div>
            <label className="block text-gray-700 mb-1">Categoria</label>
            <select
              name="category"
              value={formData.category}
              onChange={handleChange}
              className="w-full border rounded p-2"
            >
              <option value="">Selecione</option>
              <option value="moto">Moto</option>
              <option value="carro">Carro</option>
              <option value="van">Van</option>
              <option value="caminhonete">Caminhonete</option>
              <option value="caminhao">Caminhão</option>
              <option value="outros">Outros</option>
            </select>
          </div>

          <div>
            <label className="block text-gray-700 mb-1">Marca</label>
            <input
              type="text"
              name="make"
              value={formData.make}
              onChange={handleChange}
              className="w-full border rounded p-2"
            />
          </div>

          <div>
            <label className="block text-gray-700 mb-1">Modelo *</label>
            <input
              type="text"
              name="model"
              required
              value={formData.model}
              onChange={handleChange}
              className="w-full border rounded p-2"
            />
          </div>

          <div>
            <label className="block text-gray-700 mb-1">Cor</label>
            <input
              type="text"
              name="color"
              value={formData.color}
              onChange={handleChange}
              className="w-full border rounded p-2"
            />
          </div>

          <div>
            <label className="block text-gray-700 mb-1">Ano</label>
            <input
              type="number"
              name="year"
              min={1900}
              max={2099}
              value={formData.year}
              onChange={handleChange}
              className="w-full border rounded p-2"
            />
          </div>

          <div className="relative">
            <label className="block text-gray-700 mb-1">Placa *</label>
            <input
              type="text"
              name="licensePlate"
              required
              maxLength={7}
              value={formData.licensePlate}
              onChange={(e) => {
                let v = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
                if (v.length > 7) v = v.slice(0, 7);
                setFormData(prev => ({ ...prev, licensePlate: v }));
              }}
              className="w-full border rounded p-2 pr-10"
            />
            <button
              type="button"
              onClick={checkPlateRestriction}
              className="absolute right-2 top-8 p-1 bg-indigo-100 text-indigo-700 rounded-full hover:bg-indigo-200 transition"
              aria-label="Verificar restrição"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 2C6.01 2 2 6.01 2 11s4.01 9 9 9c1.8 0 3.5-.5 5-1.5l3.2 3.2"/>
                <path d="M12 7V2"/>
              </svg>
            </button>
          </div>
          {restrictionWarning && (
            <p className={`text-xs p-2 rounded mt-1 ${
              restrictionWarning.includes('Rodízio') 
                ? 'bg-yellow-100 text-yellow-800' 
                : 'bg-green-100 text-green-800'
            }`}>
              {restrictionWarning}
            </p>
          )}

          <div>
            <label className="block text-gray-700 mb-1">Tipo</label>
            <select
              name="vehicleType"
              value={formData.vehicleType}
              onChange={handleChange}
              className="w-full border rounded p-2"
            >
              <option value="">Selecione</option>
              <option value="proprio">Próprio</option>
              <option value="alugado">Alugado</option>
              <option value="trabalho">Trabalho</option>
              <option value="outros">Outros</option>
            </select>
          </div>

          {/* Campo KM Inicial removido: KM é controlado por segmentos/viagens */}

          <div>
            <label className="block text-gray-700 mb-2">Combustível *</label>
            <div className="flex flex-wrap gap-2">
              {['gasolina', 'etanol', 'diesel', 'eletrico', 'gnv'].map(fuel => (
                <label key={fuel} className="flex items-center">
                  <input
                    type="checkbox"
                    value={fuel}
                    checked={formData.fuels.includes(fuel)}
                    onChange={handleFuelChange}
                    className="mr-1"
                  />
                  <span className="text-sm">{fuel.charAt(0).toUpperCase() + fuel.slice(1)}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-gray-700 mb-2">Imagem do Veículo</label>
            <div className="flex gap-2 items-center">
              <input
                id="vehicle-gallery-input"
                type="file"
                accept="image/*"
                className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onload = () => setImagePreview(String(reader.result || ''));
                  reader.readAsDataURL(file);
                  setImageFile(file);
                  setClearPhoto(false);
                }
              }}
            />
            <input
              id="vehicle-camera-input"
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onload = () => setImagePreview(String(reader.result || ''));
                  reader.readAsDataURL(file);
                  setImageFile(file);
                  setClearPhoto(false);
                }
              }}
            />
              <button
                type="button"
                className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded text-xs"
                onClick={() => document.getElementById('vehicle-gallery-input')?.click()}
              >
                Galeria
              </button>
              <button
                type="button"
                className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded text-xs"
                onClick={() => document.getElementById('vehicle-camera-input')?.click()}
              >
                Câmera
              </button>
              {isEditing && (
                <button
                  type="button"
                  className="px-3 py-1.5 bg-red-100 text-red-700 rounded text-xs"
                  onClick={() => {
                    setImagePreview('');
                    setImageFile(null);
                    setClearPhoto(true);
                  }}
                >
                  Remover imagem
                </button>
              )}
              {imagePreview && (
                <img
                  src={imagePreview}
                  alt="Prévia do veículo"
                  className="h-12 w-12 rounded object-cover border"
                />
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 bg-indigo-600 text-white rounded font-medium hover:bg-indigo-700 disabled:opacity-60"
          >
            {isLoading ? 'Salvando...' : (isEditing ? 'Salvar Alterações' : 'Cadastrar Veículo')}
          </button>

          {message.text && (
            <p className={`text-sm p-2 rounded ${
              message.type === 'error' 
                ? 'bg-red-100 text-red-800' 
                : 'bg-green-100 text-green-800'
            }`}>
              {message.text}
            </p>
          )}
        </form>
      </div>
    </div>
  );
};

export default VehiclesOnTrip;

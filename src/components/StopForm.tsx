import { useState, useEffect } from 'react';
import { MapPin, Camera, Fuel, Utensils, Bed, Camera as CameraIcon, HeartHandshake, MoreHorizontal, PlaneLanding, PlaneTakeoff } from 'lucide-react';
import { Button } from './ui/button';
import { getAccuratePosition } from "../utils/offline/useGeoAccurate";

// Tipos (reutilizados do useTrips.ts)
interface LocationData {
  latitude: number;
  longitude: number;
}

interface StopFormProps {
  tripId: string;
  currentKm?: number; // KM atual da viagem (para sugerir como KM de chegada)
  onSave: (stop: any) => void;
  onDepartNow?: (updates: any) => void;
  onCancel: () => void;
  initialData?: any; // para edição
  initialIsDriving?: boolean; // estado da viagem para sugerir toggle
  previousKm?: number; // KM anterior calculado pelo sistema
  vehicleInUseName?: string; // nome do veículo selecionado (quando dirigindo)
  // Dados da parada anterior para calcular tempo até a chegada
  previousStopDepartureDate?: string;
  previousStopDepartureTime?: string;
}

type ExpenseCategory = 'fuel' | 'food' | 'lodging' | 'workshop' | 'other';
interface ExpenseItem { category: ExpenseCategory; amount: number; note?: string }

export function StopForm({ tripId, currentKm, onSave, onDepartNow, onCancel, initialData, initialIsDriving = false, previousKm, vehicleInUseName, previousStopDepartureDate, previousStopDepartureTime }: StopFormProps) {
  const now = new Date();
  
  // Estado do formulário
  const [name, setName] = useState(initialData?.name || '');
  const [location, setLocation] = useState<LocationData | null>(initialData?.location || null);
  // Campo "place" removido do uso; manter estado vazio apenas para compatibilidade
  const [place, setPlace] = useState<string>('');
  const [placeDetail, setPlaceDetail] = useState<string>(initialData?.placeDetail || '');
  const [stopType, setStopType] = useState<'stop' | 'destination'>(initialData?.stopType || 'stop');
  // Simplificação: quando a viagem não está em "Vai dirigir", forçar wasDriving=false
  const [wasDriving, setWasDriving] = useState<boolean>(initialIsDriving ? Boolean(initialData?.wasDriving ?? initialIsDriving) : false);
  const [arrivalKm, setArrivalKm] = useState<string>(initialData?.arrivalKm?.toString() || currentKm?.toString() || '');
  const [departureKm, setDepartureKm] = useState<string>(initialData?.departureKm?.toString() || initialData?.arrivalKm?.toString() || currentKm?.toString() || '');
  const [arrivalDate, setArrivalDate] = useState(initialData?.arrivalDate || now.toLocaleDateString('pt-BR').split('/').reverse().join('-'));
  const [arrivalTime, setArrivalTime] = useState(initialData?.arrivalTime || now.toTimeString().slice(0, 5));
  const [departureDate, setDepartureDate] = useState<string | undefined>(initialData?.departureDate || undefined);
  const [departureTime, setDepartureTime] = useState<string | undefined>(initialData?.departureTime || undefined);
  const [reasons, setReasons] = useState<(string)[]>(initialData?.reasons || []);
  const [otherReason, setOtherReason] = useState(initialData?.otherReason || '');
  const [tankFull, setTankFull] = useState<boolean>(Boolean(initialData?.tankFull) || false);
  const [cost, setCost] = useState<string>(initialData ? Number(initialData.cost || 0).toFixed(2).replace('.', ',') : '0,00');
  const [notes, setNotes] = useState(initialData?.notes || '');
  const [photoUrls, setPhotoUrls] = useState<string[]>(initialData?.photoUrls || []);
  // Texto cru de despesas por categoria para digitação livre
  const initialExpenseText: Record<ExpenseCategory, string> = { fuel: '', food: '', lodging: '', workshop: '', other: '' };
  (initialData?.costDetails || []).forEach((i: ExpenseItem) => {
    if (typeof i.amount === 'number') {
      initialExpenseText[i.category] = i.amount.toFixed(2).replace('.', ',');
    }
  });
  const [expenseText, setExpenseText] = useState<Record<ExpenseCategory, string>>(initialExpenseText);
  const [otherExpenseNote, setOtherExpenseNote] = useState<string>(
    (initialData?.costDetails || []).find((i: ExpenseItem) => i.category === 'other')?.note || ''
  );

  // Motivos pré-definidos
  const reasonOptions = [
    { id: 'rest', label: 'Descanso', icon: Bed },
    { id: 'fuel', label: 'Abastecimento', icon: Fuel },
    { id: 'food', label: 'Alimentação', icon: Utensils },
    { id: 'photos', label: 'Fotos', icon: CameraIcon },
    { id: 'visit', label: 'Visita', icon: HeartHandshake },
    { id: 'other', label: 'Outros', icon: MoreHorizontal },
  ];

  // Atualiza KM de saída quando KM de chegada muda (se for nova parada)
  useEffect(() => {
    if (!initialData && arrivalKm && !departureKm) {
      setDepartureKm(arrivalKm);
    }
  }, [arrivalKm, departureKm, initialData]);

  const handleReasonToggle = (reasonId: string) => {
    if (reasons.includes(reasonId)) {
      setReasons(reasons.filter(r => r !== reasonId));
    } else {
      setReasons([...reasons, reasonId]);
    }
  };

  const handleCostChange = (value: string) => {
    // Sanitização mínima: apenas números, vírgula e ponto
    const sanitized = value.replace(/[^0-9.,]/g, '').replace(/\./g, ',');
    setCost(sanitized);
  };

  // Helpers de normalização e formatação monetária
  const normalizeToNumber = (text: string): number => {
    const t = String(text || '').replace(/\./g, '').replace(',', '.');
    const n = parseFloat(t);
    return isNaN(n) ? 0 : n;
  };

  const formatMoney = (num: number): string => {
    return Number(num || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // Util para formatar data em yyyy-MM-dd
  const formatDateForInput = (dt: Date): string => dt.toLocaleDateString('pt-BR').split('/').reverse().join('-');
  // Util para calcular duração entre chegada e saída
  const computeStopDuration = (): string | null => {
    if (!arrivalDate || !arrivalTime || !departureDate || !departureTime) return null;
    const [ay, am, ad] = arrivalDate.includes('/') ? arrivalDate.split('/').map(Number).reverse() : arrivalDate.split('-').map(Number);
    const [ah, ami] = String(arrivalTime).split(':').map(Number);
    const [dy, dm, dd] = departureDate.includes('/') ? departureDate.split('/').map(Number).reverse() : departureDate.split('-').map(Number);
    const [dh, dmi] = String(departureTime).split(':').map(Number);
    const start = new Date(ay, (am - 1), ad, ah, ami).getTime();
    const end = new Date(dy, (dm - 1), dd, dh, dmi).getTime();
    if (isNaN(start) || isNaN(end) || end < start) return null;
    const ms = end - start;
    const minutes = Math.floor(ms / 60000);
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h <= 0) return `${m} min`;
    return `${h} h ${m} min`;
  };

  // Util para calcular tempo para chegar na parada = chegada atual - saída da parada anterior
  const computeTravelTimeToStop = (): string | null => {
    if (!arrivalDate || !arrivalTime || !previousStopDepartureDate || !previousStopDepartureTime) return null;
    const [py, pm, pd] = previousStopDepartureDate.includes('/') ? previousStopDepartureDate.split('/').map(Number).reverse() : previousStopDepartureDate.split('-').map(Number);
    const [ph, pmi] = String(previousStopDepartureTime).split(':').map(Number);
    const [ay, am, ad] = arrivalDate.includes('/') ? arrivalDate.split('/').map(Number).reverse() : arrivalDate.split('-').map(Number);
    const [ah, ami] = String(arrivalTime).split(':').map(Number);
    const start = new Date(py, (pm - 1), pd, ph, pmi).getTime();
    const end = new Date(ay, (am - 1), ad, ah, ami).getTime();
    if (isNaN(start) || isNaN(end) || end < start) return null;
    const ms = end - start;
    const minutes = Math.floor(ms / 60000);
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h <= 0) return `${m} min`;
    return `${h} h ${m} min`;
  };

  // Manter o total (cost) sincronizado com texto das despesas categorizadas
  useEffect(() => {
    const cats: ExpenseCategory[] = ['fuel', 'food', 'lodging', 'workshop', 'other'];
    const total = cats.reduce((sum, cat) => sum + normalizeToNumber(expenseText[cat] ?? ''), 0);
    setCost(formatMoney(total));
  }, [expenseText]);

  // Atualiza texto bruto por categoria com sanitização mínima (sem normalizar separador aqui)
  const setExpenseTextValue = (category: ExpenseCategory, text: string) => {
    const sanitized = text.replace(/[^0-9.,]/g, '');
    setExpenseText((prev) => ({ ...prev, [category]: sanitized }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validação mínima
    if (!name.trim()) {
      alert('Informe o nome da parada.');
      return;
    }
    // Flexibilizar motivos para parada inicial
    const isInitialStop = Boolean(
      (initialData?.notes && String(initialData.notes).toLowerCase().includes('início da viagem')) ||
      (initialData?.name && String(initialData.name).toLowerCase().includes('início')) ||
      (initialData?.name && String(initialData.name).toLowerCase().includes('ponto inicial'))
    );
    if (stopType !== 'destination' && !reasons.length && !isInitialStop) {
      alert('Selecione pelo menos um motivo.');
      return;
    }
    if (stopType !== 'destination' && reasons.includes('other') && !otherReason.trim()) {
      alert('Descreva o motivo "Outros".');
      return;
    }

    // Se não estiver dirigindo, não aceitar quilômetros
    if (wasDriving) {
      if (!arrivalKm?.trim()) {
        alert('Informe o KM de chegada (obrigatório quando estiver dirigindo).');
        return;
      }
    }

    // Converter KM para número inteiro
    const arrKm = wasDriving && arrivalKm ? parseInt(arrivalKm, 10) : null;
    const depKm = wasDriving && departureKm ? parseInt(departureKm, 10) : null;

    // Regra: KM de saída não pode ser menor que KM de chegada
    if (wasDriving && arrKm !== null && depKm !== null && depKm < arrKm) {
      alert('KM de saída não pode ser menor que o KM de chegada.');
      return;
    }

    // Converter custo para reais (a partir dos textos das despesas categorizadas)
    const cats: ExpenseCategory[] = ['fuel', 'food', 'lodging', 'workshop', 'other'];
    const costValue = cats.reduce((sum, cat) => sum + normalizeToNumber(expenseText[cat] ?? ''), 0);
    const costReais = Number(costValue.toFixed(2));

    const stopData = {
      tripId,
      name: name.trim(),
      stopType,
      wasDriving,
      location,
      // Não enviar mais "place"; usar somente "name" e "placeDetail"
      placeDetail: placeDetail.trim() || undefined,
      arrivalKm: arrKm,
      departureKm: depKm,
      arrivalDate,
      arrivalTime,
      departureDate,
      departureTime,
      reasons,
      otherReason: reasons.includes('other') ? otherReason.trim() : undefined,
      cost: costReais,
      costDetails: (
        ['fuel', 'food', 'lodging', 'workshop', 'other'] as ExpenseCategory[]
      ).map((cat) => ({
        category: cat,
        amount: normalizeToNumber(expenseText[cat] ?? ''),
        note: cat === 'other' ? (otherExpenseNote || undefined) : undefined,
      })),
      notes: notes.trim() || undefined,
      photoUrls,
      tankFull: wasDriving ? tankFull : undefined,
    };

    onSave(stopData);
  };

  const captureStopLocation = async () => {
    try {
      const start = performance.now();
      const fix = await getAccuratePosition(50, 12000);
      setLocation({ latitude: fix.latitude, longitude: fix.longitude });
      const ms = Math.round(performance.now() - start);
      setNotes((prev) => prev ? `${prev} • GPS ~${Math.round(fix.accuracy ?? 0)}m/${ms}ms` : `GPS ~${Math.round(fix.accuracy ?? 0)}m/${ms}ms`);
      alert('Localização da parada salva!');
    } catch {
      alert('Falha ao capturar localização da parada.');
    }
  };

  const handleAddPhoto = () => {
    // Simula upload com URL de placeholder
    const newPhoto = `https://placehold.co/300x200/teal/white?text=Parada+${name || 'Nova'}`;
    setPhotoUrls([...photoUrls, newPhoto]);
  };

  const handleRemovePhoto = (index: number) => {
    setPhotoUrls(photoUrls.filter((_, i) => i !== index));
  };

  // Cálculos de quilometragem conforme regras
  const prevKmNum = typeof previousKm === 'number' ? previousKm : null;
  const arrNum = arrivalKm ? parseInt(arrivalKm, 10) : null;
  const depNum = departureKm ? parseInt(departureKm, 10) : null;
  const distanceToStop = (wasDriving && prevKmNum !== null && arrNum !== null)
    ? Math.max(0, arrNum - prevKmNum)
    : null;
  const variationAtStop = (wasDriving && arrNum !== null && depNum !== null)
    ? depNum - arrNum
    : null;
  const distanceTraveled = (wasDriving && prevKmNum !== null && (arrNum !== null || depNum !== null))
    ? Math.max(0, (depNum ?? arrNum!) - prevKmNum)
    : null;

  const renderLocationAssist = () => (
    <div className="flex items-center gap-3">
      <button type="button" onClick={captureStopLocation} className="text-xs text-fuchsia-600 hover:underline">
        📍 Capturar localização da parada
      </button>
      {location && (
        <span className="text-[10px] text-teal-700">Coords salvas</span>
      )}
    </div>
  );

  return (
    <div className="bg-white rounded-2xl shadow-lg p-4 space-y-4 border border-gray-100">
      <h3 className="text-lg font-bold text-gray-800">
        {initialData ? 'Editar Parada' : 'Nova Parada'}
      </h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Tipo de parada + Dirigindo? */}
        <div>
          <div className="flex items-center justify-between">
            <div>
              <label className="block text-xs text-gray-500 mb-1 font-medium">Tipo de parada *</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium ${stopType === 'stop' ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-700'}`}
                  onClick={() => setStopType('stop')}
                >
                  Parada
                </button>
                <button
                  type="button"
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium ${stopType === 'destination' ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-700'}`}
                  onClick={() => setStopType('destination')}
                >
                  Destino
                </button>
              </div>
            </div>
            {initialIsDriving && (
              <div>
                <label className="block text-xs text-gray-500 mb-1 font-medium">Dirigindo?</label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium ${wasDriving ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-700'}`}
                    onClick={() => setWasDriving(true)}
                  >Sim</button>
                  <button
                    type="button"
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium ${!wasDriving ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-700'}`}
                    onClick={() => setWasDriving(false)}
                  >Não</button>
                </div>
              </div>
            )}
          </div>
          {wasDriving && vehicleInUseName && (
            <div className="mt-2 text-xs text-gray-700">
              Veículo desta viagem: <span className="font-semibold">{vehicleInUseName}</span>
            </div>
          )}
        </div>

        {/* Nome da parada */}
        <div>
          <label className="block text-xs text-gray-500 mb-1 font-medium">Local de parada *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
            placeholder="Ex: Posto Ipiranga, Hotel Central..."
            required
          />
        </div>

        {/* Detalhes da localização (apenas uma linha, abaixo do Local de parada) */}
        <div>
          <label className="block text-xs text-gray-500 mb-1 font-medium">Detalhes da localização (opcional)</label>
          <input
            type="text"
            value={placeDetail}
            onChange={(e) => setPlaceDetail(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
            placeholder="Insira detalhes da localização"
          />
        </div>

        {/* Localização (coords) */}
        <div>
          <label className="block text-xs text-gray-500 mb-1 font-medium">Localização (GPS)</label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="px-3 py-2 rounded-lg text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200"
              onClick={captureStopLocation}
            >
              Pegar localização
            </button>
            {location ? (
              <span className="text-xs text-gray-600">{location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}</span>
            ) : (
              <span className="text-xs text-gray-500">Sem coordenadas</span>
            )}
          </div>
          <div className="mt-1">
            {renderLocationAssist()}
          </div>
        </div>

        {/* Data e hora de chegada */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="flex items-center gap-1 text-xs text-gray-500 mb-1 font-medium">
              <PlaneLanding size={14} className="text-teal-600" />
              Data de chegada *
            </label>
            <input
              type="date"
              value={arrivalDate}
              onChange={(e) => setArrivalDate(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
              required
            />
          </div>
          <div>
            <label className="flex items-center gap-1 text-xs text-gray-500 mb-1 font-medium">
              <PlaneLanding size={14} className="text-teal-600" />
              Hora de chegada *
            </label>
            <input
              type="time"
              value={arrivalTime}
              onChange={(e) => setArrivalTime(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
              required
            />
          </div>
        </div>

        {/* Data e hora de saída + Sair agora */}
        <div className="grid grid-cols-3 gap-3 items-end">
          <div>
            <label className="flex items-center gap-1 text-xs text-gray-500 mb-1 font-medium">
              <PlaneTakeoff size={14} className="text-fuchsia-600" />
              Data de saída
            </label>
            <input
              type="date"
              value={departureDate || ''}
              onChange={(e) => setDepartureDate(e.target.value || undefined)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>
          <div>
            <label className="flex items-center gap-1 text-xs text-gray-500 mb-1 font-medium">
              <PlaneTakeoff size={14} className="text-fuchsia-600" />
              Hora de saída
            </label>
            <input
              type="time"
              value={departureTime || ''}
              onChange={(e) => setDepartureTime(e.target.value || undefined)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>
          <div className="flex justify-end">
            <Button
              type="button"
              onClick={() => {
                const dt = new Date();
                const d = formatDateForInput(dt);
                const t = dt.toTimeString().slice(0, 5);
                setDepartureDate(d);
                setDepartureTime(t);
                if (initialData?.id && typeof onDepartNow === 'function') {
                  const depKmNum = wasDriving && departureKm ? parseInt(departureKm, 10) : undefined;
                  onDepartNow({
                    departureDate: d,
                    departureTime: t,
                    wasDriving,
                    departureKm: depKmNum,
                    tankFull: wasDriving ? tankFull : undefined,
                  });
                }
              }}
              className="w-full bg-fuchsia-600 hover:bg-fuchsia-700 text-white"
              disabled={!initialData?.id}
              title={!initialData?.id ? 'Salve a parada para habilitar a saída' : 'Registrar saída agora'}
            >
              Sair agora
            </Button>
          </div>
        </div>

        {/* KM de chegada e saída (somente se dirigindo) */}
        {wasDriving && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1 font-medium">KM anterior</label>
                <div className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm bg-gray-50 text-gray-700">
                  {prevKmNum !== null ? prevKmNum : '—'}
                </div>
              </div>
              <div className="hidden sm:block"></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1 font-medium">KM de chegada *</label>
                <input
                  type="text"
                  value={arrivalKm}
                  onChange={(e) => setArrivalKm(e.target.value.replace(/[^0-9]/g, ''))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
                  placeholder="Ex: 12345"
                  required={wasDriving}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1 font-medium">KM de saída</label>
                <input
                  type="text"
                  value={departureKm}
                  onChange={(e) => setDepartureKm(e.target.value.replace(/[^0-9]/g, ''))}
                  onBlur={() => {
                    const arrNum = arrivalKm ? parseInt(arrivalKm, 10) : null;
                    const depNum = departureKm ? parseInt(departureKm, 10) : null;
                    if (arrNum !== null && depNum !== null && depNum < arrNum) {
                      alert('KM de saída não pode ser menor que o KM de chegada. Ajustamos para o mesmo valor.');
                      setDepartureKm(arrivalKm);
                    }
                  }}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
                  placeholder="Ex: 12360"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 font-medium">Tanque cheio?</span>
              <button
                type="button"
                className={`px-3 py-1.5 rounded-lg text-xs font-medium ${tankFull ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-700'}`}
                onClick={() => setTankFull(prev => !prev)}
              >{tankFull ? 'Sim' : 'Não'}</button>
            </div>
            <div className="space-y-1">
              {distanceToStop !== null && (
                <p className="text-xs text-teal-700 font-medium">Distância até a parada: <span className="font-bold">{distanceToStop} km</span></p>
              )}
              {variationAtStop !== null && (
                <p className="text-xs text-gray-700">Variação na parada: <span className="font-bold">{variationAtStop} km</span></p>
              )}
              {distanceTraveled !== null && (
                <p className="text-xs text-teal-700 font-semibold">Distância percorrida: <span className="font-bold">{distanceTraveled} km</span></p>
              )}
              {computeStopDuration() && (
                <p className="text-xs text-gray-700">Duração na parada: <span className="font-bold">{computeStopDuration()}</span></p>
              )}
              {computeTravelTimeToStop() && (
                <p className="text-xs text-gray-700">Tempo para chegar na parada: <span className="font-bold">{computeTravelTimeToStop()}</span></p>
              )}
            </div>
          </div>
        )}


        {/* Motivos (omitidos se for Destino) */}
        {stopType !== 'destination' && (
          <div>
            <label className="block text-xs text-gray-500 mb-2 font-medium">Motivo(s) *</label>
            <div className="flex flex-wrap gap-2">
              {reasonOptions.map((option) => {
                const Icon = option.icon;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => handleReasonToggle(option.id)}
                    className={`flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                      reasons.includes(option.id)
                        ? 'bg-teal-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <Icon size={14} />
                    {option.label}
                  </button>
                );
              })}
            </div>
            {reasons.includes('other') && (
              <input
                type="text"
                value={otherReason}
                onChange={(e) => setOtherReason(e.target.value)}
                className="w-full mt-2 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
                placeholder="Descreva o motivo..."
              />
            )}
          </div>
        )}

        {/* Despesas categorizadas */}
        <div>
          <label className="block text-xs text-gray-500 mb-2 font-medium">Despesas categorizadas</label>
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Abastecimento</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">R$</span>
                  <input
                    type="text"
                    value={expenseText.fuel ?? ''}
                    onChange={(e) => setExpenseTextValue('fuel', e.target.value.replace(/\./g, ',').replace(/[^0-9.,]/g, ''))}
                    onBlur={() => {
                      const n = normalizeToNumber(expenseText.fuel ?? '');
                      setExpenseText((prev) => ({ ...prev, fuel: formatMoney(n) }));
                    }}
                    className="w-full pl-8 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
                    placeholder="0,00"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Alimentação</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">R$</span>
                  <input
                    type="text"
                    value={expenseText.food ?? ''}
                    onChange={(e) => setExpenseTextValue('food', e.target.value.replace(/\./g, ',').replace(/[^0-9.,]/g, ''))}
                    onBlur={() => {
                      const n = normalizeToNumber(expenseText.food ?? '');
                      setExpenseText((prev) => ({ ...prev, food: formatMoney(n) }));
                    }}
                    className="w-full pl-8 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
                    placeholder="0,00"
                  />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Hospedagem</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">R$</span>
                  <input
                    type="text"
                    value={expenseText.lodging ?? ''}
                    onChange={(e) => setExpenseTextValue('lodging', e.target.value.replace(/\./g, ',').replace(/[^0-9.,]/g, ''))}
                    onBlur={() => {
                      const n = normalizeToNumber(expenseText.lodging ?? '');
                      setExpenseText((prev) => ({ ...prev, lodging: formatMoney(n) }));
                    }}
                    className="w-full pl-8 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
                    placeholder="0,00"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Oficinas</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">R$</span>
                  <input
                    type="text"
                    value={expenseText.workshop ?? ''}
                    onChange={(e) => setExpenseTextValue('workshop', e.target.value.replace(/\./g, ',').replace(/[^0-9.,]/g, ''))}
                    onBlur={() => {
                      const n = normalizeToNumber(expenseText.workshop ?? '');
                      setExpenseText((prev) => ({ ...prev, workshop: formatMoney(n) }));
                    }}
                    className="w-full pl-8 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
                    placeholder="0,00"
                  />
                </div>
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Outros (descrever)</label>
              <input
                type="text"
                value={otherExpenseNote}
                onChange={(e) => setOtherExpenseNote(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
                placeholder="Descreva o tipo de gasto"
              />
              <div className="relative mt-2">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">R$</span>
                <input
                  type="text"
                  value={expenseText.other ?? ''}
                  onChange={(e) => setExpenseTextValue('other', e.target.value.replace(/\./g, ',').replace(/[^0-9.,]/g, ''))}
                  onBlur={() => {
                    const n = normalizeToNumber(expenseText.other ?? '');
                    setExpenseText((prev) => ({ ...prev, other: formatMoney(n) }));
                  }}
                  className="w-full pl-8 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
                  placeholder="0,00"
                />
              </div>
            </div>
            <div className="pt-2 text-xs text-gray-700 flex items-center justify-between">
              <span>Total gasto</span>
              <span className="font-semibold">R$ {cost}</span>
            </div>
          </div>
        </div>

        {/* Fotos: câmera ou galeria */}
        <div>
          <label className="block text-xs text-gray-500 mb-2 font-medium">Fotos (opcional)</label>
          <div className="flex gap-2 flex-wrap items-center">
            {photoUrls.map((url, index) => (
              <div key={index} className="relative">
                <img src={url} alt="Parada" className="w-16 h-16 object-cover rounded-lg border" />
                <button
                  type="button"
                  onClick={() => handleRemovePhoto(index)}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center"
                >
                  ×
                </button>
              </div>
            ))}
            <input
              id="camera-input"
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={async (e) => {
                const files = Array.from(e.target.files || []);
                const toDataUrl = (file: File) => new Promise<string>((resolve, reject) => {
                  const reader = new FileReader();
                  reader.onload = () => resolve(String(reader.result));
                  reader.onerror = reject;
                  reader.readAsDataURL(file);
                });
                try {
                  const urls = await Promise.all(files.map((f) => toDataUrl(f)));
                  setPhotoUrls((prev) => [...prev, ...urls]);
                } catch (_) {
                  // fallback silencioso
                }
              }}
            />
            <input
              id="gallery-input"
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={async (e) => {
                const files = Array.from(e.target.files || []);
                const toDataUrl = (file: File) => new Promise<string>((resolve, reject) => {
                  const reader = new FileReader();
                  reader.onload = () => resolve(String(reader.result));
                  reader.onerror = reject;
                  reader.readAsDataURL(file);
                });
                try {
                  const urls = await Promise.all(files.map((f) => toDataUrl(f)));
                  setPhotoUrls((prev) => [...prev, ...urls]);
                } catch (_) {
                  // fallback silencioso
                }
              }}
            />
            <button
              type="button"
              onClick={() => document.getElementById('camera-input')?.click()}
              className="px-3 py-2 rounded-lg text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 flex items-center gap-1"
            >
              <Camera size={16} /> Abrir câmera
            </button>
            <button
              type="button"
              onClick={() => document.getElementById('gallery-input')?.click()}
              className="px-3 py-2 rounded-lg text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200"
            >
              Abrir galeria
            </button>
          </div>
        </div>

        {/* Relato */}
        <div>
          <label className="block text-xs text-gray-500 mb-1 font-medium">Relato / Observações</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
            rows={3}
            placeholder="Conte como foi sua parada..."
          />
        </div>

        {/* Ações */}
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-2 px-4 bg-gray-200 text-gray-800 rounded-lg font-medium hover:bg-gray-300 transition"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="flex-1 py-2 px-4 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition"
          >
            {initialData ? 'Atualizar' : 'Salvar Parada'}
          </button>
        </div>
      </form>
      {/* Avisos de dirigir removidos conforme simplificação: sem toggle quando 'Vai dirigir' = false */}
    </div>
  );
}

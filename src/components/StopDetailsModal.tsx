import React, { useState } from "react";
import { X, Pencil, MapPin, Fuel, Utensils, Bed, Wrench, MoreHorizontal, Car } from "lucide-react";

type ExpenseCategory = 'fuel' | 'food' | 'lodging' | 'workshop' | 'other';

interface StopDetailsModalProps {
  stop: any;
  onClose: () => void;
  onEdit?: () => void;
}

const categoryIcon = (c: ExpenseCategory) => {
  switch (c) {
    case 'fuel': return Fuel;
    case 'food': return Utensils;
    case 'lodging': return Bed;
    case 'workshop': return Wrench;
    default: return MoreHorizontal;
  }
};

const categoryLabel: Record<ExpenseCategory, string> = {
  fuel: 'Abastecimento',
  food: 'Alimentação',
  lodging: 'Hospedagem',
  workshop: 'Oficinas',
  other: 'Outros',
};

const formatBRL = (reais: number) => {
  const val = Number(reais || 0);
  return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const reasonLabels: Record<string, string> = {
  rest: 'Descanso',
  fuel: 'Abastecimento',
  food: 'Alimentação',
  photos: 'Fotos',
  visit: 'Visita',
  other: 'Outros',
};

export default function StopDetailsModal({ stop, onClose, onEdit }: StopDetailsModalProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const formatDateBR = (d?: string) => {
    if (!d) return '';
    // aceitar 'yyyy-MM-dd' e já formatados
    if (d.includes('-')) {
      const [y, m, da] = d.split('-');
      return `${da}/${m}/${y}`;
    }
    return d; // assume já em dd/MM/yyyy
  };
  const arrivalDT = stop.arrivalDate && stop.arrivalTime ? `${formatDateBR(stop.arrivalDate)}, ${stop.arrivalTime}` : '—';
  const departureDT = stop.departureDate && stop.departureTime ? `${formatDateBR(stop.departureDate)}, ${stop.departureTime}` : '—';
  const costDetails: Array<{ category: ExpenseCategory; amount: number; note?: string }> = stop?.costDetails || [];

  const byCategory = costDetails.reduce<Record<ExpenseCategory, number>>((acc, item) => {
    acc[item.category] = (acc[item.category] || 0) + (Number(item.amount) || 0);
    return acc;
  }, { fuel: 0, food: 0, lodging: 0, workshop: 0, other: 0 });

  const totalCost = stop?.cost ?? 0; // em reais

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-bold text-gray-900">Detalhes da parada</h3>
        <div className="flex items-center gap-2">
          {onEdit && (
            <button
              onClick={onEdit}
              className="text-gray-700 hover:text-gray-900 p-2 rounded-lg"
              title="Editar"
            >
              <Pencil size={18} />
            </button>
          )}
          <button
            onClick={onClose}
            className="text-gray-700 hover:text-gray-900 p-2 rounded-lg"
            title="Fechar"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <MapPin size={16} className="text-green-600" />
          <a
            href={(function() {
              const loc = stop?.location;
              if (loc && typeof loc.latitude === 'number' && typeof loc.longitude === 'number') {
                return `https://www.google.com/maps?q=${loc.latitude},${loc.longitude}`;
              }
              const q = encodeURIComponent(stop?.name || 'Local');
              return `https://www.google.com/maps/search?q=${q}`;
            })()}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-gray-800 font-semibold truncate hover:text-teal-700 hover:underline"
            title="Abrir no Google Maps"
          >
            {(stop.name || '—')}
          </a>
        </div>
        {stop.placeDetail && (
          <p className="text-xs text-gray-600">{stop.placeDetail}</p>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-gray-500 mb-1">Chegada</p>
            <p className="text-sm text-gray-800">{arrivalDT}</p>
            <p className="text-xs text-gray-600">Km chegada: {stop.arrivalKm ?? '—'}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500 mb-1">Saída</p>
            <p className="text-sm text-gray-800">{departureDT}</p>
            <p className="text-xs text-gray-600">Km saída: {stop.departureKm ?? '—'}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Car size={16} className="text-green-600" />
          <p className="text-xs text-gray-600">Dirigindo? <span className="font-semibold text-gray-800">{stop.wasDriving ? 'Sim' : 'Não'}</span></p>
        </div>

        {Array.isArray(stop.reasons) && stop.reasons.length > 0 && (
          <div>
            <p className="text-xs text-gray-500 mb-1">Motivos</p>
            <p className="text-sm text-gray-800">{stop.reasons.map((r: string) => reasonLabels[r] || r).join(', ')}</p>
            {stop.otherReason && (
              <p className="text-xs text-gray-600">Outro: {stop.otherReason}</p>
            )}
          </div>
        )}

        <div className="border-t border-dashed border-gray-200 pt-3">
          <p className="text-xs text-gray-500 mb-1">Gastos</p>
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-900">Total</span>
            <span className="text-sm font-semibold text-gray-900">{formatBRL(totalCost)}</span>
          </div>
          <div className="mt-2 space-y-2">
            {Object.entries(byCategory).map(([key, value]) => {
              const Icon = categoryIcon(key as ExpenseCategory);
              return (
                <div key={key} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon size={16} className="text-gray-600" />
                    <span className="text-sm text-gray-800">{categoryLabel[key as ExpenseCategory]}</span>
                  </div>
                  <span className="text-sm text-gray-900">{formatBRL(value || 0)}</span>
                </div>
              );
            })}
            {costDetails.length === 0 && (
              <p className="text-xs text-gray-600">Sem itens categorizados.</p>
            )}
          </div>
        </div>

        {stop.notes && (
          <div className="border-t border-dashed border-gray-200 pt-3">
            <p className="text-xs text-gray-500 mb-1">Observações</p>
            <p className="text-sm text-gray-800 whitespace-pre-wrap">{stop.notes}</p>
          </div>
        )}

        {Array.isArray(stop.photoUrls) && stop.photoUrls.length > 0 && (
          <div className="border-t border-dashed border-gray-200 pt-3">
            <p className="text-xs text-gray-500 mb-2">Fotos</p>
            <div className="flex gap-2 flex-wrap items-center">
              {stop.photoUrls
                .filter((u: string) => typeof u === 'string' && (u.startsWith('http') || u.startsWith('blob:') || u.startsWith('data:')))
                .map((url: string, idx: number) => (
                  <button key={idx} onClick={() => setPreviewUrl(url)} className="relative">
                    <img src={url} alt="Foto da parada" className="w-16 h-16 object-cover rounded-lg border" />
                  </button>
                ))}
            </div>
          </div>
        )}

        {stop.location && (
          <div className="border-t border-dashed border-gray-200 pt-3">
            <p className="text-xs text-gray-500 mb-1">Localização (GPS)</p>
            <p className="text-xs text-gray-700">{stop.location.latitude}, {stop.location.longitude}</p>
          </div>
        )}
      </div>

      {previewUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-auto">
            <div className="flex justify-between items-center p-3 border-b">
              <h4 className="text-sm font-semibold">Visualização da foto</h4>
              <button onClick={() => setPreviewUrl(null)} className="text-gray-600 hover:text-gray-900"><X size={18} /></button>
            </div>
            <div className="p-3 flex justify-center">
              <img src={previewUrl} alt="Foto" className="max-h-[70vh] w-auto object-contain" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

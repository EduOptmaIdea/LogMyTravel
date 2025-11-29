# 🔄 Guia de Migração para Supabase - LogMyTravel

Este documento explica como migrar o App.tsx do `useLocalStorage` para o hook `useTrips` com integração Supabase.

## ⚠️ Estado Atual vs. Desejado

### Estado Atual (App.tsx)
```tsx
import { useLocalStorage } from "./components/useLocalStorage";

const [trips, setTrips] = useLocalStorage<Trip[]>("trips", []);

// Adicionar nova viagem
const newTrip = { ...tripData, id: crypto.randomUUID() };
setTrips([...trips, newTrip]);
```

### Estado Desejado (Com Supabase)
```tsx
import { useTrips } from "./components/useTrips";

const { trips, saveTrip, updateTrip, deleteTrip } = useTrips();

// Adicionar nova viagem
await saveTrip(tripData); // Salva no Supabase + localStorage
```

---

## 🔧 Passo a Passo da Migração

### 1. Atualizar Imports no App.tsx

```tsx
// ❌ REMOVER
import { useLocalStorage } from "./components/useLocalStorage";

// ✅ ADICIONAR
import { useTrips, type Trip as TripType } from "./components/useTrips";
```

### 2. Remover Interface Trip Duplicada

O `App.tsx` tem sua própria interface `Trip` que é ligeiramente diferente da interface em `useTrips.ts`.

**REMOVER do App.tsx:**
```tsx
export interface Trip {
  id: string;
  name: string;
  // ... campos
}
```

**USAR a interface de useTrips:**
```tsx
import { useTrips, type Trip } from "./components/useTrips";
```

### 3. Substituir useState por useTrips Hook

```tsx
// ❌ ANTES
const [trips, setTrips] = useLocalStorage<Trip[]>("trips", []);

// ✅ DEPOIS
const { 
  trips, 
  vehicles,
  loading,
  error,
  saveTrip, 
  updateTrip, 
  deleteTrip,
  saveVehicle,
  saveStop,
  updateStop
} = useTrips();
```

### 4. Atualizar Criação de Viagens

Localize onde você cria novas viagens no App.tsx e substitua:

```tsx
// ❌ ANTES
const handleCreateTrip = (tripData) => {
  const newTrip = {
    ...tripData,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    status: 'ongoing'
  };
  setTrips([...trips, newTrip]);
};

// ✅ DEPOIS
const handleCreateTrip = async (tripData) => {
  try {
    await saveTrip({
      ...tripData,
      status: 'ongoing',
      created_at: new Date().toISOString()
    });
    // Viagem salva com sucesso!
  } catch (error) {
    console.error('Erro ao salvar viagem:', error);
    // Mostrar notificação de erro
  }
};
```

### 5. Atualizar Edição de Viagens

```tsx
// ❌ ANTES
const handleEditTrip = (id: string, updates: Partial<Trip>) => {
  setTrips(trips.map(t => 
    t.id === id ? { ...t, ...updates } : t
  ));
};

// ✅ DEPOIS
const handleEditTrip = async (id: string, updates: Partial<Trip>) => {
  try {
    await updateTrip(id, updates);
    // Atualizado com sucesso!
  } catch (error) {
    console.error('Erro ao atualizar viagem:', error);
  }
};
```

### 6. Atualizar Exclusão de Viagens

```tsx
// ❌ ANTES
const handleDeleteTrip = (id: string) => {
  setTrips(trips.filter(t => t.id !== id));
};

// ✅ DEPOIS
const handleDeleteTrip = async (id: string) => {
  try {
    await deleteTrip(id);
    // Deletada com sucesso!
  } catch (error) {
    console.error('Erro ao deletar viagem:', error);
  }
};
```

### 7. Adicionar Estado de Loading

```tsx
// No componente
const { trips, loading, error } = useTrips();

// No JSX
{loading && (
  <div className="flex items-center justify-center p-8">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-fuchsia-500"></div>
  </div>
)}

{error && (
  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
    {error}
  </div>
)}

{!loading && trips.map(trip => (
  <TripCard key={trip.id} trip={trip} />
))}
```

---

## 📝 Diferenças entre Interfaces

### Interface antiga (App.tsx)
```tsx
export interface Trip {
  id: string;
  name: string;
  departureLocation: string;
  departureCoords?: { latitude: number; longitude: number };
  departureDate: string;
  departureTime: string;
  arrivalLocation?: string;
  arrivalCoords?: { latitude: number; longitude: number };
  arrivalDate?: string;
  arrivalTime?: string;
  details: string;
  finalDetails?: string;  // ⚠️ Não existe no useTrips
  status: "ongoing" | "completed";
  createdAt: string;       // ⚠️ snake_case no useTrips: created_at
  startKm?: number;
  endKm?: number;
}
```

### Interface nova (useTrips.ts)
```tsx
export interface Trip {
  id: string;
  name: string;
  departureLocation: string;
  departureCoords?: LocationData | null;
  departureDate: string;
  departureTime: string;
  arrivalLocation?: string;
  arrivalCoords?: LocationData | null;
  arrivalDate?: string;
  arrivalTime?: string;
  startKm?: number | null;
  endKm?: number | null;
  details?: string;        // ✅ Opcional
  status: "ongoing" | "completed";
  hasVehicle?: boolean;    // ✅ Novo
  vehicleIds?: string[];   // ✅ Novo
  created_at?: string;     // ✅ snake_case
  updated_at?: string;     // ✅ Novo
  stops?: Stop[];          // ✅ Novo (paradas)
}
```

### Campos que precisam ser renomeados:

```tsx
// Se você tinha finalDetails, mova para details
trip.details = trip.finalDetails || trip.details;

// Se você tinha createdAt, use created_at
trip.created_at = trip.createdAt;
```

---

## 🗺️ Exemplo Completo de Migração

### ANTES (App.tsx com useLocalStorage)

```tsx
export default function App() {
  const [trips, setTrips] = useLocalStorage<Trip[]>("trips", []);
  const [activeView, setActiveView] = useState("new-trip");

  const handleSaveTrip = (tripData: Omit<Trip, 'id'>) => {
    const newTrip = {
      ...tripData,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString()
    };
    setTrips([...trips, newTrip]);
    setActiveView("ongoing-trip");
  };

  return (
    <div>
      <TripNew onSave={handleSaveTrip} />
      {trips.map(trip => (
        <TripCard key={trip.id} trip={trip} />
      ))}
    </div>
  );
}
```

### DEPOIS (App.tsx com useTrips + Supabase)

```tsx
import { useTrips, type Trip } from "./components/useTrips";

export default function App() {
  const { 
    trips, 
    loading, 
    error, 
    saveTrip, 
    updateTrip 
  } = useTrips();
  
  const [activeView, setActiveView] = useState("new-trip");

  const handleSaveTrip = async (tripData: Omit<Trip, 'id'>) => {
    try {
      await saveTrip(tripData);
      setActiveView("ongoing-trip");
    } catch (err) {
      console.error('Erro ao salvar:', err);
      alert('Erro ao salvar viagem. Verifique sua conexão.');
    }
  };

  if (loading) {
    return <div>Carregando...</div>;
  }

  if (error) {
    return <div>Erro: {error}</div>;
  }

  return (
    <div>
      <TripNew onSave={handleSaveTrip} />
      {trips.map(trip => (
        <TripCard key={trip.id} trip={trip} />
      ))}
    </div>
  );
}
```

---

## 🔄 Componentes que Precisam ser Atualizados

### 1. TripNew.tsx

Se `TripNew` atualmente recebe `onSave` do App, atualize para usar o hook diretamente:

```tsx
// Dentro de TripNew.tsx
import { useTrips } from "./useTrips";

export function TripNew() {
  const { saveTrip, vehicles } = useTrips();

  const handleSubmit = async (formData) => {
    try {
      await saveTrip(formData);
      // Redirecionar ou mostrar sucesso
    } catch (error) {
      // Mostrar erro
    }
  };

  // ...
}
```

### 2. OngoingTripView.tsx

```tsx
import { useTrips } from "./useTrips";

export function OngoingTripView({ tripId }: { tripId: string }) {
  const { trips, updateTrip, saveStop } = useTrips();
  const trip = trips.find(t => t.id === tripId);

  const handleUpdateKm = async (newKm: number) => {
    if (!trip) return;
    await updateTrip(trip.id, { endKm: newKm });
  };

  const handleAddStop = async (stopData) => {
    await saveStop({
      ...stopData,
      tripId: trip.id
    });
  };

  // ...
}
```

### 3. TripCard.tsx

Provavelmente não precisa de mudanças, apenas recebe `trip` como prop.

### 4. VehiclesOnTrip.tsx

```tsx
import { useTrips } from "./useTrips";

export function VehiclesOnTrip() {
  const { vehicles, saveVehicle } = useTrips();

  const handleAddVehicle = async (vehicleData) => {
    await saveVehicle(vehicleData);
  };

  // ...
}
```

---

## ✅ Checklist de Migração

- [ ] Backup do código atual (git commit)
- [ ] Configurar `.env.local` com credenciais Supabase
- [ ] Executar migrations SQL no Supabase
- [ ] Atualizar imports no App.tsx
- [ ] Remover interface Trip duplicada
- [ ] Substituir useLocalStorage por useTrips
- [ ] Atualizar todas as funções para async/await
- [ ] Adicionar estados de loading e error
- [ ] Testar criar nova viagem
- [ ] Testar editar viagem
- [ ] Testar deletar viagem
- [ ] Testar adicionar parada
- [ ] Testar cadastrar veículo
- [ ] Verificar dados no Supabase Table Editor
- [ ] Testar fallback para localStorage (desconectar internet)

---

## 🐛 Problemas Comuns

### 1. "Cannot find module './components/useTrips'"

**Solução**: Verifique o caminho de importação
```tsx
// Se você está em App.tsx na raiz:
import { useTrips } from "./components/useTrips";

// Se você está dentro de /components:
import { useTrips } from "./useTrips";
```

### 2. "saveTrip is not a function"

**Solução**: Verifique se está desestruturando corretamente:
```tsx
// ❌ ERRADO
const trips = useTrips();
trips.saveTrip(); // Erro!

// ✅ CORRETO
const { saveTrip } = useTrips();
saveTrip(); // OK
```

### 3. Dados duplicados (localStorage + Supabase)

**Solução**: Limpe o localStorage após migração:
```tsx
// Execute uma vez no console do navegador:
localStorage.removeItem('trips');
localStorage.removeItem('vehicles');
```

### 4. "Trip interface not compatible"

**Solução**: Use a interface do useTrips:
```tsx
import { Trip } from "./components/useTrips";

// Não crie sua própria interface Trip
```

---

## 📊 Verificando se Funcionou

### 1. Console do Navegador

Você deve ver logs como:
```
🚀 Salvando viagem: { name: "Viagem para SP", ... }
📡 Cliente Supabase: OK
✅ Viagem salva com sucesso
```

### 2. Supabase Table Editor

1. Acesse: `https://supabase.com/dashboard/project/seu-id/editor`
2. Vá na tabela `trips`
3. Você deve ver as viagens criadas

### 3. Network Tab

1. Abra DevTools (F12) → Network
2. Crie uma viagem
3. Você deve ver uma requisição POST para:
   ```
   https://seu-id.supabase.co/rest/v1/trips
   ```

---

## 🎯 Próximos Passos

Após a migração:

1. **Implementar autenticação**
   - Usar Supabase Auth
   - Configurar RLS por usuário

2. **Adicionar sincronização em tempo real**
   ```tsx
   useEffect(() => {
     const subscription = supabase
       .channel('trips-changes')
       .on('postgres_changes', 
         { event: '*', schema: 'public', table: 'trips' },
         (payload) => {
           console.log('Mudança detectada:', payload);
           // Atualizar estado
         }
       )
       .subscribe();

     return () => {
       subscription.unsubscribe();
     };
   }, []);
   ```

3. **Implementar modo offline**
   - Service Worker
   - Cache de requisições
   - Sincronização quando voltar online

---

**📚 Recursos Relacionados:**
- [SETUP_LOCAL.md](SETUP_LOCAL.md) - Setup inicial
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md) - Resolução de problemas
- [/supabase/migrations/README.md](supabase/migrations/README.md) - Scripts SQL

---

**Boa migração! 🚀**

Se tiver dúvidas, verifique os logs no console e no Network tab.

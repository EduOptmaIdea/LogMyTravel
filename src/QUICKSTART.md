# ⚡ Quick Start - LogMyTravel em 5 Minutos

Guia rápido para desenvolvedores experientes que querem começar imediatamente.

## 📦 Pré-requisitos

- ✅ Node.js 18+
- ✅ npm ou yarn
- ✅ Conta Supabase (grátis)

---

## 🚀 Setup Rápido

```bash
# 1. Clone e instale
git clone <repo>
cd logmytravel
npm install

# 2. Configure variáveis de ambiente
cp .env.example .env.local

# Edite .env.local:
# VITE_SUPABASE_URL=https://seu-id.supabase.co
# VITE_SUPABASE_ANON_KEY=sua-chave-aqui

# 3. Configure Supabase
# - Crie projeto em supabase.com
# - Copie credenciais para .env.local
# - Execute SQL em /supabase/migrations/README.md

# 4. Rode o projeto
npm run dev

# 5. Acesse http://localhost:5173
```

---

## 🗄️ SQL Setup (Copie e Cole)

Acesse: `https://supabase.com/dashboard/project/seu-id/sql`

### 1. Tabela trips
```sql
CREATE TABLE IF NOT EXISTS trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  departure_location TEXT NOT NULL,
  departure_coords JSONB,
  departure_date TEXT NOT NULL,
  departure_time TEXT NOT NULL,
  arrival_location TEXT,
  arrival_coords JSONB,
  arrival_date TEXT,
  arrival_time TEXT,
  start_km NUMERIC,
  end_km NUMERIC,
  details TEXT,
  status TEXT NOT NULL DEFAULT 'ongoing' CHECK (status IN ('ongoing', 'completed')),
  has_vehicle BOOLEAN DEFAULT false,
  vehicle_ids TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trips_status ON trips(status);
CREATE INDEX IF NOT EXISTS idx_trips_created_at ON trips(created_at DESC);

ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permitir leitura pública" ON trips FOR SELECT USING (true);
CREATE POLICY "Permitir inserção pública" ON trips FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir atualização pública" ON trips FOR UPDATE USING (true);
CREATE POLICY "Permitir exclusão pública" ON trips FOR DELETE USING (true);
```

### 2. Tabela vehicles
```sql
CREATE TABLE IF NOT EXISTS vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nickname TEXT NOT NULL,
  category TEXT NOT NULL,
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  color TEXT NOT NULL,
  year INTEGER NOT NULL,
  license_plate TEXT NOT NULL,
  vehicle_type TEXT NOT NULL,
  km_initial NUMERIC,
  fuels TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vehicles_created_at ON vehicles(created_at DESC);
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permitir leitura pública" ON vehicles FOR SELECT USING (true);
CREATE POLICY "Permitir inserção pública" ON vehicles FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir atualização pública" ON vehicles FOR UPDATE USING (true);
CREATE POLICY "Permitir exclusão pública" ON vehicles FOR DELETE USING (true);
```

### 3. Tabela stops
```sql
CREATE TABLE IF NOT EXISTS stops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  location JSONB,
  arrival_km NUMERIC,
  departure_km NUMERIC,
  arrival_date TEXT NOT NULL,
  arrival_time TEXT NOT NULL,
  departure_date TEXT,
  departure_time TEXT,
  reasons TEXT[] DEFAULT '{}',
  other_reason TEXT,
  cost INTEGER DEFAULT 0,
  notes TEXT,
  photo_urls TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stops_trip_id ON stops(trip_id);
CREATE INDEX IF NOT EXISTS idx_stops_created_at ON stops(created_at DESC);
ALTER TABLE stops ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permitir leitura pública" ON stops FOR SELECT USING (true);
CREATE POLICY "Permitir inserção pública" ON stops FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir atualização pública" ON stops FOR UPDATE USING (true);
CREATE POLICY "Permitir exclusão pública" ON stops FOR DELETE USING (true);
```

### 4. Triggers
```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_trips_updated_at ON trips;
CREATE TRIGGER update_trips_updated_at BEFORE UPDATE ON trips
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_vehicles_updated_at ON vehicles;
CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON vehicles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_stops_updated_at ON stops;
CREATE TRIGGER update_stops_updated_at BEFORE UPDATE ON stops
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

---

## ✅ Verificação Rápida

```sql
-- Deve retornar 3 tabelas
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('trips', 'vehicles', 'stops');
```

---

## 🎨 Paleta de Cores

```tsx
// Azul Profundo (30%)
className="bg-[#192A56] text-white"

// Fuchsia (7% - Botões)
className="bg-fuchsia-500 hover:bg-fuchsia-600"

// Teal (Voltar ao topo)
className="bg-teal-600 hover:bg-teal-700"

// Off-White (60% - Fundos)
className="bg-[#F4F6FF]"
```

---

## 🔧 Hook Principal

```tsx
import { useTrips } from "./components/useTrips";

function Component() {
  const { 
    trips,        // Trip[]
    vehicles,     // Vehicle[]
    loading,      // boolean
    error,        // string | null
    saveTrip,     // (trip) => Promise<Trip>
    updateTrip,   // (id, updates) => Promise<Trip>
    deleteTrip,   // (id) => Promise<void>
    saveVehicle,  // (vehicle) => Promise<Vehicle>
    saveStop,     // (stop) => Promise<Stop>
    updateStop,   // (id, updates) => Promise<Stop>
  } = useTrips();

  // Usar funções...
}
```

---

## 📂 Estrutura de Pastas

```
📁 app-viagens/
├── 📁 components/
│   ├── useTrips.ts          ⭐ Hook principal (CRUD + Supabase)
│   ├── TripNew.tsx          ⭐ Criar viagem
│   ├── OngoingTripView.tsx  ⭐ Viagem em andamento
│   ├── TripCard.tsx         Card de viagem
│   ├── VehiclesOnTrip.tsx   Gestão de veículos
│   └── ui/                  Componentes ShadCN
├── 📁 styles/
│   ├── globals.css          ⭐ Variáveis CSS
│   └── colors.md            Paleta de cores
├── 📁 utils/supabase/
│   ├── client.tsx           ⭐ Cliente Supabase
│   └── info.tsx             Credenciais (auto)
├── App.tsx                  ⭐ Componente raiz
├── .env.example             Template de env
└── package.json             Dependências
```

---

## 🧪 Teste Rápido

```bash
# 1. Criar viagem
# Abra http://localhost:5173
# Clique em "Nova Viagem"
# Preencha e salve

# 2. Verificar no Supabase
# Acesse Table Editor → trips
# Deve aparecer a viagem criada

# 3. Console do navegador (F12)
# Não deve ter erros
# Deve mostrar logs de sucesso
```

---

## 🐛 Solução Rápida de Problemas

```bash
# Erro: Supabase não conecta
# → Verifique .env.local

# Erro: Tabelas não existem
# → Execute SQL acima no Supabase

# Erro: Port já em uso
npx kill-port 5173
npm run dev

# Erro: Módulos não encontrados
rm -rf node_modules package-lock.json
npm install
```

---

## 📚 Docs Completas

- **Setup Detalhado**: [SETUP_LOCAL.md](SETUP_LOCAL.md)
- **Migração**: [MIGRATION_GUIDE.md](MIGRATION_GUIDE.md)
- **Troubleshooting**: [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
- **Índice**: [DOCUMENTATION_INDEX.md](DOCUMENTATION_INDEX.md)

---

## 🎯 Próximos Passos

1. ✅ Setup concluído
2. → Leia [/styles/colors.md](styles/colors.md) para cores
3. → Explore componentes em `/components`
4. → Modifique `App.tsx` conforme necessário
5. → Adicione features customizadas

---

**⏱️ Tempo estimado de setup: 5-10 minutos**

🚗 **Bom desenvolvimento!** 🛣️

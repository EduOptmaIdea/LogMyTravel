# ⚡ INÍCIO RÁPIDO - 3 PASSOS

Se você quer começar **AGORA**, siga apenas estes 3 passos:

---

## ✅ PASSO 1: Configure o Supabase (2 minutos)

### 1.1 Crie conta e projeto
1. Acesse: https://supabase.com/
2. Clique em "Start your project"
3. Crie um projeto (escolha região South America)

### 1.2 Copie suas credenciais
1. No painel do Supabase, vá em **Settings** → **API**
2. Copie:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public key**: `eyJhbGc...`

### 1.3 Configure o arquivo .env.local
```bash
# Na raiz do projeto, crie o arquivo .env.local
VITE_SUPABASE_URL=https://seu-id.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-aqui
```

---

## ✅ PASSO 2: Execute o SQL (3 minutos)

### 2.1 Acesse o SQL Editor
Vá para: `https://supabase.com/dashboard/project/seu-id/sql`

### 2.2 Execute este SQL (copie e cole tudo de uma vez):

```sql
-- 1. Criar tabela de viagens
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

-- 2. Criar tabela de veículos
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

-- 3. Criar tabela de paradas
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

-- 4. Criar triggers
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

### 2.3 Verifique se funcionou
Execute este SQL:
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('trips', 'vehicles', 'stops');
```

Deve retornar 3 linhas ✅

---

## ✅ PASSO 3: Rode o App (30 segundos)

```bash
# Se ainda não instalou as dependências:
npm install

# Rode o servidor de desenvolvimento:
npm run dev

# Acesse:
# http://localhost:5173
```

---

## 🎉 PRONTO!

Você deve ver o aplicativo rodando!

### ✅ Teste Rápido

1. Clique em **"Nova Viagem"**
2. Preencha:
   - Local de partida: "São Paulo"
   - Data: Hoje
   - Hora: Agora
3. Clique em **"Continuar"**
4. Abra o Supabase Table Editor: 
   - `https://supabase.com/dashboard/project/seu-id/editor`
   - Veja a tabela `trips`
   - Sua viagem deve estar lá! ✅

---

## ❌ Se algo der errado

### Console mostra erro de Supabase?
→ Verifique se o `.env.local` está correto

### Tabelas não foram criadas?
→ Execute o SQL novamente no Supabase

### Porta 5173 já está em uso?
```bash
npx kill-port 5173
npm run dev
```

### Outros problemas?
→ Veja [TROUBLESHOOTING.md](TROUBLESHOOTING.md)

---

## 📚 Próximos Passos

Agora que está rodando:

1. 📖 Leia [SETUP_LOCAL.md](SETUP_LOCAL.md) - Guia completo
2. 🎨 Veja [/styles/colors.md](styles/colors.md) - Paleta de cores
3. 🔄 Veja [MIGRATION_GUIDE.md](MIGRATION_GUIDE.md) - Se precisar migrar código
4. 📋 Veja [TODO.md](TODO.md) - Próximas features

---

## 💡 Dica Extra

Mantenha o console do navegador aberto (F12) para ver logs e debugar.

---

**⏱️ Tempo total: ~5-6 minutos**

🚗 **Boa viagem!** 🛣️

# Instruções de Configuração do Banco de Dados

## IMPORTANTE

Este projeto usa o Supabase para armazenar dados. Você precisa executar os comandos SQL abaixo no **SQL Editor** do painel do Supabase.

## Como executar

1. Acesse: https://supabase.com/dashboard/project/yjzrlbkqjbubpzzfvsji/sql
2. Cole e execute cada bloco SQL abaixo **na ordem**
3. Após executar todos os comandos, o aplicativo estará pronto para usar

---

## 1. Criar Tabela de Viagens (trips)

```sql
-- Criar tabela de viagens
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

-- Criar índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_trips_status ON trips(status);
CREATE INDEX IF NOT EXISTS idx_trips_created_at ON trips(created_at DESC);

-- Habilitar Row Level Security (RLS)
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;

-- Política: Permitir leitura para todos (por enquanto)
CREATE POLICY "Permitir leitura pública de viagens"
  ON trips FOR SELECT
  USING (true);

-- Política: Permitir inserção para todos (por enquanto)
CREATE POLICY "Permitir inserção pública de viagens"
  ON trips FOR INSERT
  WITH CHECK (true);

-- Política: Permitir atualização para todos (por enquanto)
CREATE POLICY "Permitir atualização pública de viagens"
  ON trips FOR UPDATE
  USING (true);

-- Política: Permitir exclusão para todos (por enquanto)
CREATE POLICY "Permitir exclusão pública de viagens"
  ON trips FOR DELETE
  USING (true);
```

---

## 2. Criar Tabela de Veículos (vehicles)

```sql
-- Criar tabela de veículos
CREATE TABLE IF NOT EXISTS vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nickname TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('moto', 'carro', 'van', 'caminhonete', 'caminhao', 'outros', '')),
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  color TEXT NOT NULL,
  year INTEGER NOT NULL,
  license_plate TEXT NOT NULL,
  vehicle_type TEXT NOT NULL CHECK (vehicle_type IN ('proprio', 'alugado', 'trabalho', 'outros', '')),
  km_initial NUMERIC,
  fuels TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_vehicles_created_at ON vehicles(created_at DESC);

-- Habilitar Row Level Security (RLS)
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Permitir leitura pública de veículos"
  ON vehicles FOR SELECT
  USING (true);

CREATE POLICY "Permitir inserção pública de veículos"
  ON vehicles FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Permitir atualização pública de veículos"
  ON vehicles FOR UPDATE
  USING (true);

CREATE POLICY "Permitir exclusão pública de veículos"
  ON vehicles FOR DELETE
  USING (true);
```

---

## 3. Criar Tabela de Paradas (stops)

```sql
-- Criar tabela de paradas
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

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_stops_trip_id ON stops(trip_id);
CREATE INDEX IF NOT EXISTS idx_stops_arrival_date ON stops(arrival_date);
CREATE INDEX IF NOT EXISTS idx_stops_created_at ON stops(created_at DESC);

-- Habilitar Row Level Security (RLS)
ALTER TABLE stops ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Permitir leitura pública de paradas"
  ON stops FOR SELECT
  USING (true);

CREATE POLICY "Permitir inserção pública de paradas"
  ON stops FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Permitir atualização pública de paradas"
  ON stops FOR UPDATE
  USING (true);

CREATE POLICY "Permitir exclusão pública de paradas"
  ON stops FOR DELETE
  USING (true);
```

---

## 4. Criar Função para Atualizar updated_at Automaticamente

```sql
-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para tabela trips
DROP TRIGGER IF EXISTS update_trips_updated_at ON trips;
CREATE TRIGGER update_trips_updated_at
  BEFORE UPDATE ON trips
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger para tabela vehicles
DROP TRIGGER IF EXISTS update_vehicles_updated_at ON vehicles;
CREATE TRIGGER update_vehicles_updated_at
  BEFORE UPDATE ON vehicles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger para tabela stops
DROP TRIGGER IF EXISTS update_stops_updated_at ON stops;
CREATE TRIGGER update_stops_updated_at
  BEFORE UPDATE ON stops
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

---

## Verificação

Execute este comando para verificar se as tabelas foram criadas corretamente:

```sql
SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
  AND table_name IN ('trips', 'vehicles', 'stops')
ORDER BY table_name;
```

Você deve ver 3 tabelas: `trips`, `vehicles`, e `stops`.

---

## Notas Importantes

1. **Custo em Centavos**: A coluna `cost` na tabela `stops` armazena valores em centavos (INTEGER). O código do aplicativo converte automaticamente entre reais e centavos.

2. **JSONB para Coordenadas**: As colunas `departure_coords`, `arrival_coords` (em trips) e `location` (em stops) armazenam dados de localização no formato JSON:
   ```json
   {
     "latitude": -15.7939,
     "longitude": -47.8828
   }
   ```

3. **Arrays**: As colunas `vehicle_ids`, `fuels`, `reasons`, e `photo_urls` usam arrays PostgreSQL (`TEXT[]`).

4. **Row Level Security (RLS)**: As políticas estão configuradas para acesso público por enquanto. Em produção, você deve configurar autenticação e ajustar as políticas conforme necessário.

5. **Cascata de Exclusão**: Quando uma viagem é excluída, todas as paradas relacionadas são excluídas automaticamente (`ON DELETE CASCADE`).

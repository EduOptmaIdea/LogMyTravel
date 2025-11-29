# 🔧 Guia de Resolução de Problemas

Este documento lista os erros mais comuns e suas soluções ao trabalhar com o LogMyTravel.

## 📋 Índice

1. [Erros de Supabase](#erros-de-supabase)
2. [Erros de Build/Compilação](#erros-de-buildcompilação)
3. [Erros de Runtime](#erros-de-runtime)
4. [Erros de Dados](#erros-de-dados)
5. [Problemas de Performance](#problemas-de-performance)

---

## 🗄️ Erros de Supabase

### ❌ Erro: "Supabase não configurado. Usando localStorage."

**Causa**: Variáveis de ambiente não estão configuradas.

**Solução**:
```bash
# 1. Crie o arquivo .env.local na raiz do projeto
touch .env.local

# 2. Adicione suas credenciais:
VITE_SUPABASE_URL=https://seu-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-aqui

# 3. Reinicie o servidor
npm run dev
```

### ❌ Erro: "relation 'trips' does not exist"

**Causa**: Tabelas não foram criadas no banco de dados.

**Solução**:
1. Acesse o SQL Editor no Supabase
2. Execute os scripts em `/supabase/migrations/README.md`
3. Execute **na ordem**: trips → vehicles → stops → triggers

### ❌ Erro: "new row violates row-level security policy"

**Causa**: Políticas RLS estão bloqueando a inserção.

**Solução**:
```sql
-- Execute no SQL Editor do Supabase:

-- Verificar se as políticas existem
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE tablename IN ('trips', 'vehicles', 'stops');

-- Se não existirem, execute novamente os blocos de políticas
-- do arquivo /supabase/migrations/README.md
```

### ❌ Erro: "Failed to fetch" ao acessar Supabase

**Causa**: URL ou chave incorreta, ou problema de rede.

**Solução**:
1. Verifique as credenciais no painel do Supabase
2. Teste a conexão com curl:
```bash
curl https://seu-project-id.supabase.co/rest/v1/ \
  -H "apikey: sua-chave-aqui"
```
3. Verifique se o projeto Supabase está ativo (não pausado)

### ❌ Erro: "column 'departure_location' does not exist"

**Causa**: Usando camelCase quando deveria ser snake_case.

**Solução**: O hook `useTrips` já faz essa conversão automaticamente. Se você está fazendo queries diretas, use snake_case:

```tsx
// ❌ ERRADO
const { data } = await supabase
  .from('trips')
  .select('departureLocation'); // camelCase

// ✅ CORRETO
const { data } = await supabase
  .from('trips')
  .select('departure_location'); // snake_case

// 👍 MELHOR: Use o hook useTrips
const { trips } = useTrips(); // Conversão automática
```

---

## 🔨 Erros de Build/Compilação

### ❌ Erro: "Failed to fetch https://esm.sh/npm:@supabase/supabase-js@2"

**Causa**: Sintaxe incorreta de importação do Supabase (usando prefixo `npm:`).

**Solução**:
```tsx
// ❌ ERRADO
import { createClient } from 'npm:@supabase/supabase-js@2';

// ✅ CORRETO
import { createClient } from '@supabase/supabase-js';
```

**Arquivo afetado**: `/utils/supabase/client.tsx`

Este erro já foi corrigido na versão 1.0.1. Se você ainda vê este erro:
1. Verifique se está usando a versão mais recente
2. Limpe o cache: `rm -rf node_modules && npm install`
3. Reinicie o servidor: `npm run dev`

### ❌ Erro: "Module not found: Can't resolve './components/...'"

**Causa**: Caminho de importação incorreto.

**Solução**:
```tsx
// ❌ ERRADO
import { TripCard } from 'components/TripCard';

// ✅ CORRETO
import { TripCard } from './components/TripCard';
```

### ❌ Erro: "Cannot find module '@supabase/supabase-js'"

**Causa**: Dependências não instaladas.

**Solução**:
```bash
# Delete node_modules e reinstale
rm -rf node_modules package-lock.json
npm install
```

### ❌ Erro TypeScript: "Property 'X' does not exist on type 'Trip'"

**Causa**: Tipos desatualizados após mudanças no schema.

**Solução**:
1. Verifique o tipo `Trip` em `/components/useTrips.ts`
2. Certifique-se de que as propriedades correspondem ao banco:
```tsx
export interface Trip {
  id: string;
  name: string;
  departureLocation: string;  // snake_case no DB: departure_location
  departureCoords?: LocationData | null;
  // ... outras propriedades
}
```

### ❌ Erro: "Vite dev server closed unexpectedly"

**Causa**: Porta já em uso ou erro de memória.

**Solução**:
```bash
# Matar processo na porta 5173
npx kill-port 5173

# Ou use outra porta
npm run dev -- --port 3000
```

---

## ⚠️ Erros de Runtime

### ❌ Erro: "Cannot read properties of undefined (reading 'map')"

**Causa**: Tentando iterar sobre dados que ainda não foram carregados.

**Solução**:
```tsx
// ❌ ERRADO
trips.map(trip => <TripCard trip={trip} />)

// ✅ CORRETO
{trips?.map(trip => <TripCard key={trip.id} trip={trip} />)}
// ou
{(trips || []).map(trip => <TripCard key={trip.id} trip={trip} />)}
```

### ❌ Erro: "Each child in a list should have a unique 'key' prop"

**Causa**: Falta de propriedade `key` em listas.

**Solução**:
```tsx
// ❌ ERRADO
{trips.map(trip => <TripCard trip={trip} />)}

// ✅ CORRETO
{trips.map(trip => <TripCard key={trip.id} trip={trip} />)}
```

### ❌ Erro: "Maximum update depth exceeded"

**Causa**: Estado sendo atualizado dentro de um loop infinito.

**Solução**:
```tsx
// ❌ ERRADO
function Component() {
  const [count, setCount] = useState(0);
  setCount(count + 1); // Loop infinito!
  return <div>{count}</div>;
}

// ✅ CORRETO
function Component() {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    setCount(count + 1);
  }, []); // Executa apenas uma vez
  
  return <div>{count}</div>;
}
```

### ❌ Erro: "localStorage is not defined"

**Causa**: Tentando acessar localStorage durante SSR (Server-Side Rendering).

**Solução**: O código já está preparado para isso no hook `useLocalStorage`, mas se você criar novos componentes:

```tsx
// ✅ CORRETO
if (typeof window !== 'undefined') {
  localStorage.setItem('key', 'value');
}
```

---

## 💾 Erros de Dados

### ❌ Dados não sincronizam com Supabase

**Diagnóstico**:
```tsx
// Adicione logs no useTrips.ts
const saveTrip = async (trip: Omit<Trip, "id">): Promise<Trip> => {
  console.log('🚀 Salvando viagem:', trip);
  
  const supabase = getSupabase();
  console.log('📡 Cliente Supabase:', supabase ? 'OK' : 'NULL');
  
  // ... resto do código
};
```

**Soluções**:

1. **Se `supabase` é NULL**: Configure `.env.local`
2. **Se há erro na inserção**: Verifique o formato dos dados
3. **Se insere mas não aparece**: Verifique políticas RLS

### ❌ Custo da parada aparece errado (multiplicado por 100)

**Causa**: Conversão centavos ↔ reais sendo aplicada duas vezes.

**Solução**: O hook `useTrips` já faz a conversão automaticamente:
- Salva em **centavos** no DB (INTEGER)
- Retorna em **reais** no frontend (DECIMAL)

Não faça conversões manuais:
```tsx
// ❌ ERRADO
await saveStop({ ...stop, cost: stop.cost * 100 });

// ✅ CORRETO
await saveStop({ ...stop, cost: stop.cost }); // Conversão automática
```

### ❌ Coordenadas GPS não são salvas

**Causa**: Formato incorreto ou permissões de geolocalização negadas.

**Solução**:
```tsx
// Verificar permissões
if (navigator.geolocation) {
  navigator.geolocation.getCurrentPosition(
    (position) => {
      const coords = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude
      };
      console.log('📍 Coordenadas:', coords);
    },
    (error) => {
      console.error('❌ Erro de geolocalização:', error.message);
      // Verificar se o usuário negou permissão
    }
  );
} else {
  console.error('❌ Geolocalização não suportada');
}
```

### ❌ Paradas não aparecem na viagem

**Causa**: Relacionamento trip_id incorreto.

**Solução**:
```tsx
// Verificar no Supabase Table Editor:
// 1. A coluna trip_id na tabela stops
// 2. O valor corresponde ao id de uma viagem existente

// No código, certifique-se de passar o tripId correto:
await saveStop({
  tripId: selectedTrip.id, // ✅ Usar o ID da viagem selecionada
  name: 'Posto de gasolina',
  // ...
});
```

---

## 🚀 Problemas de Performance

### ⚠️ App lento ao carregar muitas viagens

**Solução**: Implementar paginação:

```tsx
// No useTrips.ts, adicione limit e offset
const { data: tripsData } = await supabase
  .from('trips')
  .select('*')
  .order('created_at', { ascending: false })
  .range(0, 19); // Primeiras 20 viagens
```

### ⚠️ Muitas re-renderizações

**Diagnóstico**:
```tsx
// Use React DevTools Profiler
// Ou adicione logs:
function Component() {
  console.log('🔄 Component renderizou');
  // ...
}
```

**Solução**: Use `useMemo` e `useCallback`:
```tsx
const sortedTrips = useMemo(() => {
  return trips.sort((a, b) => 
    new Date(b.created_at) - new Date(a.created_at)
  );
}, [trips]);

const handleSaveTrip = useCallback(async (trip) => {
  await saveTrip(trip);
}, [saveTrip]);
```

### ⚠️ Imagens grandes deixam o app lento

**Solução**: Use Supabase Storage com transformações:
```tsx
// Quando implementar upload de fotos
const { data } = await supabase.storage
  .from('trip-photos')
  .upload('photo.jpg', file, {
    cacheControl: '3600',
    upsert: false
  });

// URL com transformação (resize automático)
const url = supabase.storage
  .from('trip-photos')
  .getPublicUrl('photo.jpg', {
    transform: {
      width: 800,
      height: 600,
      resize: 'cover'
    }
  });
```

---

## 🔍 Como Debugar

### Console do Navegador (F12)

```tsx
// Adicione logs estratégicos:
console.log('📊 Dados da viagem:', trip);
console.error('❌ Erro ao salvar:', error);
console.warn('⚠️ Aviso:', message);
console.table(trips); // Visualizar arrays
```

### React DevTools

1. Instale a extensão: [React DevTools](https://react.dev/learn/react-developer-tools)
2. Inspecione componentes
3. Veja props e state em tempo real
4. Use o Profiler para identificar re-renders

### Supabase Table Editor

1. Acesse: `https://supabase.com/dashboard/project/seu-id/editor`
2. Visualize dados inseridos
3. Execute queries SQL manualmente
4. Verifique estrutura das tabelas

### Network Tab

1. Abra DevTools (F12) → Network
2. Filtre por "Fetch/XHR"
3. Veja todas as requisições ao Supabase
4. Inspecione payloads e respostas

---

## 🆘 Checklist de Debugging

Quando algo não funcionar, verifique na ordem:

- [ ] Servidor de dev está rodando? (`npm run dev`)
- [ ] Arquivo `.env.local` existe e está correto?
- [ ] Tabelas criadas no Supabase?
- [ ] Políticas RLS configuradas?
- [ ] Console do navegador mostra erros?
- [ ] Network tab mostra requisições falhando?
- [ ] Dados aparecem no Table Editor do Supabase?
- [ ] Permissões de geolocalização concedidas?
- [ ] Node.js e npm estão atualizados?
- [ ] Dependências instaladas? (`node_modules` existe?)

---

## 📞 Recursos Adicionais

- **Setup Local**: Ver [SETUP_LOCAL.md](SETUP_LOCAL.md)
- **Documentação Supabase**: https://supabase.com/docs
- **React Docs**: https://react.dev/
- **TypeScript Handbook**: https://www.typescriptlang.org/docs/

---

**💡 Dica**: Se você encontrou um erro não listado aqui, adicione-o neste documento para ajudar outros desenvolvedores!


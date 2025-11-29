# 📝 Changelog - LogMyTravel

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Semantic Versioning](https://semver.org/lang/pt-BR/).

---

## [1.1.2] - 2025-11-05

### ✨ Adicionado
- Lista de paradas na viagem atual exibindo: `Local | Data e hora | Distância percorrida (km)` com cálculo cumulativo desde o `Km inicial` do veículo em uso.
- Modal de visualização de parada (`StopDetailsModal`) somente leitura, com detalhes de chegada/saída, motivos, notas e despesas categorizadas.
- Ações na listagem: Visualizar, Editar e Excluir (com confirmação).

### 🐛 Corrigido
- Atualização do `Km atual` do veículo após salvar/editar uma parada quando o usuário marcou "Dirigindo"; o `Km de saída` da parada passa a ser considerado como `Km atual` do veículo.
- Erro 400 ao atualizar parada quando o schema remoto não possui colunas novas (`place`, `place_detail`, `stop_type`, `was_driving`). Implementado retry automático em `updateStop` usando payload compatível com o schema antigo (mensagem Supabase `PGRST204: Could not find column in schema cache`).

### 🔧 Técnico
- Hook `useTrips`: adicionada função `deleteStop` com suporte Supabase + fallback local.
- `saveStop` e `updateStop` preservam `costDetails` no estado do cliente, evitando perda de dados enquanto a coluna não existe no banco.
- `updateStop` passou a montar dois payloads (completo e básico) e re-tentar quando o Supabase/PostgREST reporta ausência de colunas (códigos `PGRST204`/`42703`).
- Recarregamento dos segmentos da viagem após salvar/editar/excluir paradas para refletir imediatamente o `Km atual` e os totais por veículo.

### 📌 Impacto Visual
- Nova lista de paradas com destaque para a distância acumulada por parada.
- Modal de detalhes de parada sem edição, com ícones e formatação amigável.
- Botões de ação na linha de cada parada: visualizar, editar e excluir.

---

## [1.1.1] - 2025-11-05

### 🐛 Corrigido
- "KM anterior" passa a usar o KM atual do veículo vinculado, evitando mostrar 0 no primeiro registro da viagem.
- Erro 400 (Supabase) ao salvar parada quando colunas novas não existem no schema. Implementado fallback automático que remove `place`, `place_detail`, `stop_type`, `was_driving` do payload em ambientes sem a migration mais recente.

### ✨ Adicionado
- Exibição do veículo selecionado no StopForm quando "Dirigindo = Sim".
- UI de despesas categorizadas na parada: Abastecimento, Alimentação, Hospedagem, Oficinas e Outros (com descrição). O total é calculado e sincronizado com o campo de custo.

### 🔧 Técnico
- StopForm agora envia `costDetails` (somente cliente) e o hook `saveStop` filtra para evitar erro de schema até a migration ser aplicada.
- Recomendada execução do script SQL `supabase_sql/2025-11-05_stops_schema_rls.sql` para adicionar colunas: `stop_type`, `was_driving`, `place`, `place_detail` e políticas RLS atualizadas.

### 📌 Impacto Visual
- Formulário de parada exibe o veículo quando o usuário está dirigindo.
- Seção de custos substituída por despesas categorizadas com total visível.

---

## [1.1.0] - 2024-11-02

### 🎨 Rebranding Completo

#### Mudança de Nome
- **Novo nome**: LogMyTravel
- **Antigo**: Aplicativo de Gestão de Viagens / App de Viagens
- **Significado**: Log (registrar) + My (minhas) + Travel (viagens)
- **Escrita oficial**: LogMyTravel (CamelCase, uma palavra)

#### Arquivos Atualizados
- ✅ `/package.json` - Nome e versão (1.1.0)
- ✅ `/README.md` - Título, descrição e branding
- ✅ `/components/TripHeader.tsx` - Header com nome LogMyTravel
- ✅ `/index.html` - Meta tags e título
- ✅ Todos os arquivos de documentação (SETUP_LOCAL.md, DOCUMENTATION_INDEX.md, etc.)

#### Novos Arquivos
- ✅ `/ABOUT.md` - História e missão do LogMyTravel
- ✅ `/BRANDING.md` - Guia completo de marca (já existente, atualizado)
- ✅ `/.env.example` - Template de variáveis de ambiente
- ✅ `/index.html` - HTML com meta tags para SEO

#### Identidade Visual
- **Tagline**: "Registre suas viagens"
- **Hero Message**: "Registre, acompanhe e reviva suas melhores viagens"
- **Paleta oficial**: Azul Profundo (#192A56), Fuchsia (#c026d3), Teal (#0d9488)
- **Emoji oficial**: 🗺️

### 🎯 Próximos Passos
O projeto está 100% pronto para download e uso local com o novo nome LogMyTravel.

---

## [1.0.1] - 2024-11-02

### 🐛 Corrigido
- **[CRITICAL]** Corrigido erro de build relacionado à importação do Supabase client
  - Removido prefixo `npm:` de `@supabase/supabase-js@2`
  - Alterado de `import { createClient } from 'npm:@supabase/supabase-js@2'` 
  - Para `import { createClient } from '@supabase/supabase-js'`
  - Arquivo: `/utils/supabase/client.tsx`

### 📝 Detalhes Técnicos
O erro ocorria porque o build system tentava fazer fetch de:
```
https://esm.sh/npm:@supabase/supabase-js@2
```

A sintaxe correta no ambiente Figma Make é importar diretamente do pacote sem prefixos:
```tsx
import { createClient } from '@supabase/supabase-js';
```

---

## [1.0.0] - 2024-11-02

### ✨ Adicionado

#### Integração Supabase
- **Hook useTrips** (`/components/useTrips.ts`)
  - Gerenciamento completo de estado (viagens, veículos, paradas)
  - Integração automática com Supabase
  - Fallback para localStorage quando offline
  - Conversão automática camelCase ↔ snake_case
  - Funções CRUD: `saveTrip`, `updateTrip`, `deleteTrip`, `saveVehicle`, `saveStop`, `updateStop`

#### Cliente Supabase
- **Cliente configurado** (`/utils/supabase/client.tsx`)
  - Singleton pattern para performance
  - Configuração automática usando credenciais de `info.tsx`

#### Estrutura do Banco de Dados
- **3 Tabelas criadas**:
  - `trips` - Viagens com partida/chegada, KM, status
  - `vehicles` - Veículos com categoria, marca, modelo
  - `stops` - Paradas durante viagens com motivos e custos
- Row Level Security (RLS) habilitado
- Políticas públicas configuradas (desenvolvimento)
- Triggers para `updated_at` automático
- Índices para performance
- Foreign keys com CASCADE delete

#### Paleta de Cores Atualizada
- Substituído verde-água (#2ECC71) por fuchsia (#c026d3 / #d946ef)
- Adicionado teal (#0d9488) para botão "Voltar ao topo"
- Atualizado `/styles/globals.css` com novas variáveis CSS
- Atualizado `/styles/colors.md` com documentação completa
- Classes Tailwind:
  - `bg-fuchsia-500 hover:bg-fuchsia-600` - Botões de ação
  - `bg-teal-600 hover:bg-teal-700` - Botão voltar ao topo
  - `text-fuchsia-500` - Links e CTAs

#### Componentes Atualizados
- `App.tsx` - Botão flutuante com teal
- `TripNew.tsx` - Inputs e botões com fuchsia
- `OngoingTripView.tsx` - Links com fuchsia
- `TripEditModal.tsx` - Botões com fuchsia

#### Documentação Completa
- **README.md** (3.2 KB) - Visão geral do projeto
- **SETUP_LOCAL.md** (14.8 KB) - Guia completo de setup
- **MIGRATION_GUIDE.md** (11.2 KB) - Migração para useTrips
- **TROUBLESHOOTING.md** (9.5 KB) - Resolução de problemas
- **QUICKSTART.md** (5.1 KB) - Setup em 5 minutos
- **DOCUMENTATION_INDEX.md** (8.7 KB) - Índice central
- **RESUMO_IMPLEMENTACAO.md** - Resumo executivo
- **TODO.md** - Lista de tarefas organizadas
- **/supabase/migrations/README.md** - Scripts SQL completos

#### Arquivos de Configuração
- `.env.example` - Template de variáveis de ambiente
- `.gitignore` - Proteção de arquivos sensíveis
- `package.json` - Dependências e scripts

### 🎨 Alterado
- Sistema de cores de 4 para 5 cores principais
- Distribuição: 60% fundos, 30% primária, 7% fuchsia, 3% roxo
- Botões de ação agora usam fuchsia em vez de verde-água
- Botão "Voltar ao topo" usa teal em vez de indigo

### 🔧 Técnico
- Conversão automática de dados entre frontend (camelCase) e backend (snake_case)
- Sistema de fallback: Supabase → localStorage → erro gracioso
- Backup local automático em todas as operações
- Tratamento de erros em todas as funções CRUD

### 📊 Métricas
- ~1500 linhas de código adicionadas
- 10 arquivos criados
- 5 componentes atualizados
- 3 tabelas de banco
- 7 documentos de referência

---

## [Unreleased]

### 🔮 Planejado

#### Autenticação
- [ ] Supabase Auth com login/cadastro
- [ ] Políticas RLS por usuário
- [ ] Login social (Google, Facebook)

#### Dashboard
- [ ] Gráficos com Recharts
- [ ] Estatísticas de viagens
- [ ] Cálculo de custos totais

#### Features
- [ ] Upload de fotos (Supabase Storage)
- [ ] PWA com modo offline
- [ ] Exportação para PDF/Excel
- [ ] Integração Google Maps

#### Otimizações
- [ ] Paginação de viagens
- [ ] Lazy loading de componentes
- [ ] Code splitting
- [ ] Cache de imagens

---

## Tipos de Mudanças

- ✨ **Adicionado** - Novas features
- 🎨 **Alterado** - Mudanças em features existentes
- ⚠️ **Descontinuado** - Features que serão removidas
- ❌ **Removido** - Features removidas
- 🐛 **Corrigido** - Bug fixes
- 🔒 **Segurança** - Vulnerabilidades corrigidas
- 🔧 **Técnico** - Mudanças técnicas internas
- 📝 **Documentação** - Mudanças na documentação

---

## Links

- [Documentação Completa](DOCUMENTATION_INDEX.md)
- [Guia de Setup](SETUP_LOCAL.md)
- [Lista de Tarefas](TODO.md)
- [Troubleshooting](TROUBLESHOOTING.md)

---

**Nota**: Este changelog é mantido manualmente. Cada PR deve atualizar este arquivo.

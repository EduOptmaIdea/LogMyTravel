# 📚 Índice de Documentação - LogMyTravel

Este documento serve como ponto central para toda a documentação do projeto.

## 🎯 Visão Geral do Projeto

LogMyTravel - Aplicativo web para registrar e gerenciar suas viagens com:
- ✅ Cadastro de viagens (partida/chegada, datas, KM)
- ✅ Gerenciamento de veículos
- ✅ Registro de paradas durante viagens
- ✅ Sincronização com Supabase (PostgreSQL)
- ✅ Fallback para localStorage (modo offline)
- ✅ Interface responsiva (mobile-first)

---

## 📖 Documentos Principais

### 1. README.md
**O que é**: Visão geral do projeto  
**Quando usar**: Para entender rapidamente o que o projeto faz  
**Conteúdo**:
- Funcionalidades
- Tecnologias usadas
- Instalação rápida
- Scripts disponíveis
- Roadmap

👉 **[Ir para README.md](README.md)**

---

### 2. SETUP_LOCAL.md
**O que é**: Guia completo de configuração  
**Quando usar**: Ao configurar o projeto pela primeira vez  
**Conteúdo**:
- Pré-requisitos (Node.js, npm, Git)
- Como baixar o projeto
- Instalar dependências
- Configurar Supabase
- Criar arquivo .env.local
- Executar migrations SQL
- Rodar o servidor de desenvolvimento
- Checklist de setup completo

👉 **[Ir para SETUP_LOCAL.md](SETUP_LOCAL.md)** ⭐ **COMECE AQUI**

---

### 3. MIGRATION_GUIDE.md
**O que é**: Guia de migração para Supabase  
**Quando usar**: Se você tem código com `useLocalStorage` e quer migrar para `useTrips` + Supabase  
**Conteúdo**:
- Diferenças entre useLocalStorage e useTrips
- Passo a passo da migração
- Atualizar imports e hooks
- Converter funções síncronas para assíncronas
- Diferenças entre interfaces Trip
- Checklist de migração

👉 **[Ir para MIGRATION_GUIDE.md](MIGRATION_GUIDE.md)**

---

### 4. TROUBLESHOOTING.md
**O que é**: Guia de resolução de problemas  
**Quando usar**: Quando algo não funcionar como esperado  
**Conteúdo**:
- Erros de Supabase
- Erros de build/compilação
- Erros de runtime
- Erros de dados
- Problemas de performance
- Como debugar
- Checklist de debugging

👉 **[Ir para TROUBLESHOOTING.md](TROUBLESHOOTING.md)**

---

### 5. /supabase/migrations/README.md
**O que é**: Scripts SQL para criar tabelas  
**Quando usar**: Ao configurar o banco de dados pela primeira vez  
**Conteúdo**:
- Como acessar SQL Editor
- Script para criar tabela `trips`
- Script para criar tabela `vehicles`
- Script para criar tabela `stops`
- Script para triggers de updated_at
- Políticas RLS
- Como verificar se funcionou

👉 **[Ir para /supabase/migrations/README.md](supabase/migrations/README.md)**

---

### 6. /styles/colors.md
**O que é**: Documentação da paleta de cores  
**Quando usar**: Ao estilizar componentes ou criar novos designs  
**Conteúdo**:
- Paleta de cores completa
- Percentuais de uso (60/30/7/3)
- Variáveis CSS disponíveis
- Classes Tailwind customizadas
- Tabela de migração de cores antigas
- Guia de uso

👉 **[Ir para /styles/colors.md](styles/colors.md)**

---

### 7. /guidelines/Guidelines.md
**O que é**: Padrões de código e boas práticas  
**Quando usar**: Ao desenvolver novos componentes ou features  
**Conteúdo**:
- Convenções de código
- Estrutura de componentes
- Padrões de nomenclatura
- Boas práticas

👉 **[Ir para /guidelines/Guidelines.md](guidelines/Guidelines.md)** (se existir)

---

## 🗂️ Arquivos de Configuração

### .env.example
Template para variáveis de ambiente. Copie para `.env.local` e preencha.

```bash
cp .env.example .env.local
```

### .gitignore
Lista de arquivos/pastas que não devem ser versionados.  
**IMPORTANTE**: `.env.local` está nesta lista (nunca commitar credenciais!)

---

## 📁 Estrutura de Código

### /components/useTrips.ts
**Hook customizado principal** que gerencia:
- Estado de viagens, veículos e paradas
- Integração com Supabase
- Fallback para localStorage
- CRUD completo (Create, Read, Update, Delete)
- Conversão automática camelCase ↔ snake_case

**Funções exportadas**:
```tsx
{
  trips: Trip[],              // Lista de viagens
  vehicles: Vehicle[],        // Lista de veículos
  loading: boolean,           // Estado de carregamento
  error: string | null,       // Mensagens de erro
  saveTrip,                   // Criar nova viagem
  updateTrip,                 // Atualizar viagem
  deleteTrip,                 // Deletar viagem
  saveVehicle,                // Criar veículo
  saveStop,                   // Adicionar parada
  updateStop,                 // Atualizar parada
}
```

### /utils/supabase/client.tsx
Cliente Supabase configurado e pronto para uso.

```tsx
import { supabase } from './utils/supabase/client.tsx';

// Usar diretamente em queries
const { data } = await supabase.from('trips').select('*');
```

### /utils/supabase/info.tsx
Credenciais do Supabase (auto-gerado, não editar).

---

## 🎨 Sistema de Design

### Paleta de Cores Principal

```css
/* Azul Profundo - 30% */
--color-primary-deep-blue: #192A56;

/* Fuchsia - 7% (Ações/Botões) */
--color-accent-fuchsia: #c026d3;
--color-accent-fuchsia-light: #d946ef;

/* Roxo - 3% (Destaques) */
--color-accent-purple: #8E44AD;

/* Teal - Utilitário */
--color-teal: #0d9488;

/* Off-White - 60% (Fundos) */
--color-neutral-off-white: #F4F6FF;
```

### Classes Tailwind Recomendadas

```tsx
// Botões de ação
<button className="bg-fuchsia-500 hover:bg-fuchsia-600">
  Salvar
</button>

// Voltar ao topo
<button className="bg-teal-600 hover:bg-teal-700">
  ↑
</button>

// Fundo de página
<div className="bg-[#F4F6FF]">
  Conteúdo
</div>

// Texto primário
<h1 className="text-[#192A56]">
  Título
</h1>
```

---

## 🔄 Fluxo de Dados

```
┌─────────────────┐
│   Componente    │
│   (React)       │
└────────┬────────┘
         │
         │ useTrips()
         ↓
┌─────────────────┐
│   useTrips.ts   │ ← Hook customizado
│                 │   - Gerencia estado
│                 │   - Faz conversões
└────────┬────────┘
         │
         ↓
    ┌────────┴────────┐
    │                 │
    ↓                 ↓
┌──────────┐    ┌─────────────┐
│ Supabase │    │ localStorage│
│ (Cloud)  │    │  (Backup)   │
└──────────┘    └─────────────┘
```

**Como funciona**:
1. Componente chama `useTrips()`
2. Hook tenta salvar no Supabase
3. Se Supabase falhar, usa localStorage como fallback
4. Hook converte automaticamente camelCase ↔ snake_case
5. Estado é atualizado e componente re-renderiza

---

## 🧪 Como Testar

### 1. Teste Manual - Criar Viagem
```
1. Clique em "Nova Viagem"
2. Preencha local de partida
3. Escolha data e hora
4. Clique em "Continuar"
5. Verificar:
   ✅ Viagem aparece em "Minhas Viagens"
   ✅ Dados no Supabase Table Editor
   ✅ Console sem erros
```

### 2. Teste Manual - Adicionar Parada
```
1. Entre em uma viagem em andamento
2. Clique em "+ Adicionar Parada"
3. Preencha nome e motivo
4. Salve
5. Verificar:
   ✅ Parada aparece na lista
   ✅ Dados no Supabase (tabela stops)
```

### 3. Teste de Fallback - Modo Offline
```
1. Abra DevTools (F12) → Network
2. Simule "Offline"
3. Crie uma viagem
4. Verificar:
   ✅ Aviso "Usando dados locais"
   ✅ Viagem salva no localStorage
   ✅ Ao voltar online, sincroniza
```

---

## 🚀 Roadmap de Features

### ✅ Implementado
- [x] Cadastro de viagens
- [x] Gerenciamento de veículos
- [x] Sistema de paradas
- [x] Integração com Supabase
- [x] Fallback para localStorage
- [x] Paleta de cores moderna
- [x] Interface responsiva
- [x] Documentação completa

### 🔨 Em Desenvolvimento
- [ ] Dashboard com estatísticas
- [ ] Upload de fotos (Supabase Storage)
- [ ] Modo offline (PWA)
- [ ] Autenticação de usuários

### 📋 Planejado
- [ ] Exportação de dados (PDF/Excel)
- [ ] Integração com Google Maps
- [ ] Modo escuro
- [ ] Aplicativo mobile (React Native)
- [ ] Compartilhamento de viagens

---

## 🆘 Precisa de Ajuda?

### Fluxo de Resolução de Problemas

```
1. Algo não funciona
   ↓
2. Verifique o console (F12)
   ↓
3. Veja TROUBLESHOOTING.md
   ↓
4. Ainda com problema?
   ↓
5. Verifique Network tab
   ↓
6. Confira Supabase Table Editor
   ↓
7. Reveja SETUP_LOCAL.md
   ↓
8. Documente o erro em TROUBLESHOOTING.md
```

### Links Úteis

- **React Docs**: https://react.dev/
- **Supabase Docs**: https://supabase.com/docs
- **Tailwind CSS**: https://tailwindcss.com/docs
- **TypeScript**: https://www.typescriptlang.org/docs/
- **Lucide Icons**: https://lucide.dev/

---

## 📊 Métricas do Projeto

```
📁 Total de Componentes: ~15
📄 Total de Linhas de Código: ~5000
🗄️ Tabelas no Banco: 3 (trips, vehicles, stops)
🎨 Cores Principais: 5
📝 Documentos: 7
✨ Features Implementadas: 12+
```

---

## 🔐 Segurança

### ⚠️ NUNCA Commitar
- ❌ `.env.local`
- ❌ Credenciais do Supabase
- ❌ API Keys
- ❌ Senhas

### ✅ Sempre Fazer
- ✅ Usar variáveis de ambiente
- ✅ Configurar RLS no Supabase
- ✅ Validar dados no backend
- ✅ Sanitizar inputs do usuário

---

## 🎓 Para Novos Desenvolvedores

### Ordem de Leitura Recomendada

```
1. 📖 README.md
   ↓ Entenda o que o projeto faz
   
2. 🚀 SETUP_LOCAL.md
   ↓ Configure seu ambiente
   
3. 🎨 /styles/colors.md
   ↓ Aprenda a paleta de cores
   
4. 🔄 MIGRATION_GUIDE.md (se necessário)
   ↓ Migre código existente
   
5. 🔧 TROUBLESHOOTING.md (quando precisar)
   ↓ Resolva problemas
   
6. 📊 /supabase/migrations/README.md
   ↓ Entenda o banco de dados
```

### Começando a Desenvolver

```bash
# 1. Clone o projeto
git clone <repo>

# 2. Instale dependências
npm install

# 3. Configure .env.local
cp .env.example .env.local
# Edite com suas credenciais

# 4. Execute migrations SQL
# Veja /supabase/migrations/README.md

# 5. Rode o projeto
npm run dev

# 6. Comece a codar! 🚀
```

---

## 📞 Contato e Suporte

- **Documentação**: Este índice e documentos linkados
- **Issues**: Abra uma issue no repositório
- **Contribuições**: Pull requests são bem-vindos!

---

**Última atualização**: 02/11/2024  
**Versão**: 1.0.0  
**Status**: ✅ Ativo

---

🚗 **Boa viagem no desenvolvimento!** 🛣️

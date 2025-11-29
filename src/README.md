# 🗺️ LogMyTravel

**Registre, acompanhe e reviva suas melhores viagens**

Aplicativo web moderno e responsivo para registrar e gerenciar suas viagens pessoais, veículos e paradas, com sincronização em nuvem via Supabase.

![Status](https://img.shields.io/badge/status-active-success.svg)
![Version](https://img.shields.io/badge/version-1.1.0-fuchsia.svg)
![React](https://img.shields.io/badge/React-18.x-blue.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)
![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-4.x-38bdf8.svg)

> 💡 **Sobre o nome**: LogMyTravel é escrito em CamelCase como uma palavra única. "Log" (registrar) + "My" (minhas) + "Travel" (viagens).

## ✨ Funcionalidades

### 🎯 Viagens
- ✅ Criar novas viagens com local, data e hora de partida/chegada
- ✅ Visualizar viagens em andamento e histórico completo
- ✅ Editar informações de viagens existentes
- ✅ Registrar KM inicial e final
- ✅ Adicionar detalhes e observações
- ✅ Sistema de status (em andamento / concluída)

### 🚙 Veículos
- ✅ Cadastro completo de veículos (próprio, alugado, trabalho)
- ✅ Categorias: moto, carro, van, caminhonete, caminhão
- ✅ Registro de marca, modelo, cor, ano, placa
- ✅ Controle de KM inicial
- ✅ Tipos de combustível suportados

### 📍 Paradas
- ✅ Adicionar paradas durante a viagem
- ✅ Registrar motivos: descanso, combustível, alimentação, fotos, visita
- ✅ Capturar localização GPS
- ✅ Controle de KM de chegada/saída
- ✅ Registro de custos
- ✅ Notas e diário de viagem
- ✅ Suporte para fotos (preparado)

### 🎨 Design
- ✅ Interface moderna com paleta de cores profissional
- ✅ Responsivo (mobile-first)
- ✅ Navegação inferior intuitiva
- ✅ Animações suaves
- ✅ Temas consistentes

### 💾 Dados
- ✅ Sincronização em tempo real com Supabase
- ✅ Fallback automático para localStorage
- ✅ Backup local de segurança
- ✅ Suporte offline (em desenvolvimento)

## 🎨 Paleta de Cores

- **Azul Profundo** (#192A56) - Primária (30%)
- **Fuchsia** (#c026d3, #d946ef) - Ações e CTAs (7%)
- **Roxo** (#8E44AD) - Destaques (3%)
- **Teal** (#0d9488) - Utilitário
- **Off-White** (#F4F6FF) - Fundos (60%)
- **Verde** (#2ECC71) - Sucesso

Veja documentação completa em `/styles/colors.md`

## 🚀 Começando

### Pré-requisitos

- Node.js 18+ e npm
- Conta no Supabase (gratuita)
- VS Code (recomendado)

### Instalação Rápida

```bash
# 1. Clone o repositório
git clone <seu-repositorio>
cd logmytravel

# 2. Instale as dependências
npm install

# 3. Configure o Supabase
# Copie .env.example para .env.local e preencha suas credenciais
cp .env.example .env.local

# 4. Execute as migrations SQL
# Veja instruções em /supabase/migrations/README.md

# 5. Inicie o servidor de desenvolvimento
npm run dev
```

**📖 Para instruções detalhadas, veja o [Guia de Setup Local](SETUP_LOCAL.md)**

## 🗄️ Estrutura do Banco de Dados

O aplicativo usa 3 tabelas principais no Supabase:

### `trips` (Viagens)
- id, name, departure/arrival (location, coords, date, time)
- start_km, end_km, details, status
- has_vehicle, vehicle_ids

### `vehicles` (Veículos)
- id, nickname, category, make, model, color, year
- license_plate, vehicle_type, km_initial, fuels

### `stops` (Paradas)
- id, trip_id, name, location
- arrival/departure (km, date, time)
- reasons, other_reason, cost, notes, photo_urls

Todas as tabelas têm Row Level Security (RLS) habilitado.

## 📁 Estrutura do Projeto

```
📁 logmytravel/
├── 📁 components/              # Componentes React
│   ├── TripNew.tsx            # Formulário de nova viagem
│   ├── OngoingTripView.tsx    # Visualização de viagem ativa
│   ├── TripCard.tsx           # Card de viagem
│   ├── BottomNav.tsx          # Navegação inferior
│   ├── VehiclesOnTrip.tsx     # Gestão de veículos
│   ├── StopForm.tsx           # Formulário de paradas
│   ├── useTrips.ts            # Hook customizado (CRUD)
│   └── ui/                    # Componentes ShadCN
├── 📁 styles/
│   ├── globals.css            # Estilos globais + variáveis
│   └── colors.md              # Documentação da paleta
├── 📁 utils/
│   └── supabase/
│       ├── client.tsx         # Cliente Supabase
│       └── info.tsx           # Credenciais (auto-gerado)
├── 📁 supabase/
│   └── migrations/
│       └── README.md          # Scripts SQL para setup
├── App.tsx                    # Componente raiz
├── SETUP_LOCAL.md             # Guia de setup detalhado
├── .env.example               # Template de variáveis de ambiente
└── package.json               # Dependências
```

## 🛠️ Tecnologias Utilizadas

- **React 18** - Framework UI
- **TypeScript** - Tipagem estática
- **Tailwind CSS 4** - Estilização
- **Supabase** - Backend as a Service (PostgreSQL + Auth + Storage)
- **Vite** - Build tool e dev server
- **Lucide React** - Ícones
- **ShadCN UI** - Componentes acessíveis

## 🧩 Principais Componentes

### `useTrips` Hook

Hook customizado que gerencia todo o estado e lógica de dados:

```tsx
const {
  trips,           // Lista de viagens
  vehicles,        // Lista de veículos
  loading,         // Estado de carregamento
  error,           // Mensagens de erro
  saveTrip,        // Criar nova viagem
  updateTrip,      // Atualizar viagem
  deleteTrip,      // Deletar viagem
  saveVehicle,     // Criar veículo
  saveStop,        // Adicionar parada
  updateStop,      // Atualizar parada
} = useTrips();
```

### Integração com Supabase

O hook `useTrips` faz conversão automática entre:
- **camelCase** (código JavaScript/TypeScript)
- **snake_case** (banco de dados PostgreSQL)

Exemplo:
```tsx
// Frontend (camelCase)
const trip = {
  departureLocation: "São Paulo",
  departureDate: "02/11/2024"
};

// Supabase (snake_case)
// Convertido automaticamente para:
{
  departure_location: "São Paulo",
  departure_date: "02/11/2024"
}
```

## 📊 Dashboard (Em Desenvolvimento)

Funcionalidades planejadas:
- Estatísticas de viagens
- Gráficos de KM percorridos
- Custos totais
- Histórico de paradas
- Análise de veículos

## 🔐 Segurança

- ✅ Variáveis de ambiente para credenciais sensíveis
- ✅ Row Level Security (RLS) no Supabase
- ✅ Validação de dados no frontend
- ⚠️ Em produção: implementar autenticação de usuários
- ⚠️ Em produção: configurar políticas RLS por usuário

## 🐛 Resolução de Problemas

### Erro de conexão com Supabase
1. Verifique o arquivo `.env.local`
2. Confirme as credenciais no painel do Supabase
3. Execute as migrations SQL

### Dados não aparecem
1. Abra o Console do navegador (F12)
2. Verifique a aba Network para erros
3. Confirme que as tabelas existem no Supabase

### Hot reload não funciona
1. Pare o servidor (Ctrl + C)
2. Delete `node_modules` e `package-lock.json`
3. Execute `npm install` novamente

**Para mais detalhes, veja [SETUP_LOCAL.md](SETUP_LOCAL.md)**

## 📝 Scripts Disponíveis

```bash
npm run dev       # Inicia servidor de desenvolvimento
npm run build     # Cria build de produção
npm run preview   # Preview do build de produção
npm run lint      # Executa linter (se configurado)
```

## 🚀 Deploy

O aplicativo pode ser hospedado em:

- **Vercel** (recomendado para React)
- **Netlify**
- **GitHub Pages**
- **Supabase Hosting**

### Deploy na Vercel

```bash
# Instale a CLI da Vercel
npm i -g vercel

# Execute o deploy
vercel
```

Lembre-se de configurar as variáveis de ambiente no painel da Vercel:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## 🤝 Contribuindo

Contribuições são bem-vindas! Sinta-se à vontade para:

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/MinhaFeature`)
3. Commit suas mudanças (`git commit -m 'Adiciona MinhaFeature'`)
4. Push para a branch (`git push origin feature/MinhaFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo `LICENSE` para mais detalhes.

## 📞 Suporte

- **Documentação**: Veja [SETUP_LOCAL.md](SETUP_LOCAL.md)
- **Paleta de Cores**: Veja [/styles/colors.md](styles/colors.md)
- **Migrations SQL**: Veja [/supabase/migrations/README.md](supabase/migrations/README.md)

## 🗺️ Roadmap

- [ ] Autenticação de usuários (Supabase Auth)
- [ ] Modo offline completo (PWA)
- [ ] Upload de fotos para Supabase Storage
- [ ] Exportação de dados (PDF/Excel)
- [ ] Dashboard com estatísticas
- [ ] Integração com Google Maps para rotas
- [ ] Modo escuro
- [ ] Aplicativo mobile (React Native)
- [ ] Compartilhamento de viagens
- [ ] Relatórios de despesas

## 🙏 Agradecimentos

- [React](https://react.dev/)
- [Supabase](https://supabase.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Lucide Icons](https://lucide.dev/)
- [ShadCN UI](https://ui.shadcn.com/)

---

**LogMyTravel** - Desenvolvido com ❤️ usando React + TypeScript + Supabase

🗺️ Registre suas viagens e crie memórias inesquecíveis! 🛣️

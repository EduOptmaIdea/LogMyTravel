# 🗺️ Guia de Setup Local - LogMyTravel

Este guia vai te ajudar a baixar, configurar e rodar o LogMyTravel no seu VS Code local.

## 📋 Pré-requisitos

Antes de começar, certifique-se de ter instalado:

1. **Node.js** (versão 18 ou superior)
   - Baixe em: https://nodejs.org/
   - Verifique a instalação: `node --version`

2. **npm** ou **yarn** (gerenciador de pacotes)
   - npm já vem com Node.js
   - Verifique: `npm --version`

3. **Git** (para clonar o repositório)
   - Baixe em: https://git-scm.com/
   - Verifique: `git --version`

4. **VS Code** (editor de código)
   - Baixe em: https://code.visualstudio.com/

5. **Conta no Supabase** (banco de dados)
   - Crie uma conta gratuita em: https://supabase.com/

---

## 🚀 Passo 1: Baixar o Projeto

### Opção A: Clonar do Repositório Git

```bash
# Clone o repositório (substitua pela URL do seu repositório)
git clone <URL_DO_SEU_REPOSITORIO>

# Entre na pasta do projeto
cd nome-do-projeto
```

### Opção B: Download Direto

1. Baixe todos os arquivos do projeto
2. Extraia em uma pasta de sua preferência
3. Abra o terminal nessa pasta

---

## 🔧 Passo 2: Instalar Dependências

Abra o terminal na pasta do projeto e execute:

```bash
# Usando npm
npm install

# OU usando yarn
yarn install
```

Isso vai instalar todas as dependências necessárias:
- React
- TypeScript
- Tailwind CSS
- Supabase Client
- Lucide Icons
- e outras bibliotecas

---

## 🗄️ Passo 3: Configurar o Supabase

### 3.1 Criar um Projeto no Supabase

1. Acesse: https://supabase.com/dashboard
2. Clique em **"New Project"**
3. Preencha:
   - **Name**: Nome do seu projeto (ex: "app-viagens")
   - **Database Password**: Crie uma senha forte
   - **Region**: Escolha a região mais próxima (ex: South America)
4. Clique em **"Create new project"**
5. Aguarde alguns minutos até o projeto estar pronto

### 3.2 Obter as Credenciais

1. No painel do Supabase, vá em **Settings** (ícone de engrenagem)
2. Clique em **API**
3. Copie as seguintes informações:
   - **Project URL** (ex: `https://xxxxx.supabase.co`)
   - **Project ID** (parte da URL, ex: `yjzrlbkqjbubpzzfvsji`)
   - **anon public** (API Key pública)

### 3.3 Criar o Arquivo de Variáveis de Ambiente

1. Na raiz do projeto, crie um arquivo chamado `.env.local`
2. Adicione as credenciais do Supabase:

```env
VITE_SUPABASE_URL=https://seu-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-publica-aqui
```

**⚠️ IMPORTANTE**: 
- Substitua `seu-project-id` pelo ID real do seu projeto
- Substitua `sua-chave-publica-aqui` pela sua API Key (anon public)
- NUNCA compartilhe este arquivo `.env.local` publicamente

### 3.4 Criar as Tabelas no Banco de Dados

1. No painel do Supabase, vá em **SQL Editor**
2. Abra o arquivo `/supabase/migrations/README.md` neste projeto
3. Execute **cada bloco SQL na ordem**:
   - Bloco 1: Criar tabela `trips`
   - Bloco 2: Criar tabela `vehicles`
   - Bloco 3: Criar tabela `stops`
   - Bloco 4: Criar função `update_updated_at_column`

4. Para verificar se funcionou, execute:

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

Você deve ver 3 tabelas listadas.

---

## ▶️ Passo 4: Rodar o Projeto

### 4.1 Iniciar o Servidor de Desenvolvimento

```bash
# Usando npm
npm run dev

# OU usando yarn
yarn dev
```

### 4.2 Acessar o Aplicativo

1. O terminal mostrará uma mensagem como:
   ```
   Local: http://localhost:5173/
   ```

2. Abra seu navegador e acesse: **http://localhost:5173/**

3. Você deve ver a tela inicial do aplicativo! 🎉

---

## 🛠️ Passo 5: Desenvolver e Editar

### Estrutura de Pastas

```
📁 projeto/
├── 📁 components/          # Componentes React
│   ├── TripNew.tsx        # Formulário de nova viagem
│   ├── TripCard.tsx       # Card de viagem
│   ├── OngoingTripView.tsx # Visualização de viagem em andamento
│   ├── BottomNav.tsx      # Navegação inferior
│   ├── useTrips.ts        # Hook customizado para gerenciar dados
│   └── ...
├── 📁 styles/             # Estilos globais
│   ├── globals.css        # CSS global e variáveis de cores
│   └── colors.md          # Documentação da paleta de cores
├── 📁 utils/              # Utilitários
│   └── supabase/
│       └── client.tsx     # Cliente Supabase
├── 📁 supabase/           # Configurações do Supabase
│   └── migrations/
│       └── README.md      # Scripts SQL
├── App.tsx                # Componente principal
├── .env.local             # Variáveis de ambiente (NÃO COMMITAR!)
└── package.json           # Dependências do projeto
```

### Principais Arquivos para Editar

1. **`/components/TripNew.tsx`**
   - Formulário de criação de viagens
   - Lógica de validação e envio

2. **`/components/OngoingTripView.tsx`**
   - Visualização e edição de viagens em andamento
   - Gerenciamento de paradas e KM

3. **`/components/useTrips.ts`**
   - Hook customizado que gerencia:
     - Estado das viagens
     - Integração com Supabase
     - Fallback para localStorage
     - CRUD de viagens, veículos e paradas

4. **`/styles/globals.css`**
   - Variáveis CSS customizadas
   - Paleta de cores do app
   - Tipografia

5. **`/App.tsx`**
   - Componente raiz
   - Roteamento entre views
   - Estado global

### Paleta de Cores Atual

O projeto usa a seguinte paleta (veja `/styles/colors.md`):

- **Azul Profundo** (#192A56): Cor primária, headers, textos importantes
- **Fuchsia** (#c026d3, #d946ef): Botões de ação, CTAs, links
- **Roxo** (#8E44AD): Destaques secundários
- **Teal** (#0d9488): Botão "Voltar ao topo"
- **Off-White** (#F4F6FF): Fundos
- **Verde** (#2ECC71): Sucesso/confirmações

---

## 🧪 Testando as Funcionalidades

### 1. Criar uma Nova Viagem

1. Clique no botão **"Nova Viagem"** (ícone +)
2. Preencha os campos obrigatórios:
   - Local de partida
   - Data e hora de partida
3. (Opcional) Ative "Encerrar viagem" e preencha chegada
4. Clique em **"Continuar"**
5. A viagem será salva no Supabase!

### 2. Visualizar Viagem em Andamento

1. Clique no botão **"Viagem Atual"** (centro da navegação inferior)
2. Você verá os detalhes da viagem
3. Atualize o KM clicando no número
4. Adicione paradas clicando em **"+ Adicionar Parada"**

### 3. Cadastrar um Veículo

1. Em "Nova Viagem", clique em **"Cadastrar veículo"**
2. Preencha os dados do veículo
3. Salve - o veículo ficará disponível para futuras viagens

### 4. Ver Histórico de Viagens

1. Clique em **"Minhas Viagens"** na navegação inferior
2. Veja todas as viagens (em andamento e finalizadas)
3. Clique em uma viagem para ver detalhes

---

## 🐛 Resolução de Problemas

### Problema: "Erro ao carregar do Supabase"

**Solução**:
1. Verifique se o arquivo `.env.local` existe
2. Confirme que as credenciais estão corretas
3. Verifique se as tabelas foram criadas no Supabase
4. Abra o **Console do navegador** (F12) para ver erros detalhados

### Problema: "localhost:5173 não abre"

**Solução**:
1. Verifique se o comando `npm run dev` está rodando sem erros
2. Tente outro navegador
3. Limpe o cache do navegador (Ctrl + Shift + Del)
4. Tente acessar `http://127.0.0.1:5173/`

### Problema: Dados não aparecem

**Solução**:
1. Abra o **Console do navegador** (F12)
2. Vá na aba **Network**
3. Recarregue a página
4. Verifique se há erros 401, 403 ou 500
5. Confirme que as políticas RLS do Supabase estão ativas

### Problema: Hot Reload não funciona

**Solução**:
1. Pare o servidor (Ctrl + C)
2. Delete a pasta `node_modules`
3. Delete o arquivo `package-lock.json`
4. Execute `npm install` novamente
5. Execute `npm run dev`

---

## 📦 Build para Produção

Quando estiver pronto para publicar:

```bash
# Gerar build otimizado
npm run build

# Testar o build localmente
npm run preview
```

Os arquivos otimizados ficarão na pasta `dist/`.

---

## 🔐 Segurança e Boas Práticas

1. **NUNCA commite o arquivo `.env.local`**
   - Adicione ao `.gitignore`
   - Use variáveis de ambiente no servidor de produção

2. **Use Row Level Security (RLS) no Supabase**
   - Em produção, configure autenticação
   - Restrinja acesso por usuário

3. **Valide dados no backend**
   - Use Supabase Edge Functions para validação
   - Não confie apenas em validação frontend

4. **Mantenha dependências atualizadas**
   ```bash
   npm outdated
   npm update
   ```

---

## 📚 Recursos Úteis

- **Documentação React**: https://react.dev/
- **Documentação Tailwind CSS**: https://tailwindcss.com/docs
- **Documentação Supabase**: https://supabase.com/docs
- **Lucide Icons**: https://lucide.dev/icons/
- **TypeScript Handbook**: https://www.typescriptlang.org/docs/

---

## 🆘 Precisa de Ajuda?

- Verifique os logs no console do navegador (F12)
- Leia o arquivo `/supabase/migrations/README.md` para setup do banco
- Consulte `/styles/colors.md` para entender a paleta de cores
- Revise `/guidelines/Guidelines.md` para padrões de código

---

## 🎨 Personalizando o Projeto

### Alterar Cores

1. Edite o arquivo `/styles/globals.css`
2. Modifique as variáveis CSS:
   ```css
   --color-primary-deep-blue: #192A56;
   --color-accent-fuchsia: #c026d3;
   ```
3. As cores serão aplicadas automaticamente

### Adicionar Novos Componentes

```bash
# Crie um novo arquivo em /components
touch components/MeuComponente.tsx
```

```tsx
// components/MeuComponente.tsx
export function MeuComponente() {
  return (
    <div className="p-4 bg-[#F4F6FF] rounded-lg">
      <h2>Meu Componente</h2>
    </div>
  );
}
```

Importe no `App.tsx`:
```tsx
import { MeuComponente } from "./components/MeuComponente";
```

---

## ✅ Checklist de Setup Completo

- [ ] Node.js instalado
- [ ] Projeto baixado/clonado
- [ ] `npm install` executado com sucesso
- [ ] Conta no Supabase criada
- [ ] Projeto no Supabase criado
- [ ] Arquivo `.env.local` configurado
- [ ] Tabelas criadas no SQL Editor do Supabase
- [ ] `npm run dev` rodando sem erros
- [ ] Aplicativo abrindo no navegador
- [ ] Criou uma viagem de teste com sucesso
- [ ] Dados aparecendo no Supabase (aba Table Editor)

---

**Parabéns! 🎉 Seu ambiente de desenvolvimento está pronto!**

Agora você pode começar a desenvolver e personalizar o LogMyTravel.

Bom desenvolvimento! 🚀

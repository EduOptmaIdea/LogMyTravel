# 🤝 Guia de Contribuição - LogMyTravel

Obrigado por considerar contribuir com o LogMyTravel! 🎉

## 📋 Código de Conduta

Ao participar deste projeto, você concorda em manter um ambiente respeitoso e acolhedor para todos.

## 🚀 Como Contribuir

### 1. Reporte Bugs 🐛

Se você encontrou um bug:

1. Verifique se já não existe uma issue aberta
2. Crie uma nova issue com o template de bug
3. Inclua:
   - Descrição clara do problema
   - Passos para reproduzir
   - Comportamento esperado vs. atual
   - Screenshots (se aplicável)
   - Versão do navegador/sistema

### 2. Sugira Features 💡

Para novas funcionalidades:

1. Abra uma issue com o template de feature request
2. Descreva claramente:
   - O problema que resolve
   - Como funcionaria
   - Por que seria útil
   - Mockups/exemplos (opcional)

### 3. Envie Pull Requests 🔧

#### Setup Local

```bash
# 1. Fork o repositório no GitHub

# 2. Clone seu fork
git clone https://github.com/SEU-USUARIO/logmytravel.git
cd logmytravel

# 3. Adicione o repositório original como upstream
git remote add upstream https://github.com/ORIGINAL/logmytravel.git

# 4. Instale as dependências
npm install

# 5. Configure o Supabase (veja SETUP_LOCAL.md)
cp .env.example .env.local
# Edite .env.local com suas credenciais

# 6. Rode o projeto
npm run dev
```

#### Workflow de Desenvolvimento

```bash
# 1. Crie uma branch para sua feature/fix
git checkout -b feature/minha-feature
# ou
git checkout -b fix/meu-bug

# 2. Faça suas alterações
# ...

# 3. Teste localmente
npm run dev

# 4. Commit suas mudanças
git add .
git commit -m "feat: adiciona nova funcionalidade X"

# 5. Push para seu fork
git push origin feature/minha-feature

# 6. Abra um Pull Request no GitHub
```

## 📝 Padrões de Código

### Commits

Usamos [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: adiciona nova funcionalidade
fix: corrige bug específico
docs: atualiza documentação
style: melhora formatação/estilo
refactor: refatora código
test: adiciona/atualiza testes
chore: atualiza dependências/config
```

Exemplos:
```
feat: adiciona upload de fotos nas paradas
fix: corrige cálculo de KM total
docs: atualiza guia de instalação
style: melhora espaçamento no header
refactor: simplifica hook useTrips
```

### TypeScript

- ✅ Use TypeScript sempre que possível
- ✅ Defina tipos explícitos
- ✅ Evite `any` - use `unknown` se necessário
- ✅ Use interfaces para objetos complexos

```typescript
// ✅ Bom
interface Trip {
  id: string;
  name: string;
  status: "ongoing" | "completed";
}

// ❌ Evite
const trip: any = { ... };
```

### React

- ✅ Use componentes funcionais
- ✅ Use hooks (useState, useEffect, etc.)
- ✅ Extraia lógica complexa em custom hooks
- ✅ Nomeie componentes em PascalCase

```tsx
// ✅ Bom
export function TripCard({ trip }: TripCardProps) {
  const [expanded, setExpanded] = useState(false);
  return <div>...</div>;
}

// ❌ Evite
export default function tripcard(props: any) {
  return <div>...</div>;
}
```

### Tailwind CSS

- ✅ Use classes utilitárias
- ✅ Siga a paleta de cores oficial
- ✅ Evite classes customizadas quando possível
- ✅ Use `className` em ordem lógica (layout → visual → interação)

```tsx
// ✅ Bom
<button className="flex items-center gap-2 px-4 py-2 bg-fuchsia-500 text-white rounded-lg hover:bg-fuchsia-600">

// ❌ Evite
<button style={{ backgroundColor: '#c026d3' }}>
```

## 🎨 Guia de Estilo

### Nome do Projeto
- ✅ LogMyTravel (CamelCase, uma palavra)
- ❌ Log My Travel, logmytravel, LOGMYTRAVEL

### Paleta de Cores
Sempre use as cores oficiais:
- **Azul Profundo**: `#192A56` ou `bg-[#192A56]`
- **Fuchsia**: `#c026d3` ou `bg-fuchsia-500`
- **Teal**: `#0d9488` ou `bg-teal-600`

Veja `/BRANDING.md` para detalhes completos.

## 📚 Documentação

Se sua contribuição adiciona funcionalidades:

1. Atualize o README.md
2. Adicione comentários no código
3. Atualize o CHANGELOG.md
4. Crie/atualize documentação específica

## ✅ Checklist para Pull Requests

Antes de enviar seu PR, certifique-se:

- [ ] O código compila sem erros (`npm run build`)
- [ ] O código segue os padrões do projeto
- [ ] Adicionou testes (se aplicável)
- [ ] Atualizou a documentação
- [ ] A mensagem de commit segue Conventional Commits
- [ ] O PR descreve claramente as mudanças

## 🧪 Testes

```bash
# Rode os testes (quando implementados)
npm test

# Verifique o build
npm run build

# Teste localmente
npm run dev
```

## 📦 Estrutura de Pastas

```
/components      # Componentes React
  /ui           # Componentes ShadCN
/styles         # CSS global e documentação
/utils          # Utilidades e helpers
/supabase       # Configuração Supabase
```

## 🔍 Code Review

Todos os PRs serão revisados. O processo:

1. Análise de código
2. Testes funcionais
3. Verificação de documentação
4. Aprovação ou solicitação de mudanças

## 💬 Comunicação

- **Issues**: Para bugs e features
- **Discussions**: Para ideias gerais
- **Pull Requests**: Para código

## 🎯 Áreas que Precisam de Ajuda

- [ ] Testes automatizados
- [ ] Modo offline (PWA)
- [ ] Integração com Google Maps
- [ ] Upload de fotos
- [ ] Modo escuro
- [ ] Internacionalização (i18n)
- [ ] Documentação adicional
- [ ] Otimização de performance

## 📞 Precisa de Ajuda?

- Abra uma issue com a tag `question`
- Confira a [Documentação](DOCUMENTATION_INDEX.md)
- Veja o [Guia de Troubleshooting](TROUBLESHOOTING.md)

## 🙏 Agradecimentos

Toda contribuição é valorizada! Obrigado por ajudar a tornar o LogMyTravel melhor! 🎉

---

**LogMyTravel** 🗺️  
*Registre, acompanhe e reviva suas melhores viagens*

---

*Última atualização: 02/11/2024*

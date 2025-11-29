# Templates de E-mail do Supabase

Este diretório contém os templates prontos para uso no Supabase Auth, em pt-BR.

## Confirm Signup (Confirmação de E-mail)

- Arquivo: `confirm_signup-pt-br.html`
- Como configurar:
  1. Acesse `Supabase → Auth → Templates`.
  2. Selecione `Confirm Signup` e cole o conteúdo do arquivo.
  3. Substitua `%%LOGO_URL%%` por uma URL pública da imagem `logo-do-carrousel.png`.
     - Dica: envie a imagem para o `Storage` como pública e copie o URL.
  4. Salve as alterações.

### Observações
- O botão usa `{{ .ConfirmationURL }}` (placeholder obrigatório do Supabase).
- O template utiliza as cores do app (`#192A56` no header e `#C026D3` no botão).
- O rodapé e outros detalhes (copyright, links) podem ser ajustados depois.


Netlify deployment checklist

1. Link repository
   - New site from Git → GitHub → select EduOptmaIdea/LogMyTravel

2. Build settings
   - Build command: `npm run build`
   - Publish directory: `build`
   - Node version: `20` (already in netlify.toml)
   - Functions directory: `netlify/functions` (already in netlify.toml)

3. Environment variables
   - Client (Vite): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
   - Server (Functions): `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SMTP_HOST`, `SMTP_PORT=465`, `SMTP_USERNAME`, `SMTP_PASSWORD`, `SMTP_FROM`

4. Trigger deploy
   - Push to `main` or use `Trigger deploy` in Netlify

5. Verify
   - Signup sends welcome email
   - Profile edits persist and show last update
   - Password reset/modify emails are sent
   - Backup JSON arrives via email
   - Immediate deletion: backup + cascade removal + confirmation email


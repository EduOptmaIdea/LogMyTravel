
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';
import nodemailer from 'nodemailer';
import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

// Carrega configuração SMTP de env ou dos templates em supabase_templates
function getSmtpConfig(): { host: string; port: number; user: string; pass: string; from: string } {
  let host = process.env.SMTP_HOST;
  let port = Number(process.env.SMTP_PORT || '465');
  let user = process.env.SMTP_USERNAME;
  let pass = process.env.SMTP_PASSWORD;
  let from = process.env.SMTP_FROM || user || '';

  const needFallback = !host || !user || !pass || !from;
  if (needFallback) {
    try {
      const cwd = process.cwd();
      const mdPath = path.resolve(cwd, 'supabase_templates', 'smtp.md');
      const txtPath = path.resolve(cwd, 'supabase_templates', 'SMTP dados de configuração.txt');

      if (fs.existsSync(mdPath)) {
        const md = fs.readFileSync(mdPath, 'utf-8');
        const hostMatch = md.match(/^\s*Host:\s*(.+)$/mi);
        const portMatch = md.match(/^\s*Port:\s*(\d+)/mi);
        const userMatch = md.match(/^\s*Username:\s*(.+)$/mi);
        const passMatch = md.match(/^\s*Password:\s*([^\n\r]+)/mi);
        const fromMatch = md.match(/^\s*From:\s*(.+)$/mi);
        host = host || (hostMatch?.[1]?.trim() ?? '');
        port = portMatch ? Number(portMatch[1]) : port;
        user = user || (userMatch?.[1]?.trim() ?? '');
        pass = pass || (passMatch?.[1]?.replace(/\s+/g, '') ?? '');
        from = from || (fromMatch?.[1]?.trim() ?? '');
      }

      if ((!user || !from) && fs.existsSync(txtPath)) {
        const txt = fs.readFileSync(txtPath, 'utf-8');
        const emailMatch = txt.match(/[\w.-]+@[\w.-]+/);
        if (emailMatch) {
          user = user || emailMatch[0];
          from = from || (user ? `LogMyTravel <${user}>` : '');
        }
      }

      host = host || 'smtp.gmail.com';
      from = from || user || '';
    } catch (_) {
      // Ignora fallbacks se ocorrer erro de leitura; usará validação abaixo
    }
  }

  if (!host || !user || !pass || !from) {
    throw new Error('SMTP config ausente: defina SMTP_HOST, SMTP_USERNAME, SMTP_PASSWORD e SMTP_FROM (ou preencha supabase_templates/smtp.md).');
  }
  // Garantir tipos estritos para o retorno
  return {
    host: host as string,
    port,
    user: user as string,
    pass: pass as string,
    from: from as string,
  };
}

function accountsEmailMiddlewarePlugin() {
  return {
    name: 'accounts-email-middleware',
    configureServer(server: any) {
      async function readJson(req: any): Promise<any> {
        return new Promise((resolve, reject) => {
          let data = '';
          req.on('data', (chunk: any) => (data += chunk));
          req.on('end', () => {
            try { resolve(data ? JSON.parse(data) : {}); } catch (e) { reject(e); }
          });
          req.on('error', reject);
        });
      }

      async function sendSMTP({ to, subject, contentText, contentHtml }: { to: string; subject: string; contentText?: string; contentHtml?: string; }) {
        const { host, port, user, pass, from } = getSmtpConfig();
        const transporter = nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } });
        await transporter.sendMail({ from, to, subject, text: contentText, html: contentHtml });
      }

      function buildDeactivationNotice(daysLeft: number, reactivationUrl: string) {
        const subject = daysLeft === 7
          ? 'Aviso: conta será excluída em 7 dias'
          : daysLeft === 2
            ? 'Aviso: conta será excluída em 2 dias'
            : `Aviso: conta será excluída em ${daysLeft} dias`;
        const content = [
          'Olá,',
          '',
          'Você agendou a desativação da sua conta no LogMyTravel.',
          'Sua conta está programada para exclusão definitiva após o período de carência.',
          '',
          `Faltam ${daysLeft} dias para a exclusão.`,
          '',
          `Se você deseja reativar sua conta, acesse: ${reactivationUrl}`,
          '',
          'Opcionalmente, você poderá solicitar um backup dos seus dados antes da exclusão (em breve).',
          '',
          'Se você não tomar nenhuma ação, seus dados serão removidos de forma permanente após o prazo.',
          '',
          'Atenciosamente,',
          'Equipe LogMyTravel',
        ].join('\n');
        return { subject, content };
      }

      const handler = async (req: any, res: any, next: any) => {
        const url = req.url || '';
        if (!url.startsWith('/accounts/')) return next();
        if (req.method !== 'POST') return next();
        try {
          const body = await readJson(req);
          if (url.startsWith('/accounts/send-password-changed')) {
            const to = body?.to as string | undefined;
            if (!to) {
              res.statusCode = 400; res.setHeader('Content-Type', 'application/json');
              return res.end(JSON.stringify({ ok: false, error: "Missing 'to'" }));
            }
            const subject = 'Senha alterada – LogMyTravel';
            try {
              const cwd = process.cwd();
              const htmlPath = path.resolve(cwd, 'supabase_templates', 'password_changed_pt-br.html');
              const html = fs.readFileSync(htmlPath, 'utf-8');
              await sendSMTP({ to, subject, contentHtml: html });
            } catch (_) {
              const fallbackText = [
                'Olá,',
                '',
                'Sua senha no LogMyTravel foi alterada recentemente.',
                'Se não foi você, reconfigure sua senha imediatamente e entre em contato com o suporte.',
                '',
                'Atenciosamente,',
                'Equipe LogMyTravel',
              ].join('\n');
              await sendSMTP({ to, subject, contentText: fallbackText });
            }
            res.statusCode = 200; res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify({ ok: true }));
          }

          if (url.startsWith('/accounts/send-deactivation-email')) {
            const to = body?.to as string | undefined;
            const type = (body?.type as ('7_days' | '2_days') | undefined) || '7_days';
            const reactivationUrl = (body?.reactivationUrl as string | undefined) || 'https://logmytravel.app/reactivar';
            if (!to) {
              res.statusCode = 400; res.setHeader('Content-Type', 'application/json');
              return res.end(JSON.stringify({ ok: false, error: "Missing 'to'" }));
            }
            const daysLeft = type === '2_days' ? 2 : 7;
            const { subject, content } = buildDeactivationNotice(daysLeft, reactivationUrl);
            await sendSMTP({ to, subject, contentText: content });
            res.statusCode = 200; res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify({ ok: true }));
          }

          if (url.startsWith('/accounts/delete-account-immediately')) {
            const authHeader = req.headers['authorization'] || req.headers['Authorization'] || '';
            const token = typeof authHeader === 'string' && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : '';
            if (!token) {
              res.statusCode = 401; res.setHeader('Content-Type', 'application/json');
              return res.end(JSON.stringify({ ok: false, error: 'Missing access token' }));
            }
            const supabase = createClient(
              process.env.SUPABASE_URL as string,
              process.env.SUPABASE_SERVICE_ROLE_KEY as string
            );
            const { data: userData, error: getUserErr } = await supabase.auth.getUser(token);
            if (getUserErr || !userData?.user?.id) {
              res.statusCode = 401; res.setHeader('Content-Type', 'application/json');
              return res.end(JSON.stringify({ ok: false, error: 'Invalid token' }));
            }
            const uid = userData.user.id;
            const userEmail = userData.user.email || undefined;
            const tables = [
              'trip_vehicle_segments',
              'trip_vehicles',
              'stops',
              'trips',
              'vehicles',
            ];
            for (const t of tables) {
              try { await supabase.from(t).delete().eq('user_id', uid); } catch (_) {}
            }
            try { await supabase.from('profiles').delete().eq('id', uid); } catch (_) {}
            // Send confirmation email (HTML template) before deleting auth user
            if (userEmail) {
              try {
                const cwd = process.cwd();
                const htmlPath = path.resolve(cwd, 'supabase_templates', 'account_deleted_pt-br.html');
                const html = fs.readFileSync(htmlPath, 'utf-8');
                await sendSMTP({ to: userEmail, subject: 'Conta excluída – LogMyTravel', contentHtml: html });
              } catch (_) {
                const fallbackText = [
                  'Olá,',
                  '',
                  'Confirmamos que sua conta no LogMyTravel foi excluída com sucesso. Lamentamos sua saída e agradecemos por ter utilizado nossa plataforma.',
                  '',
                  'Atenciosamente,',
                  'Equipe LogMyTravel',
                ].join('\n');
                try { await sendSMTP({ to: userEmail, subject: 'Conta excluída – LogMyTravel', contentText: fallbackText }); } catch (_) {}
              }
            }
            const { error: delErr } = await supabase.auth.admin.deleteUser(uid);
            if (delErr) {
              res.statusCode = 500; res.setHeader('Content-Type', 'application/json');
              return res.end(JSON.stringify({ ok: false, error: delErr.message || 'Failed to delete user' }));
            }
            res.statusCode = 200; res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify({ ok: true }));
          }

          next();
        } catch (e: any) {
          res.statusCode = 500; res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify({ ok: false, error: e?.message || 'Failed' }));
        }
      };
      server.middlewares.use(handler);
    },
    configurePreviewServer(server: any) {
      // Reusa o mesmo middleware durante "vite preview"
      // Copia das funções internas do configureServer
      async function readJson(req: any): Promise<any> {
        return new Promise((resolve, reject) => {
          let data = '';
          req.on('data', (chunk: any) => (data += chunk));
          req.on('end', () => {
            try { resolve(data ? JSON.parse(data) : {}); } catch (e) { reject(e); }
          });
          req.on('error', reject);
        });
      }
      async function sendSMTP({ to, subject, contentText, contentHtml }: { to: string; subject: string; contentText?: string; contentHtml?: string; }) {
        const { host, port, user, pass, from } = getSmtpConfig();
        const transporter = nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } });
        await transporter.sendMail({ from, to, subject, text: contentText, html: contentHtml });
      }
      function buildDeactivationNotice(daysLeft: number, reactivationUrl: string) {
        const subject = daysLeft === 7
          ? 'Aviso: conta será excluída em 7 dias'
          : daysLeft === 2
            ? 'Aviso: conta será excluída em 2 dias'
            : `Aviso: conta será excluída em ${daysLeft} dias`;
        const content = [
          'Olá,',
          '',
          'Você agendou a desativação da sua conta no LogMyTravel.',
          'Sua conta está programada para exclusão definitiva após o período de carência.',
          '',
          `Faltam ${daysLeft} dias para a exclusão.`,
          '',
          `Se você deseja reativar sua conta, acesse: ${reactivationUrl}`,
          '',
          'Opcionalmente, você poderá solicitar um backup dos seus dados antes da exclusão (em breve).',
          '',
          'Se você não tomar nenhuma ação, seus dados serão removidos de forma permanente após o prazo.',
          '',
          'Atenciosamente,',
          'Equipe LogMyTravel',
        ].join('\n');
        return { subject, content };
      }
      server.middlewares.use(async (req: any, res: any, next: any) => {
        const url = req.url || '';
        if (!url.startsWith('/accounts/')) return next();
        if (req.method !== 'POST') return next();
        try {
          const body = await readJson(req);
          if (url.startsWith('/accounts/send-password-changed')) {
            const to = body?.to as string | undefined;
            if (!to) {
              res.statusCode = 400; res.setHeader('Content-Type', 'application/json');
              return res.end(JSON.stringify({ ok: false, error: "Missing 'to'" }));
            }
            const subject = 'Senha alterada – LogMyTravel';
            try {
              const cwd = process.cwd();
              const htmlPath = path.resolve(cwd, 'supabase_templates', 'password_changed_pt-br.html');
              const html = fs.readFileSync(htmlPath, 'utf-8');
              await sendSMTP({ to, subject, contentHtml: html });
            } catch (_) {
              const fallbackText = [
                'Olá,',
                '',
                'Sua senha no LogMyTravel foi alterada recentemente.',
                'Se não foi você, reconfigure sua senha imediatamente e entre em contato com o suporte.',
                '',
                'Atenciosamente,',
                'Equipe LogMyTravel',
              ].join('\n');
              await sendSMTP({ to, subject, contentText: fallbackText });
            }
            res.statusCode = 200; res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify({ ok: true }));
          }
          if (url.startsWith('/accounts/send-deactivation-email')) {
            const to = body?.to as string | undefined;
            const type = (body?.type as ('7_days' | '2_days') | undefined) || '7_days';
            const reactivationUrl = (body?.reactivationUrl as string | undefined) || 'https://logmytravel.app/reactivar';
            if (!to) {
              res.statusCode = 400; res.setHeader('Content-Type', 'application/json');
              return res.end(JSON.stringify({ ok: false, error: "Missing 'to'" }));
            }
            const daysLeft = type === '2_days' ? 2 : 7;
            const { subject, content } = buildDeactivationNotice(daysLeft, reactivationUrl);
            await sendSMTP({ to, subject, contentText: content });
            res.statusCode = 200; res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify({ ok: true }));
          }
          if (url.startsWith('/accounts/delete-account-immediately')) {
            const authHeader = req.headers['authorization'] || req.headers['Authorization'] || '';
            const token = typeof authHeader === 'string' && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : '';
            if (!token) {
              res.statusCode = 401; res.setHeader('Content-Type', 'application/json');
              return res.end(JSON.stringify({ ok: false, error: 'Missing access token' }));
            }
            const supabase = createClient(
              process.env.SUPABASE_URL as string,
              process.env.SUPABASE_SERVICE_ROLE_KEY as string
            );
            const { data: userData, error: getUserErr } = await supabase.auth.getUser(token);
            if (getUserErr || !userData?.user?.id) {
              res.statusCode = 401; res.setHeader('Content-Type', 'application/json');
              return res.end(JSON.stringify({ ok: false, error: 'Invalid token' }));
            }
            const uid = userData.user.id;
            const userEmail = userData.user.email || undefined;
            const tables = [
              'trip_vehicle_segments',
              'trip_vehicles',
              'stops',
              'trips',
              'vehicles',
            ];
            for (const t of tables) {
              try { await supabase.from(t).delete().eq('user_id', uid); } catch (_) {}
            }
            try { await supabase.from('profiles').delete().eq('id', uid); } catch (_) {}
            // Send confirmation email (HTML template) before deleting auth user
            if (userEmail) {
              try {
                const cwd = process.cwd();
                const htmlPath = path.resolve(cwd, 'supabase_templates', 'account_deleted_pt-br.html');
                const html = fs.readFileSync(htmlPath, 'utf-8');
                await sendSMTP({ to: userEmail, subject: 'Conta excluída – LogMyTravel', contentHtml: html });
              } catch (_) {
                const fallbackText = [
                  'Olá,',
                  '',
                  'Confirmamos que sua conta no LogMyTravel foi excluída com sucesso. Lamentamos sua saída e agradecemos por ter utilizado nossa plataforma.',
                  '',
                  'Atenciosamente,',
                  'Equipe LogMyTravel',
                ].join('\n');
                try { await sendSMTP({ to: userEmail, subject: 'Conta excluída – LogMyTravel', contentText: fallbackText }); } catch (_) {}
              }
            }
            const { error: delErr } = await supabase.auth.admin.deleteUser(uid);
            if (delErr) {
              res.statusCode = 500; res.setHeader('Content-Type', 'application/json');
              return res.end(JSON.stringify({ ok: false, error: delErr.message || 'Failed to delete user' }));
            }
            res.statusCode = 200; res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify({ ok: true }));
          }
          next();
        } catch (e: any) {
          res.statusCode = 500; res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify({ ok: false, error: e?.message || 'Failed' }));
        }
      });
    },
  };
}

  export default defineConfig({
    plugins: [react(), accountsEmailMiddlewarePlugin()],
    resolve: {
      extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
      alias: {
        'vaul@1.1.2': 'vaul',
        'sonner@2.0.3': 'sonner',
        'recharts@2.15.2': 'recharts',
        'react-resizable-panels@2.1.7': 'react-resizable-panels',
        'react-hook-form@7.55.0': 'react-hook-form',
        'react-day-picker@8.10.1': 'react-day-picker',
        'lucide-react@0.487.0': 'lucide-react',
        'input-otp@1.4.2': 'input-otp',
        // Removidos aliases figma:asset — use '@/assets/...'
        'embla-carousel-react@8.6.0': 'embla-carousel-react',
        'cmdk@1.1.1': 'cmdk',
        'class-variance-authority@0.7.1': 'class-variance-authority',
        '@supabase/supabase-js@2': '@supabase/supabase-js',
        '@radix-ui/react-tooltip@1.1.8': '@radix-ui/react-tooltip',
        '@radix-ui/react-toggle@1.1.2': '@radix-ui/react-toggle',
        '@radix-ui/react-toggle-group@1.1.2': '@radix-ui/react-toggle-group',
        '@radix-ui/react-tabs@1.1.3': '@radix-ui/react-tabs',
        '@radix-ui/react-switch@1.1.3': '@radix-ui/react-switch',
        '@radix-ui/react-slot@1.1.2': '@radix-ui/react-slot',
        '@radix-ui/react-slider@1.2.3': '@radix-ui/react-slider',
        '@radix-ui/react-separator@1.1.2': '@radix-ui/react-separator',
        '@radix-ui/react-select@2.1.6': '@radix-ui/react-select',
        '@radix-ui/react-scroll-area@1.2.3': '@radix-ui/react-scroll-area',
        '@radix-ui/react-radio-group@1.2.3': '@radix-ui/react-radio-group',
        '@radix-ui/react-progress@1.1.2': '@radix-ui/react-progress',
        '@radix-ui/react-popover@1.1.6': '@radix-ui/react-popover',
        '@radix-ui/react-navigation-menu@1.2.5': '@radix-ui/react-navigation-menu',
        '@radix-ui/react-menubar@1.1.6': '@radix-ui/react-menubar',
        '@radix-ui/react-label@2.1.2': '@radix-ui/react-label',
        '@radix-ui/react-hover-card@1.1.6': '@radix-ui/react-hover-card',
        '@radix-ui/react-dropdown-menu@2.1.6': '@radix-ui/react-dropdown-menu',
        '@radix-ui/react-dialog@1.1.6': '@radix-ui/react-dialog',
        '@radix-ui/react-context-menu@2.2.6': '@radix-ui/react-context-menu',
        '@radix-ui/react-collapsible@1.1.3': '@radix-ui/react-collapsible',
        '@radix-ui/react-checkbox@1.1.4': '@radix-ui/react-checkbox',
        '@radix-ui/react-avatar@1.1.3': '@radix-ui/react-avatar',
        '@radix-ui/react-aspect-ratio@1.1.2': '@radix-ui/react-aspect-ratio',
        '@radix-ui/react-alert-dialog@1.1.6': '@radix-ui/react-alert-dialog',
        '@radix-ui/react-accordion@1.2.3': '@radix-ui/react-accordion',
        '@jsr/supabase__supabase-js@2.49.8': '@jsr/supabase__supabase-js',
        '@': path.resolve(__dirname, './src'),
      },
    },
    build: {
      target: 'esnext',
      outDir: 'build',
    },
    server: {
      port: 3002,
      host: 'localhost',
      strictPort: true,
      open: false,
      hmr: {
        host: 'localhost',
        protocol: 'ws',
      },
    },
    preview: {
      port: 3002,
      host: 'localhost',
      strictPort: true,
      open: false,
    },
  });

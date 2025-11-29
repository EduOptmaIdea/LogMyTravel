// Simple SMTP helper for Deno using deno.land/x/smtp
// Reads SMTP config from environment variables
// Required envs: SMTP_HOST, SMTP_PORT, SMTP_USERNAME, SMTP_PASSWORD, SMTP_FROM
import { SmtpClient } from "https://deno.land/x/smtp/mod.ts";

export type SendEmailArgs = {
  to: string;
  subject: string;
  content?: string; // plain text
  html?: string;    // html content (if supported)
};

export async function sendSMTP({ to, subject, content, html }: SendEmailArgs): Promise<void> {
  const host = Deno.env.get("SMTP_HOST");
  const portStr = Deno.env.get("SMTP_PORT") ?? "465"; // default TLS port
  const username = Deno.env.get("SMTP_USERNAME");
  const password = Deno.env.get("SMTP_PASSWORD");
  const from = Deno.env.get("SMTP_FROM") ?? username ?? "";

  if (!host || !username || !password || !from) {
    throw new Error("SMTP config ausente: defina SMTP_HOST, SMTP_USERNAME, SMTP_PASSWORD e SMTP_FROM.");
  }
  const port = Number(portStr) || 465;

  const client = new SmtpClient();
  try {
    // Prefer TLS when using 465
    if (port === 465) {
      await client.connectTLS({ hostname: host, port, username, password });
    } else {
      await client.connect({ hostname: host, port, username, password });
    }

    // Some SMTP clients support HTML by setting content-type implicitly.
    // deno_smtp doesn't have a native HTML field; attempt to send HTML when provided.
    // If html is provided, prefer it; otherwise, use plain text content.
    await client.send({
      from,
      to,
      subject,
      content: html ?? content ?? "",
    });
  } finally {
    try { await client.close(); } catch (_) { /* ignore */ }
  }
}

export function buildDeactivationNotice({ daysLeft, reactivationUrl }: { daysLeft: number; reactivationUrl: string; }): { subject: string; content: string } {
  const subject = daysLeft === 7
    ? "Aviso: conta será excluída em 7 dias"
    : daysLeft === 2
      ? "Aviso: conta será excluída em 2 dias"
      : `Aviso: conta será excluída em ${daysLeft} dias`;

  const content = [
    `Olá,`,
    `\n`,
    `Você agendou a desativação da sua conta no LogMyTravel.`,
    `Sua conta está programada para exclusão definitiva após o período de carência.`,
    `\n`,
    `Faltam ${daysLeft} dias para a exclusão.`,
    `\n`,
    `Se você deseja reativar sua conta, acesse: ${reactivationUrl}`,
    `\n`,
    `Opcionalmente, você poderá solicitar um backup dos seus dados antes da exclusão (em breve).`,
    `\n`,
    `Se você não tomar nenhuma ação, seus dados serão removidos de forma permanente após o prazo.`,
    `\n`,
    `Atenciosamente,`,
    `Equipe LogMyTravel`,
  ].join("\n");

  return { subject, content };
}

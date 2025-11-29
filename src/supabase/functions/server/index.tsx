import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.ts";
import { sendSMTP, buildDeactivationNotice } from "./email.ts";
import { join } from "https://deno.land/std/path/mod.ts";
import { createClient } from "jsr:@supabase/supabase-js@2.49.8";
const app = new Hono();

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Health check endpoint
app.get("/make-server-6be74ba7/health", (c) => {
  return c.json({ status: "ok" });
});

// Stub: send deactivation email
app.post("/accounts/send-deactivation-email", async (c) => {
  try {
    const body = await c.req.json();
    const to = body?.to as string | undefined;
    const type = body?.type as ("7_days" | "2_days") | undefined;
    const reactivationUrl = body?.reactivationUrl as string | undefined;
    if (!to || typeof to !== "string") {
      return c.json({ ok: false, error: "Missing 'to'" }, 400);
    }
    const daysLeft = type === "2_days" ? 2 : 7;
    const reactivation = reactivationUrl || "https://logmytravel.app/reactivar";
    const { subject, content } = buildDeactivationNotice({ daysLeft, reactivationUrl: reactivation });

    await sendSMTP({ to, subject, content });
    return c.json({ ok: true });
  } catch (e: any) {
    console.error("[email] error:", e);
    return c.json({ ok: false, error: e?.message || "Failed" }, 500);
  }
});

// Send password changed confirmation email
app.post("/accounts/send-password-changed", async (c) => {
  try {
    const body = await c.req.json();
    const to = body?.to as string | undefined;
    if (!to || typeof to !== "string") {
      return c.json({ ok: false, error: "Missing 'to'" }, 400);
    }
    const subject = "Senha alterada – LogMyTravel";
    // Try to send HTML template; fallback to plaintext
    try {
      const htmlPath = join(Deno.cwd(), "supabase_templates", "password_changed_pt-br.html");
      const html = await Deno.readTextFile(htmlPath);
      await sendSMTP({ to, subject, html });
    } catch (_) {
      const content = [
        "Olá,",
        "",
        "Sua senha no LogMyTravel foi alterada recentemente.",
        "Se não foi você, reconfigure sua senha imediatamente e entre em contato com o suporte.",
        "",
        "Atenciosamente,",
        "Equipe LogMyTravel",
      ].join("\n");
      await sendSMTP({ to, subject, content });
    }
    return c.json({ ok: true });
  } catch (e: any) {
    console.error("[email] error:", e);
    return c.json({ ok: false, error: e?.message || "Failed" }, 500);
  }
});

// Immediate account deletion (requires Authorization: Bearer <access_token>)
app.post("/accounts/delete-account-immediately", async (c) => {
  try {
    const authHeader = c.req.header("Authorization") || c.req.header("authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.substring(7) : "";
    if (!token) {
      return c.json({ ok: false, error: "Missing access token" }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Validate token and identify user
    const { data: userData, error: getUserErr } = await supabase.auth.getUser(token);
    if (getUserErr || !userData?.user?.id) {
      return c.json({ ok: false, error: "Invalid token" }, 401);
    }
    const uid = userData.user.id;
    const userEmail = userData.user.email || undefined;

    // Purge application data referencing user_id
    const tables = [
      "trip_vehicle_segments",
      "trip_vehicles",
      "stops",
      "trips",
      "vehicles",
    ];
    for (const t of tables) {
      try { await supabase.from(t).delete().eq("user_id", uid); } catch (_) {}
    }
    try { await supabase.from("profiles").delete().eq("id", uid); } catch (_) {}

    // Optionally send confirmation email before deleting auth user
    if (userEmail) {
      try {
        const htmlPath = join(Deno.cwd(), "supabase_templates", "account_deleted_pt-br.html");
        const html = await Deno.readTextFile(htmlPath);
        await sendSMTP({ to: userEmail, subject: "Conta excluída – LogMyTravel", html });
      } catch (_) {
        try {
          const fallbackText = [
            "Olá,",
            "",
            "Confirmamos que sua conta no LogMyTravel foi excluída com sucesso. Lamentamos sua saída e agradecemos por ter utilizado nossa plataforma.",
            "",
            "Atenciosamente,",
            "Equipe LogMyTravel",
          ].join("\n");
          await sendSMTP({ to: userEmail, subject: "Conta excluída – LogMyTravel", text: fallbackText });
        } catch (_) {}
      }
    }

    // Delete Auth user (service role)
    const { error: delErr } = await supabase.auth.admin.deleteUser(uid);
    if (delErr) {
      return c.json({ ok: false, error: delErr.message || "Failed to delete user" }, 500);
    }

    return c.json({ ok: true });
  } catch (e: any) {
    console.error("[delete-account] error:", e);
    return c.json({ ok: false, error: e?.message || "Failed" }, 500);
  }
});

// Permite configurar a porta via variável de ambiente (default: 8787)
const port = Number(Deno.env.get('PORT') || '8787');
Deno.serve({ port }, app.fetch);

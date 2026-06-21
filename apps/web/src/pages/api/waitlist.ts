import type { APIRoute } from "astro";
import { json, runtimeEnvFromContext } from "../../lib/server/hydra.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type WaitlistBody = {
  email?: unknown;
  name?: unknown;
  source?: unknown;
  website?: unknown;
};

// Captures MCP + skills early-access signups. Storage is destination-agnostic:
// set WAITLIST_WEBHOOK_URL to any HTTPS endpoint (Zapier/Make catch hook,
// Formspree, Buttondown, a Google Apps Script, a custom worker, ...) and every
// signup is forwarded there as JSON. Signups are always logged as a fallback so
// one is never silently lost while a webhook is being connected.
export const POST: APIRoute = async (context) => {
  let body: WaitlistBody;
  try {
    body = (await context.request.json()) as WaitlistBody;
  } catch {
    return json(
      { ok: false, message: "Invalid request body." },
      { status: 400 }
    );
  }

  // Honeypot: a hidden field humans never see. If a bot fills it, accept the
  // request silently without recording anything.
  if (typeof body.website === "string" && body.website.trim() !== "") {
    return json({ ok: true, message: "You're on the list." });
  }

  const email =
    typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!EMAIL_RE.test(email) || email.length > 254) {
    return json(
      { ok: false, message: "Enter a valid email address." },
      { status: 400 }
    );
  }

  const name =
    typeof body.name === "string" ? body.name.trim().slice(0, 120) : "";
  const source =
    typeof body.source === "string" ? body.source.slice(0, 60) : "site";
  const signup = {
    email,
    name,
    source,
    list: "mcp-and-skills",
    at: new Date().toISOString(),
  };

  console.log("[waitlist] signup", JSON.stringify(signup));

  const env = runtimeEnvFromContext(context) as {
    WAITLIST_WEBHOOK_URL?: string;
  };
  if (env.WAITLIST_WEBHOOK_URL) {
    try {
      const forwarded = await fetch(env.WAITLIST_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(signup),
      });
      if (!forwarded.ok) {
        console.error("[waitlist] webhook responded", forwarded.status);
      }
    } catch (error) {
      // Never fail the signup on a webhook hiccup — it is captured in logs.
      console.error("[waitlist] webhook failed", error);
    }
  }

  return json({
    ok: true,
    message: "You're on the list. We'll email you when access opens.",
  });
};

/// <reference types="astro/client" />
/// <reference types="@cloudflare/workers-types" />

type MyndMemoryCloudflareEnv = {
  HYDRA_DB_API_KEY?: string;
  HYDRA_TENANT_ID?: string;
  HYDRA_SHARED_SUB_TENANT_ID?: string;
  MYND_MEMORY_DEMO_USER_ID?: string;
  AI_GATEWAY_API_KEY?: string;
  VERCEL_AI_GATEWAY_API_KEY?: string;
  OPENAI_API_KEY?: string;
  GEMINI_AI_STUDIO?: string;
  GOOGLE_GENERATIVE_AI_API_KEY?: string;
  MYND_MEMORY_INFERENCE_PROVIDER?:
    | "aiGateway"
    | "openAI"
    | "googleGenAI"
    | "local";
  MYND_MEMORY_GATEWAY_MODEL?: string;
  MYND_MEMORY_OPENAI_MODEL?: string;
  MYND_MEMORY_GEMINI_MODEL?: string;
  MYND_MEMORY_MAX_OUTPUT_TOKENS?: string;
  // Optional HTTPS endpoint that MCP + skills waitlist signups are forwarded to
  // (Zapier/Make catch hook, Formspree, Buttondown, a custom worker, ...).
  WAITLIST_WEBHOOK_URL?: string;
};

type Runtime = import("@astrojs/cloudflare").Runtime<MyndMemoryCloudflareEnv>;

declare namespace App {
  interface Locals extends Runtime {}
}

declare namespace Cloudflare {
  interface Env extends MyndMemoryCloudflareEnv {}
}

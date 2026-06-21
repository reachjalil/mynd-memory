import { readHydraConfig } from "@mynd-memory/hydradb";
import type { HydraRuntimeEnv } from "@mynd-memory/hydradb";
import type { InferenceRuntimeEnv } from "@mynd-memory/inference";
import type { APIContext } from "astro";
import { env } from "cloudflare:workers";

export type MyndMemoryRuntimeEnv = HydraRuntimeEnv & InferenceRuntimeEnv;

export const runtimeEnvFromContext = (context: APIContext) => {
  void context;
  return env as MyndMemoryRuntimeEnv;
};

export const hydraConfigFromContext = (context: APIContext) => {
  return readHydraConfig(runtimeEnvFromContext(context));
};

export const json = (body: unknown, init: ResponseInit = {}) =>
  new Response(JSON.stringify(body), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init.headers,
    },
  });

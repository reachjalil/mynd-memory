import type { HydraConfig, HydraRuntimeEnv } from "./types.js";

export const readHydraConfig = (
  env: HydraRuntimeEnv | undefined = undefined
): HydraConfig => ({
  apiKey: env?.HYDRA_DB_API_KEY ?? process.env.HYDRA_DB_API_KEY,
  baseUrl: "https://api.hydradb.com",
  tenantId:
    env?.HYDRA_TENANT_ID ?? process.env.HYDRA_TENANT_ID ?? "myndmemory_demo",
  sharedSubTenantId:
    env?.HYDRA_SHARED_SUB_TENANT_ID ??
    process.env.HYDRA_SHARED_SUB_TENANT_ID ??
    "demo_shared",
  demoUserId:
    env?.MYND_MEMORY_DEMO_USER_ID ??
    process.env.MYND_MEMORY_DEMO_USER_ID ??
    "demo_user",
});

export const assertHydraConfigured = (config: HydraConfig): string => {
  if (!config.apiKey) {
    throw new Error(
      "HYDRA_DB_API_KEY is not configured. Add it as a Cloudflare secret or local .dev.vars value."
    );
  }
  return config.apiKey;
};

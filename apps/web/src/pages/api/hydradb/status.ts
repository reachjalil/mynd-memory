import type { APIRoute } from "astro";
import {
  HydraMemoryRepository,
  getProfileSubTenantId,
} from "@mynd-memory/hydradb";
import { getAgentProfile } from "@mynd-memory/memory-core";
import { hydraConfigFromContext, json } from "../../../lib/server/hydra.js";

export const GET: APIRoute = async (context) => {
  const config = hydraConfigFromContext(context);
  const profile = getAgentProfile("one-month");
  const response = {
    configured: Boolean(config.apiKey),
    tenantId: config.tenantId,
    sharedSubTenantId: config.sharedSubTenantId,
    profileSubTenantId: getProfileSubTenantId(config, profile.id),
    status: "offline",
    message:
      "HYDRA_DB_API_KEY is not configured. The local simulator will run without remote persistence.",
    requestId: undefined as string | undefined,
  };

  if (!config.apiKey) return json(response);

  try {
    const repository = new HydraMemoryRepository(config);
    const status = await repository.client.tenantStatus();
    response.status = "ready";
    response.message =
      "HydraDB is configured. Seed the tenant before relying on remote recall.";
    response.requestId = status.meta?.request_id ?? status.meta?.requestId;
  } catch (error) {
    response.status = "error";
    response.message =
      error instanceof Error
        ? error.message
        : "HydraDB status check failed with an unknown error.";
  }

  return json(response);
};

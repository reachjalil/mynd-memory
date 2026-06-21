import type { APIRoute } from "astro";
import { HydraMemoryRepository } from "@mynd-memory/hydradb";
import { hydraConfigFromContext, json } from "../../../lib/server/hydra.js";

export const POST: APIRoute = async (context) => {
  const config = hydraConfigFromContext(context);
  const repository = new HydraMemoryRepository(config);

  try {
    const summary = await repository.seedDemo({
      waitForIndex: false,
      timeoutMs: 120_000,
    });
    return json(summary, { status: summary.configured ? 200 : 202 });
  } catch (error) {
    return json(
      {
        configured: Boolean(config.apiKey),
        tenantId: config.tenantId,
        message:
          error instanceof Error
            ? error.message
            : "HydraDB seed failed with an unknown error.",
      },
      { status: 500 }
    );
  }
};

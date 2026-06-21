import type { APIRoute } from "astro";
import { HydraMemoryRepository } from "@mynd-memory/hydradb";
import { getAgentProfile } from "@mynd-memory/memory-core";
import type { BrainParameters } from "@mynd-memory/memory-core";
import { hydraConfigFromContext, json } from "../../../lib/server/hydra.js";

type QueryBody = {
  profileId?: string;
  query?: string;
  parameters?: BrainParameters;
};

export const POST: APIRoute = async (context) => {
  const config = hydraConfigFromContext(context);
  if (!config.apiKey) {
    return json(
      {
        configured: false,
        contextText: "",
        chunks: [],
        message: "HYDRA_DB_API_KEY is not configured.",
      },
      { status: 202 }
    );
  }

  const body = (await context.request.json()) as QueryBody;
  const profile = getAgentProfile(body.profileId ?? "one-month");
  const query = body.query?.trim();
  if (!query) {
    return json({ message: "Missing query." }, { status: 400 });
  }

  try {
    const repository = new HydraMemoryRepository(config);
    const promptContext = await repository.queryForAgent({
      profile,
      query,
      parameters: body.parameters,
    });
    return json({ configured: true, ok: true, ...promptContext });
  } catch (error) {
    return json(
      {
        configured: true,
        ok: false,
        contextText: "",
        chunks: [],
        message:
          error instanceof Error
            ? error.message
            : "HydraDB query failed with an unknown error.",
      },
      { status: 500 }
    );
  }
};

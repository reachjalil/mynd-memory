import type { APIRoute } from "astro";
import { HydraMemoryRepository } from "@mynd-memory/hydradb";
import { getAgentProfile } from "@mynd-memory/memory-core";
import type { AgentMemory } from "@mynd-memory/memory-core";
import { hydraConfigFromContext, json } from "../../../lib/server/hydra.js";

type MemoryBody = {
  profileId?: string;
  memory?: AgentMemory;
};

export const POST: APIRoute = async (context) => {
  const config = hydraConfigFromContext(context);
  if (!config.apiKey) {
    return json(
      {
        configured: false,
        ids: [],
        message: "HYDRA_DB_API_KEY is not configured.",
      },
      { status: 202 }
    );
  }

  const body = (await context.request.json()) as MemoryBody;
  const profile = getAgentProfile(body.profileId ?? "one-month");
  if (!body.memory?.id || !body.memory.content) {
    return json({ message: "Missing memory payload." }, { status: 400 });
  }

  try {
    const repository = new HydraMemoryRepository(config);
    const result = await repository.ingestLiveMemory({
      profile,
      memory: body.memory,
    });
    return json({ configured: true, ...result });
  } catch (error) {
    return json(
      {
        configured: true,
        ids: [],
        message:
          error instanceof Error
            ? error.message
            : "HydraDB memory ingestion failed with an unknown error.",
      },
      { status: 500 }
    );
  }
};

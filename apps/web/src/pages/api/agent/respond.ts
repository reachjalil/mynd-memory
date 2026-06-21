import type { APIRoute } from "astro";
import { generateAgentResponseAbility } from "@mynd-memory/inference";
import { getAgentProfile } from "@mynd-memory/memory-core";
import type {
  AgentMemory,
  AgentProfile,
  BrainParameters,
} from "@mynd-memory/memory-core";
import { json, runtimeEnvFromContext } from "../../../lib/server/hydra.js";

type AgentContextChunk = {
  id: string;
  title: string;
  content: string;
  score: number;
  metadata: Record<string, unknown>;
};

type RespondBody = {
  profile?: AgentProfile;
  profileId?: string;
  query?: string;
  parameters?: BrainParameters;
  localMemories?: AgentMemory[];
  hydraChunks?: AgentContextChunk[];
  fallbackResponse?: string;
};

export const POST: APIRoute = async (context) => {
  const body = (await context.request.json()) as RespondBody;
  const query = body.query?.trim();
  if (!query) {
    return json({ message: "Missing query." }, { status: 400 });
  }

  const profile =
    body.profile ?? getAgentProfile(body.profileId ?? "new-agent");
  const fallbackResponse =
    body.fallbackResponse?.trim() ??
    "I need a message and memory context before I can answer.";

  try {
    const response = await generateAgentResponseAbility(
      {
        profile,
        query,
        parameters: body.parameters ?? profile.parameters,
        localMemories: body.localMemories ?? [],
        hydraChunks: body.hydraChunks ?? [],
        fallbackResponse,
      },
      runtimeEnvFromContext(context)
    );
    return json(response);
  } catch (error) {
    return json(
      {
        provider: "local",
        model: "local-fallback",
        text: fallbackResponse,
        usedModel: false,
        reason:
          error instanceof Error
            ? error.message
            : "Model response failed with an unknown error.",
      },
      { status: 202 }
    );
  }
};

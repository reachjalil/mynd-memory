import type { APIRoute } from "astro";
import { embedMemoriesAbility } from "@mynd-memory/inference";
import { json, runtimeEnvFromContext } from "../../../lib/server/hydra.js";

type RetrieveBody = {
  query?: string;
  memories?: Array<{ id?: string; content?: string }>;
};

export const POST: APIRoute = async (context) => {
  const body = (await context.request.json()) as RetrieveBody;
  const query = body.query?.trim();
  if (!query) {
    return json({ message: "Missing query." }, { status: 400 });
  }

  const memories = (body.memories ?? []).flatMap((memory) =>
    memory.id && memory.content
      ? [{ id: memory.id, content: memory.content }]
      : []
  );

  try {
    const output = await embedMemoriesAbility(
      { query, memories },
      runtimeEnvFromContext(context)
    );
    return json(output);
  } catch (error) {
    return json(
      {
        provider: "none",
        scores: [],
        reason:
          error instanceof Error
            ? error.message
            : "Nebius semantic re-rank failed.",
      },
      { status: 202 }
    );
  }
};

import { createOpenAI } from "@ai-sdk/openai";
import { embedMany } from "ai";
import {
  getNebiusApiKey,
  nebiusBaseUrl,
  resolveNebiusEmbedModel,
} from "./models.js";
import type { AbilityOptions, InferenceRuntimeEnv } from "./types.js";

export interface EmbedMemoryInput {
  id: string;
  content: string;
}

export interface EmbedMemoriesInput {
  query: string;
  memories: EmbedMemoryInput[];
}

export interface MemorySemanticScore {
  id: string;
  /** Cosine similarity of the memory to the query, clamped to 0..1. */
  similarity: number;
}

export interface EmbedMemoriesOutput {
  provider: "nebius" | "none";
  model?: string;
  scores: MemorySemanticScore[];
  reason: string;
}

/**
 * Cosine similarity of two equal-length vectors, mapped from [-1, 1] to [0, 1]
 * so it composes cleanly with the simulator's lexical 0..1 scores.
 */
export const cosineSimilarity = (a: number[], b: number[]): number => {
  if (a.length === 0 || a.length !== b.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i += 1) {
    const left = a[i] ?? 0;
    const right = b[i] ?? 0;
    dot += left * right;
    normA += left * left;
    normB += right * right;
  }
  if (normA === 0 || normB === 0) return 0;
  const cosine = dot / (Math.sqrt(normA) * Math.sqrt(normB));
  return Math.max(0, Math.min(1, (cosine + 1) / 2));
};

/**
 * Re-ranks candidate memories against a query using Nebius Token Factory
 * embeddings (OpenAI-compatible). Degrades gracefully to an empty result when
 * no Nebius key is configured so the caller can fall back to lexical scoring.
 */
export const embedMemoriesAbility = async (
  input: EmbedMemoriesInput,
  env: InferenceRuntimeEnv,
  options: AbilityOptions<EmbedMemoriesOutput> = {}
): Promise<EmbedMemoriesOutput> => {
  const apiKey = getNebiusApiKey(env);
  if (!apiKey || input.memories.length === 0) {
    const output: EmbedMemoriesOutput = {
      provider: "none",
      scores: [],
      reason: apiKey
        ? "No memories to embed."
        : "NEBIUS_API_KEY is not configured; semantic re-rank skipped.",
    };
    await options.onComplete?.(output);
    return output;
  }

  const model = resolveNebiusEmbedModel(env.NEBIUS_EMBED_MODEL);
  const provider = createOpenAI({ apiKey, baseURL: nebiusBaseUrl });
  const { embeddings } = await embedMany({
    model: provider.textEmbeddingModel(model),
    values: [input.query, ...input.memories.map((memory) => memory.content)],
    abortSignal: options.signal,
  });

  const [queryEmbedding, ...memoryEmbeddings] = embeddings;
  const scores: MemorySemanticScore[] = input.memories.map((memory, index) => ({
    id: memory.id,
    similarity:
      queryEmbedding && memoryEmbeddings[index]
        ? cosineSimilarity(queryEmbedding, memoryEmbeddings[index])
        : 0,
  }));

  const output: EmbedMemoriesOutput = {
    provider: "nebius",
    model,
    scores,
    reason: `Nebius ${model} embedded ${input.memories.length} memories.`,
  };
  await options.onComplete?.(output);
  return output;
};

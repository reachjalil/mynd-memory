import type { AgentMemory, BrainParameters } from "@mynd-memory/memory-core";
import type { AgentContextChunk, GenerateAgentResponseInput } from "./types.js";

const formatNumber = (value: number) => value.toFixed(2);

const parameterSummary = (parameters: BrainParameters) =>
  [
    `recency=${formatNumber(parameters.recencyBias)}`,
    `longTermRecall=${formatNumber(parameters.longTermRecallStrength)}`,
    `importanceThreshold=${formatNumber(parameters.importanceThreshold)}`,
    `emotionalSensitivity=${formatNumber(parameters.emotionalSensitivity)}`,
    `exploration=${formatNumber(parameters.exploration)}`,
  ].join(", ");

const formatMemory = (memory: AgentMemory, index: number) =>
  [
    `[M${index + 1}] ${memory.theme} (${memory.type}, ${memory.state}, importance ${formatNumber(memory.importance)})`,
    memory.content,
    `Why it matters: ${memory.explanation}`,
  ].join("\n");

const formatChunk = (chunk: AgentContextChunk, index: number) =>
  [
    `[H${index + 1}] ${chunk.title} (score ${formatNumber(chunk.score)})`,
    chunk.content,
  ].join("\n");

const listOrFallback = <Item>(
  items: Item[],
  render: (item: Item, index: number) => string,
  fallback: string
) => (items.length > 0 ? items.map(render).join("\n\n") : fallback);

export const buildAgentResponsePrompt = (input: GenerateAgentResponseInput) => {
  const system = [
    "You are the MyndMemory agent brain, a persistent-memory assistant.",
    "Answer as the selected agent, but stay grounded in the supplied memory context.",
    "For personal history, preferences, or remembered facts, use only Local Memory and HydraDB Context.",
    "Cite memory-backed claims inline with labels like [M1] or [H2].",
    "If the context is insufficient, say what is missing instead of inventing it.",
    "Keep the answer concise, practical, and grounded in memory.",
  ].join(" ");

  const user = [
    `Agent: ${input.profile.name}`,
    `Mood: ${input.profile.mood}`,
    `Personality: ${input.profile.personality}`,
    `Operating style: ${input.profile.operatingStyle}`,
    `Recall strategy: ${input.profile.recallStrategy}`,
    `Brain parameters: ${parameterSummary(input.parameters)}`,
    "",
    `User message: ${input.query}`,
    "",
    "Local Memory",
    listOrFallback(
      input.localMemories,
      formatMemory,
      "No local memory crossed the recall threshold."
    ),
    "",
    "HydraDB Context",
    listOrFallback(
      input.hydraChunks,
      formatChunk,
      "No HydraDB chunks were returned for this turn."
    ),
    "",
    "Fallback answer",
    input.fallbackResponse,
    "",
    "Write the final agent answer. Prefer concrete next actions and preserve the agent's voice.",
  ].join("\n");

  return { system, user };
};

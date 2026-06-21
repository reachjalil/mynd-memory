import type {
  AgentMemory,
  AgentProfile,
  BrainParameters,
} from "@mynd-memory/memory-core";

export const inferenceProviders = [
  "aiGateway",
  "openAI",
  "googleGenAI",
  "nebius",
  "local",
] as const;

export type InferenceProvider = (typeof inferenceProviders)[number];

export interface InferenceRuntimeEnv {
  AI_GATEWAY_API_KEY?: string;
  VERCEL_AI_GATEWAY_API_KEY?: string;
  OPENAI_API_KEY?: string;
  GEMINI_AI_STUDIO?: string;
  GOOGLE_GENERATIVE_AI_API_KEY?: string;
  NEBIUS_API_KEY?: string;
  MYND_MEMORY_INFERENCE_PROVIDER?: InferenceProvider;
  MYND_MEMORY_GATEWAY_MODEL?: string;
  MYND_MEMORY_OPENAI_MODEL?: string;
  MYND_MEMORY_GEMINI_MODEL?: string;
  MYND_MEMORY_NEBIUS_MODEL?: string;
  NEBIUS_EMBED_MODEL?: string;
  MYND_MEMORY_MAX_OUTPUT_TOKENS?: string;
}

export interface AbilityOptions<Output> {
  signal?: AbortSignal;
  onComplete?: (output: Output) => void | Promise<void>;
}

export interface AgentContextChunk {
  id: string;
  title: string;
  content: string;
  score: number;
  metadata: Record<string, unknown>;
}

export interface GenerateAgentResponseInput {
  profile: AgentProfile;
  query: string;
  parameters: BrainParameters;
  localMemories: AgentMemory[];
  hydraChunks: AgentContextChunk[];
  fallbackResponse: string;
}

export interface GenerateAgentResponseOutput {
  provider: InferenceProvider;
  model: string;
  text: string;
  usedModel: boolean;
  reason: string;
  finishReason?: string;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
  };
}

export interface InferenceProviderSelection {
  provider: InferenceProvider;
  model: string;
  apiKey?: string;
  reason: string;
}

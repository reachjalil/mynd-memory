import type {
  InferenceProvider,
  InferenceProviderSelection,
  InferenceRuntimeEnv,
} from "./types.js";

const openAiModels = [
  "gpt-5.2",
  "gpt-5.2-chat",
  "gpt-5-mini",
  "gpt-5-nano",
] as const;

const geminiModels = [
  "gemini-3-flash",
  "gemini-3.1-pro-preview",
  "gemini-3.1-flash-lite-preview",
] as const;

export type OpenAiModel = (typeof openAiModels)[number];
export type GeminiModel = (typeof geminiModels)[number];

export const defaultOpenAiModel: OpenAiModel = "gpt-5-mini";
export const defaultGeminiModel: GeminiModel = "gemini-3-flash";
export const defaultGatewayModel = "openai/gpt-5.5";

// Nebius Token Factory is OpenAI-compatible. Model ids are catalog-specific —
// override these via MYND_MEMORY_NEBIUS_MODEL / NEBIUS_EMBED_MODEL to match a
// model returned by `client.models.list()` for your account.
export const nebiusBaseUrl = "https://api.tokenfactory.nebius.com/v1/";
export const defaultNebiusModel = "meta-llama/Llama-3.3-70B-Instruct";
export const defaultNebiusEmbedModel = "Qwen/Qwen3-Embedding-8B";

const openAiAliases: Record<string, string> = {
  "gpt-5.2-chat": "gpt-5.2-chat-latest",
};

const isProvider = (value: string | undefined): value is InferenceProvider =>
  value === "aiGateway" ||
  value === "openAI" ||
  value === "googleGenAI" ||
  value === "nebius" ||
  value === "local";

const firstDefined = (...values: Array<string | undefined>) =>
  values.find((value) => value && value.trim().length > 0)?.trim();

export const resolveOpenAiModel = (value?: string) => {
  const model = firstDefined(value) ?? defaultOpenAiModel;
  return openAiAliases[model] ?? model;
};

export const resolveGeminiModel = (value?: string) =>
  firstDefined(value) ?? defaultGeminiModel;

export const resolveGatewayModel = (value?: string) =>
  firstDefined(value) ?? defaultGatewayModel;

export const getGatewayApiKey = (env: InferenceRuntimeEnv) =>
  firstDefined(env.AI_GATEWAY_API_KEY, env.VERCEL_AI_GATEWAY_API_KEY);

export const getGeminiApiKey = (env: InferenceRuntimeEnv) =>
  firstDefined(env.GEMINI_AI_STUDIO, env.GOOGLE_GENERATIVE_AI_API_KEY);

export const resolveNebiusModel = (value?: string) =>
  firstDefined(value) ?? defaultNebiusModel;

export const resolveNebiusEmbedModel = (value?: string) =>
  firstDefined(value) ?? defaultNebiusEmbedModel;

export const getNebiusApiKey = (env: InferenceRuntimeEnv) =>
  firstDefined(env.NEBIUS_API_KEY);

export const selectInferenceProvider = (
  env: InferenceRuntimeEnv
): InferenceProviderSelection => {
  const requestedProvider = isProvider(env.MYND_MEMORY_INFERENCE_PROVIDER)
    ? env.MYND_MEMORY_INFERENCE_PROVIDER
    : undefined;

  if (requestedProvider === "local") {
    return {
      provider: "local",
      model: "deterministic-simulator",
      reason: "Local deterministic mode was explicitly requested.",
    };
  }

  if (requestedProvider === "aiGateway") {
    const apiKey = getGatewayApiKey(env);
    if (apiKey) {
      return {
        provider: "aiGateway",
        model: resolveGatewayModel(env.MYND_MEMORY_GATEWAY_MODEL),
        apiKey,
        reason: "AI_GATEWAY_API_KEY selected the Vercel AI Gateway provider.",
      };
    }
    return {
      provider: "local",
      model: "deterministic-simulator",
      reason:
        "MYND_MEMORY_INFERENCE_PROVIDER requested AI Gateway, but AI_GATEWAY_API_KEY is not configured.",
    };
  }

  if (requestedProvider === "openAI") {
    if (env.OPENAI_API_KEY) {
      return {
        provider: "openAI",
        model: resolveOpenAiModel(env.MYND_MEMORY_OPENAI_MODEL),
        apiKey: env.OPENAI_API_KEY,
        reason: "OPENAI_API_KEY selected the OpenAI AI SDK provider.",
      };
    }
    return {
      provider: "local",
      model: "deterministic-simulator",
      reason:
        "MYND_MEMORY_INFERENCE_PROVIDER requested OpenAI, but OPENAI_API_KEY is not configured.",
    };
  }

  if (requestedProvider === "googleGenAI") {
    const apiKey = getGeminiApiKey(env);
    if (apiKey) {
      return {
        provider: "googleGenAI",
        model: resolveGeminiModel(env.MYND_MEMORY_GEMINI_MODEL),
        apiKey,
        reason:
          "Gemini API key selected the Google Generative AI SDK provider.",
      };
    }
    return {
      provider: "local",
      model: "deterministic-simulator",
      reason:
        "MYND_MEMORY_INFERENCE_PROVIDER requested Gemini, but no Gemini API key is configured.",
    };
  }

  if (requestedProvider === "nebius") {
    const apiKey = getNebiusApiKey(env);
    if (apiKey) {
      return {
        provider: "nebius",
        model: resolveNebiusModel(env.MYND_MEMORY_NEBIUS_MODEL),
        apiKey,
        reason: "NEBIUS_API_KEY selected the Nebius Token Factory provider.",
      };
    }
    return {
      provider: "local",
      model: "deterministic-simulator",
      reason:
        "MYND_MEMORY_INFERENCE_PROVIDER requested Nebius, but NEBIUS_API_KEY is not configured.",
    };
  }

  const gatewayApiKey = getGatewayApiKey(env);
  if (gatewayApiKey) {
    return {
      provider: "aiGateway",
      model: resolveGatewayModel(env.MYND_MEMORY_GATEWAY_MODEL),
      apiKey: gatewayApiKey,
      reason:
        "AI_GATEWAY_API_KEY is available, so Vercel AI Gateway is the default provider.",
    };
  }

  if (env.OPENAI_API_KEY) {
    return {
      provider: "openAI",
      model: resolveOpenAiModel(env.MYND_MEMORY_OPENAI_MODEL),
      apiKey: env.OPENAI_API_KEY,
      reason: "OPENAI_API_KEY is available, so OpenAI is the default provider.",
    };
  }

  const geminiApiKey = getGeminiApiKey(env);
  if (geminiApiKey) {
    return {
      provider: "googleGenAI",
      model: resolveGeminiModel(env.MYND_MEMORY_GEMINI_MODEL),
      apiKey: geminiApiKey,
      reason:
        "A Gemini API key is available, so Google Generative AI is the fallback provider.",
    };
  }

  const nebiusApiKey = getNebiusApiKey(env);
  if (nebiusApiKey) {
    return {
      provider: "nebius",
      model: resolveNebiusModel(env.MYND_MEMORY_NEBIUS_MODEL),
      apiKey: nebiusApiKey,
      reason:
        "NEBIUS_API_KEY is available, so Nebius Token Factory is the fallback provider.",
    };
  }

  return {
    provider: "local",
    model: "deterministic-simulator",
    reason: "No model provider key is configured.",
  };
};

export const maxOutputTokensFromEnv = (env: InferenceRuntimeEnv) => {
  const parsed = Number(env.MYND_MEMORY_MAX_OUTPUT_TOKENS);
  if (!Number.isFinite(parsed)) return 420;
  return Math.max(120, Math.min(900, Math.floor(parsed)));
};

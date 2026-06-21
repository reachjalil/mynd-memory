import { createGateway } from "@ai-sdk/gateway";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";
import {
  maxOutputTokensFromEnv,
  nebiusBaseUrl,
  selectInferenceProvider,
} from "./models.js";
import { buildAgentResponsePrompt } from "./prompt.js";
import type {
  AbilityOptions,
  GenerateAgentResponseInput,
  GenerateAgentResponseOutput,
  InferenceRuntimeEnv,
} from "./types.js";

type ProviderResult = Awaited<ReturnType<typeof generateText>>;

const usageFromResult = (result: ProviderResult) => ({
  inputTokens: result.usage?.inputTokens,
  outputTokens: result.usage?.outputTokens,
  totalTokens: result.usage?.totalTokens,
});

export const generateAgentResponseAbility = async (
  input: GenerateAgentResponseInput,
  env: InferenceRuntimeEnv,
  options: AbilityOptions<GenerateAgentResponseOutput> = {}
): Promise<GenerateAgentResponseOutput> => {
  const selection = selectInferenceProvider(env);
  if (selection.provider === "local" || !selection.apiKey) {
    const output: GenerateAgentResponseOutput = {
      provider: "local",
      model: selection.model,
      text: input.fallbackResponse,
      usedModel: false,
      reason: selection.reason,
    };
    await options.onComplete?.(output);
    return output;
  }

  const prompt = buildAgentResponsePrompt(input);
  const maxOutputTokens = maxOutputTokensFromEnv(env);
  const commonOptions = {
    system: prompt.system,
    prompt: prompt.user,
    maxOutputTokens,
    abortSignal: options.signal,
  };

  let result: ProviderResult;
  if (selection.provider === "aiGateway") {
    result = await generateText({
      ...commonOptions,
      model: createGateway({ apiKey: selection.apiKey })(selection.model),
    });
  } else if (selection.provider === "openAI") {
    result = await generateText({
      ...commonOptions,
      model: createOpenAI({ apiKey: selection.apiKey })(selection.model),
    });
  } else if (selection.provider === "nebius") {
    // Nebius Token Factory implements the Chat Completions API, not the
    // OpenAI Responses API that `createOpenAI(...)(model)` now defaults to, so
    // pin the chat model explicitly.
    result = await generateText({
      ...commonOptions,
      model: createOpenAI({
        apiKey: selection.apiKey,
        baseURL: nebiusBaseUrl,
      }).chat(selection.model),
    });
  } else {
    result = await generateText({
      ...commonOptions,
      model: createGoogleGenerativeAI({ apiKey: selection.apiKey })(
        selection.model
      ),
    });
  }

  const output: GenerateAgentResponseOutput = {
    provider: selection.provider,
    model: selection.model,
    text: result.text.trim() || input.fallbackResponse,
    usedModel: Boolean(result.text.trim()),
    reason: selection.reason,
    finishReason: result.finishReason,
    usage: usageFromResult(result),
  };
  await options.onComplete?.(output);
  return output;
};

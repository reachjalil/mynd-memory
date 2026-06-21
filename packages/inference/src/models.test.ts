import { describe, expect, it } from "vitest";
import { resolveOpenAiModel, selectInferenceProvider } from "./models.js";

describe("selectInferenceProvider", () => {
  it("prefers OpenAI when the OpenAI key is present", () => {
    expect(
      selectInferenceProvider({
        OPENAI_API_KEY: "openai-key",
        GEMINI_AI_STUDIO: "gemini-key",
      })
    ).toMatchObject({
      provider: "openAI",
      model: "gpt-5-mini",
    });
  });

  it("prefers AI Gateway over direct provider keys when available", () => {
    expect(
      selectInferenceProvider({
        AI_GATEWAY_API_KEY: "gateway-key",
        OPENAI_API_KEY: "openai-key",
      })
    ).toMatchObject({
      provider: "aiGateway",
      model: "openai/gpt-5.5",
    });
  });

  it("uses the latest GPT-5.5 gateway model when explicitly requested", () => {
    expect(
      selectInferenceProvider({
        MYND_MEMORY_INFERENCE_PROVIDER: "aiGateway",
        AI_GATEWAY_API_KEY: "gateway-key",
      })
    ).toMatchObject({
      provider: "aiGateway",
      model: "openai/gpt-5.5",
    });
  });

  it("uses Gemini when explicitly requested and configured", () => {
    expect(
      selectInferenceProvider({
        MYND_MEMORY_INFERENCE_PROVIDER: "googleGenAI",
        GEMINI_AI_STUDIO: "gemini-key",
      })
    ).toMatchObject({
      provider: "googleGenAI",
      model: "gemini-3-flash",
    });
  });

  it("uses Nebius when explicitly requested and configured", () => {
    expect(
      selectInferenceProvider({
        MYND_MEMORY_INFERENCE_PROVIDER: "nebius",
        NEBIUS_API_KEY: "nebius-key",
      })
    ).toMatchObject({
      provider: "nebius",
      model: "meta-llama/Llama-3.3-70B-Instruct",
    });
  });

  it("falls back to Nebius when only the Nebius key is present", () => {
    expect(
      selectInferenceProvider({
        NEBIUS_API_KEY: "nebius-key",
      })
    ).toMatchObject({
      provider: "nebius",
      model: "meta-llama/Llama-3.3-70B-Instruct",
    });
  });

  it("falls back locally when requested provider is missing its key", () => {
    expect(
      selectInferenceProvider({
        MYND_MEMORY_INFERENCE_PROVIDER: "openAI",
      })
    ).toMatchObject({
      provider: "local",
      model: "deterministic-simulator",
    });
  });

  it("resolves the Workspaces OpenAI chat alias", () => {
    expect(resolveOpenAiModel("gpt-5.2-chat")).toBe("gpt-5.2-chat-latest");
  });
});

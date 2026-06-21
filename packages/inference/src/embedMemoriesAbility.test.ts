import { describe, expect, it } from "vitest";
import {
  cosineSimilarity,
  embedMemoriesAbility,
} from "./embedMemoriesAbility.js";

describe("cosineSimilarity", () => {
  it("maps identical vectors to 1", () => {
    expect(cosineSimilarity([1, 2, 3], [1, 2, 3])).toBeCloseTo(1, 5);
  });

  it("maps opposite vectors to 0", () => {
    expect(cosineSimilarity([1, 0], [-1, 0])).toBeCloseTo(0, 5);
  });

  it("maps orthogonal vectors to 0.5", () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0.5, 5);
  });

  it("returns 0 for empty or mismatched vectors", () => {
    expect(cosineSimilarity([], [])).toBe(0);
    expect(cosineSimilarity([1, 2], [1])).toBe(0);
  });
});

describe("embedMemoriesAbility", () => {
  it("skips semantic re-rank when no Nebius key is configured", async () => {
    const output = await embedMemoriesAbility(
      {
        query: "weekly planning",
        memories: [{ id: "m1", content: "planning" }],
      },
      {}
    );
    expect(output).toMatchObject({ provider: "none", scores: [] });
    expect(output.reason).toContain("NEBIUS_API_KEY");
  });

  it("returns no scores when there are no candidate memories", async () => {
    const output = await embedMemoriesAbility(
      { query: "anything", memories: [] },
      { NEBIUS_API_KEY: "nebius-key" }
    );
    expect(output).toMatchObject({ provider: "none", scores: [] });
  });
});

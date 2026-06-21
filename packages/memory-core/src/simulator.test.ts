import { describe, expect, it } from "vitest";
import {
  advanceSimulatedTime,
  createSimulatorState,
  retrieveMemories,
  runAgentTurn,
  runConsolidationCycle,
} from "./index.js";

describe("MyndMemory simulator", () => {
  it("keeps the new agent generic when no memory crosses threshold", () => {
    const state = createSimulatorState("new-agent");
    const result = runAgentTurn(
      state,
      "What should I focus on for this hackathon demo?"
    );

    expect(result.retrieved).toHaveLength(0);
    expect(result.response.content).toContain("generic advice");
  });

  it("recalls month-old hackathon context for the one-month agent", () => {
    const state = createSimulatorState("one-month");
    const result = runAgentTurn(
      state,
      "What should I focus on for this hackathon demo?"
    );

    expect(result.retrieved.length).toBeGreaterThan(0);
    expect(result.retrieved.map((memory) => memory.theme)).toContain(
      "hackathon-demo"
    );
    expect(result.response.content).toContain("judge path");
  });

  it("consolidates repeated live signals into a long-term theme", () => {
    const first = runAgentTurn(
      createSimulatorState("new-agent"),
      "Remember that I want visual dashboards that expose internal state."
    ).state;
    const second = runAgentTurn(
      first,
      "I prefer tools that show real-time internal process state."
    ).state;
    const consolidated = runConsolidationCycle(second);

    expect(
      consolidated.memories.some(
        (memory) =>
          memory.state === "long_term" && memory.theme === "transparency"
      )
    ).toBe(true);
  });

  it("decays low-value short-term memories as simulated time advances", () => {
    const state = runAgentTurn(
      createSimulatorState("new-agent"),
      "Remember I might tweak the sidebar label later."
    ).state;
    const future = advanceSimulatedTime(state, 24 * 14);
    const { traces } = retrieveMemories(future, "sidebar label", 3);

    expect(traces[0]?.score ?? 1).toBeLessThan(0.8);
  });
});

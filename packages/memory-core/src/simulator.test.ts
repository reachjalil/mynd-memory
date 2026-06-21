import { describe, expect, it } from "vitest";
import {
  advanceSimulatedTime,
  createSimulatorState,
  retrieveMemories,
  runAgentTurn,
  runConsolidationCycle,
  updateBrainParameter,
} from "./index.js";

describe("MyndMemory simulator", () => {
  it("stays generic when the blank-slate agent has no matching memory", () => {
    const state = createSimulatorState("new-agent");
    const result = runAgentTurn(state, "What should I prioritize this week?");

    expect(result.retrieved).toHaveLength(0);
    expect(result.response.content).toContain("general starting point");
  });

  it("recalls seeded context for the memory-rich productivity copilot", () => {
    const state = createSimulatorState("one-month");
    const result = runAgentTurn(
      state,
      "Remind me of my goals and how I prefer my status updates."
    );

    expect(result.retrieved.length).toBeGreaterThan(0);
    expect(result.retrieved.map((memory) => memory.theme)).toEqual(
      expect.arrayContaining(["goals"])
    );
    expect(result.response.content).toContain("remember");
  });

  it("creates memories dynamically following the agent configuration", () => {
    const result = runAgentTurn(
      createSimulatorState("new-agent"),
      "I prefer concise bulleted summaries over long documents."
    );

    expect(result.created.length).toBe(1);
    expect(result.created[0]?.type).toBe("user_preference");
    expect(result.created[0]?.theme).toBe("preferences");
  });

  it("consolidates repeated live signals into a long-term theme", () => {
    const first = runAgentTurn(
      createSimulatorState("new-agent"),
      "I prefer concise bulleted summaries over long documents."
    ).state;
    const second = runAgentTurn(
      first,
      "I would rather get short, action-focused updates."
    ).state;
    const consolidated = runConsolidationCycle(second);

    expect(
      consolidated.memories.some(
        (memory) =>
          memory.state === "long_term" && memory.theme === "preferences"
      )
    ).toBe(true);
  });

  it("coalesces a slider drag into one event with unique ids", () => {
    // A drag fires updateBrainParameter once per step; the log should keep a
    // single, freshest entry per parameter rather than one per step.
    let state = createSimulatorState("new-agent");
    const baseEvents = state.events.length;
    for (const value of [6, 7, 8, 9, 8, 7, 6, 5, 4, 3]) {
      state = updateBrainParameter(state, "shortTermCapacity", value);
    }

    const capacityEvents = state.events.filter(
      (event) =>
        event.kind === "parameter_changed" &&
        event.title.includes("Short term capacity")
    );
    expect(capacityEvents).toHaveLength(1);
    expect(capacityEvents[0]?.detail).toContain("is now 3");
    expect(state.events.length).toBe(baseEvents + 1);
    expect(state.parameters.shortTermCapacity).toBe(3);

    // No duplicate React keys: every event id is unique even after re-tuning a
    // parameter that was edited before a different one.
    state = updateBrainParameter(state, "decaySpeed", 0.5);
    state = updateBrainParameter(state, "shortTermCapacity", 8);
    const ids = state.events.map((event) => event.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(
      state.events.filter(
        (event) =>
          event.kind === "parameter_changed" &&
          event.title.includes("Short term capacity")
      )
    ).toHaveLength(1);
  });

  it("decays low-value short-term memories as simulated time advances", () => {
    const state = runAgentTurn(
      createSimulatorState("new-agent"),
      "I prefer dark mode in the dashboard."
    ).state;
    const future = advanceSimulatedTime(state, 24 * 14);
    const { traces } = retrieveMemories(future, "dark mode", 3);

    expect(traces[0]?.score ?? 1).toBeLessThan(0.8);
  });
});

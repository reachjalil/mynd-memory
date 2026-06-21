import {
  agentProfiles,
  defaultBrainParameters,
  getAgentProfile,
} from "./seeds.js";
import type {
  AgentDraftInput,
  AgentMemory,
  AgentMessage,
  AgentMood,
  AgentProfile,
  AgentTurnResult,
  BrainParameters,
  MemoryEvent,
  MemoryEventKind,
  MemoryState,
  MemoryType,
  RetrievalTrace,
  SimulatorState,
} from "./types.js";

const STOP_WORDS = new Set([
  "the",
  "a",
  "an",
  "and",
  "or",
  "to",
  "for",
  "of",
  "in",
  "on",
  "with",
  "this",
  "that",
  "what",
  "should",
  "i",
  "we",
  "you",
  "it",
  "is",
  "are",
  "be",
  "my",
  "our",
  "as",
  "at",
  "from",
  "about",
]);

const tokenize = (value: string): string[] =>
  Array.from(
    new Set(
      value
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, " ")
        .split(/\s+/)
        .filter((token) => token.length > 2 && !STOP_WORDS.has(token))
    )
  );

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));

const nowIso = (): string => new Date().toISOString();

const slug = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);

const event = (
  kind: MemoryEventKind,
  title: string,
  detail: string,
  createdAt: string,
  options: Pick<MemoryEvent, "memoryId" | "score"> = {}
): MemoryEvent => ({
  id: `${createdAt}-${kind}-${slug(title)}-${
    options.memoryId ?? slug(detail).slice(0, 18)
  }`,
  kind,
  title,
  detail,
  createdAt,
  ...options,
});

const cloneMemory = (memory: AgentMemory): AgentMemory => ({
  ...memory,
  relatedMemoryIds: [...memory.relatedMemoryIds],
});

const cloneProfile = (profile: AgentProfile): AgentProfile => ({
  ...profile,
  parameters: { ...profile.parameters },
  seedMemories: profile.seedMemories.map(cloneMemory),
});

export const listAgentProfiles = (): AgentProfile[] =>
  agentProfiles.map(cloneProfile);

export const createSimulatorStateFromProfile = (
  inputProfile: AgentProfile,
  createdAt = "2026-06-21T09:00:00.000Z"
): SimulatorState => {
  const profile = cloneProfile(inputProfile);
  return {
    profile,
    memories: profile.seedMemories.map(cloneMemory),
    messages: [
      {
        id: `${profile.id}-system-intro`,
        role: "system",
        content:
          "MyndMemory is ready. Ask the same question across agents to see memory change behavior.",
        createdAt,
        retrievedMemoryIds: [],
        newMemoryIds: [],
        explanation: "Session initialized from the selected agent profile.",
      },
    ],
    events: [
      event(
        "agent_created",
        `${profile.name} loaded`,
        `${profile.seedMemories.length} seeded memories loaded into the memory runtime.`,
        createdAt
      ),
    ],
    simulatedNow: createdAt,
    parameters: { ...profile.parameters },
  };
};

export const createSimulatorState = (
  agentId = "new-agent",
  createdAt = "2026-06-21T09:00:00.000Z"
): SimulatorState =>
  createSimulatorStateFromProfile(getAgentProfile(agentId), createdAt);

const classifyTheme = (content: string): string => {
  const text = content.toLowerCase();
  if (
    /\b(prefer|like|love|hate|rather|favou?rite|style|tone|format|concise)\b/.test(
      text
    )
  ) {
    return "preferences";
  }
  if (
    /\b(goal|objective|target|aim|launch|ship|roadmap|deadline|quarter|close the)\b/.test(
      text
    )
  ) {
    return "goals";
  }
  if (
    /\b(task|to-?do|follow ?up|next step|remind|by (mon|tue|wed|thu|fri|sat|sun|tomorrow|next week|end of))\b/.test(
      text
    )
  ) {
    return "tasks";
  }
  if (
    /\b(decided|decision|chose|choosing|standardi[sz]e|agreed|go with|we will)\b/.test(
      text
    )
  ) {
    return "decisions";
  }
  if (
    /\b(frustrated|annoyed|angry|worried|anxious|stressed|excited|happy|relieved|overwhelmed)\b/.test(
      text
    )
  ) {
    return "wellbeing";
  }
  if (
    /\b(manager|team|customer|client|contact|stakeholder|colleague|partner|reports to|champion|buyer)\b/.test(
      text
    )
  ) {
    return "relationships";
  }
  if (
    /\b(schedule|time ?zone|calendar|meeting|morning|afternoon|availability|deep work)\b/.test(
      text
    )
  ) {
    return "schedule";
  }
  if (
    /\b(api|code|service|architecture|config|deploy|database|workaround|learned|fix|bug|endpoint)\b/.test(
      text
    )
  ) {
    return "knowledge";
  }
  return "general";
};

const classifyType = (content: string): MemoryType => {
  const text = content.toLowerCase();
  if (/\b(prefer|like|love|hate|rather|favou?rite|enjoy)\b/.test(text)) {
    return "user_preference";
  }
  if (
    /\b(decided|decision|chose|choosing|standardi[sz]e|agreed|go with)\b/.test(
      text
    )
  ) {
    return "decision";
  }
  if (
    /\b(goal|objective|target|aim to|want to|plan to|trying to|hoping to|close the)\b/.test(
      text
    )
  ) {
    return "goal";
  }
  if (
    /\b(task|to-?do|follow ?up|next step|need to|remind me|by (mon|tue|wed|thu|fri|tomorrow|next week))\b/.test(
      text
    )
  ) {
    return "task";
  }
  if (
    /\b(frustrated|annoyed|angry|worried|anxious|stressed|excited|happy|relieved|overwhelmed)\b/.test(
      text
    )
  ) {
    return "emotional_signal";
  }
  if (
    /\b(learned|figured out|turns out|workaround|the fix|the trick|realized)\b/.test(
      text
    )
  ) {
    return "skill_or_learning";
  }
  if (
    /\b(my (manager|team|boss|report)|reports to|colleague|customer|client|contact|stakeholder|champion|buyer)\b/.test(
      text
    )
  ) {
    return "relationship_context";
  }
  if (
    /\b(i am|i'm|my name|i work|i live|i use|we use|our team|on the)\b/.test(
      text
    )
  ) {
    return "user_fact";
  }
  return "conversation_episode";
};

const baseImportance = (
  content: string,
  type: MemoryType,
  parameters: BrainParameters
): number => {
  const text = content.toLowerCase();
  let score = 0.4;
  // Cognitive category weighting: durable kinds matter more.
  if (type === "goal") score += 0.2;
  if (type === "user_preference" || type === "decision") score += 0.18;
  if (type === "user_fact" || type === "relationship_context") score += 0.14;
  if (type === "skill_or_learning" || type === "repeated_pattern") {
    score += 0.12;
  }
  // Explicit salience markers.
  if (
    /\b(always|never|important|critical|must|key|prefer|remember|note that)\b/.test(
      text
    )
  ) {
    score += 0.12;
  }
  // Emotional content scaled by the agent's emotional sensitivity.
  if (
    /\b(frustrated|annoyed|angry|worried|anxious|stressed|excited|happy|relieved|overwhelmed)\b/.test(
      text
    )
  ) {
    score += 0.16 * parameters.emotionalSensitivity;
  }
  // Curious agents assign a little more value to marginal detail.
  score += parameters.exploration * 0.08;
  return clamp01(score);
};

const emotionalWeight = (content: string): number => {
  const text = content.toLowerCase();
  if (
    /\b(frustrated|annoyed|angry|furious|worried|anxious|stressed|overwhelmed)\b/.test(
      text
    )
  ) {
    return 0.82;
  }
  if (
    /\b(excited|love|thrilled|delighted|great|energized|happy|relieved)\b/.test(
      text
    )
  ) {
    return 0.72;
  }
  if (
    /\b(cautious|careful|nervous|risk|constraint|concerned|hesitant)\b/.test(
      text
    )
  ) {
    return 0.62;
  }
  return 0.24;
};

const moodBoost = (memory: AgentMemory, mood: AgentMood): number => {
  if (
    mood === "focused" &&
    ["goal", "task", "decision"].includes(memory.type)
  ) {
    return 0.13;
  }
  if (
    mood === "cautious" &&
    /(risk|constraint|frustrated|hide|warning)/i.test(memory.content)
  ) {
    return 0.16;
  }
  if (mood === "curious" && memory.theme !== "general") return 0.08;
  if (mood === "overloaded" && memory.importance < 0.7) return -0.18;
  if (mood === "reflective" && memory.state === "long_term") return 0.14;
  if (mood === "excited" && memory.emotionalWeight > 0.5) return 0.11;
  return 0;
};

const stateWeight = (
  state: MemoryState,
  parameters: BrainParameters
): number => {
  switch (state) {
    case "working":
      return 0.22;
    case "short_term":
      return 0.18;
    case "candidate":
      return 0.08;
    case "long_term":
      return 0.2 * parameters.longTermRecallStrength;
    case "dormant":
      return -0.12;
    case "decayed":
      return -0.42;
    case "superseded":
      return -0.5;
    case "observed":
      return 0.04;
  }
};

const scoreMemory = (
  memory: AgentMemory,
  query: string,
  state: SimulatorState
): RetrievalTrace => {
  const queryTokens = tokenize(query);
  const memoryTokens = new Set(tokenize(`${memory.content} ${memory.theme}`));
  const matchedTerms = queryTokens.filter((token) => memoryTokens.has(token));
  const lexical = queryTokens.length
    ? matchedTerms.length / Math.max(4, queryTokens.length)
    : 0;
  const ageHours =
    (new Date(state.simulatedNow).getTime() -
      new Date(memory.lastAccessedAt).getTime()) /
    3_600_000;
  const recency = Math.exp(
    -Math.max(0, ageHours) * 0.012 * state.parameters.decaySpeed
  );
  const score = clamp01(
    lexical * 0.45 +
      memory.importance * 0.25 +
      recency * state.parameters.recencyBias * 0.18 +
      memory.emotionalWeight * state.parameters.emotionalSensitivity * 0.12 +
      moodBoost(memory, state.profile.mood) * state.parameters.moodInfluence +
      stateWeight(memory.state, state.parameters) +
      state.parameters.exploration * (memory.theme === "general" ? 0.02 : 0.04)
  );
  const used =
    score >= state.parameters.importanceThreshold &&
    memory.state !== "decayed" &&
    memory.state !== "superseded";
  return {
    memoryId: memory.id,
    score,
    matchedTerms,
    used,
    reason: used
      ? `Score ${score.toFixed(2)} crossed threshold ${state.parameters.importanceThreshold.toFixed(2)}.`
      : `Score ${score.toFixed(2)} stayed below threshold ${state.parameters.importanceThreshold.toFixed(2)}.`,
  };
};

export const retrieveMemories = (
  state: SimulatorState,
  query: string,
  limit = 5
): { retrieved: AgentMemory[]; traces: RetrievalTrace[] } => {
  const traces = state.memories
    .map((memory) => scoreMemory(memory, query, state))
    .sort((left, right) => right.score - left.score);
  const retrieved = traces
    .filter((trace) => trace.used)
    .slice(0, limit)
    .map((trace) =>
      state.memories.find((memory) => memory.id === trace.memoryId)
    )
    .filter((memory): memory is AgentMemory => Boolean(memory));
  return { retrieved, traces };
};

const createObservedMemories = (
  state: SimulatorState,
  userMessage: string
): AgentMemory[] => {
  const type = classifyType(userMessage);
  const importance = baseImportance(userMessage, type, state.parameters);
  const emotional = emotionalWeight(userMessage);

  // Storage is driven entirely by the agent's configuration: its importance
  // threshold (loosened slightly for exploratory agents) plus an emotional
  // override scaled by how emotionally sensitive the agent is.
  const explorationAllowance = state.parameters.exploration * 0.12;
  const emotionalOverride =
    emotional * state.parameters.emotionalSensitivity >= 0.5;
  const shouldStore =
    importance >= state.parameters.importanceThreshold - explorationAllowance ||
    emotionalOverride;
  if (!shouldStore) return [];

  const theme = classifyTheme(userMessage);
  const idBase = `${state.profile.id}_${theme}_${state.memories.length + 1}`;
  // Durable agents (aggressive consolidation) hold new memories longer;
  // episodic chatter fades faster.
  const decayRate = clamp01(
    (type === "conversation_episode" ? 0.2 : 0.1) *
      (1.25 - state.parameters.consolidationAggressiveness * 0.5)
  );
  const primary: AgentMemory = {
    id: slug(idBase),
    agentId: state.profile.id,
    content: userMessage,
    type,
    sourceInteraction: "live_chat",
    createdAt: state.simulatedNow,
    simulatedTime: state.simulatedNow,
    lastAccessedAt: state.simulatedNow,
    importance,
    emotionalWeight: emotional,
    confidence: type === "conversation_episode" ? 0.68 : 0.82,
    theme,
    relatedMemoryIds: state.memories
      .filter((memory) => memory.theme === theme)
      .slice(0, 3)
      .map((memory) => memory.id),
    decayRate,
    accessCount: 0,
    state: "short_term",
    explanation: `Captured as a ${type.replaceAll(
      "_",
      " "
    )} because it crossed this agent's importance threshold (${state.parameters.importanceThreshold.toFixed(
      2
    )}).`,
  };
  return [primary];
};

const responseFor = (
  _state: SimulatorState,
  _userMessage: string,
  retrieved: AgentMemory[]
): string => {
  if (retrieved.length === 0) {
    return [
      "I do not have stored context about this yet, so here is a general starting point.",
      "Tell me your preferences, goals, or constraints and I will remember them for next time.",
    ].join("\n\n");
  }

  const themes = Array.from(new Set(retrieved.map((memory) => memory.theme)));
  const lines = retrieved.slice(0, 3).map((memory) => `- ${memory.content}`);

  return [
    "Based on what I remember about you:",
    lines.join("\n"),
    `I am weighting ${themes.join(
      ", "
    )} because those are already established in this agent's memory.`,
  ].join("\n\n");
};

export const runAgentTurn = (
  current: SimulatorState,
  userMessage: string
): AgentTurnResult => {
  const state: SimulatorState = {
    ...current,
    profile: cloneProfile(current.profile),
    parameters: { ...current.parameters },
    memories: current.memories.map(cloneMemory),
    messages: [...current.messages],
    events: [...current.events],
  };
  const createdAt = state.simulatedNow;
  const user: AgentMessage = {
    id: `${state.profile.id}-user-${state.messages.length + 1}`,
    role: "user",
    content: userMessage,
    createdAt,
    retrievedMemoryIds: [],
    newMemoryIds: [],
    explanation: "User message captured as the retrieval query.",
  };

  const { retrieved, traces } = retrieveMemories(state, userMessage);
  const created = createObservedMemories(state, userMessage);
  const retrievedIds = new Set(retrieved.map((memory) => memory.id));

  state.memories = state.memories.map((memory) => {
    if (!retrievedIds.has(memory.id)) return memory;
    return {
      ...memory,
      state: memory.state === "long_term" ? "long_term" : "working",
      lastAccessedAt: state.simulatedNow,
      accessCount: memory.accessCount + 1,
      importance: clamp01(memory.importance + 0.04),
    };
  });
  state.memories.push(...created);

  const response: AgentMessage = {
    id: `${state.profile.id}-agent-${state.messages.length + 2}`,
    role: "agent",
    content: responseFor(state, userMessage, retrieved),
    createdAt,
    retrievedMemoryIds: retrieved.map((memory) => memory.id),
    newMemoryIds: created.map((memory) => memory.id),
    explanation:
      retrieved.length > 0
        ? "The answer was personalized from ranked memories while preserving retrieval order."
        : "No memory crossed the current recall threshold, so the answer stayed generic.",
  };

  const ignored = traces.filter((trace) => !trace.used).slice(0, 5);
  const newEvents = [
    ...retrieved.map((memory) =>
      event(
        "memory_recalled",
        `Recalled ${memory.theme}`,
        memory.explanation,
        createdAt,
        {
          memoryId: memory.id,
          score: traces.find((trace) => trace.memoryId === memory.id)?.score,
        }
      )
    ),
    ...retrieved.map((memory) =>
      event(
        "memory_reinforced",
        `Reinforced ${memory.theme}`,
        `Access count is now ${memory.accessCount + 1}.`,
        createdAt,
        { memoryId: memory.id }
      )
    ),
    ...created.map((memory) =>
      event(
        "memory_encoded",
        `Encoded ${memory.type}`,
        memory.explanation,
        createdAt,
        { memoryId: memory.id, score: memory.importance }
      )
    ),
    ...ignored
      .slice(0, 2)
      .map((trace) =>
        event(
          "memory_ignored",
          "Ignored low-score memory",
          trace.reason,
          createdAt,
          { memoryId: trace.memoryId, score: trace.score }
        )
      ),
  ];

  state.messages = [...state.messages, user, response];
  state.events = [...newEvents, ...state.events].slice(0, 80);
  state.memories = enforceShortTermCapacity(state);

  return { state, retrieved, created, ignored, response };
};

const enforceShortTermCapacity = (state: SimulatorState): AgentMemory[] => {
  const shortTerm = state.memories
    .filter((memory) => memory.state === "short_term")
    .sort(
      (left, right) =>
        new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()
    );
  if (shortTerm.length <= state.parameters.shortTermCapacity) {
    return state.memories;
  }
  const overflow = new Set(
    shortTerm
      .slice(0, shortTerm.length - state.parameters.shortTermCapacity)
      .map((memory) => memory.id)
  );
  return state.memories.map((memory) =>
    overflow.has(memory.id) ? { ...memory, state: "candidate" } : memory
  );
};

export const advanceSimulatedTime = (
  current: SimulatorState,
  hours: number
): SimulatorState => {
  const nextTime = new Date(current.simulatedNow);
  nextTime.setUTCHours(nextTime.getUTCHours() + hours);
  const simulatedNow = nextTime.toISOString();
  const memories = current.memories.map((memory) => {
    const ageDays =
      (nextTime.getTime() - new Date(memory.lastAccessedAt).getTime()) /
      86_400_000;
    const longTermProtection = memory.state === "long_term" ? 0.35 : 1;
    const decay =
      ageDays *
      memory.decayRate *
      current.parameters.decaySpeed *
      longTermProtection;
    const importance = clamp01(memory.importance - decay);
    let state = memory.state;
    if (state === "short_term" && ageDays >= 1) state = "candidate";
    if (importance < 0.28 && state !== "long_term") state = "dormant";
    if (importance < 0.12) state = "decayed";
    return { ...memory, importance, state };
  });
  return {
    ...current,
    simulatedNow,
    memories,
    events: [
      event(
        "time_advanced",
        `Advanced ${hours} hour${hours === 1 ? "" : "s"}`,
        "Low-salience memories decayed while durable long-term memories resisted decay.",
        simulatedNow
      ),
      ...current.events,
    ].slice(0, 80),
  };
};

export const runConsolidationCycle = (
  current: SimulatorState
): SimulatorState => {
  const themeCounts = new Map<string, AgentMemory[]>();
  for (const memory of current.memories) {
    if (["decayed", "superseded", "dormant"].includes(memory.state)) continue;
    const group = themeCounts.get(memory.theme) ?? [];
    group.push(memory);
    themeCounts.set(memory.theme, group);
  }

  const consolidated: AgentMemory[] = [];
  const promoted = new Set<string>();
  for (const [theme, memories] of themeCounts) {
    const averageImportance =
      memories.reduce((sum, memory) => sum + memory.importance, 0) /
      memories.length;
    const shouldConsolidate =
      memories.length >= 2 &&
      averageImportance +
        current.parameters.consolidationAggressiveness * 0.2 >=
        current.parameters.importanceThreshold;
    if (!shouldConsolidate) continue;
    for (const memory of memories) promoted.add(memory.id);
    consolidated.push({
      id: `${current.profile.id}_consolidated_${slug(theme)}_${current.memories.length + consolidated.length + 1}`,
      agentId: current.profile.id,
      content: `Consolidated theme: ${theme}. ${memories
        .slice(0, 3)
        .map((memory) => memory.content)
        .join(" ")}`,
      type: "repeated_pattern",
      sourceInteraction: "consolidation_cycle",
      createdAt: current.simulatedNow,
      simulatedTime: current.simulatedNow,
      lastAccessedAt: current.simulatedNow,
      importance: clamp01(averageImportance + 0.08),
      emotionalWeight: clamp01(
        memories.reduce((sum, memory) => sum + memory.emotionalWeight, 0) /
          memories.length
      ),
      confidence: 0.84,
      theme,
      relatedMemoryIds: memories.map((memory) => memory.id),
      decayRate: 0.035,
      accessCount: 0,
      state: "long_term",
      explanation:
        "Created by consolidation because repeated related memories crossed the theme-linking threshold.",
    });
  }

  const memories: AgentMemory[] = current.memories.map((memory) => {
    if (!promoted.has(memory.id)) return memory;
    const nextState: MemoryState =
      memory.importance >= current.parameters.importanceThreshold
        ? "long_term"
        : "candidate";
    return {
      ...memory,
      state: nextState,
    };
  });

  return {
    ...current,
    memories: [...memories, ...consolidated],
    events: [
      ...consolidated.map((memory) =>
        event(
          "memory_consolidated",
          `Consolidated ${memory.theme}`,
          memory.explanation,
          current.simulatedNow,
          { memoryId: memory.id, score: memory.importance }
        )
      ),
      ...current.events,
    ].slice(0, 80),
  };
};

const humanizeParameter = (key: string): string => {
  const spaced = key.replace(/([a-z0-9])([A-Z])/g, "$1 $2").toLowerCase();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
};

export const updateBrainParameter = (
  current: SimulatorState,
  key: keyof BrainParameters,
  value: number
): SimulatorState => {
  const nextValue =
    key === "shortTermCapacity" ? Math.round(value) : Number(value.toFixed(2));
  const display =
    key === "shortTermCapacity" ? String(nextValue) : nextValue.toFixed(2);
  const label = humanizeParameter(key);
  // A slider drag emits one update per integer/step, so a single gesture used
  // to stack dozens of near-identical entries — and because the event id was
  // built from simulatedNow + a truncated detail slug, every edit to the same
  // parameter collided on its React key. Give the entry a stable id per
  // (simulated time, parameter) and drop any prior copy before prepending, so
  // consecutive edits coalesce into one fresh entry instead of flooding the log.
  const id = `${current.simulatedNow}-parameter_changed-${key}`;
  const changeEvent: MemoryEvent = {
    id,
    kind: "parameter_changed",
    title: `Tuned ${label}`,
    detail: `${label} is now ${display}. Future recall and storage decisions will use the new value.`,
    createdAt: current.simulatedNow,
  };
  const events = [
    changeEvent,
    ...current.events.filter((item) => item.id !== id),
  ].slice(0, 80);
  return {
    ...current,
    parameters: { ...current.parameters, [key]: nextValue },
    events,
  };
};

export const createCustomAgentProfile = (
  input: AgentDraftInput,
  createdAt = nowIso()
): AgentProfile => ({
  id: `custom_${slug(input.name || "agent")}_${createdAt.slice(11, 19).replace(/:/g, "")}`,
  name: input.name || "Custom Agent",
  description: input.description || "A custom agent profile.",
  memoryAge: input.memoryAge || "Freshly configured",
  personality: input.personality || "Configurable and transparent.",
  operatingStyle:
    "Uses the same MyndMemory lifecycle with user-selected mood and parameters.",
  mood: input.mood,
  recallStrategy: input.recallStrategy || "Balanced memory-aware retrieval.",
  parameters: { ...defaultBrainParameters },
  seedMemories: [],
});

export const addCustomProfileState = (
  profiles: AgentProfile[],
  profile: AgentProfile
): AgentProfile[] => [...profiles.map(cloneProfile), cloneProfile(profile)];

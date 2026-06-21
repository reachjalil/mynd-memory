import type { AgentMemory, AgentProfile, BrainParameters } from "./types.js";

export const defaultBrainParameters: BrainParameters = {
  shortTermCapacity: 5,
  decaySpeed: 0.35,
  importanceThreshold: 0.58,
  emotionalSensitivity: 0.48,
  recencyBias: 0.42,
  longTermRecallStrength: 0.76,
  consolidationAggressiveness: 0.5,
  themeLinkingSensitivity: 0.62,
  moodInfluence: 0.48,
  exploration: 0.28,
};

const seedBaseTime = "2026-06-21T09:00:00.000Z";

const memory = (
  input: Omit<
    AgentMemory,
    | "createdAt"
    | "simulatedTime"
    | "lastAccessedAt"
    | "relatedMemoryIds"
    | "accessCount"
    | "sourceInteraction"
  > & {
    daysAgo: number;
    relatedMemoryIds?: string[];
    accessCount?: number;
    sourceInteraction?: string;
  }
): AgentMemory => {
  const created = new Date(seedBaseTime);
  created.setUTCDate(created.getUTCDate() - input.daysAgo);
  return {
    ...input,
    createdAt: created.toISOString(),
    simulatedTime: created.toISOString(),
    lastAccessedAt: created.toISOString(),
    relatedMemoryIds: input.relatedMemoryIds ?? [],
    accessCount: input.accessCount ?? 1,
    sourceInteraction: input.sourceInteraction ?? "seeded_demo_history",
  };
};

const monthAgentMemories: AgentMemory[] = [
  memory({
    id: "one_month_pref_concise",
    agentId: "one-month",
    content:
      "The user prefers concise answers with concrete next actions instead of long theory.",
    type: "user_preference",
    daysAgo: 27,
    importance: 0.88,
    emotionalWeight: 0.22,
    confidence: 0.94,
    theme: "answer-style",
    decayRate: 0.05,
    state: "long_term",
    explanation:
      "Repeated feedback favored short, practical answers during planning sessions.",
  }),
  memory({
    id: "one_month_goal_hackathon",
    agentId: "one-month",
    content:
      "The user is preparing a hackathon demo about AI agents with persistent, inspectable memory.",
    type: "goal",
    daysAgo: 22,
    importance: 0.95,
    emotionalWeight: 0.5,
    confidence: 0.96,
    theme: "hackathon-demo",
    decayRate: 0.04,
    accessCount: 4,
    state: "long_term",
    explanation:
      "This goal has been recalled across several planning and implementation turns.",
  }),
  memory({
    id: "one_month_visual_dashboard",
    agentId: "one-month",
    content:
      "The user likes visual dashboards that expose real-time internal process state.",
    type: "user_preference",
    daysAgo: 18,
    importance: 0.86,
    emotionalWeight: 0.28,
    confidence: 0.91,
    theme: "transparency",
    decayRate: 0.05,
    state: "long_term",
    explanation:
      "Dashboard visibility was reinforced whenever the user compared demos.",
  }),
  memory({
    id: "one_month_frustration_hidden_tools",
    agentId: "one-month",
    content:
      "The user gets frustrated when tools hide what they are doing or skip explainability.",
    type: "emotional_signal",
    daysAgo: 14,
    importance: 0.82,
    emotionalWeight: 0.84,
    confidence: 0.88,
    theme: "transparency",
    decayRate: 0.08,
    state: "long_term",
    explanation:
      "Emotionally weighted feedback makes hidden internal state especially salient.",
  }),
  memory({
    id: "one_month_mvp_bias",
    agentId: "one-month",
    content:
      "The user prefers practical MVPs over abstract research demos for judging contexts.",
    type: "decision",
    daysAgo: 12,
    importance: 0.82,
    emotionalWeight: 0.32,
    confidence: 0.9,
    theme: "execution-style",
    decayRate: 0.05,
    state: "long_term",
    explanation:
      "This preference changes how advice should be framed during hackathon work.",
  }),
  memory({
    id: "one_month_pattern_memory",
    agentId: "one-month",
    content:
      "A repeated theme is that the demo should show memory forming, being recalled, and changing behavior in under two minutes.",
    type: "repeated_pattern",
    daysAgo: 9,
    importance: 0.91,
    emotionalWeight: 0.36,
    confidence: 0.93,
    theme: "hackathon-demo",
    decayRate: 0.04,
    accessCount: 5,
    state: "long_term",
    explanation:
      "Multiple related memories consolidated into a thematic long-term memory.",
  }),
];

export const agentProfiles: AgentProfile[] = [
  {
    id: "new-agent",
    name: "Brand-New Agent",
    description:
      "A clean baseline with almost no history. It can reason, but it has not learned the user's habits yet.",
    memoryAge: "0 days",
    personality: "Neutral, helpful, and context-light.",
    operatingStyle:
      "Answers from the current message only unless new memories form.",
    mood: "calm",
    recallStrategy: "Short-term buffer first, no seeded long-term context.",
    parameters: {
      ...defaultBrainParameters,
      longTermRecallStrength: 0.18,
      consolidationAggressiveness: 0.22,
    },
    seedMemories: [],
  },
  {
    id: "one-month",
    name: "One-Month Agent",
    description:
      "A memory-rich agent with a simulated month of planning history with the user.",
    memoryAge: "31 simulated days",
    personality: "Practical, transparent, and tuned for hackathon execution.",
    operatingStyle:
      "Personalizes advice by combining goals, preferences, emotional signals, and repeated themes.",
    mood: "focused",
    recallStrategy:
      "Use `type=all` style retrieval: shared demo knowledge plus user memories.",
    parameters: {
      ...defaultBrainParameters,
      recencyBias: 0.35,
      longTermRecallStrength: 0.92,
      consolidationAggressiveness: 0.68,
      themeLinkingSensitivity: 0.74,
    },
    seedMemories: monthAgentMemories,
  },
  {
    id: "focused",
    name: "Focused Agent",
    description:
      "Prioritizes recent goals and task commitments, sometimes ignoring weaker side context.",
    memoryAge: "10 simulated days",
    personality: "Direct, goal-seeking, and low-distraction.",
    operatingStyle: "Recent working memories outrank older long-term context.",
    mood: "focused",
    recallStrategy: "High recency bias and strong goal matching.",
    parameters: {
      ...defaultBrainParameters,
      shortTermCapacity: 4,
      recencyBias: 0.82,
      exploration: 0.12,
      moodInfluence: 0.72,
    },
    seedMemories: monthAgentMemories
      .filter((item) =>
        ["hackathon-demo", "execution-style"].includes(item.theme)
      )
      .map((item) => ({ ...item, agentId: "focused" })),
  },
  {
    id: "reflective",
    name: "Reflective Agent",
    description:
      "Aggressively consolidates repeated details into durable themes and relationship context.",
    memoryAge: "45 simulated days",
    personality: "Pattern-oriented, careful, and synthesis-heavy.",
    operatingStyle: "Turns repeated signals into long-term thematic memories.",
    mood: "reflective",
    recallStrategy: "Long-term memory and theme links carry more weight.",
    parameters: {
      ...defaultBrainParameters,
      longTermRecallStrength: 0.98,
      consolidationAggressiveness: 0.92,
      themeLinkingSensitivity: 0.9,
      exploration: 0.42,
    },
    seedMemories: monthAgentMemories.map((item) => ({
      ...item,
      agentId: "reflective",
      state: "long_term",
      importance: Math.min(1, item.importance + 0.05),
    })),
  },
  {
    id: "moody",
    name: "Moody Agent",
    description:
      "Shows how mood can bias what an agent notices, stores, and recalls.",
    memoryAge: "18 simulated days",
    personality: "Expressive and context-sensitive.",
    operatingStyle:
      "Emotional memories and mood-aligned memories get extra recall weight.",
    mood: "cautious",
    recallStrategy:
      "Cautious mood boosts warnings, constraints, and frustration signals.",
    parameters: {
      ...defaultBrainParameters,
      emotionalSensitivity: 0.86,
      moodInfluence: 0.9,
      decaySpeed: 0.48,
      exploration: 0.34,
    },
    seedMemories: monthAgentMemories.map((item) => ({
      ...item,
      agentId: "moody",
      emotionalWeight: Math.min(1, item.emotionalWeight + 0.14),
    })),
  },
];

export const getAgentProfile = (agentId: string): AgentProfile => {
  const profile = agentProfiles.find((item) => item.id === agentId);
  if (!profile) return agentProfiles[0]!;
  return profile;
};

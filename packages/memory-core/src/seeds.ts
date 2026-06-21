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
    sourceInteraction: input.sourceInteraction ?? "seeded_history",
  };
};

// Personal productivity copilot for a product manager (id: one-month).
const productivityMemories: AgentMemory[] = [
  memory({
    id: "pc_pref_concise",
    agentId: "one-month",
    content:
      "Prefers concise, bulleted updates with clear next actions over long write-ups.",
    type: "user_preference",
    daysAgo: 27,
    importance: 0.88,
    emotionalWeight: 0.2,
    confidence: 0.94,
    theme: "preferences",
    decayRate: 0.05,
    state: "long_term",
    explanation:
      "Repeated feedback favored short, actionable summaries during planning sessions.",
  }),
  memory({
    id: "pc_fact_schedule",
    agentId: "one-month",
    content:
      "Works in Pacific time and protects 9-11am every day for deep work with no meetings.",
    type: "user_fact",
    daysAgo: 24,
    importance: 0.8,
    emotionalWeight: 0.18,
    confidence: 0.9,
    theme: "schedule",
    decayRate: 0.05,
    state: "long_term",
    explanation: "A stable fact about how the user structures their day.",
  }),
  memory({
    id: "pc_goal_roadmap",
    agentId: "one-month",
    content:
      "Wants to ship the Q3 product roadmap and cut recurring meeting load by about 30%.",
    type: "goal",
    daysAgo: 21,
    importance: 0.95,
    emotionalWeight: 0.45,
    confidence: 0.96,
    theme: "goals",
    decayRate: 0.04,
    accessCount: 4,
    state: "long_term",
    explanation:
      "This goal has been recalled across several planning and prioritization turns.",
  }),
  memory({
    id: "pc_task_friday_summary",
    agentId: "one-month",
    content:
      "Expects a status summary drafted every Friday afternoon for the leadership sync.",
    type: "task",
    daysAgo: 16,
    importance: 0.78,
    emotionalWeight: 0.2,
    confidence: 0.88,
    theme: "tasks",
    decayRate: 0.07,
    state: "long_term",
    explanation: "A recurring commitment the assistant is expected to prepare.",
  }),
  memory({
    id: "pc_decision_linear",
    agentId: "one-month",
    content:
      "Decided to standardize the team on Linear for issue tracking instead of spreadsheets.",
    type: "decision",
    daysAgo: 12,
    importance: 0.82,
    emotionalWeight: 0.25,
    confidence: 0.9,
    theme: "decisions",
    decayRate: 0.05,
    state: "long_term",
    explanation:
      "A settled decision that should shape future tooling suggestions.",
  }),
  memory({
    id: "pc_emotion_scattered",
    agentId: "one-month",
    content:
      "Gets stressed when project context is scattered across too many disconnected tools.",
    type: "emotional_signal",
    daysAgo: 10,
    importance: 0.8,
    emotionalWeight: 0.82,
    confidence: 0.86,
    theme: "wellbeing",
    decayRate: 0.08,
    state: "long_term",
    explanation:
      "Emotionally weighted signal that makes consolidation especially valuable here.",
  }),
  memory({
    id: "pc_relationship_vp",
    agentId: "one-month",
    content:
      "Reports to a VP who expects data-backed proposals rather than opinions.",
    type: "relationship_context",
    daysAgo: 8,
    importance: 0.84,
    emotionalWeight: 0.3,
    confidence: 0.9,
    theme: "relationships",
    decayRate: 0.05,
    state: "long_term",
    explanation: "Relationship context that shapes how recommendations land.",
  }),
  memory({
    id: "pc_pattern_action_items",
    agentId: "one-month",
    content:
      "Repeatedly asks to turn long threads and notes into prioritized action items.",
    type: "repeated_pattern",
    daysAgo: 6,
    importance: 0.91,
    emotionalWeight: 0.34,
    confidence: 0.93,
    theme: "preferences",
    decayRate: 0.04,
    accessCount: 5,
    state: "long_term",
    explanation:
      "Several related requests consolidated into a durable working pattern.",
  }),
];

// B2B sales / account executive agent tracking one deal (id: focused).
const salesMemories: AgentMemory[] = [
  memory({
    id: "sa_fact_evaluation",
    agentId: "focused",
    content:
      "Northwind Logistics is evaluating us against two competitors for a 5,000-seat rollout.",
    type: "user_fact",
    daysAgo: 38,
    importance: 0.9,
    emotionalWeight: 0.3,
    confidence: 0.94,
    theme: "account",
    decayRate: 0.05,
    state: "long_term",
    explanation: "Core account fact framing the whole opportunity.",
  }),
  memory({
    id: "sa_goal_close",
    agentId: "focused",
    content:
      "Goal is to close the Northwind deal before the end of the quarter.",
    type: "goal",
    daysAgo: 30,
    importance: 0.95,
    emotionalWeight: 0.5,
    confidence: 0.95,
    theme: "goals",
    decayRate: 0.04,
    accessCount: 4,
    state: "long_term",
    explanation: "The driving objective recalled on most account turns.",
  }),
  memory({
    id: "sa_decision_security_story",
    agentId: "focused",
    content:
      "Decided to lead with the security and compliance story for their CISO.",
    type: "decision",
    daysAgo: 22,
    importance: 0.84,
    emotionalWeight: 0.3,
    confidence: 0.9,
    theme: "decisions",
    decayRate: 0.05,
    state: "long_term",
    explanation: "Strategic decision guiding messaging on this deal.",
  }),
  memory({
    id: "sa_relationship_champion",
    agentId: "focused",
    content:
      "The champion is Priya, Director of Ops; the economic buyer is the CFO.",
    type: "relationship_context",
    daysAgo: 18,
    importance: 0.88,
    emotionalWeight: 0.35,
    confidence: 0.92,
    theme: "relationships",
    decayRate: 0.05,
    state: "long_term",
    explanation: "Map of who matters in the buying committee.",
  }),
  memory({
    id: "sa_emotion_champion_excited",
    agentId: "focused",
    content: "The champion is genuinely excited about the analytics dashboard.",
    type: "emotional_signal",
    daysAgo: 12,
    importance: 0.76,
    emotionalWeight: 0.72,
    confidence: 0.85,
    theme: "wellbeing",
    decayRate: 0.07,
    state: "long_term",
    explanation: "Positive emotional signal to lean into during the close.",
  }),
  memory({
    id: "sa_task_send_collateral",
    agentId: "focused",
    content:
      "Send the SOC 2 report and the ROI model right after Thursday's technical demo.",
    type: "task",
    daysAgo: 8,
    importance: 0.8,
    emotionalWeight: 0.25,
    confidence: 0.88,
    theme: "tasks",
    decayRate: 0.08,
    state: "long_term",
    explanation: "A concrete near-term commitment tied to the deal timeline.",
  }),
  memory({
    id: "sa_pattern_pricing_objection",
    agentId: "focused",
    content:
      "Pricing keeps surfacing as the main objection from the buying committee.",
    type: "repeated_pattern",
    daysAgo: 5,
    importance: 0.86,
    emotionalWeight: 0.4,
    confidence: 0.9,
    theme: "objections",
    decayRate: 0.04,
    accessCount: 4,
    state: "long_term",
    explanation: "A recurring objection consolidated from multiple calls.",
  }),
];

// Engineering copilot for a codebase (id: reflective).
const codingMemories: AgentMemory[] = [
  memory({
    id: "ec_decision_strict_ts",
    agentId: "reflective",
    content:
      "The team standardized on TypeScript strict mode with Biome for lint and formatting.",
    type: "decision",
    daysAgo: 55,
    importance: 0.86,
    emotionalWeight: 0.2,
    confidence: 0.95,
    theme: "conventions",
    decayRate: 0.04,
    state: "long_term",
    explanation:
      "A durable engineering convention that constrains suggestions.",
  }),
  memory({
    id: "ec_fact_monorepo",
    agentId: "reflective",
    content:
      "The product is a pnpm + Turborepo monorepo deployed on Cloudflare Workers.",
    type: "user_fact",
    daysAgo: 48,
    importance: 0.82,
    emotionalWeight: 0.18,
    confidence: 0.93,
    theme: "architecture",
    decayRate: 0.05,
    state: "long_term",
    explanation: "Foundational architecture fact about the codebase.",
  }),
  memory({
    id: "ec_skill_auth_jwt",
    agentId: "reflective",
    content:
      "Learned the auth service issues short-lived JWTs refreshed by a background worker.",
    type: "skill_or_learning",
    daysAgo: 40,
    importance: 0.8,
    emotionalWeight: 0.22,
    confidence: 0.9,
    theme: "architecture",
    decayRate: 0.06,
    state: "long_term",
    explanation: "A learned implementation detail useful for future changes.",
  }),
  memory({
    id: "ec_pref_small_prs",
    agentId: "reflective",
    content:
      "Prefers small, well-tested PRs over large refactors, and wants trade-offs explained first.",
    type: "user_preference",
    daysAgo: 30,
    importance: 0.88,
    emotionalWeight: 0.24,
    confidence: 0.93,
    theme: "workflow",
    decayRate: 0.05,
    accessCount: 4,
    state: "long_term",
    explanation: "A strong working preference recalled on most coding turns.",
  }),
  memory({
    id: "ec_task_trpc_migration",
    agentId: "reflective",
    content:
      "Open task: migrate the legacy REST endpoints onto the new typed router.",
    type: "task",
    daysAgo: 18,
    importance: 0.78,
    emotionalWeight: 0.2,
    confidence: 0.86,
    theme: "tasks",
    decayRate: 0.08,
    state: "long_term",
    explanation: "An in-flight migration task spanning several sessions.",
  }),
  memory({
    id: "ec_pattern_tradeoffs",
    agentId: "reflective",
    content:
      "Recurring request: weigh library trade-offs before recommending a dependency.",
    type: "repeated_pattern",
    daysAgo: 10,
    importance: 0.9,
    emotionalWeight: 0.3,
    confidence: 0.92,
    theme: "workflow",
    decayRate: 0.04,
    accessCount: 5,
    state: "long_term",
    explanation: "A consolidated habit that shapes how options are presented.",
  }),
  memory({
    id: "ec_episode_flaky_test",
    agentId: "reflective",
    content:
      "Last session traced a flaky test to a shared fixture mutated across cases.",
    type: "conversation_episode",
    daysAgo: 6,
    importance: 0.7,
    emotionalWeight: 0.3,
    confidence: 0.8,
    theme: "knowledge",
    decayRate: 0.12,
    state: "long_term",
    explanation: "A specific past episode that may recur in similar debugging.",
  }),
];

// Customer support agent for one enterprise account (id: moody).
const supportMemories: AgentMemory[] = [
  memory({
    id: "su_fact_account",
    agentId: "moody",
    content:
      "Acme Corp is on the Enterprise plan with 240 seats and a dedicated success manager.",
    type: "user_fact",
    daysAgo: 20,
    importance: 0.86,
    emotionalWeight: 0.2,
    confidence: 0.94,
    theme: "account",
    decayRate: 0.05,
    state: "long_term",
    explanation: "Key account fact that frames the support relationship.",
  }),
  memory({
    id: "su_relationship_dana",
    agentId: "moody",
    content:
      "Primary contact is Dana, the IT admin, who prefers email over phone calls.",
    type: "relationship_context",
    daysAgo: 17,
    importance: 0.84,
    emotionalWeight: 0.28,
    confidence: 0.92,
    theme: "relationships",
    decayRate: 0.05,
    state: "long_term",
    explanation: "Relationship and channel preference for the main contact.",
  }),
  memory({
    id: "su_emotion_frustrated_sso",
    agentId: "moody",
    content:
      "Dana was frustrated after repeated SSO login failures affected her users.",
    type: "emotional_signal",
    daysAgo: 12,
    importance: 0.82,
    emotionalWeight: 0.86,
    confidence: 0.88,
    theme: "wellbeing",
    decayRate: 0.09,
    state: "long_term",
    explanation:
      "A strong emotional signal a cautious support agent should keep salient.",
  }),
  memory({
    id: "su_decision_credit",
    agentId: "moody",
    content:
      "Agreed to a service credit for the March outage; ticket #4821 is resolved.",
    type: "decision",
    daysAgo: 10,
    importance: 0.8,
    emotionalWeight: 0.3,
    confidence: 0.9,
    theme: "resolutions",
    decayRate: 0.05,
    state: "long_term",
    explanation: "A resolution decision that should not be re-litigated.",
  }),
  memory({
    id: "su_pattern_sso_cert",
    agentId: "moody",
    content:
      "Recurring issue: SSO breaks whenever their identity provider rotates its certificate.",
    type: "repeated_pattern",
    daysAgo: 7,
    importance: 0.88,
    emotionalWeight: 0.45,
    confidence: 0.92,
    theme: "technical",
    decayRate: 0.04,
    accessCount: 4,
    state: "long_term",
    explanation: "A consolidated recurring failure mode for this account.",
  }),
  memory({
    id: "su_skill_metadata_fix",
    agentId: "moody",
    content:
      "Workaround that resolves it: re-upload the IdP metadata to clear the SSO loop.",
    type: "skill_or_learning",
    daysAgo: 5,
    importance: 0.82,
    emotionalWeight: 0.3,
    confidence: 0.9,
    theme: "knowledge",
    decayRate: 0.06,
    state: "long_term",
    explanation: "A learned fix tied to the recurring SSO pattern.",
  }),
  memory({
    id: "su_task_saml_followup",
    agentId: "moody",
    content:
      "Follow up on the pending SAML metadata update Dana promised by next week.",
    type: "task",
    daysAgo: 3,
    importance: 0.78,
    emotionalWeight: 0.32,
    confidence: 0.85,
    theme: "tasks",
    decayRate: 0.1,
    state: "short_term",
    explanation: "An open follow-up commitment with the customer.",
  }),
];

export const agentProfiles: AgentProfile[] = [
  {
    id: "new-agent",
    name: "Blank-Slate Agent",
    description:
      "A clean baseline with no history. It can reason, but it has not learned anything about this user or account yet.",
    memoryAge: "0 days",
    personality: "Neutral, helpful, and context-light.",
    operatingStyle:
      "Answers from the current message only until new memories form.",
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
    name: "Productivity Copilot",
    description:
      "A personal work copilot with a month of history: preferences, schedule, goals, and recurring tasks for a product manager.",
    memoryAge: "31 simulated days",
    personality: "Practical, organized, and proactive.",
    operatingStyle:
      "Personalizes help by combining preferences, goals, decisions, and recurring patterns.",
    mood: "focused",
    recallStrategy: "Balanced recall across long-term preferences and goals.",
    parameters: {
      ...defaultBrainParameters,
      recencyBias: 0.4,
      longTermRecallStrength: 0.9,
      consolidationAggressiveness: 0.66,
      themeLinkingSensitivity: 0.72,
    },
    seedMemories: productivityMemories,
  },
  {
    id: "focused",
    name: "Sales Account Agent",
    description:
      "An account executive's copilot tracking a single enterprise deal, biased toward the most recent deal state.",
    memoryAge: "42 simulated days",
    personality: "Direct, goal-seeking, and momentum-driven.",
    operatingStyle: "Recent deal signals outrank older background context.",
    mood: "excited",
    recallStrategy:
      "High recency bias with strong goal and objection matching.",
    parameters: {
      ...defaultBrainParameters,
      shortTermCapacity: 4,
      recencyBias: 0.82,
      exploration: 0.12,
      moodInfluence: 0.6,
      longTermRecallStrength: 0.8,
    },
    seedMemories: salesMemories,
  },
  {
    id: "reflective",
    name: "Engineering Copilot",
    description:
      "A coding copilot that consolidates conventions, architecture facts, and recurring requests into durable knowledge.",
    memoryAge: "60 simulated days",
    personality: "Pattern-oriented, careful, and synthesis-heavy.",
    operatingStyle: "Turns repeated signals into long-term thematic knowledge.",
    mood: "reflective",
    recallStrategy: "Long-term memory and theme links carry the most weight.",
    parameters: {
      ...defaultBrainParameters,
      longTermRecallStrength: 0.97,
      consolidationAggressiveness: 0.92,
      themeLinkingSensitivity: 0.9,
      exploration: 0.4,
    },
    seedMemories: codingMemories,
  },
  {
    id: "moody",
    name: "Support Agent",
    description:
      "A customer-support copilot for one enterprise account, tuned to keep emotional signals and recurring issues salient.",
    memoryAge: "21 simulated days",
    personality: "Empathetic, cautious, and detail-retentive.",
    operatingStyle:
      "Emotional and mood-aligned memories get extra recall weight.",
    mood: "cautious",
    recallStrategy:
      "Cautious mood boosts frustrations, constraints, and recurring failures.",
    parameters: {
      ...defaultBrainParameters,
      emotionalSensitivity: 0.86,
      moodInfluence: 0.9,
      decaySpeed: 0.45,
      exploration: 0.3,
      longTermRecallStrength: 0.8,
    },
    seedMemories: supportMemories,
  },
];

export const getAgentProfile = (agentId: string): AgentProfile => {
  const profile = agentProfiles.find((item) => item.id === agentId);
  if (!profile) return agentProfiles[0]!;
  return profile;
};

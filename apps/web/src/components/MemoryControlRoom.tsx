import {
  Activity,
  ArrowRight,
  Brain,
  CheckCircle2,
  CircleDot,
  Clock,
  Database,
  GitBranch,
  LockKeyhole,
  Plug,
  Plus,
  Puzzle,
  RotateCcw,
  Search,
  Send,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  UserRound,
  Waypoints,
  Workflow,
  X,
  Zap,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
} from "react";
import {
  CartesianGrid,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  addCustomProfileState,
  advanceSimulatedTime,
  createCustomAgentProfile,
  createSimulatorStateFromProfile,
  defaultBrainParameters,
  listAgentProfiles,
  runAgentTurn,
  runConsolidationCycle,
  updateBrainParameter,
} from "@mynd-memory/memory-core";
import type {
  AgentMemory,
  AgentMood,
  AgentProfile,
  BrainParameters,
  MemoryEvent,
  MemoryEventKind,
  MemoryState,
  RetrievalTrace,
  SimulatorState,
} from "@mynd-memory/memory-core";

type HydraStatus = {
  configured: boolean;
  tenantId: string;
  sharedSubTenantId: string;
  profileSubTenantId: string;
  status: "offline" | "ready" | "not_ready" | "error";
  message: string;
  requestId?: string;
};

type HydraChunk = {
  id: string;
  title: string;
  content: string;
  score: number;
  metadata: Record<string, unknown>;
  sourceType?: string;
};

type AgentGenerationResponse = {
  provider: "aiGateway" | "openAI" | "googleGenAI" | "nebius" | "local";
  model: string;
  text: string;
  usedModel: boolean;
  reason: string;
};

type HydraAppliedPlan = {
  mode: string;
  queryBy: string;
  maxResults: number;
  alpha: number | "auto";
  graphContext: boolean;
  forcefulRelations: boolean;
  recencyBias: number;
};

type HydraTurnMeta = {
  ok: boolean;
  requestId?: string;
  latencyMs?: number;
  resultCount: number;
  sources?: Array<{ id: string; title: string; type?: string }>;
  applied?: HydraAppliedPlan;
};

type LastTurn = {
  retrieved: AgentMemory[];
  created: AgentMemory[];
  ignored: RetrievalTrace[];
  hydraChunks: HydraChunk[];
  hydraMessage: string;
  hydraMeta?: HydraTurnMeta;
  semanticScores?: Record<string, number>;
  semanticProvider?: "nebius" | "none";
  semanticModel?: string;
  modelMessage: string;
  modelProvider: string;
  modelUsed: boolean;
};

type MemoryRadarPoint = {
  themeId: string;
  theme: string;
  strength: number;
  count: number;
  avgImportance: number;
  avgConfidence: number;
  stateMix: string;
};

type MemoryMatrixRow = {
  themeId: string;
  theme: string;
  total: number;
  avgImportance: number;
  topMemoryId: string;
  states: Record<MemoryState, number>;
};

type MemoryMapMode = "radar" | "network" | "matrix";

const initialProfiles = listAgentProfiles();

const memoryStateLabels: Record<MemoryState, string> = {
  observed: "Observed",
  short_term: "Short-term",
  working: "Working",
  candidate: "Candidate",
  long_term: "Long-term",
  dormant: "Dormant",
  decayed: "Decayed",
  superseded: "Superseded",
};

const stateColor: Record<MemoryState, string> = {
  observed: "#4f8cff",
  short_term: "#54d6b3",
  working: "#20a885",
  candidate: "#f0b84f",
  long_term: "#28c77f",
  dormant: "#8a96aa",
  decayed: "#df6f72",
  superseded: "#4b5568",
};

const memoryStateKeys = Object.keys(memoryStateLabels) as MemoryState[];

const memoryMapModes: Array<{ id: MemoryMapMode; label: string }> = [
  { id: "radar", label: "Radar" },
  { id: "network", label: "Network" },
  { id: "matrix", label: "Matrix" },
];

const eventKindMeta: Record<MemoryEventKind, { label: string; color: string }> =
  {
    memory_observed: { label: "Observed", color: "#4f8cff" },
    memory_encoded: { label: "Encoded", color: "#7c3aed" },
    memory_scored: { label: "Nebius score", color: "#6d5dfc" },
    memory_recalled: { label: "Recalled", color: "#20a885" },
    memory_reinforced: { label: "Reinforced", color: "#28c77f" },
    memory_decayed: { label: "Decayed", color: "#df6f72" },
    memory_consolidated: { label: "Consolidated", color: "#148c78" },
    memory_ignored: { label: "Ignored", color: "#8a96aa" },
    memory_superseded: { label: "Superseded", color: "#4b5568" },
    time_advanced: { label: "Time", color: "#d79b2f" },
    parameter_changed: { label: "Parameter", color: "#3c83f6" },
    agent_created: { label: "Agent", color: "#54d6b3" },
    hydradb_sync: { label: "HydraDB", color: "#0891b2" },
  };

const eventFilters: Array<{
  id: string;
  label: string;
  kinds: MemoryEventKind[] | null;
}> = [
  { id: "all", label: "All", kinds: null },
  {
    id: "recall",
    label: "Recall",
    kinds: ["memory_recalled", "memory_reinforced"],
  },
  {
    id: "encode",
    label: "Encode",
    kinds: ["memory_observed", "memory_encoded"],
  },
  { id: "consolidate", label: "Consolidate", kinds: ["memory_consolidated"] },
  { id: "hydra", label: "HydraDB", kinds: ["hydradb_sync"] },
  { id: "nebius", label: "Nebius", kinds: ["memory_scored"] },
  {
    id: "system",
    label: "System",
    kinds: [
      "time_advanced",
      "parameter_changed",
      "agent_created",
      "memory_decayed",
      "memory_ignored",
      "memory_superseded",
    ],
  },
];

type TurnStepStatus = "pending" | "active" | "done" | "skipped" | "error";

type TurnStep = { id: string; label: string; status: TurnStepStatus };

const makeTurnSteps = (): TurnStep[] => [
  { id: "retrieve", label: "Retrieve local memory", status: "active" },
  { id: "hydra", label: "Query HydraDB", status: "pending" },
  { id: "semantic", label: "Nebius semantic re-rank", status: "pending" },
  { id: "generate", label: "Generate answer (Nebius)", status: "pending" },
];

const heroStats = [
  { value: "8", label: "memory states" },
  { value: "10", label: "tunable brain parameters" },
  { value: "Hybrid", label: "HydraDB + Nebius" },
] as const;

const platformPillars = [
  {
    icon: Workflow,
    title: "Individualized memory policies",
    body: "Configure each agent profile with its own recall strategy, mood, scoring thresholds, and lifecycle behavior.",
  },
  {
    icon: Database,
    title: "HydraDB profile memory",
    body: "Persist memories by tenant and profile, then retrieve durable context through scoped hybrid search.",
  },
  {
    icon: CircleDot,
    title: "Human-like memory lifecycle",
    body: "Move memory through visible states: observed, short-term, working, candidate, long-term, dormant, decayed, and superseded.",
  },
  {
    icon: SlidersHorizontal,
    title: "Memory Studio control surface",
    body: "Inspect recalls, ignored memories, events, model grounding, and brain parameters in the console we built for this framework.",
  },
  {
    icon: Brain,
    title: "Memory prompt assembly",
    body: "Assemble retrieved memories into a dedicated memory prompt so the final agent answer reflects the user's history.",
  },
] as const;

const productProof = [
  {
    icon: Waypoints,
    title: "Inspectable memory",
    body: "The live demo shows what the agent noticed, what it retrieved, what it ignored, and why the answer changed.",
  },
  {
    icon: Database,
    title: "Persistent recall",
    body: "HydraDB v2 stores seeded knowledge and live memories by tenant and profile, then returns ranked hybrid context for each turn.",
  },
  {
    icon: Workflow,
    title: "Tunable behavior",
    body: "Brain parameters expose recency, decay, importance, consolidation, mood influence, and theme linking as product controls.",
  },
  {
    icon: ShieldCheck,
    title: "Grounded and secure",
    body: "Every answer cites the context it retrieved, degrades gracefully when a source is unavailable, and keeps provider keys server-side.",
  },
] as const;

const memoryPipeline = [
  "Application events",
  "MyndMemory runtime",
  "Memory policies + lifecycle",
  "HydraDB persistence + retrieval",
  "Context assembly",
  "Agent response",
  "Live app demo",
] as const;

const architectureLayers = [
  {
    name: "MyndMemory",
    role: "Invented memory prompting framework",
    body: "The runtime, policies, lifecycle, Memory Studio console, and memory prompt assembly layer. Decides what becomes memory, how it evolves, and how builders tune it.",
  },
  {
    name: "HydraDB",
    role: "Profile-scoped memory substrate",
    body: "Tenant-aware persistence and hybrid search — where individualized agent memory lives and how it is retrieved across sessions.",
  },
  {
    name: "Nebius Token Factory",
    role: "Inference and semantic scoring",
    body: "Embeddings and generation — ranks recalled memory by meaning and turns it into final, grounded agent answers.",
  },
] as const;

const liveDemoSteps = [
  {
    label: "01",
    title: "Observe the app event",
    body: "A user asks for launch guidance. MyndMemory extracts the durable signal instead of treating the turn as disposable chat.",
    status: "Capturing preference",
  },
  {
    label: "02",
    title: "Score and link memory",
    body: "The runtime scores importance, confidence, emotion, recency, and theme so related moments can reinforce each other.",
    status: "Theme: launch-planning",
  },
  {
    label: "03",
    title: "Retrieve grounded context",
    body: "HydraDB returns profile-scoped memories and shared knowledge. Nebius semantic scoring helps rank what matters now.",
    status: "4 memories recalled",
  },
  {
    label: "04",
    title: "Answer with visible evidence",
    body: "The agent receives a memory prompt with citations, then responds in a way that reflects the user's history.",
    status: "Response adapted",
  },
] as const;

const demoMemorySignals = [
  {
    title: "Preference",
    body: "User wants concise launch plans with concrete next actions.",
    score: "0.91",
  },
  {
    title: "Goal",
    body: "Prioritize agent memory reliability before visual polish.",
    score: "0.87",
  },
  {
    title: "Pattern",
    body: "Often asks for overflow fixes after reviewing wide screenshots.",
    score: "0.78",
  },
] as const;

const useCases = [
  "AI copilots that remember user preferences without burying them in prompts.",
  "Support and success agents that keep relationship context across sessions.",
  "Research and productivity assistants that preserve evolving project intent.",
  "Customer-facing assistants that stay consistent as a relationship spans days or weeks.",
] as const;

const systemSteps = [
  "Observe application events and decide which signals deserve memory.",
  "Score candidate memories by importance, confidence, recency, emotion, and theme.",
  "Persist durable memory through HydraDB with profile-scoped tenant boundaries.",
  "Retrieve context, assemble a memory prompt, and generate grounded responses.",
] as const;

const parameterLabels: Record<keyof BrainParameters, string> = {
  shortTermCapacity: "Short-term capacity",
  decaySpeed: "Decay speed",
  importanceThreshold: "Importance threshold",
  emotionalSensitivity: "Emotional sensitivity",
  recencyBias: "Recency bias",
  longTermRecallStrength: "Long-term recall",
  consolidationAggressiveness: "Consolidation",
  themeLinkingSensitivity: "Theme linking",
  moodInfluence: "Mood influence",
  exploration: "Exploration",
};

const moodOptions: AgentMood[] = [
  "calm",
  "focused",
  "curious",
  "overloaded",
  "cautious",
  "excited",
  "reflective",
];

const formatScore = (value: number) => value.toFixed(2);

const formatSimulatedTime = (isoValue: string) =>
  `${isoValue.replace("T", " ").slice(0, 16)} UTC`;

const formatThemeLabel = (theme: string) =>
  theme
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const getProfileState = (profile: AgentProfile) =>
  createSimulatorStateFromProfile(profile);

const memoryStateStrength: Record<MemoryState, number> = {
  observed: 0.35,
  short_term: 0.72,
  working: 0.92,
  candidate: 0.56,
  long_term: 1,
  dormant: 0.26,
  decayed: 0.08,
  superseded: 0.03,
};

const getMemoryRadarData = (memories: AgentMemory[]): MemoryRadarPoint[] => {
  const groups = new Map<
    string,
    {
      strength: number;
      count: number;
      importance: number;
      confidence: number;
      states: Record<MemoryState, number>;
    }
  >();

  for (const memory of memories) {
    const group = groups.get(memory.theme) ?? {
      strength: 0,
      count: 0,
      importance: 0,
      confidence: 0,
      states: {
        observed: 0,
        short_term: 0,
        working: 0,
        candidate: 0,
        long_term: 0,
        dormant: 0,
        decayed: 0,
        superseded: 0,
      },
    };
    const accessBoost = Math.min(memory.accessCount, 5) / 5;
    const weightedStrength =
      (memory.importance * 0.55 +
        memory.confidence * 0.22 +
        memory.emotionalWeight * 0.13 +
        accessBoost * 0.1) *
      memoryStateStrength[memory.state];
    group.strength += weightedStrength;
    group.count += 1;
    group.importance += memory.importance;
    group.confidence += memory.confidence;
    group.states[memory.state] += 1;
    groups.set(memory.theme, group);
  }

  return [...groups.entries()]
    .map(([theme, group]) => {
      const stateMix = (Object.keys(group.states) as MemoryState[])
        .filter((stateKey) => group.states[stateKey] > 0)
        .map(
          (stateKey) =>
            `${memoryStateLabels[stateKey]} ${group.states[stateKey]}`
        )
        .join(" / ");
      return {
        themeId: theme,
        theme: formatThemeLabel(theme),
        strength: Math.min(
          100,
          Math.round((group.strength / group.count) * 100)
        ),
        count: group.count,
        avgImportance: group.importance / group.count,
        avgConfidence: group.confidence / group.count,
        stateMix,
      };
    })
    .sort((left, right) => right.strength - left.strength)
    .slice(0, 8);
};

const getMemoryMatrixRows = (memories: AgentMemory[]): MemoryMatrixRow[] => {
  const groups = new Map<string, MemoryMatrixRow>();
  for (const memory of memories) {
    const row = groups.get(memory.theme) ?? {
      themeId: memory.theme,
      theme: formatThemeLabel(memory.theme),
      total: 0,
      avgImportance: 0,
      topMemoryId: memory.id,
      states: {
        observed: 0,
        short_term: 0,
        working: 0,
        candidate: 0,
        long_term: 0,
        dormant: 0,
        decayed: 0,
        superseded: 0,
      },
    };
    row.total += 1;
    row.avgImportance += memory.importance;
    row.states[memory.state] += 1;
    groups.set(memory.theme, row);
  }

  return [...groups.values()]
    .map((row) => ({
      ...row,
      avgImportance: row.avgImportance / row.total,
    }))
    .sort((left, right) => right.avgImportance - left.avgImportance);
};

const getCounts = (memories: AgentMemory[]) =>
  memories.reduce<Record<MemoryState, number>>(
    (counts, memory) => {
      counts[memory.state] += 1;
      return counts;
    },
    {
      observed: 0,
      short_term: 0,
      working: 0,
      candidate: 0,
      long_term: 0,
      dormant: 0,
      decayed: 0,
      superseded: 0,
    }
  );

const fetchJson = async <T,>(
  url: string,
  init?: RequestInit,
  timeoutMs = 15_000
): Promise<T> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    const text = await response.text();
    const parsed = text ? JSON.parse(text) : {};
    if (!response.ok) {
      const message =
        typeof parsed === "object" &&
        parsed !== null &&
        "message" in parsed &&
        typeof parsed.message === "string"
          ? parsed.message
          : `Request to ${url} failed (HTTP ${response.status}).`;
      throw new Error(message);
    }
    return parsed as T;
  } finally {
    clearTimeout(timeout);
  }
};

const pendingAgentExplanation =
  "Retrieving memory and context, then generating a grounded answer.";

const updateAgentMessage = (
  state: SimulatorState,
  messageId: string,
  input: { text: string; explanation: string }
): SimulatorState => ({
  ...state,
  messages: state.messages.map((item) =>
    item.id === messageId
      ? {
          ...item,
          content: input.text,
          explanation: input.explanation,
        }
      : item
  ),
});

const replaceAgentMessage = (
  state: SimulatorState,
  messageId: string,
  response: AgentGenerationResponse
): SimulatorState =>
  updateAgentMessage(state, messageId, {
    text: response.usedModel
      ? response.text
      : `I could not get a live model response for this turn. ${response.reason}`,
    explanation: response.usedModel
      ? `Generated with ${response.provider}/${response.model} from local memory and HydraDB context.`
      : "No fallback answer was rendered because the model did not complete.",
  });

const modelMessageFor = (
  response: AgentGenerationResponse,
  hydraChunkCount: number
) => {
  if (!response.usedModel) return response.reason;
  const contextLabel =
    hydraChunkCount > 0
      ? `${hydraChunkCount} HydraDB chunk${hydraChunkCount === 1 ? "" : "s"}`
      : "local memory";
  return `${response.provider}/${response.model} grounded the answer with ${contextLabel}.`;
};

type QueryPlanPreview = {
  mode: "fast" | "thinking";
  maxResults: number;
  graphContext: boolean;
  forcefulRelations: boolean;
  recencyBias: number;
  summary: string;
};

// Mirrors describeQueryPlan / queryOptionsFromParameters in
// @mynd-memory/hydradb (contract.ts). Inlined so the client bundle does not
// pull in the HydraDB HTTP client. Keep these thresholds in sync with
// contract.ts.
const deriveQueryPlan = (parameters: BrainParameters): QueryPlanPreview => {
  const mode = parameters.longTermRecallStrength > 0.65 ? "thinking" : "fast";
  const maxResults = parameters.shortTermCapacity < 4 ? 5 : 8;
  const graphContext = parameters.themeLinkingSensitivity >= 0.55;
  const forcefulRelations = mode === "thinking";
  const summary = [
    `${mode} mode`,
    "hybrid search",
    graphContext ? "graph ON" : "graph OFF",
    forcefulRelations ? "forceful relations ON" : "forceful relations OFF",
    `recency ${parameters.recencyBias.toFixed(2)}`,
    `top ${maxResults}`,
  ].join(" · ");
  return {
    mode,
    maxResults,
    graphContext,
    forcefulRelations,
    recencyBias: parameters.recencyBias,
    summary,
  };
};

let hydraSyncSeq = 0;
const appendHydraEvent = (
  state: SimulatorState,
  title: string,
  detail: string
): SimulatorState => {
  hydraSyncSeq += 1;
  const hydraEvent: MemoryEvent = {
    id: `${state.simulatedNow}-hydradb_sync-${hydraSyncSeq}`,
    kind: "hydradb_sync",
    title,
    detail,
    createdAt: state.simulatedNow,
  };
  return { ...state, events: [hydraEvent, ...state.events].slice(0, 80) };
};

let nebiusSyncSeq = 0;
const appendNebiusEvent = (
  state: SimulatorState,
  title: string,
  detail: string
): SimulatorState => {
  nebiusSyncSeq += 1;
  const nebiusEvent: MemoryEvent = {
    id: `${state.simulatedNow}-memory_scored-nebius-${nebiusSyncSeq}`,
    kind: "memory_scored",
    title,
    detail,
    createdAt: state.simulatedNow,
  };
  return { ...state, events: [nebiusEvent, ...state.events].slice(0, 80) };
};

// Suggested first messages shown in the empty chat. They work for both the
// blank-slate agent (which will say it has nothing yet) and the seeded agents
// (which recall real context), so they double as a guided demo.
const suggestedPrompts = [
  "What do you remember about me?",
  "What are my current priorities?",
  "Summarize what you know so far.",
] as const;

// --- Temporary, auth-free session ------------------------------------------
// Custom agents the visitor creates are persisted to localStorage under an
// anonymous session id, so they see only their own agents across reloads
// without signing in. Seeded example agents stay shared as templates.
const SESSION_STORAGE_KEY = "mynd:session";
const AGENTS_STORAGE_KEY = "mynd:custom-agents";

const isBrowser = () => typeof window !== "undefined";

const isCustomProfile = (profile: AgentProfile) =>
  profile.id.startsWith("custom_");

const makeSessionId = (): string => {
  try {
    if (isBrowser() && typeof crypto?.randomUUID === "function") {
      return crypto.randomUUID().slice(0, 8);
    }
  } catch {
    // fall through to the Math.random fallback below
  }
  return Math.random().toString(36).slice(2, 10);
};

const ensureSessionId = (): string => {
  if (!isBrowser()) return "local";
  try {
    const existing = window.localStorage.getItem(SESSION_STORAGE_KEY);
    if (existing) return existing;
    const next = makeSessionId();
    window.localStorage.setItem(SESSION_STORAGE_KEY, next);
    return next;
  } catch {
    return "local";
  }
};

// Re-hydrate a stored agent into a complete profile so older or partial
// records can never strand the simulator (which needs parameters + memories).
const normalizeStoredProfile = (profile: AgentProfile): AgentProfile => ({
  ...profile,
  parameters: { ...defaultBrainParameters, ...(profile.parameters ?? {}) },
  seedMemories: Array.isArray(profile.seedMemories) ? profile.seedMemories : [],
});

const readStoredAgents = (): AgentProfile[] => {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(AGENTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (item): item is AgentProfile =>
          typeof item === "object" &&
          item !== null &&
          typeof (item as AgentProfile).id === "string" &&
          typeof (item as AgentProfile).name === "string"
      )
      .map(normalizeStoredProfile);
  } catch {
    return [];
  }
};

const writeStoredAgents = (profiles: AgentProfile[]) => {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(
      AGENTS_STORAGE_KEY,
      JSON.stringify(profiles.filter(isCustomProfile))
    );
  } catch {
    // Best-effort: private mode or quota limits should never break the demo.
  }
};

export function MemoryControlRoom({
  view = "site",
}: {
  view?: "site" | "console";
} = {}) {
  const [profiles, setProfiles] = useState<AgentProfile[]>(initialProfiles);
  const [selectedProfileId, setSelectedProfileId] = useState("new-agent");
  const selectedProfile = useMemo(
    () =>
      profiles.find((profile) => profile.id === selectedProfileId) ??
      profiles[0]!,
    [profiles, selectedProfileId]
  );
  const [state, setState] = useState<SimulatorState>(() =>
    getProfileState(selectedProfile)
  );
  const [message, setMessage] = useState("");
  const [lastTurn, setLastTurn] = useState<LastTurn>({
    retrieved: [],
    created: [],
    ignored: [],
    hydraChunks: [],
    hydraMessage: "HydraDB has not been queried in this session.",
    modelMessage: "Inference has not run in this session.",
    modelProvider: "local",
    modelUsed: false,
  });
  const [hydraStatus, setHydraStatus] = useState<HydraStatus | null>(null);
  const [hydraBusy, setHydraBusy] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [turnSteps, setTurnSteps] = useState<TurnStep[]>([]);
  const activeProfileIdRef = useRef(selectedProfileId);
  const [chartReady, setChartReady] = useState(false);
  const [memoryMapMode, setMemoryMapMode] = useState<MemoryMapMode>("radar");
  const [eventFilter, setEventFilter] = useState("all");
  const [selectedMemoryId, setSelectedMemoryId] = useState<string>();
  const [isCreating, setIsCreating] = useState(false);
  const [sessionId, setSessionId] = useState("");
  const [customName, setCustomName] = useState("");
  const [customMood, setCustomMood] = useState<AgentMood>("curious");
  const [customDescription, setCustomDescription] = useState("");
  const [customPersonality, setCustomPersonality] = useState("");
  const [customRecall, setCustomRecall] = useState("");
  const chatLogRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setState(getProfileState(selectedProfile));
    setLastTurn({
      retrieved: [],
      created: [],
      ignored: [],
      hydraChunks: [],
      hydraMessage: "HydraDB has not been queried for this profile yet.",
      modelMessage: "Inference has not run for this profile yet.",
      modelProvider: "local",
      modelUsed: false,
    });
    setSelectedMemoryId(undefined);
  }, [selectedProfile]);

  useEffect(() => {
    let cancelled = false;
    fetchJson<HydraStatus>("/api/hydradb/status")
      .then((status) => {
        if (!cancelled) setHydraStatus(status);
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setHydraStatus({
            configured: false,
            tenantId: "unknown",
            sharedSubTenantId: "unknown",
            profileSubTenantId: "unknown",
            status: "error",
            message:
              error instanceof Error
                ? error.message
                : "Unable to load HydraDB status.",
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setChartReady(true);
  }, []);

  // Restore the anonymous session and any agents this visitor created earlier.
  useEffect(() => {
    setSessionId(ensureSessionId());
    const stored = readStoredAgents();
    if (stored.length === 0) return;
    setProfiles((current) => {
      const ids = new Set(current.map((profile) => profile.id));
      const merged = [...current];
      for (const profile of stored) {
        if (!ids.has(profile.id)) merged.push(profile);
      }
      return merged;
    });
  }, []);

  // Keep the newest message in view as the conversation grows.
  useEffect(() => {
    const node = chatLogRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [state.messages.length, isSending]);

  // Let Escape dismiss the agent-creation modal.
  useEffect(() => {
    if (!isCreating) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsCreating(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isCreating]);

  useEffect(() => {
    activeProfileIdRef.current = selectedProfileId;
  }, [selectedProfileId]);

  const counts = getCounts(state.memories);
  const activeEventFilter =
    eventFilters.find((filter) => filter.id === eventFilter) ?? eventFilters[0];
  const filteredEvents = activeEventFilter.kinds
    ? state.events.filter((item) =>
        activeEventFilter.kinds?.includes(item.kind)
      )
    : state.events;
  const queryPlan = useMemo(
    () => deriveQueryPlan(state.parameters),
    [state.parameters]
  );
  const memoryRadarData = useMemo(
    () => getMemoryRadarData(state.memories),
    [state.memories]
  );
  const memoryMatrixRows = useMemo(
    () => getMemoryMatrixRows(state.memories),
    [state.memories]
  );
  const selectedMemory =
    state.memories.find((memory) => memory.id === selectedMemoryId) ??
    state.memories[0];
  const selectedThemeMemories = selectedMemory
    ? state.memories.filter((memory) => memory.theme === selectedMemory.theme)
    : [];
  const visibleMessages = state.messages.filter(
    (item) => item.role !== "system"
  );
  const activeMemories = state.memories.filter((memory) =>
    ["working", "short_term"].includes(memory.state)
  );
  const longTermMemories = state.memories.filter(
    (memory) => memory.state === "long_term"
  );
  const candidateMemories = state.memories.filter((memory) =>
    ["candidate", "dormant", "decayed"].includes(memory.state)
  );

  const handleSend = async () => {
    const trimmed = message.trim();
    if (!trimmed || isSending) return;

    const requestProfileId = selectedProfile.id;
    const isCurrent = () => activeProfileIdRef.current === requestProfileId;
    const markStep = (id: string, status: TurnStepStatus) =>
      setTurnSteps((current) =>
        current.map((step) => (step.id === id ? { ...step, status } : step))
      );

    setIsSending(true);
    setTurnSteps(makeTurnSteps());
    try {
      const result = runAgentTurn(state, trimmed);
      markStep("retrieve", "done");
      setState(
        updateAgentMessage(result.state, result.response.id, {
          text: "Synthesizing an answer from retrieved HydraDB memory...",
          explanation: pendingAgentExplanation,
        })
      );
      setMessage("");
      setLastTurn({
        retrieved: result.retrieved,
        created: result.created,
        ignored: result.ignored,
        hydraChunks: [],
        hydraMessage: hydraStatus?.configured
          ? "HydraDB query running..."
          : "HydraDB is offline; local memory handled this turn.",
        modelMessage: "AI SDK inference is preparing the final answer...",
        modelProvider: "local",
        modelUsed: false,
      });

      let hydraChunks: HydraChunk[] = [];

      if (hydraStatus?.configured && !requestProfileId.startsWith("custom_")) {
        markStep("hydra", "active");
        try {
          const hydra = await fetchJson<{
            configured: boolean;
            ok?: boolean;
            chunks: HydraChunk[];
            message?: string;
            sources?: Array<{ id: string; title: string; type?: string }>;
            latencyMs?: number;
            requestId?: string;
            appliedOptions?: {
              mode: string;
              queryBy: string;
              maxResults: number;
              alpha: number | "auto";
              graphContext: boolean;
              queryForcefulRelations: boolean;
              recencyBias: number;
            };
          }>(
            "/api/hydradb/query",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                profileId: requestProfileId,
                query: trimmed,
                parameters: result.state.parameters,
              }),
            },
            30_000
          );

          hydraChunks = hydra.chunks ?? [];
          markStep("hydra", "done");

          // Live-memory ingest: concurrent, non-fatal, and non-blocking so a
          // slow or failed write can never strand the turn or delay the answer.
          void Promise.allSettled(
            result.created.map((memory) =>
              fetchJson("/api/hydradb/memory", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ profileId: requestProfileId, memory }),
              })
            )
          );

          if (isCurrent()) {
            const applied = hydra.appliedOptions;
            const hydraMeta: HydraTurnMeta = {
              ok: hydra.ok ?? true,
              requestId: hydra.requestId,
              latencyMs: hydra.latencyMs,
              resultCount: hydraChunks.length,
              sources: hydra.sources,
              applied: applied
                ? {
                    mode: applied.mode,
                    queryBy: applied.queryBy,
                    maxResults: applied.maxResults,
                    alpha: applied.alpha,
                    graphContext: applied.graphContext,
                    forcefulRelations:
                      applied.queryForcefulRelations &&
                      applied.mode === "thinking",
                    recencyBias: applied.recencyBias,
                  }
                : undefined,
            };
            setLastTurn((current) => ({
              ...current,
              hydraChunks,
              hydraMessage:
                hydra.message ??
                `HydraDB returned ${hydraChunks.length} ranked chunks.`,
              hydraMeta,
            }));
            setState((current) =>
              appendHydraEvent(
                current,
                `HydraDB query · ${hydraMeta.applied?.mode ?? "hybrid"}`,
                `${hydraMeta.resultCount} chunk${
                  hydraMeta.resultCount === 1 ? "" : "s"
                }${hydraMeta.latencyMs != null ? ` in ${hydraMeta.latencyMs}ms` : ""}${
                  hydraMeta.requestId ? ` · ${hydraMeta.requestId}` : ""
                }`
              )
            );
          }
        } catch (error) {
          markStep("hydra", "error");
          if (isCurrent()) {
            setLastTurn((current) => ({
              ...current,
              hydraMessage:
                error instanceof Error
                  ? error.message
                  : "HydraDB query failed with an unknown error.",
            }));
          }
        }
      } else {
        markStep("hydra", "skipped");
      }

      const semanticCandidates = [
        ...result.retrieved.map((memory) => ({
          id: memory.id,
          content: memory.content,
        })),
        ...result.ignored.slice(0, 3).flatMap((trace) => {
          const memory = result.state.memories.find(
            (item) => item.id === trace.memoryId
          );
          return memory ? [{ id: memory.id, content: memory.content }] : [];
        }),
      ];
      if (semanticCandidates.length > 0) {
        markStep("semantic", "active");
        try {
          const semantic = await fetchJson<{
            provider: "nebius" | "none";
            model?: string;
            scores: Array<{ id: string; similarity: number }>;
            reason: string;
          }>(
            "/api/memory/retrieve",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                query: trimmed,
                memories: semanticCandidates,
              }),
            },
            30_000
          );
          markStep(
            "semantic",
            semantic.provider === "nebius" ? "done" : "skipped"
          );
          if (isCurrent() && semantic.provider === "nebius") {
            const semanticScores: Record<string, number> = {};
            for (const entry of semantic.scores) {
              semanticScores[entry.id] = entry.similarity;
            }
            const top = [...semantic.scores].sort(
              (left, right) => right.similarity - left.similarity
            )[0];
            const topMemory = top
              ? result.state.memories.find((item) => item.id === top.id)
              : undefined;
            setLastTurn((current) => ({
              ...current,
              semanticScores,
              semanticProvider: semantic.provider,
              semanticModel: semantic.model,
            }));
            setState((current) =>
              appendNebiusEvent(
                current,
                `Nebius re-ranked ${semantic.scores.length} memories`,
                topMemory && top
                  ? `Top semantic match: ${formatThemeLabel(topMemory.theme)} (${formatScore(top.similarity)})`
                  : (semantic.model ?? "nebius embeddings")
              )
            );
          }
        } catch {
          // Semantic re-rank is best-effort; fall back to lexical silently.
          markStep("semantic", "skipped");
        }
      } else {
        markStep("semantic", "skipped");
      }

      markStep("generate", "active");
      try {
        const response = await fetchJson<AgentGenerationResponse>(
          "/api/agent/respond",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              profile: selectedProfile,
              profileId: requestProfileId,
              query: trimmed,
              parameters: result.state.parameters,
              localMemories: result.retrieved,
              hydraChunks,
              fallbackResponse: result.response.content,
            }),
          },
          90_000
        );
        markStep("generate", "done");

        if (isCurrent()) {
          setState((current) =>
            replaceAgentMessage(current, result.response.id, response)
          );
          setLastTurn((current) => ({
            ...current,
            modelMessage: modelMessageFor(response, hydraChunks.length),
            modelProvider: response.provider,
            modelUsed: response.usedModel,
          }));
        }
      } catch (error) {
        markStep("generate", "error");
        if (isCurrent()) {
          setState((current) =>
            updateAgentMessage(current, result.response.id, {
              text:
                error instanceof Error
                  ? `I could not get a live model response: ${error.message}`
                  : "I could not get a live model response.",
              explanation:
                "No fallback answer was rendered because inference failed.",
            })
          );
          setLastTurn((current) => ({
            ...current,
            modelMessage:
              error instanceof Error
                ? error.message
                : "AI SDK inference failed with an unknown error.",
          }));
        }
      }
    } finally {
      setIsSending(false);
    }
  };

  const handleSeedHydra = async () => {
    setHydraBusy(true);
    try {
      const summary = await fetchJson<{ message: string; configured: boolean }>(
        "/api/hydradb/seed",
        { method: "POST" }
      );
      const status = await fetchJson<HydraStatus>("/api/hydradb/status");
      setHydraStatus(status);
      setState((current) =>
        appendHydraEvent(current, "HydraDB seeded", summary.message)
      );
      setLastTurn((current) => ({
        ...current,
        hydraMessage: summary.message,
      }));
    } catch (error) {
      setLastTurn((current) => ({
        ...current,
        hydraMessage:
          error instanceof Error
            ? error.message
            : "HydraDB seed failed with an unknown error.",
      }));
    } finally {
      setHydraBusy(false);
    }
  };

  const openCreate = () => {
    setCustomName("");
    setCustomDescription("");
    setCustomPersonality("");
    setCustomRecall("");
    setCustomMood("curious");
    setIsCreating(true);
  };

  const createProfile = () => {
    const name = customName.trim();
    if (!name) return;
    const profile = createCustomAgentProfile({
      name,
      description: customDescription.trim(),
      personality: customPersonality.trim(),
      mood: customMood,
      recallStrategy: customRecall.trim() || undefined,
    });
    const next = addCustomProfileState(profiles, profile);
    setProfiles(next);
    writeStoredAgents(next);
    setSelectedProfileId(profile.id);
    setIsCreating(false);
  };

  const deleteProfile = (id: string) => {
    const next = profiles.filter((profile) => profile.id !== id);
    setProfiles(next);
    writeStoredAgents(next);
    if (selectedProfileId === id) {
      setSelectedProfileId(next[0]?.id ?? "new-agent");
    }
  };

  const applySuggestion = (text: string) => {
    setMessage(text);
    composerRef.current?.focus();
  };

  const customProfiles = profiles.filter(isCustomProfile);
  const exampleProfiles = profiles.filter(
    (profile) => !isCustomProfile(profile)
  );

  const parameterEntries = Object.entries(state.parameters) as Array<
    [keyof BrainParameters, number]
  >;

  const controlRoom = (
    <section className="control-room-section" id="control-room">
      <div className="section-intro control-room-intro">
        <div>
          <p className="section-kicker">Memory Studio</p>
          <h2>Configure how adaptive agents remember.</h2>
        </div>
        <p>
          MyndMemory Studio is the developer console for the memory prompting
          framework. Compare profiles, tune memory policies, inspect HydraDB
          retrieval, and watch remembered context reshape the agent's answer in
          real time.
        </p>
      </div>

      <div className="app-shell">
        <section className="topbar">
          <div>
            <div className="eyebrow">
              <BrandLogo compact tone="dark" />
              Memory prompting framework
            </div>
            <h1>MyndMemory Studio</h1>
          </div>
          <div
            className={`hydra-pill ${hydraStatus?.configured ? "is-on" : ""}`}
          >
            <Database size={17} aria-hidden="true" />
            <span>HydraDB</span>
            <strong>{hydraStatus?.configured ? "configured" : "local"}</strong>
          </div>
        </section>

        <section className="workspace-grid">
          <aside className="panel profile-panel">
            <div className="panel-heading split">
              <span>
                <UserRound size={18} aria-hidden="true" />
                <h2>Agents</h2>
              </span>
              <button
                className="ghost-action"
                onClick={openCreate}
                type="button"
              >
                <Plus size={15} aria-hidden="true" />
                New
              </button>
            </div>

            <div className="profile-scroll">
              {customProfiles.length > 0 ? (
                <div className="profile-group">
                  <p className="profile-group-label">Your agents</p>
                  <div className="profile-list">
                    {customProfiles.map((profile) => (
                      <ProfileRow
                        deletable
                        key={profile.id}
                        onDelete={() => deleteProfile(profile.id)}
                        onSelect={() => setSelectedProfileId(profile.id)}
                        profile={profile}
                        selected={profile.id === selectedProfileId}
                      />
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="profile-group">
                <p className="profile-group-label">Example agents</p>
                <div className="profile-list">
                  {exampleProfiles.map((profile) => (
                    <ProfileRow
                      key={profile.id}
                      onSelect={() => setSelectedProfileId(profile.id)}
                      profile={profile}
                      selected={profile.id === selectedProfileId}
                    />
                  ))}
                </div>
              </div>

              <div className="profile-summary">
                <h3>{selectedProfile.name}</h3>
                <p>{selectedProfile.description}</p>
                <dl>
                  <div>
                    <dt>Style</dt>
                    <dd>{selectedProfile.operatingStyle}</dd>
                  </div>
                  <div>
                    <dt>Recall</dt>
                    <dd>{selectedProfile.recallStrategy}</dd>
                  </div>
                </dl>
              </div>
            </div>

            <div
              className="profile-session"
              title="No account needed — agents you create are saved in this browser only."
            >
              <ShieldCheck size={14} aria-hidden="true" />
              <span>Temporary session · {sessionId || "local"}</span>
            </div>
          </aside>

          <section className="panel chat-panel">
            <div className="panel-heading split">
              <span>
                <Zap size={18} aria-hidden="true" />
                <h2>Chat</h2>
              </span>
              <span className="chat-agent-tag">{selectedProfile.name}</span>
            </div>
            <div className="chat-log" ref={chatLogRef}>
              {visibleMessages.length === 0 ? (
                <div className="chat-empty">
                  <span className="chat-empty-badge" aria-hidden="true">
                    <Sparkles size={20} />
                  </span>
                  <strong>Chat with {selectedProfile.name}</strong>
                  <p>
                    Your first message becomes the retrieval query. MyndMemory
                    captures it, scores it, and the agent answers from memory.
                  </p>
                  <div className="chat-suggestions">
                    {suggestedPrompts.map((prompt) => (
                      <button
                        className="chat-suggestion"
                        key={prompt}
                        onClick={() => applySuggestion(prompt)}
                        type="button"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                visibleMessages.map((item) => {
                  const isPending =
                    item.explanation === pendingAgentExplanation;
                  return (
                    <article
                      aria-busy={isPending}
                      className={`message ${item.role} ${
                        isPending ? "is-pending" : ""
                      }`}
                      key={item.id}
                    >
                      <div>
                        {item.role === "user" ? "User" : state.profile.name}
                      </div>
                      <p>{item.content}</p>
                      {item.explanation ? (
                        <small>{item.explanation}</small>
                      ) : null}
                    </article>
                  );
                })
              )}
            </div>
            {turnSteps.length > 0 ? (
              <div className="turn-steps">
                {turnSteps.map((step) => (
                  <div className={`turn-step is-${step.status}`} key={step.id}>
                    <span className="turn-step-dot" aria-hidden="true" />
                    <span className="turn-step-label">{step.label}</span>
                  </div>
                ))}
              </div>
            ) : null}
            <div className="composer">
              <textarea
                disabled={isSending}
                onChange={(event) => setMessage(event.target.value)}
                onKeyDown={(event) => {
                  if (
                    event.key === "Enter" &&
                    (event.metaKey || event.ctrlKey)
                  ) {
                    event.preventDefault();
                    void handleSend();
                  }
                }}
                placeholder={`Message ${selectedProfile.name}…  (⌘↵ to send)`}
                ref={composerRef}
                value={message}
              />
              <button
                aria-label="Send message"
                className={`icon-action send ${isSending ? "is-busy" : ""}`}
                disabled={isSending || message.trim().length === 0}
                onClick={() => void handleSend()}
                title={isSending ? "Sending…" : "Send"}
                type="button"
              >
                <Send size={18} aria-hidden="true" />
              </button>
            </div>
          </section>

          <section className="panel memory-panel">
            <div className="panel-heading split">
              <span>
                <GitBranch size={18} aria-hidden="true" />
                <h2>Memory Map</h2>
              </span>
              <div className="memory-heading-actions">
                <div className="memory-mode-switch">
                  {memoryMapModes.map((mode) => (
                    <button
                      aria-pressed={memoryMapMode === mode.id}
                      className={memoryMapMode === mode.id ? "is-active" : ""}
                      key={mode.id}
                      onClick={() => setMemoryMapMode(mode.id)}
                      type="button"
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>
                <time>{formatSimulatedTime(state.simulatedNow)}</time>
              </div>
            </div>
            <div className="memory-map">
              {memoryRadarData.length === 0 ? (
                <div className="empty-map">
                  <Brain size={26} aria-hidden="true" />
                  <strong>No memories yet</strong>
                  <span>
                    Send a message in the chat — MyndMemory captures it, scores
                    it, and plots it here as memory forms.
                  </span>
                </div>
              ) : (
                <div className="memory-explorer">
                  <div className="memory-visual">
                    {memoryMapMode === "radar" ? (
                      <MemoryRadarView
                        chartReady={chartReady}
                        data={memoryRadarData}
                        onThemeSelect={(themeId) => {
                          const next = state.memories.find(
                            (memory) => memory.theme === themeId
                          );
                          setSelectedMemoryId(next?.id);
                        }}
                      />
                    ) : null}
                    {memoryMapMode === "network" ? (
                      <MemoryNetworkView
                        memories={state.memories}
                        onSelect={setSelectedMemoryId}
                        selectedMemoryId={selectedMemory?.id}
                      />
                    ) : null}
                    {memoryMapMode === "matrix" ? (
                      <MemoryMatrixView
                        onSelect={setSelectedMemoryId}
                        rows={memoryMatrixRows}
                      />
                    ) : null}
                  </div>
                  <MemoryInspector
                    memory={selectedMemory}
                    themeMemories={selectedThemeMemories}
                  />
                </div>
              )}
            </div>
            <div className="state-counters">
              {(Object.keys(counts) as MemoryState[]).map((key) => (
                <div key={key}>
                  <span style={{ background: stateColor[key] }} />
                  <strong>{counts[key]}</strong>
                  <small>{memoryStateLabels[key]}</small>
                </div>
              ))}
            </div>
          </section>

          <section className="panel dashboard-panel">
            <div className="panel-heading split">
              <span>
                <Activity size={18} aria-hidden="true" />
                <h2>Live Trace</h2>
              </span>
              <button
                className="secondary-action"
                disabled={hydraBusy}
                onClick={() => void handleSeedHydra()}
                type="button"
              >
                <Database size={16} aria-hidden="true" />
                {hydraBusy ? "Seeding" : "Seed HydraDB"}
              </button>
            </div>

            <h3 className="trace-subhead">Last turn</h3>
            <div className="trace-grid">
              <TraceList
                memories={lastTurn.retrieved}
                title="Retrieved"
                value={(memory) => formatScore(memory.importance)}
              />
              <TraceList
                memories={lastTurn.created}
                title="Created"
                value={(memory) => memory.state.replace("_", " ")}
              />
            </div>

            <div className="hydra-box">
              <div className="hydra-box-head">
                <Database size={18} aria-hidden="true" />
                <strong>{hydraStatus?.tenantId ?? "HydraDB"}</strong>
                <span
                  className={`hydra-plan-badge ${
                    queryPlan.mode === "thinking" ? "is-thinking" : ""
                  }`}
                >
                  {queryPlan.mode}
                </span>
              </div>
              <p
                className="hydra-plan-line"
                title="Retrieval strategy derived from the current brain parameters"
              >
                Plan: {queryPlan.summary}
              </p>
              <p>{lastTurn.hydraMessage}</p>
              {lastTurn.hydraMeta ? (
                <div className="hydra-stats">
                  {lastTurn.hydraMeta.applied ? (
                    <>
                      <span>mode {lastTurn.hydraMeta.applied.mode}</span>
                      <span>{lastTurn.hydraMeta.applied.queryBy}</span>
                      <span>
                        alpha {String(lastTurn.hydraMeta.applied.alpha)}
                      </span>
                      <span>top {lastTurn.hydraMeta.applied.maxResults}</span>
                      <span>
                        graph{" "}
                        {lastTurn.hydraMeta.applied.graphContext ? "on" : "off"}
                      </span>
                    </>
                  ) : null}
                  {lastTurn.hydraMeta.latencyMs != null ? (
                    <span>{lastTurn.hydraMeta.latencyMs}ms</span>
                  ) : null}
                  {lastTurn.hydraMeta.requestId ? (
                    <span className="hydra-reqid" title="HydraDB request id">
                      {lastTurn.hydraMeta.requestId}
                    </span>
                  ) : null}
                </div>
              ) : null}
              {lastTurn.hydraChunks.length > 0 ? (
                <ol className="hydra-chunks">
                  {lastTurn.hydraChunks.slice(0, 5).map((chunk) => {
                    const provenance =
                      chunk.sourceType ??
                      String(
                        chunk.metadata.memory_type ??
                          chunk.metadata.agent_id ??
                          chunk.metadata.theme ??
                          ""
                      );
                    const width = Math.round(
                      Math.min(1, Math.max(0, chunk.score)) * 100
                    );
                    return (
                      <li key={chunk.id}>
                        <div className="hydra-chunk-head">
                          <strong>{chunk.title}</strong>
                          <span>{formatScore(chunk.score)}</span>
                        </div>
                        <div className="hydra-relbar">
                          <span style={{ width: `${width}%` }} />
                        </div>
                        {provenance ? <small>{provenance}</small> : null}
                      </li>
                    );
                  })}
                </ol>
              ) : null}
            </div>

            <div className="model-box">
              <div>
                <Brain size={18} aria-hidden="true" />
                <strong>Inference</strong>
                <span>{lastTurn.modelProvider}</span>
              </div>
              <p>{lastTurn.modelMessage}</p>
            </div>

            {lastTurn.semanticProvider === "nebius" &&
            lastTurn.retrieved.length > 0 ? (
              <div className="nebius-box">
                <div className="nebius-box-head">
                  <Brain size={18} aria-hidden="true" />
                  <strong>Nebius semantic re-rank</strong>
                  {lastTurn.semanticModel ? (
                    <span>{lastTurn.semanticModel}</span>
                  ) : null}
                </div>
                <p>Lexical keyword score vs Nebius meaning score.</p>
                <ul className="nebius-scores">
                  {lastTurn.retrieved.slice(0, 5).map((memory) => {
                    const semantic = lastTurn.semanticScores?.[memory.id];
                    return (
                      <li key={memory.id}>
                        <span className="nebius-theme">
                          {formatThemeLabel(memory.theme)}
                        </span>
                        <span className="nebius-lex" title="Lexical importance">
                          lex {formatScore(memory.importance)}
                        </span>
                        <span
                          className="nebius-sem"
                          title="Nebius cosine similarity"
                        >
                          sem {semantic != null ? formatScore(semantic) : "—"}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : null}

            <h3 className="trace-subhead">Memory by state</h3>
            <div className="memory-columns">
              <MemoryColumn title="Working" memories={activeMemories} />
              <MemoryColumn title="Long-term" memories={longTermMemories} />
              <MemoryColumn title="Fading" memories={candidateMemories} />
            </div>
          </section>

          <section className="panel controls-panel">
            <div className="panel-heading">
              <SlidersHorizontal size={18} aria-hidden="true" />
              <h2>Brain Parameters</h2>
            </div>
            <div className="control-list">
              {parameterEntries.map(([key, value]) => {
                const isCapacity = key === "shortTermCapacity";
                return (
                  <label key={key}>
                    <span>
                      {parameterLabels[key]}
                      <b>{isCapacity ? value : value.toFixed(2)}</b>
                    </span>
                    <input
                      max={isCapacity ? 9 : 1}
                      min={isCapacity ? 2 : 0}
                      onChange={(event) =>
                        setState((current) =>
                          updateBrainParameter(
                            current,
                            key,
                            Number(event.target.value)
                          )
                        )
                      }
                      step={isCapacity ? 1 : 0.01}
                      type="range"
                      value={value}
                    />
                  </label>
                );
              })}
            </div>

            <div className="time-controls">
              <button
                onClick={() =>
                  setState((current) => advanceSimulatedTime(current, 1))
                }
                type="button"
              >
                <Clock size={16} aria-hidden="true" />1 hour
              </button>
              <button
                onClick={() =>
                  setState((current) => advanceSimulatedTime(current, 24))
                }
                type="button"
              >
                <Clock size={16} aria-hidden="true" />1 day
              </button>
              <button
                onClick={() =>
                  setState((current) => advanceSimulatedTime(current, 24 * 7))
                }
                type="button"
              >
                <Clock size={16} aria-hidden="true" />1 week
              </button>
              <button
                onClick={() =>
                  setState((current) => runConsolidationCycle(current))
                }
                type="button"
              >
                <GitBranch size={16} aria-hidden="true" />
                Consolidate
              </button>
              <button
                onClick={() => setState(getProfileState(selectedProfile))}
                type="button"
              >
                <RotateCcw size={16} aria-hidden="true" />
                Reset
              </button>
            </div>
          </section>

          <section className="panel event-panel">
            <div className="panel-heading split">
              <span>
                <Activity size={18} aria-hidden="true" />
                <h2>Event Log</h2>
              </span>
              <span className="event-count">{filteredEvents.length}</span>
            </div>
            <div className="event-filters">
              {eventFilters.map((filter) => (
                <button
                  className={eventFilter === filter.id ? "is-active" : ""}
                  key={filter.id}
                  onClick={() => setEventFilter(filter.id)}
                  type="button"
                >
                  {filter.label}
                </button>
              ))}
            </div>
            <div className="event-log">
              {filteredEvents.length === 0 ? (
                <p className="event-empty">No events for this filter yet.</p>
              ) : null}
              {filteredEvents.map((item) => {
                const meta = eventKindMeta[item.kind];
                return (
                  <article
                    className="event-item"
                    key={item.id}
                    style={{ "--event-color": meta.color } as CSSProperties}
                  >
                    <span className="event-dot" aria-hidden="true" />
                    <div className="event-body">
                      <div className="event-top">
                        <strong>{item.title}</strong>
                        {typeof item.score === "number" ? (
                          <em>{formatScore(item.score)}</em>
                        ) : null}
                      </div>
                      <p>{item.detail}</p>
                      <span className="event-kind">{meta.label}</span>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        </section>
      </div>

      {isCreating ? (
        <div className="agent-modal-backdrop" role="presentation">
          <div
            aria-labelledby="agent-modal-title"
            aria-modal="true"
            className="agent-modal"
            role="dialog"
          >
            <div className="agent-modal-head">
              <div>
                <p className="section-kicker">New agent</p>
                <h2 id="agent-modal-title">Create a memory agent</h2>
              </div>
              <button
                aria-label="Close"
                className="modal-close"
                onClick={() => setIsCreating(false)}
                type="button"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>
            <p className="agent-modal-sub">
              Define how this agent behaves. It starts blank and forms memories
              as you chat. Saved to this browser session only — no account
              needed.
            </p>
            <div className="agent-modal-body">
              <label className="full">
                Name
                <input
                  onChange={(event) => setCustomName(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") createProfile();
                  }}
                  placeholder="e.g. Support Copilot"
                  value={customName}
                />
              </label>
              <label>
                Mood
                <select
                  onChange={(event) =>
                    setCustomMood(event.target.value as AgentMood)
                  }
                  value={customMood}
                >
                  {moodOptions.map((mood) => (
                    <option key={mood} value={mood}>
                      {mood}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Recall strategy <span className="optional">optional</span>
                <input
                  onChange={(event) => setCustomRecall(event.target.value)}
                  placeholder="Balanced memory-aware retrieval"
                  value={customRecall}
                />
              </label>
              <label className="full">
                Description
                <textarea
                  onChange={(event) => setCustomDescription(event.target.value)}
                  placeholder="What is this agent for?"
                  rows={2}
                  value={customDescription}
                />
              </label>
              <label className="full">
                Personality
                <textarea
                  onChange={(event) => setCustomPersonality(event.target.value)}
                  placeholder="How should it sound and reason?"
                  rows={2}
                  value={customPersonality}
                />
              </label>
            </div>
            <div className="agent-modal-foot">
              <button
                className="ghost-action"
                onClick={() => setIsCreating(false)}
                type="button"
              >
                Cancel
              </button>
              <button
                className="primary-action"
                disabled={customName.trim().length === 0}
                onClick={createProfile}
                type="button"
              >
                <Plus size={16} aria-hidden="true" />
                Create agent
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );

  if (view === "console") {
    return (
      <main className="console-shell">
        <header className="console-topbar">
          <a className="console-brand" href="/">
            <BrandLogo tone="dark" />
          </a>
          <nav className="console-nav">
            <span className="console-context">Memory Studio</span>
            <a className="console-back" href="/">
              Back to site
            </a>
            <div
              className={`hydra-pill ${hydraStatus?.configured ? "is-on" : ""}`}
            >
              <Database size={16} aria-hidden="true" />
              <span>HydraDB</span>
              <strong>
                {hydraStatus?.configured ? "configured" : "local"}
              </strong>
            </div>
          </nav>
        </header>
        {controlRoom}
      </main>
    );
  }

  return (
    <main className="site-shell">
      <MarketingHero />
      <ArchitectureSection />
      <RealTimeDemoSection />
      <PlatformSection />
      <UseCaseSection />
      <WaitlistSection />
    </main>
  );
}

function ProfileRow({
  profile,
  selected,
  onSelect,
  deletable = false,
  onDelete,
}: {
  profile: AgentProfile;
  selected: boolean;
  onSelect: () => void;
  deletable?: boolean;
  onDelete?: () => void;
}) {
  return (
    <div className={`profile-row ${selected ? "is-selected" : ""}`}>
      <button className="profile-row-main" onClick={onSelect} type="button">
        <span className="profile-row-text">
          <strong>{profile.name}</strong>
          <small>{profile.memoryAge}</small>
        </span>
        <b>{profile.mood}</b>
      </button>
      {deletable && onDelete ? (
        <button
          aria-label={`Delete ${profile.name}`}
          className="profile-row-delete"
          onClick={onDelete}
          title="Delete agent"
          type="button"
        >
          <Trash2 size={14} aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}

function BrandLogo({
  compact = false,
  tone = "light",
}: {
  compact?: boolean;
  tone?: "light" | "dark";
}) {
  return (
    <span className={`brand-logo ${compact ? "is-compact" : ""} is-${tone}`}>
      <span className="brand-mark" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
        <span />
        <span className="is-dot" />
        <span />
        <span />
        <span />
      </span>
      {compact ? null : (
        <span className="brand-word">
          <strong>MyndMemory</strong>
          <small>.com</small>
        </span>
      )}
    </span>
  );
}

function MarketingHero() {
  return (
    <section className="hero-section" id="top">
      <nav className="hero-nav" aria-label="Primary">
        <a className="hero-brand-link" href="#top">
          <BrandLogo tone="dark" />
        </a>
        <div className="hero-nav-links">
          <a href="#platform">Framework</a>
          <a href="#architecture">Architecture</a>
          <a href="#demo">Live demo</a>
          <a href="#use-cases">Use cases</a>
          <a href="#waitlist">MCP &amp; skills</a>
          <a className="nav-cta" href="/console">
            Open console
          </a>
        </div>
      </nav>

      <div className="hero-content">
        <div className="hero-copy">
          <p className="hero-kicker">
            <span className="coined-term">We coined memory prompting</span>
            <span>for adaptive agents</span>
          </p>
          <h1>
            Build agents that
            <br />
            remember, learn,
            <br />
            and <span>evolve.</span>
          </h1>
          <p className="hero-lede">
            MyndMemory is our individualized framework for building AI
            applications with human-like memory. It lets developers configure
            agent profiles that capture context, score what matters, persist
            memory through HydraDB, and recall the right knowledge through a
            dedicated memory prompt.
          </p>
          <div className="hero-actions">
            <a className="primary-link" href="/console">
              Open console
              <ArrowRight size={18} aria-hidden="true" />
            </a>
            <a className="secondary-link" href="#demo">
              Watch the demo
            </a>
          </div>
          <dl className="hero-stats">
            {heroStats.map((item) => (
              <div key={item.label}>
                <dt>{item.value}</dt>
                <dd>{item.label}</dd>
              </div>
            ))}
          </dl>
        </div>

        <LivingBrainGrid />
      </div>

      <div className="hero-footer">
        <span>We invented memory prompting</span>
        <span>On HydraDB + Nebius Token Factory</span>
        <span>Memory Studio console included</span>
      </div>
    </section>
  );
}

type GridCell = {
  col: number;
  row: number;
  x: number;
  y: number;
  dist: number;
};

const GRID_COLS = 6;
const GRID_ROWS = 4;
const CELL_W = 100;
const CELL_H = 80;
const GRID_X = 70;
const GRID_Y = 70;
// The first memory forms here; learning then ripples outward from this cell.
const SEED_COL = 4;
const SEED_ROW = 2;
const CELL_INSET = 7;

function LivingBrainGrid() {
  const cells: GridCell[] = [];
  for (let row = 0; row < GRID_ROWS; row += 1) {
    for (let col = 0; col < GRID_COLS; col += 1) {
      cells.push({
        col,
        row,
        x: GRID_X + col * CELL_W,
        y: GRID_Y + row * CELL_H,
        dist: Math.hypot(col - SEED_COL, row - SEED_ROW),
      });
    }
  }

  const maxDist = Math.max(...cells.map((cell) => cell.dist));
  // Cells light up in order of distance from the seed, so the grid appears to
  // "fill in" as memory spreads outward instead of all at once.
  const learningOrder = [...cells].sort(
    (left, right) => left.dist - right.dist
  );
  const orderOf = new Map(
    learningOrder.map((cell, index) => [`${cell.col}:${cell.row}`, index])
  );
  const coreCells = learningOrder.slice(0, 5); // seed + four nearest memories
  const seedCell = coreCells[0]!;
  const centerOf = (cell: GridCell) => ({
    cx: cell.x + CELL_W / 2,
    cy: cell.y + CELL_H / 2,
  });
  const seedCenter = centerOf(seedCell);
  const links = coreCells.slice(1).map((cell) => {
    const target = centerOf(cell);
    return {
      key: `${cell.col}:${cell.row}`,
      to: target,
      length: Math.hypot(target.cx - seedCenter.cx, target.cy - seedCenter.cy),
      order: orderOf.get(`${cell.col}:${cell.row}`) ?? 0,
    };
  });

  const horizontalLines = Array.from(
    { length: GRID_ROWS + 1 },
    (_, index) => GRID_Y + index * CELL_H
  );
  const verticalLines = Array.from(
    { length: GRID_COLS + 1 },
    (_, index) => GRID_X + index * CELL_W
  );
  const gridRight = GRID_X + GRID_COLS * CELL_W;
  const gridBottom = GRID_Y + GRID_ROWS * CELL_H;

  return (
    <div className="living-grid-visual" aria-hidden="true">
      <svg role="img" viewBox="0 0 760 460">
        <title>Agent memory grid filling in as it learns</title>
        <defs>
          <linearGradient id="gridGlow" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor="#65e0bd" stopOpacity="0.95" />
            <stop offset="0.52" stopColor="#ffffff" stopOpacity="0.52" />
            <stop offset="1" stopColor="#65e0bd" stopOpacity="0.18" />
          </linearGradient>
          <filter id="mintGlow" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur result="blur" stdDeviation="10" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <g className="grid-base">
          {horizontalLines.map((y) => (
            <line key={`h-${y}`} x1={GRID_X} y1={y} x2={gridRight} y2={y} />
          ))}
          {verticalLines.map((x) => (
            <line key={`v-${x}`} x1={x} y1={GRID_Y} x2={x} y2={gridBottom} />
          ))}
        </g>

        <g className="grid-cells">
          {cells.map((cell) => {
            const order = orderOf.get(`${cell.col}:${cell.row}`) ?? 0;
            const lit = 0.14 + (1 - cell.dist / maxDist) * 0.32;
            const isStrong = cell.dist <= 1.45;
            return (
              <rect
                className={`memory-cell ${isStrong ? "is-strong" : ""}`}
                key={`${cell.col}:${cell.row}`}
                x={cell.x + CELL_INSET}
                y={cell.y + CELL_INSET}
                width={CELL_W - CELL_INSET * 2}
                height={CELL_H - CELL_INSET * 2}
                rx="5"
                style={
                  {
                    "--lit": lit.toFixed(3),
                    animationDelay: `${(order * 0.13).toFixed(2)}s`,
                  } as CSSProperties
                }
              />
            );
          })}
        </g>

        <g className="grid-links">
          {links.map((link) => (
            <path
              className="memory-link"
              key={link.key}
              d={`M${seedCenter.cx} ${seedCenter.cy} L${link.to.cx} ${link.to.cy}`}
              style={
                {
                  "--len": link.length.toFixed(1),
                  strokeDasharray: link.length.toFixed(1),
                  animationDelay: `${(link.order * 0.13 + 0.5).toFixed(2)}s`,
                } as CSSProperties
              }
            />
          ))}
        </g>

        <line
          className="scan-sweep"
          x1={GRID_X}
          y1={GRID_Y}
          x2={GRID_X}
          y2={gridBottom}
        />

        <g className="memory-attention">
          <rect
            className="memory-focus"
            x={seedCell.x}
            y={seedCell.y}
            width={CELL_W}
            height={CELL_H}
          />
          <circle
            className="memory-dot"
            cx={seedCenter.cx}
            cy={seedCenter.cy}
            r="22"
            filter="url(#mintGlow)"
          />
        </g>
      </svg>
    </div>
  );
}

function ArchitectureSection() {
  return (
    <section className="brand-section" id="architecture">
      <div className="section-intro">
        <div>
          <p className="section-kicker">
            From chat prompting to coined memory prompting
          </p>
          <h2>The individualized memory framework we constructed.</h2>
        </div>
        <p>
          We use memory prompting to describe a new layer between app events and
          agent reasoning: MyndMemory captures profile-specific context, scores
          importance and confidence, moves memories through state transitions,
          persists durable recall in HydraDB, and exposes the behavior in Memory
          Studio.
        </p>
      </div>

      <div className="brand-system-grid">
        <article className="brand-card brand-card-dark">
          <p>Chat prompting</p>
          <h3>Flat and forgetful.</h3>
          <span>
            Linear and session-bound. Every turn depends on what fits in the
            current context window, so builders keep re-explaining the same
            preferences, goals, and decisions.
          </span>
        </article>
        <article className="brand-card">
          <p>Memory prompting</p>
          <span>
            Our coined approach. Agents receive a memory prompt assembled from
            scored, profile-scoped context that evolves across users, sessions,
            and applications.
          </span>
        </article>
        <article className="brand-card brand-rationale-card">
          <p>The upgrade</p>
          <h3>Agents that evolve instead of reset.</h3>
          <span>
            MyndMemory turns memory from hidden prompt engineering into a
            concrete framework: lifecycle states, scoring, HydraDB recall,
            Nebius semantic rank, and Memory Studio inspection.
          </span>
        </article>
      </div>

      <ol aria-label="Memory runtime pipeline" className="memory-pipeline">
        {memoryPipeline.map((step, index) => (
          <li className="memory-pipeline-step" key={step}>
            <span>{step}</span>
            {index < memoryPipeline.length - 1 ? (
              <ArrowRight size={15} aria-hidden="true" />
            ) : null}
          </li>
        ))}
      </ol>

      <div className="memory-stack">
        {architectureLayers.map((layer) => (
          <article className="memory-stack-layer" key={layer.name}>
            <div className="memory-stack-name">
              <strong>{layer.name}</strong>
              <em>{layer.role}</em>
            </div>
            <p>{layer.body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function RealTimeDemoSection() {
  return (
    <section className="demo-section" id="demo">
      <div className="section-intro">
        <div>
          <p className="section-kicker">Real-time demo</p>
          <h2>What our memory prompting framework does during a live turn.</h2>
        </div>
        <p>
          A user message becomes individualized memory: captured from the app
          event, scored by the MyndMemory runtime, persisted through HydraDB,
          ranked with Nebius semantics, and returned as grounded context for the
          agent response.
        </p>
      </div>

      <div className="demo-runtime">
        <article className="demo-app">
          <div className="demo-app-head">
            <span>
              <BrandLogo compact tone="dark" />
              Agent memory run
            </span>
            <strong>
              <Activity size={15} aria-hidden="true" />
              live replay
            </strong>
          </div>

          <div className="demo-chat-feed">
            <div className="demo-message user">
              <span>User</span>
              <p>
                Can you help plan the launch tasks and remember that reliability
                matters more than visual polish this week?
              </p>
            </div>
            <div className="demo-message agent">
              <span>Agent with memory</span>
              <p>
                I found your launch-planning preference and the earlier decision
                to prioritize reliability. I would start with regression checks,
                overflow fixes, and retrieval traces before adding polish.
              </p>
            </div>
          </div>

          <ul className="demo-memory-strip" aria-label="Recalled memories">
            {demoMemorySignals.map((memory) => (
              <li className="demo-memory-signal" key={memory.title}>
                <div>
                  <strong>{memory.title}</strong>
                  <em>{memory.score}</em>
                </div>
                <p>{memory.body}</p>
              </li>
            ))}
          </ul>

          <div className="demo-context-row">
            <span>
              <Database size={16} aria-hidden="true" />
              HydraDB scoped recall
            </span>
            <span>
              <Sparkles size={16} aria-hidden="true" />
              Nebius semantic rank
            </span>
            <span>
              <Brain size={16} aria-hidden="true" />
              Memory prompt assembled
            </span>
          </div>
        </article>

        <ol className="demo-step-list">
          {liveDemoSteps.map((step) => (
            <li key={step.title}>
              <span>{step.label}</span>
              <div>
                <strong>{step.title}</strong>
                <p>{step.body}</p>
                <em>{step.status}</em>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function PlatformSection() {
  return (
    <section className="platform-section" id="platform">
      <div className="section-intro">
        <div>
          <p className="section-kicker">The framework</p>
          <h2>The control plane for memory prompting.</h2>
        </div>
        <p>
          MyndMemory turns HydraDB-backed storage into an individualized memory
          system: agent profiles, scoring policies, lifecycle rules, recall
          traces, Memory Studio controls, and memory prompt assembly for final
          answers.
        </p>
      </div>

      <div className="pillar-grid">
        {platformPillars.map((pillar) => {
          const Icon = pillar.icon;
          return (
            <article className="pillar-card" key={pillar.title}>
              <Icon size={22} aria-hidden="true" />
              <h3>{pillar.title}</h3>
              <p>{pillar.body}</p>
            </article>
          );
        })}
      </div>

      <div className="proof-band">
        <div>
          <p className="section-kicker">Why it matters</p>
          <h2>Applications need agents that compound context.</h2>
          <p>
            Compare a blank-slate agent with one that has history, ask the same
            question, and watch remembered preferences reshape the answer. That
            is why we coined memory prompting: memory becomes a configurable
            system instead of hand-written context pasted into every prompt.
          </p>
        </div>
        <div className="proof-grid">
          {productProof.map((item) => {
            const Icon = item.icon;
            return (
              <article key={item.title}>
                <Icon size={20} aria-hidden="true" />
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function UseCaseSection() {
  return (
    <section className="use-case-section" id="use-cases">
      <div className="use-case-copy">
        <p className="section-kicker">Where it fits</p>
        <h2>For builders shipping agents into real workflows.</h2>
        <p>
          Use MyndMemory when the agent needs to get better with the
          relationship: remember user preferences, project context, goals,
          decisions, and recurring patterns without turning every interaction
          into prompt maintenance.
        </p>
        <div className="use-case-list">
          {useCases.map((item) => (
            <div key={item}>
              <CheckCircle2 size={18} aria-hidden="true" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="system-panel">
        <div className="system-panel-head">
          <Sparkles size={19} aria-hidden="true" />
          <strong>Memory lifecycle</strong>
        </div>
        <ol>
          {systemSteps.map((step, index) => (
            <li key={step}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <p>{step}</p>
            </li>
          ))}
        </ol>
        <div className="system-panel-footer">
          <span>
            <Search size={16} aria-hidden="true" />
            Hybrid retrieval
          </span>
          <span>
            <LockKeyhole size={16} aria-hidden="true" />
            Server-side keys
          </span>
        </div>
      </div>
    </section>
  );
}

function WaitlistSection() {
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">(
    "idle"
  );
  const [message, setMessage] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = email.trim();
    if (!value || status === "loading") return;
    setStatus("loading");
    setMessage("");
    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: value, website, source: "site" }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        message?: string;
      };
      if (!response.ok || !data.ok) {
        setStatus("error");
        setMessage(data.message ?? "Something went wrong. Please try again.");
        return;
      }
      setStatus("done");
      setMessage(
        data.message ??
          "You're on the list — we'll be in touch when access opens."
      );
    } catch {
      setStatus("error");
      setMessage("Network error. Please try again.");
    }
  };

  return (
    <section className="waitlist-section" id="waitlist">
      <div className="waitlist-inner">
        <div className="waitlist-copy">
          <p className="section-kicker">Coming soon</p>
          <h2>Drop MyndMemory into any agent.</h2>
          <p>
            An MCP server and ready-made skills are on the way — so your agents
            can capture, score, and recall memory through MyndMemory without
            wiring the framework by hand. Join the waitlist for early access.
          </p>

          <div className="coming-soon-grid">
            <article className="coming-soon-card">
              <div className="coming-soon-card-head">
                <Plug size={18} aria-hidden="true" />
                <strong>MCP server</strong>
                <span className="coming-soon-badge">Coming soon</span>
              </div>
              <p>
                Connect MyndMemory as a Model Context Protocol server. Your
                agent gets memory tools — capture, recall, consolidate — over a
                standard interface, with no glue code.
              </p>
            </article>
            <article className="coming-soon-card">
              <div className="coming-soon-card-head">
                <Puzzle size={18} aria-hidden="true" />
                <strong>Skills</strong>
                <span className="coming-soon-badge">Coming soon</span>
              </div>
              <p>
                Install drop-in skills that teach an agent memory prompting out
                of the box — capture preferences, recall context, and ground
                answers automatically.
              </p>
            </article>
          </div>
        </div>

        <div className="waitlist-form-card">
          {status === "done" ? (
            <div className="waitlist-success">
              <CheckCircle2 size={26} aria-hidden="true" />
              <strong>You're on the list.</strong>
              <span>{message}</span>
            </div>
          ) : (
            <form className="waitlist-form" onSubmit={handleSubmit} noValidate>
              <label htmlFor="waitlist-email">Get early access</label>
              <div className="waitlist-input-row">
                <input
                  autoComplete="email"
                  disabled={status === "loading"}
                  id="waitlist-email"
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@company.com"
                  required
                  type="email"
                  value={email}
                />
                <button disabled={status === "loading"} type="submit">
                  {status === "loading" ? "Joining…" : "Join the waitlist"}
                  <ArrowRight size={17} aria-hidden="true" />
                </button>
              </div>
              <input
                aria-hidden="true"
                autoComplete="off"
                className="waitlist-hp"
                name="website"
                onChange={(event) => setWebsite(event.target.value)}
                tabIndex={-1}
                value={website}
              />
              {status === "error" ? (
                <p className="waitlist-error">{message}</p>
              ) : null}
              <p className="waitlist-note">
                Early access to the MCP server and skills. No spam — just a
                heads-up the moment it's ready.
              </p>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}

function TraceList({
  title,
  memories,
  value,
}: {
  title: string;
  memories: AgentMemory[];
  value: (memory: AgentMemory) => string;
}) {
  return (
    <div className="trace-list">
      <h3>{title}</h3>
      {memories.length === 0 ? <p>None</p> : null}
      {memories.map((memory) => (
        <article key={memory.id}>
          <b>{memory.theme}</b>
          <span>{value(memory)}</span>
          <p>{memory.content}</p>
        </article>
      ))}
    </div>
  );
}

function MemoryRadarView({
  chartReady,
  data,
  onThemeSelect,
}: {
  chartReady: boolean;
  data: MemoryRadarPoint[];
  onThemeSelect: (themeId: string) => void;
}) {
  return (
    <div className="radar-view">
      <div className="radar-chart-frame">
        {chartReady ? (
          <ResponsiveContainer height="100%" width="100%">
            <RadarChart data={data}>
              <PolarGrid gridType="polygon" stroke="#cfd6e2" />
              <PolarAngleAxis
                dataKey="theme"
                tick={{
                  fill: "#475467",
                  fontSize: 11,
                  fontWeight: 800,
                }}
              />
              <PolarRadiusAxis
                angle={90}
                axisLine={false}
                domain={[0, 100]}
                tick={false}
                tickCount={5}
              />
              <Radar
                dataKey="strength"
                fill="#0f766e"
                fillOpacity={0.28}
                name="Memory strength"
                stroke="#0f766e"
                strokeWidth={2}
              />
              <Tooltip
                formatter={(value) => [
                  `${Number(value).toFixed(0)} strength`,
                  "Memory",
                ]}
                labelFormatter={(label) => String(label)}
              />
            </RadarChart>
          </ResponsiveContainer>
        ) : null}
      </div>
      <div className="radar-theme-list">
        {data.slice(0, 4).map((point) => (
          <button
            key={point.themeId}
            onClick={() => onThemeSelect(point.themeId)}
            type="button"
          >
            <strong>{point.theme}</strong>
            <span>{point.strength}</span>
            <p>
              {point.count} {point.count === 1 ? "memory" : "memories"} -
              importance {formatScore(point.avgImportance)}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}

type NetworkNodeDatum = { x: number; y: number; memory: AgentMemory };

const fitDomain = (pad: number) =>
  [
    (min: number) => Math.max(0, Math.floor((min - pad) * 10) / 10),
    (max: number) => Math.min(1, Math.ceil((max + pad) * 10) / 10),
  ] as const;

function MemoryNetworkTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: NetworkNodeDatum }>;
}) {
  const memory = active ? payload?.[0]?.payload.memory : undefined;
  if (!memory) return null;
  return (
    <div className="memory-network-tip">
      <div className="memory-network-tip-head">
        <span style={{ background: stateColor[memory.state] }} />
        <strong>{formatThemeLabel(memory.theme)}</strong>
        <em>{memoryStateLabels[memory.state]}</em>
      </div>
      <p>{memory.content}</p>
      <div className="memory-network-tip-stats">
        <span>imp {formatScore(memory.importance)}</span>
        <span>conf {formatScore(memory.confidence)}</span>
        <span>emo {formatScore(memory.emotionalWeight)}</span>
      </div>
    </div>
  );
}

function MemoryNetworkView({
  memories,
  selectedMemoryId,
  onSelect,
}: {
  memories: AgentMemory[];
  selectedMemoryId?: string;
  onSelect: (memoryId: string) => void;
}) {
  const data: NetworkNodeDatum[] = memories.map((memory) => ({
    x: memory.importance,
    y: memory.confidence,
    memory,
  }));

  const renderNode = (props: {
    cx?: number;
    cy?: number;
    payload?: NetworkNodeDatum;
  }) => {
    const { cx, cy, payload } = props;
    if (cx == null || cy == null || !payload) return <g />;
    const memory = payload.memory;
    const selected = memory.id === selectedMemoryId;
    const radius = 9 + memory.emotionalWeight * 11;
    return (
      // biome-ignore lint/a11y/noStaticElementInteractions: Recharts custom SVG nodes cannot render native HTML buttons.
      <g
        className="memory-network-node"
        onClick={() => onSelect(memory.id)}
        style={{ cursor: "pointer" }}
      >
        {selected ? (
          <circle
            cx={cx}
            cy={cy}
            fill="none"
            r={radius + 5}
            stroke="rgba(15, 118, 110, 0.6)"
            strokeWidth={2}
          />
        ) : null}
        <circle
          cx={cx}
          cy={cy}
          fill={stateColor[memory.state]}
          fillOpacity={0.92}
          r={radius}
          stroke="#fff"
          strokeWidth={2}
        />
      </g>
    );
  };

  return (
    <div className="memory-network-view">
      <ResponsiveContainer height="100%" minHeight={330} width="100%">
        <ScatterChart margin={{ top: 16, right: 22, bottom: 30, left: 6 }}>
          <CartesianGrid stroke="#e7ebf2" strokeDasharray="3 3" />
          <XAxis
            axisLine={{ stroke: "#cfd6e2" }}
            dataKey="x"
            domain={fitDomain(0.08) as unknown as [number, number]}
            label={{
              value: "Importance →",
              position: "insideBottom",
              offset: -16,
              fill: "#64748b",
              fontSize: 11,
              fontWeight: 700,
            }}
            name="Importance"
            tick={{ fill: "#94a3b8", fontSize: 10 }}
            tickFormatter={(value: number) => value.toFixed(1)}
            tickLine={false}
            type="number"
          />
          <YAxis
            axisLine={{ stroke: "#cfd6e2" }}
            dataKey="y"
            domain={fitDomain(0.08) as unknown as [number, number]}
            label={{
              value: "Confidence →",
              angle: -90,
              position: "insideLeft",
              offset: 16,
              fill: "#64748b",
              fontSize: 11,
              fontWeight: 700,
            }}
            name="Confidence"
            tick={{ fill: "#94a3b8", fontSize: 10 }}
            tickFormatter={(value: number) => value.toFixed(1)}
            tickLine={false}
            type="number"
          />
          <Tooltip
            content={<MemoryNetworkTooltip />}
            cursor={{ stroke: "#cbd5e1", strokeDasharray: "3 3" }}
          />
          <Scatter data={data} isAnimationActive={false} shape={renderNode} />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}

function MemoryMatrixView({
  rows,
  onSelect,
}: {
  rows: MemoryMatrixRow[];
  onSelect: (memoryId: string) => void;
}) {
  return (
    <div className="memory-matrix">
      {rows.map((row) => (
        <button
          className="memory-matrix-row"
          key={row.themeId}
          onClick={() => onSelect(row.topMemoryId)}
          type="button"
        >
          <strong>{row.theme}</strong>
          <div className="memory-state-strip">
            {memoryStateKeys.map((stateKey) => (
              <span
                key={stateKey}
                style={
                  {
                    "--state-color": stateColor[stateKey],
                    "--state-opacity": row.states[stateKey] > 0 ? 1 : 0.12,
                  } as CSSProperties
                }
                title={`${memoryStateLabels[stateKey]}: ${row.states[stateKey]}`}
              />
            ))}
          </div>
          <em>{row.total}</em>
          <small>{formatScore(row.avgImportance)}</small>
        </button>
      ))}
    </div>
  );
}

function MemoryInspector({
  memory,
  themeMemories,
}: {
  memory?: AgentMemory;
  themeMemories: AgentMemory[];
}) {
  if (!memory) {
    return (
      <aside className="memory-inspector">
        <h3>No memory selected</h3>
      </aside>
    );
  }

  return (
    <aside className="memory-inspector">
      <div>
        <span style={{ background: stateColor[memory.state] }} />
        <strong>{formatThemeLabel(memory.theme)}</strong>
      </div>
      <p>{memory.content}</p>
      <dl>
        <div>
          <dt>State</dt>
          <dd>{memoryStateLabels[memory.state]}</dd>
        </div>
        <div>
          <dt>Type</dt>
          <dd>{memory.type.replaceAll("_", " ")}</dd>
        </div>
        <div>
          <dt>Importance</dt>
          <dd>{formatScore(memory.importance)}</dd>
        </div>
        <div>
          <dt>Confidence</dt>
          <dd>{formatScore(memory.confidence)}</dd>
        </div>
      </dl>
      <small>{memory.explanation}</small>
      <div className="theme-stack">
        {themeMemories.slice(0, 4).map((item) => (
          <span key={item.id}>{memoryStateLabels[item.state]}</span>
        ))}
      </div>
    </aside>
  );
}

function MemoryColumn({
  title,
  memories,
}: {
  title: string;
  memories: AgentMemory[];
}) {
  return (
    <div className="memory-column">
      <h3>{title}</h3>
      {memories.slice(0, 5).map((memory) => (
        <article key={memory.id}>
          <span style={{ background: stateColor[memory.state] }} />
          <div>
            <strong>{memory.theme}</strong>
            <p>{memory.content}</p>
          </div>
        </article>
      ))}
      {memories.length === 0 ? <p>None</p> : null}
    </div>
  );
}

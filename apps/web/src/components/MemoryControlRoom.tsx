import {
  Activity,
  ArrowRight,
  Brain,
  CheckCircle2,
  CircleDot,
  Clock,
  Database,
  GitBranch,
  Layers3,
  LockKeyhole,
  Network,
  Plus,
  RotateCcw,
  Search,
  Send,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  UserRound,
  Waypoints,
  Workflow,
  Zap,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import {
  addCustomProfileState,
  advanceSimulatedTime,
  createCustomAgentProfile,
  createSimulatorStateFromProfile,
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

const heroStats = [
  { value: "8", label: "visible memory states" },
  { value: "31d", label: "simulated profile history" },
  { value: "Hybrid", label: "local + HydraDB recall" },
] as const;

const platformPillars = [
  {
    icon: Layers3,
    title: "Capture the signal",
    body: "Turn user preferences, goals, decisions, emotional signals, and repeated patterns into inspectable memory objects with clear state, score, and source.",
  },
  {
    icon: Network,
    title: "Connect the context",
    body: "Link memories by theme, confidence, recency, and relationship so an agent can retrieve the right thread instead of replaying a flat transcript.",
  },
  {
    icon: CircleDot,
    title: "Keep it alive",
    body: "Watch memories form, decay, consolidate, persist to HydraDB, and return as grounded context for model-authored responses.",
  },
] as const;

const productProof = [
  {
    icon: Waypoints,
    title: "Visible cognition",
    body: "The live memory map shows what the agent noticed, what it retrieved, what it ignored, and why the answer changed.",
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
    title: "Demo-safe grounding",
    body: "Responses can fall back locally, cite retrieved context, and keep provider keys server-side in Cloudflare bindings.",
  },
] as const;

const useCases = [
  "AI copilots that remember user preferences without burying them in prompts.",
  "Support and success agents that keep relationship context across sessions.",
  "Research and productivity assistants that preserve evolving project intent.",
  "Hackathon and sponsor demos that make memory infrastructure impossible to miss.",
] as const;

const systemSteps = [
  "Observe each turn and score candidate memories by importance, confidence, and emotional weight.",
  "Organize related moments into themes so context can be recalled as a living graph.",
  "Persist selected memories through HydraDB with profile-scoped tenant boundaries.",
  "Retrieve local and remote context, then generate answers grounded in visible evidence.",
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

const memoryNodeStyle = (memory: AgentMemory, index: number): CSSProperties =>
  ({
    "--node-color": stateColor[memory.state],
    "--x": `${10 + ((index * 31) % 78)}%`,
    "--y": `${15 + ((index * 47) % 70)}%`,
    "--size": `${34 + memory.importance * 34}px`,
  }) as CSSProperties;

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
  "Retrieving HydraDB context, then generating with AI Gateway GPT-5.5.";

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
      : "No canned simulator answer was rendered because the model did not complete.",
  });

const modelMessageFor = (
  response: AgentGenerationResponse,
  hydraChunkCount: number
) => {
  if (!response.usedModel) return response.reason;
  const contextLabel =
    hydraChunkCount > 0
      ? `${hydraChunkCount} HydraDB chunk${hydraChunkCount === 1 ? "" : "s"}`
      : "local simulator memory";
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

export function MemoryControlRoom() {
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
  const [message, setMessage] = useState(
    "What should I focus on for this hackathon demo?"
  );
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
  const activeProfileIdRef = useRef(selectedProfileId);
  const [chartReady, setChartReady] = useState(false);
  const [memoryMapMode, setMemoryMapMode] = useState<MemoryMapMode>("radar");
  const [selectedMemoryId, setSelectedMemoryId] = useState<string>();
  const [customName, setCustomName] = useState("Demo Ops Agent");
  const [customMood, setCustomMood] = useState<AgentMood>("curious");
  const [customDescription, setCustomDescription] = useState(
    "Tracks what judges notice and recalls demo proof points."
  );
  const [customPersonality, setCustomPersonality] = useState(
    "Observant, practical, and quick to explain tradeoffs."
  );

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

  useEffect(() => {
    activeProfileIdRef.current = selectedProfileId;
  }, [selectedProfileId]);

  const counts = getCounts(state.memories);
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

    setIsSending(true);
    try {
      const result = runAgentTurn(state, trimmed);
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
          : "HydraDB is offline; local simulator handled this turn.",
        modelMessage: "AI SDK inference is preparing the final answer...",
        modelProvider: "local",
        modelUsed: false,
      });

      let hydraChunks: HydraChunk[] = [];

      if (hydraStatus?.configured && !requestProfileId.startsWith("custom_")) {
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
        }
      }

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
        if (isCurrent()) {
          setState((current) =>
            updateAgentMessage(current, result.response.id, {
              text:
                error instanceof Error
                  ? `I could not get a live model response: ${error.message}`
                  : "I could not get a live model response.",
              explanation:
                "No canned simulator answer was rendered because inference failed.",
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

  const createProfile = () => {
    const profile = createCustomAgentProfile({
      name: customName,
      description: customDescription,
      personality: customPersonality,
      mood: customMood,
    });
    setProfiles((current) => addCustomProfileState(current, profile));
    setSelectedProfileId(profile.id);
  };

  const parameterEntries = Object.entries(state.parameters) as Array<
    [keyof BrainParameters, number]
  >;

  return (
    <main className="site-shell">
      <MarketingHero />
      <BrandNarrative />
      <PlatformSection />
      <UseCaseSection />

      <section className="control-room-section" id="control-room">
        <div className="section-intro control-room-intro">
          <div>
            <p className="section-kicker">Live product</p>
            <h2>Agent memory you can operate, not just describe.</h2>
          </div>
          <p>
            Compare agent profiles, ask the same question across different
            histories, tune brain parameters, and see what gets recalled,
            ignored, persisted, or consolidated.
          </p>
        </div>

        <div className="app-shell">
          <section className="topbar">
            <div>
              <div className="eyebrow">
                <BrandLogo compact tone="dark" />
                MyndMemory
              </div>
              <h1>Agent Memory Control Room</h1>
            </div>
            <div
              className={`hydra-pill ${hydraStatus?.configured ? "is-on" : ""}`}
            >
              <Database size={17} aria-hidden="true" />
              <span>HydraDB</span>
              <strong>
                {hydraStatus?.configured ? "configured" : "local"}
              </strong>
            </div>
          </section>

          <section className="workspace-grid">
            <aside className="panel profile-panel">
              <div className="panel-heading">
                <UserRound size={18} aria-hidden="true" />
                <h2>Agents</h2>
              </div>
              <div className="profile-list">
                {profiles.map((profile) => (
                  <button
                    className={`profile-row ${
                      profile.id === selectedProfileId ? "is-selected" : ""
                    }`}
                    key={profile.id}
                    onClick={() => setSelectedProfileId(profile.id)}
                    type="button"
                  >
                    <span>
                      <strong>{profile.name}</strong>
                      <small>{profile.memoryAge}</small>
                    </span>
                    <b>{profile.mood}</b>
                  </button>
                ))}
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

              <div className="create-agent">
                <div className="panel-heading compact">
                  <Plus size={17} aria-hidden="true" />
                  <h2>New Profile</h2>
                </div>
                <label>
                  Name
                  <input
                    onChange={(event) => setCustomName(event.target.value)}
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
                  Description
                  <textarea
                    onChange={(event) =>
                      setCustomDescription(event.target.value)
                    }
                    rows={3}
                    value={customDescription}
                  />
                </label>
                <label>
                  Personality
                  <textarea
                    onChange={(event) =>
                      setCustomPersonality(event.target.value)
                    }
                    rows={3}
                    value={customPersonality}
                  />
                </label>
                <button
                  className="primary-action"
                  onClick={createProfile}
                  type="button"
                >
                  <Plus size={16} aria-hidden="true" />
                  Create
                </button>
              </div>
            </aside>

            <section className="panel chat-panel">
              <div className="panel-heading">
                <Zap size={18} aria-hidden="true" />
                <h2>Chat</h2>
              </div>
              <div className="chat-log">
                {visibleMessages.map((item) => {
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
                })}
              </div>
              <div className="composer">
                <textarea
                  disabled={isSending}
                  onChange={(event) => setMessage(event.target.value)}
                  onKeyDown={(event) => {
                    if (
                      event.key === "Enter" &&
                      (event.metaKey || event.ctrlKey)
                    ) {
                      void handleSend();
                    }
                  }}
                  value={message}
                />
                <button
                  aria-label="Send message"
                  className={`icon-action send ${isSending ? "is-busy" : ""}`}
                  disabled={isSending}
                  onClick={() => void handleSend()}
                  title={isSending ? "Sending..." : "Send"}
                  type="button"
                >
                  <Send size={20} aria-hidden="true" />
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
                  <div className="empty-map">No durable memories yet</div>
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
                          {lastTurn.hydraMeta.applied.graphContext
                            ? "on"
                            : "off"}
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
                          <span
                            className="nebius-lex"
                            title="Lexical importance"
                          >
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

              <div className="memory-columns">
                <MemoryColumn title="Working" memories={activeMemories} />
                <MemoryColumn title="Long-term" memories={longTermMemories} />
                <MemoryColumn title="Queue" memories={candidateMemories} />
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
              <div className="panel-heading">
                <Activity size={18} aria-hidden="true" />
                <h2>Event Log</h2>
              </div>
              <div className="event-log">
                {state.events.map((item) => (
                  <article key={item.id}>
                    <span>{item.kind.replaceAll("_", " ")}</span>
                    <strong>{item.title}</strong>
                    <p>{item.detail}</p>
                  </article>
                ))}
              </div>
            </section>
          </section>
        </div>
      </section>
    </main>
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
          <a href="#platform">Features</a>
          <a href="#use-cases">Use cases</a>
          <a href="#control-room">Pricing</a>
          <a href="#identity">About</a>
          <a className="nav-cta" href="#control-room">
            Launch demo
          </a>
        </div>
      </nav>

      <div className="hero-content">
        <div className="hero-copy">
          <p className="hero-kicker">Organize. Connect. Remember.</p>
          <h1>
            Your memory.
            <br />
            Structured.
            <br />
            <span>Alive.</span>
          </h1>
          <p className="hero-lede">
            MyndMemory helps AI agents capture ideas, connect the dots, and
            recall what matters through a visible living brain grid.
          </p>
          <div className="hero-actions">
            <a className="primary-link" href="#control-room">
              Start free
              <ArrowRight size={18} aria-hidden="true" />
            </a>
            <a className="secondary-link" href="#platform">
              Explore features
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
        <span>Pitch-ready product demo</span>
        <span>Persistent agent memory</span>
        <span>HydraDB-backed recall</span>
      </div>
    </section>
  );
}

function LivingBrainGrid() {
  return (
    <div className="living-grid-visual" aria-hidden="true">
      <svg role="img" viewBox="0 0 760 460">
        <title>Animated living brain grid</title>
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
          <line x1="70" y1="70" x2="690" y2="70" />
          <line x1="70" y1="150" x2="690" y2="150" />
          <line x1="70" y1="230" x2="690" y2="230" />
          <line x1="70" y1="310" x2="690" y2="310" />
          <line x1="70" y1="390" x2="690" y2="390" />
          <line x1="70" y1="70" x2="70" y2="390" />
          <line x1="170" y1="70" x2="170" y2="390" />
          <line x1="270" y1="70" x2="270" y2="390" />
          <line x1="370" y1="70" x2="370" y2="390" />
          <line x1="470" y1="70" x2="470" y2="390" />
          <line x1="570" y1="70" x2="570" y2="390" />
          <line x1="690" y1="70" x2="690" y2="390" />
        </g>

        <g className="grid-active">
          <path className="grid-draw draw-one" d="M70 310H570" />
          <path className="grid-draw draw-two" d="M470 70V390" />
          <path className="grid-draw draw-three" d="M270 230H690" />
        </g>

        <rect
          className="memory-focus"
          x="470"
          y="230"
          width="100"
          height="80"
        />
        <circle
          className="memory-dot"
          cx="520"
          cy="270"
          r="23"
          filter="url(#mintGlow)"
        />
      </svg>
    </div>
  );
}

function BrandNarrative() {
  return (
    <section className="brand-section" id="identity">
      <div className="section-intro">
        <div>
          <p className="section-kicker">Visual identity</p>
          <h2>Living Brain Grid</h2>
        </div>
        <p>
          The mark is a modular grid with one highlighted point of recall. It
          communicates structure, connection, and active memory without making
          the product feel abstract or decorative.
        </p>
      </div>

      <div className="brand-system-grid">
        <article className="brand-card brand-card-dark">
          <p>Primary mark</p>
          <BrandLogo tone="light" />
          <span>
            A durable wordmark for product, pitch, docs, and sponsor-facing
            collateral.
          </span>
        </article>
        <article className="brand-card">
          <p>Symbol</p>
          <BrandLogo compact tone="dark" />
          <span>
            The grid works at favicon scale while preserving the mint recall
            point.
          </span>
        </article>
        <article className="brand-card brand-rationale-card">
          <p>Rationale</p>
          <h3>Clear architecture. Visible cognition. Active recall.</h3>
          <span>
            The system turns memory from invisible prompt glue into something
            people can see, query, tune, and trust.
          </span>
        </article>
      </div>
    </section>
  );
}

function PlatformSection() {
  return (
    <section className="platform-section" id="platform">
      <div className="section-intro">
        <div>
          <p className="section-kicker">Product story</p>
          <h2>From temporary context to an operating memory layer.</h2>
        </div>
        <p>
          MyndMemory packages the hackathon demo into a complete product
          surface: branded narrative, live simulator, retrieval trace, HydraDB
          persistence, and model grounding.
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
          <h2>Agents should not have amnesia.</h2>
          <p>
            The product proves memory behavior in a few minutes: compare a
            brand-new agent with one that has history, ask the same question,
            and watch the remembered preferences reshape the answer.
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
        <p className="section-kicker">Go-to-market</p>
        <h2>Built for teams turning agents into long-running products.</h2>
        <p>
          MyndMemory gives founders, platform teams, and AI product builders a
          concrete way to show what an agent knows, why it knows it, and how
          that knowledge changes future work.
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

function MemoryNetworkView({
  memories,
  selectedMemoryId,
  onSelect,
}: {
  memories: AgentMemory[];
  selectedMemoryId?: string;
  onSelect: (memoryId: string) => void;
}) {
  return (
    <div className="memory-node-stage">
      {memories.map((memory, index) => (
        <button
          className={`memory-node ${
            memory.id === selectedMemoryId ? "is-selected" : ""
          }`}
          key={memory.id}
          onClick={() => onSelect(memory.id)}
          style={memoryNodeStyle(memory, index)}
          title={memory.content}
          type="button"
        >
          <span>{formatThemeLabel(memory.theme)}</span>
        </button>
      ))}
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

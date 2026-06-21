import type {
  AgentMemory,
  AgentProfile,
  BrainParameters,
} from "@mynd-memory/memory-core";
import { listAgentProfiles } from "@mynd-memory/memory-core";
import type {
  HydraConfig,
  HydraQueryOptions,
  HydraQueryPlan,
} from "./types.js";

const idPart = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 44);

export const getProfileSubTenantId = (
  config: Pick<HydraConfig, "demoUserId">,
  profileId: string
): string => `${idPart(config.demoUserId)}_${idPart(profileId)}`;

export const tenantMetadataSchema = [
  {
    name: "agent_id",
    data_type: "VARCHAR",
    max_length: 128,
    enable_match: true,
  },
  {
    name: "memory_type",
    data_type: "VARCHAR",
    max_length: 128,
    enable_match: true,
  },
  {
    name: "memory_state",
    data_type: "VARCHAR",
    max_length: 128,
    enable_match: true,
  },
  {
    name: "theme",
    data_type: "VARCHAR",
    max_length: 128,
    enable_match: true,
  },
  {
    name: "demo_kind",
    data_type: "VARCHAR",
    max_length: 128,
    enable_match: true,
  },
  {
    name: "source_kind",
    data_type: "VARCHAR",
    max_length: 128,
    enable_match: true,
  },
] as const;

export const buildCreateTenantRequest = (config: HydraConfig) => ({
  tenant_id: config.tenantId,
  tenant_metadata_schema: tenantMetadataSchema,
});

export const buildProfileKnowledgeSources = (
  config: HydraConfig,
  profile: AgentProfile
) => {
  const subTenantId = getProfileSubTenantId(config, profile.id);
  const baseMetadata = {
    agent_id: profile.id,
    memory_type: "knowledge",
    memory_state: "long_term",
    theme: "demo-system",
    demo_kind: "myndmemory",
    source_kind: "agent_profile",
  };

  return [
    {
      id: `profile_${idPart(profile.id)}_blueprint`,
      tenant_id: config.tenantId,
      sub_tenant_id: subTenantId,
      title: `${profile.name} operating blueprint`,
      type: "myndmemory_profile",
      content: {
        text: [
          `Agent: ${profile.name}`,
          `Description: ${profile.description}`,
          `Memory age: ${profile.memoryAge}`,
          `Personality: ${profile.personality}`,
          `Mood: ${profile.mood}`,
          `Operating style: ${profile.operatingStyle}`,
          `Recall strategy: ${profile.recallStrategy}`,
        ].join("\n"),
      },
      metadata: baseMetadata,
      additional_metadata: {
        profile_name: profile.name,
        mood: profile.mood,
        source: "seeded-profile",
      },
    },
    {
      id: `profile_${idPart(profile.id)}_demo_script`,
      tenant_id: config.tenantId,
      sub_tenant_id: subTenantId,
      title: `${profile.name} MyndMemory demo script`,
      type: "myndmemory_demo_script",
      content: {
        text: [
          "Demo path: ask the Brand-New Agent what to focus on for the hackathon demo.",
          "Switch to the One-Month Agent and ask the same question.",
          "Show retrieved memories, newly encoded memories, state changes, and consolidation events.",
          "Advance simulated time, run consolidation, then adjust parameters and ask again.",
          "The judge should see the agent is not starting from zero.",
        ].join("\n"),
      },
      metadata: {
        ...baseMetadata,
        source_kind: "demo_script",
        theme: "hackathon-demo",
      },
      additional_metadata: {
        source: "seeded-demo-script",
        profile_name: profile.name,
      },
    },
  ];
};

export const buildMemoryItem = (memory: AgentMemory) => ({
  id: `memory_${idPart(memory.agentId)}_${idPart(memory.id)}`,
  title: `${memory.theme}: ${memory.type}`,
  text: memory.content,
  infer: false,
  user_name: "MyndMemory demo user",
  metadata: {
    agent_id: memory.agentId,
    memory_type: memory.type,
    memory_state: memory.state,
    theme: memory.theme,
    demo_kind: "myndmemory",
    source_kind: memory.sourceInteraction,
  },
  additional_metadata: {
    source_memory_id: memory.id,
    confidence: memory.confidence,
    importance: memory.importance,
    emotional_weight: memory.emotionalWeight,
    simulated_time: memory.simulatedTime,
    explanation: memory.explanation,
  },
});

export const buildMemoryItems = (profile: AgentProfile) =>
  profile.seedMemories.map(buildMemoryItem);

export const buildKnowledgeForm = (
  config: HydraConfig,
  profile: AgentProfile
): FormData => {
  const form = new FormData();
  form.set("type", "knowledge");
  form.set("tenant_id", config.tenantId);
  form.set("sub_tenant_id", getProfileSubTenantId(config, profile.id));
  form.set("upsert", "true");
  form.set(
    "app_knowledge",
    JSON.stringify(buildProfileKnowledgeSources(config, profile))
  );
  return form;
};

export const buildMemoriesForm = (
  config: HydraConfig,
  profile: AgentProfile,
  memories: AgentMemory[] = profile.seedMemories
): FormData => {
  const form = new FormData();
  form.set("type", "memory");
  form.set("tenant_id", config.tenantId);
  form.set("sub_tenant_id", getProfileSubTenantId(config, profile.id));
  form.set("upsert", "true");
  form.set("memories", JSON.stringify(memories.map(buildMemoryItem)));
  return form;
};

export const buildLiveMemoryForm = (
  config: HydraConfig,
  profile: AgentProfile,
  memory: AgentMemory
): FormData => buildMemoriesForm(config, profile, [memory]);

export const queryOptionsFromParameters = (
  parameters?: BrainParameters
): HydraQueryOptions => ({
  type: "all",
  queryBy: "hybrid",
  mode:
    parameters && parameters.longTermRecallStrength > 0.65
      ? "thinking"
      : "fast",
  maxResults: parameters && parameters.shortTermCapacity < 4 ? 5 : 8,
  alpha: "auto",
  recencyBias: parameters?.recencyBias ?? 0.25,
  graphContext: (parameters?.themeLinkingSensitivity ?? 0.6) >= 0.55,
  queryForcefulRelations: true,
  queryApps: true,
  additionalContext:
    "MyndMemory demo: retrieve shared demo knowledge and profile-scoped user memories without broadening tenant or sub-tenant scope.",
});

/**
 * Derives a human-readable retrieval plan from brain parameters, reusing the
 * exact thresholds in `queryOptionsFromParameters`. Surfaced in the UI so the
 * sliders visibly rewire HydraDB's strategy before a query is sent.
 */
export const describeQueryPlan = (
  parameters?: BrainParameters
): HydraQueryPlan => {
  const options = queryOptionsFromParameters(parameters);
  const forcefulRelations =
    options.queryForcefulRelations && options.mode === "thinking";
  const summary = [
    `${options.mode} mode`,
    `${options.queryBy} search`,
    options.graphContext ? "graph ON" : "graph OFF",
    forcefulRelations ? "forceful relations ON" : "forceful relations OFF",
    `recency ${options.recencyBias.toFixed(2)}`,
    `top ${options.maxResults}`,
  ].join(" · ");
  return {
    mode: options.mode,
    queryBy: options.queryBy,
    maxResults: options.maxResults,
    alpha: options.alpha,
    recencyBias: options.recencyBias,
    graphContext: options.graphContext,
    forcefulRelations,
    summary,
  };
};

export const buildQueryRequest = (
  config: HydraConfig,
  profile: AgentProfile,
  query: string,
  options: HydraQueryOptions = queryOptionsFromParameters(profile.parameters)
) => ({
  tenant_id: config.tenantId,
  sub_tenant_id: getProfileSubTenantId(config, profile.id),
  query,
  type: options.type,
  query_by: options.queryBy,
  mode: options.mode,
  max_results: options.maxResults,
  alpha: options.alpha,
  recency_bias: options.recencyBias,
  graph_context: options.graphContext,
  query_forceful_relations: options.queryForcefulRelations,
  query_apps: options.queryApps,
  metadata_filters: options.metadataFilters,
  additional_context: options.additionalContext,
});

export const demoProfilesForHydraSeed = (): AgentProfile[] =>
  listAgentProfiles().filter((profile) =>
    ["new-agent", "one-month", "focused", "reflective", "moody"].includes(
      profile.id
    )
  );

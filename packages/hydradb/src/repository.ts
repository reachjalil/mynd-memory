import type { AgentMemory, AgentProfile } from "@mynd-memory/memory-core";
import {
  buildCreateTenantRequest,
  buildKnowledgeForm,
  buildLiveMemoryForm,
  buildMemoriesForm,
  buildQueryRequest,
  demoProfilesForHydraSeed,
  getProfileSubTenantId,
  queryOptionsFromParameters,
} from "./contract.js";
import {
  HydraDbHttpClient,
  HydraDbHttpError,
  isSearchableStatus,
  isTenantReady,
  isTerminalFailureStatus,
} from "./http-client.js";
import type {
  HydraConfig,
  HydraPromptContext,
  HydraQueryData,
  HydraQueryForAgentInput,
  HydraQueryOptions,
  HydraSeedSummary,
} from "./types.js";

const sleep = (milliseconds: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

const requestIdOf = (response: {
  meta?: { request_id?: string; requestId?: string };
}) => response.meta?.request_id ?? response.meta?.requestId;

const latencyOf = (response: {
  meta?: { latency_ms?: number; latencyMs?: number };
}) => response.meta?.latency_ms ?? response.meta?.latencyMs;

const idsFromIngest = (
  data: { results?: Array<{ id?: string }> } | undefined
) =>
  data?.results
    ?.map((result) => result.id)
    .filter((id): id is string => Boolean(id)) ?? [];

export class HydraMemoryRepository {
  readonly client: HydraDbHttpClient;
  readonly config: HydraConfig;

  constructor(config: HydraConfig, fetcher?: typeof fetch) {
    this.config = config;
    this.client = new HydraDbHttpClient(config, fetcher);
  }

  async ensureTenantReady(options: {
    timeoutMs: number;
    intervalMs: number;
  }): Promise<{ createdOrReconciled: boolean; requestIds: string[] }> {
    const requestIds: string[] = [];
    let createdOrReconciled = false;
    try {
      const create = await this.client.createTenant(
        buildCreateTenantRequest(this.config)
      );
      createdOrReconciled = true;
      const requestId = requestIdOf(create);
      if (requestId) requestIds.push(requestId);
    } catch (error) {
      if (!(error instanceof HydraDbHttpError) || error.status !== 409) {
        throw error;
      }
      createdOrReconciled = true;
      if (error.requestId) requestIds.push(error.requestId);
    }

    const deadline = Date.now() + options.timeoutMs;
    while (Date.now() < deadline) {
      const status = await this.client.tenantStatus();
      const requestId = requestIdOf(status);
      if (requestId) requestIds.push(requestId);
      if (isTenantReady(status.data)) {
        return { createdOrReconciled, requestIds };
      }
      await sleep(options.intervalMs);
    }

    throw new Error(
      `Timed out waiting for HydraDB tenant ${this.config.tenantId} to become ready.`
    );
  }

  async seedDemo(
    options: {
      profiles?: AgentProfile[];
      waitForIndex?: boolean;
      timeoutMs?: number;
    } = {}
  ): Promise<HydraSeedSummary> {
    if (!this.config.apiKey) {
      return {
        configured: false,
        tenantId: this.config.tenantId,
        profileSubTenants: [],
        createdOrReconciledTenant: false,
        knowledgeIds: [],
        memoryIds: [],
        searchableIds: [],
        requestIds: [],
        message:
          "HYDRA_DB_API_KEY is not configured; local simulator mode is active.",
      };
    }

    const profiles = options.profiles ?? demoProfilesForHydraSeed();
    const tenant = await this.ensureTenantReady({
      timeoutMs: options.timeoutMs ?? 180_000,
      intervalMs: 4_000,
    });
    const requestIds = [...tenant.requestIds];
    const knowledgeIds: string[] = [];
    const memoryIds: string[] = [];
    const profileSubTenants = profiles.map((profile) =>
      getProfileSubTenantId(this.config, profile.id)
    );
    const idsBySubTenant = new Map<string, string[]>();

    for (const profile of profiles) {
      const subTenantId = getProfileSubTenantId(this.config, profile.id);
      const idsForProfile: string[] = [];
      const knowledge = await this.client.ingestContext(
        buildKnowledgeForm(this.config, profile)
      );
      const knowledgeRequestId = requestIdOf(knowledge);
      if (knowledgeRequestId) requestIds.push(knowledgeRequestId);
      const profileKnowledgeIds = idsFromIngest(knowledge.data);
      knowledgeIds.push(...profileKnowledgeIds);
      idsForProfile.push(...profileKnowledgeIds);

      if (profile.seedMemories.length > 0) {
        const memories = await this.client.ingestContext(
          buildMemoriesForm(this.config, profile)
        );
        const memoryRequestId = requestIdOf(memories);
        if (memoryRequestId) requestIds.push(memoryRequestId);
        const profileMemoryIds = idsFromIngest(memories.data);
        memoryIds.push(...profileMemoryIds);
        idsForProfile.push(...profileMemoryIds);
      }
      idsBySubTenant.set(subTenantId, idsForProfile);
    }

    const searchableIds = options.waitForIndex
      ? await this.waitForSearchableIds({
          idsBySubTenant,
          timeoutMs: options.timeoutMs ?? 180_000,
        })
      : [];

    return {
      configured: true,
      tenantId: this.config.tenantId,
      profileSubTenants,
      createdOrReconciledTenant: tenant.createdOrReconciled,
      knowledgeIds,
      memoryIds,
      searchableIds,
      requestIds,
      message:
        "HydraDB demo tenant, Knowledge, and Memories were seeded with stable IDs.",
    };
  }

  async ingestLiveMemory(input: {
    profile: AgentProfile;
    memory: AgentMemory;
  }): Promise<{ ids: string[]; requestId?: string }> {
    const response = await this.client.ingestContext(
      buildLiveMemoryForm(this.config, input.profile, input.memory)
    );
    return {
      ids: idsFromIngest(response.data),
      requestId: requestIdOf(response),
    };
  }

  async queryForAgent(
    input: HydraQueryForAgentInput
  ): Promise<HydraPromptContext> {
    const appliedOptions = queryOptionsFromParameters(
      input.parameters ?? input.profile.parameters
    );
    const response = await this.client.query(
      buildQueryRequest(this.config, input.profile, input.query, appliedOptions)
    );
    return formatHydraPromptContext(response.data, {
      requestId: requestIdOf(response),
      latencyMs: latencyOf(response),
      appliedOptions,
    });
  }

  private async waitForSearchableIds(input: {
    idsBySubTenant: Map<string, string[]>;
    timeoutMs: number;
  }): Promise<string[]> {
    const searchable = new Set<string>();
    const pendingBySubTenant = new Map(
      [...input.idsBySubTenant.entries()].map(([subTenantId, ids]) => [
        subTenantId,
        [...ids],
      ])
    );

    const deadline = Date.now() + input.timeoutMs;
    while (Date.now() < deadline) {
      for (const [subTenantId, ids] of pendingBySubTenant) {
        if (ids.length === 0) continue;
        const response = await this.client.contextStatus({ ids, subTenantId });
        const statuses = response.data?.statuses ?? [];
        const stillPending: string[] = [];
        for (const item of statuses) {
          const id = item.id;
          const status = item.indexing_status ?? item.indexingStatus;
          if (!id) continue;
          if (isSearchableStatus(status)) searchable.add(id);
          else if (isTerminalFailureStatus(status)) {
            throw new Error(
              `HydraDB context ${id} failed indexing: ${item.error_message ?? item.errorMessage ?? item.message ?? "unknown error"}`
            );
          } else {
            stillPending.push(id);
          }
        }
        pendingBySubTenant.set(subTenantId, stillPending);
      }
      if ([...pendingBySubTenant.values()].every((ids) => ids.length === 0)) {
        return [...searchable];
      }
      await sleep(3_000);
    }
    return [...searchable];
  }
}

export const formatHydraPromptContext = (
  data: HydraQueryData | undefined,
  meta: {
    requestId?: string;
    latencyMs?: number;
    appliedOptions?: HydraQueryOptions;
  } = {}
): HydraPromptContext => {
  const chunks = (data?.chunks ?? []).map((chunk, index) => {
    const metadata = {
      ...(chunk.metadata ?? {}),
      ...(chunk.additional_metadata ?? chunk.additionalMetadata ?? {}),
    };
    return {
      id:
        chunk.id ?? chunk.chunk_uuid ?? chunk.chunkUuid ?? `chunk_${index + 1}`,
      title:
        chunk.source_title ??
        chunk.sourceTitle ??
        String(metadata.source_memory_id ?? "HydraDB context"),
      content: chunk.chunk_content ?? chunk.chunkContent ?? "",
      score: chunk.relevancy_score ?? chunk.relevancyScore ?? 0,
      metadata,
      sourceType: chunk.source_type ?? chunk.sourceType,
    };
  });

  const sources = (data?.sources ?? []).map((source, index) => ({
    id: source.id ?? `source_${index + 1}`,
    title: source.title ?? "HydraDB source",
    type: source.type,
    url: source.url,
  }));

  const contextText = chunks
    .map(
      (chunk, index) =>
        `[${index + 1}] ${chunk.title} (score ${chunk.score.toFixed(2)})\n${chunk.content}`
    )
    .join("\n\n");

  return {
    contextText,
    chunks,
    sources,
    graphContext: data?.graph_context ?? data?.graphContext,
    latencyMs: meta.latencyMs,
    appliedOptions: meta.appliedOptions,
    requestId: meta.requestId,
  };
};

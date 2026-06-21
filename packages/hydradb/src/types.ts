import type {
  AgentMemory,
  AgentProfile,
  BrainParameters,
} from "@mynd-memory/memory-core";

export interface HydraRuntimeEnv {
  HYDRA_DB_API_KEY?: string;
  HYDRA_TENANT_ID?: string;
  HYDRA_SHARED_SUB_TENANT_ID?: string;
  MYND_MEMORY_DEMO_USER_ID?: string;
}

export interface HydraConfig {
  apiKey?: string;
  baseUrl: string;
  tenantId: string;
  sharedSubTenantId: string;
  demoUserId: string;
}

export interface HydraEnvelope<T> {
  success?: boolean;
  data?: T;
  error?: {
    code?: string;
    message?: string;
  } | null;
  meta?: {
    request_id?: string;
    requestId?: string;
    latency_ms?: number;
    latencyMs?: number;
  };
}

export interface HydraTenantStatusData {
  tenant_id?: string;
  tenantId?: string;
  infra?: {
    scheduler_status?: boolean;
    schedulerStatus?: boolean;
    graph_status?: boolean;
    graphStatus?: boolean;
    ready_for_ingestion?: boolean;
    readyForIngestion?: boolean;
    vectorstore_status?: {
      knowledge?: boolean;
      memories?: boolean;
    };
    vectorstoreStatus?: {
      knowledge?: boolean;
      memories?: boolean;
    };
  };
}

export interface HydraIngestResult {
  id?: string;
  filename?: string;
  status?: string;
  error?: string;
  error_code?: string;
  errorCode?: string;
}

export interface HydraIngestData {
  success?: boolean;
  message?: string;
  results?: HydraIngestResult[];
  success_count?: number;
  successCount?: number;
  failed_count?: number;
  failedCount?: number;
}

export interface HydraStatusItem {
  id?: string;
  indexing_status?: string;
  indexingStatus?: string;
  error_code?: string;
  errorCode?: string;
  error_message?: string;
  errorMessage?: string;
  message?: string;
  success?: boolean;
}

export interface HydraContextStatusData {
  statuses?: HydraStatusItem[];
}

export interface HydraQueryChunk {
  id?: string;
  chunk_uuid?: string;
  chunkUuid?: string;
  chunk_content?: string;
  chunkContent?: string;
  source_title?: string;
  sourceTitle?: string;
  source_type?: string;
  sourceType?: string;
  relevancy_score?: number;
  relevancyScore?: number;
  metadata?: Record<string, unknown>;
  additional_metadata?: Record<string, unknown>;
  additionalMetadata?: Record<string, unknown>;
}

export interface HydraQuerySource {
  id?: string;
  title?: string;
  type?: string;
  url?: string;
  timestamp?: string;
  metadata?: Record<string, unknown>;
  additional_metadata?: Record<string, unknown>;
  additionalMetadata?: Record<string, unknown>;
}

export interface HydraQueryData {
  chunks?: HydraQueryChunk[];
  sources?: HydraQuerySource[];
  graph_context?: unknown;
  graphContext?: unknown;
  additional_context?: Record<string, HydraQueryChunk>;
  additionalContext?: Record<string, HydraQueryChunk>;
}

export type HydraQueryType = "knowledge" | "memory" | "all";
export type HydraQueryBy = "hybrid" | "text";
export type HydraMode = "fast" | "thinking";

export interface HydraQueryOptions {
  type: HydraQueryType;
  queryBy: HydraQueryBy;
  mode: HydraMode;
  maxResults: number;
  alpha: number | "auto";
  recencyBias: number;
  graphContext: boolean;
  queryForcefulRelations: boolean;
  queryApps: boolean;
  metadataFilters?: Record<string, unknown>;
  additionalContext?: string;
}

/**
 * Human-readable summary of the retrieval strategy HydraDB will run for a given
 * set of brain parameters. Used to surface "what HydraDB is about to do" in the
 * UI before a query is even sent.
 */
export interface HydraQueryPlan {
  mode: HydraMode;
  queryBy: HydraQueryBy;
  maxResults: number;
  alpha: number | "auto";
  recencyBias: number;
  graphContext: boolean;
  /** Forceful relations are only effective in `thinking` mode. */
  forcefulRelations: boolean;
  summary: string;
}

export interface HydraPromptChunk {
  id: string;
  title: string;
  content: string;
  score: number;
  metadata: Record<string, unknown>;
  sourceType?: string;
}

export interface HydraPromptSource {
  id: string;
  title: string;
  type?: string;
  url?: string;
}

export interface HydraPromptContext {
  contextText: string;
  chunks: HydraPromptChunk[];
  sources: HydraPromptSource[];
  graphContext?: unknown;
  latencyMs?: number;
  appliedOptions?: HydraQueryOptions;
  requestId?: string;
}

export interface HydraSeedSummary {
  configured: boolean;
  tenantId: string;
  profileSubTenants: string[];
  createdOrReconciledTenant: boolean;
  knowledgeIds: string[];
  memoryIds: string[];
  searchableIds: string[];
  requestIds: string[];
  message: string;
}

export interface HydraLiveMemoryInput {
  profile: AgentProfile;
  memory: AgentMemory;
}

export interface HydraQueryForAgentInput {
  profile: AgentProfile;
  query: string;
  parameters?: BrainParameters;
}

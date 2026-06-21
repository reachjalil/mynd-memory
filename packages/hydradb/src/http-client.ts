import { assertHydraConfigured } from "./config.js";
import type {
  HydraConfig,
  HydraContextStatusData,
  HydraEnvelope,
  HydraIngestData,
  HydraQueryData,
  HydraTenantStatusData,
} from "./types.js";

export class HydraDbHttpError extends Error {
  readonly status: number;
  readonly requestId?: string;
  readonly code?: string;

  constructor(input: {
    message: string;
    status: number;
    requestId?: string;
    code?: string;
  }) {
    super(input.message);
    this.name = "HydraDbHttpError";
    this.status = input.status;
    this.requestId = input.requestId;
    this.code = input.code;
  }
}

const transientStatuses = new Set([429, 500, 503]);

const sleep = (milliseconds: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

const requestIdFrom = <T>(envelope: HydraEnvelope<T>): string | undefined =>
  envelope.meta?.request_id ?? envelope.meta?.requestId;

const defaultFetch: typeof fetch = (input, init) => fetch(input, init);

export class HydraDbHttpClient {
  readonly config: HydraConfig;
  readonly fetcher: typeof fetch;

  constructor(config: HydraConfig, fetcher: typeof fetch = defaultFetch) {
    this.config = config;
    this.fetcher = fetcher;
  }

  async createTenant(
    body: Record<string, unknown>
  ): Promise<HydraEnvelope<Record<string, unknown>>> {
    return this.json<Record<string, unknown>>("/tenants", {
      method: "POST",
      body,
    });
  }

  async tenantStatus(): Promise<HydraEnvelope<HydraTenantStatusData>> {
    const params = new URLSearchParams({ tenant_id: this.config.tenantId });
    return this.json<HydraTenantStatusData>(`/tenants/status?${params}`, {
      method: "GET",
    });
  }

  async ingestContext(form: FormData): Promise<HydraEnvelope<HydraIngestData>> {
    return this.form<HydraIngestData>("/context/ingest", form);
  }

  async contextStatus(input: {
    ids: string[];
    subTenantId: string;
  }): Promise<HydraEnvelope<HydraContextStatusData>> {
    const params = new URLSearchParams({
      tenant_id: this.config.tenantId,
      sub_tenant_id: input.subTenantId,
    });
    for (const id of input.ids) params.append("ids", id);
    return this.json<HydraContextStatusData>(`/context/status?${params}`, {
      method: "GET",
    });
  }

  async query(
    body: Record<string, unknown>
  ): Promise<HydraEnvelope<HydraQueryData>> {
    return this.json<HydraQueryData>("/query", {
      method: "POST",
      body,
    });
  }

  private async json<T>(
    path: string,
    input: { method: "GET" | "POST" | "DELETE"; body?: Record<string, unknown> }
  ): Promise<HydraEnvelope<T>> {
    return this.request<T>(path, {
      method: input.method,
      headers: {
        "Content-Type": "application/json",
      },
      body: input.body ? JSON.stringify(input.body) : undefined,
    });
  }

  private async form<T>(
    path: string,
    form: FormData
  ): Promise<HydraEnvelope<T>> {
    return this.request<T>(path, {
      method: "POST",
      body: form,
    });
  }

  private async request<T>(
    path: string,
    init: RequestInit,
    attempt = 0
  ): Promise<HydraEnvelope<T>> {
    const token = assertHydraConfigured(this.config);
    const response = await this.fetcher(`${this.config.baseUrl}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        "API-Version": "2",
        ...init.headers,
      },
    });
    const text = await response.text();
    const parsed = text ? (JSON.parse(text) as HydraEnvelope<T>) : {};

    if (!response.ok || parsed.success === false) {
      const requestId = requestIdFrom(parsed);
      const code = parsed.error?.code;
      const message =
        parsed.error?.message ??
        `HydraDB request failed with HTTP ${response.status}`;
      if (transientStatuses.has(response.status) && attempt < 3) {
        const jitter = Math.floor(Math.random() * 150);
        await sleep(250 * 2 ** attempt + jitter);
        return this.request<T>(path, init, attempt + 1);
      }
      throw new HydraDbHttpError({
        message,
        status: response.status,
        requestId,
        code,
      });
    }

    return parsed;
  }
}

export const isTenantReady = (
  data: HydraTenantStatusData | undefined
): boolean => {
  const infra = data?.infra;
  const vector = infra?.vectorstore_status ?? infra?.vectorstoreStatus;
  return Boolean(
    infra?.ready_for_ingestion ??
      infra?.readyForIngestion ??
      ((infra?.scheduler_status ?? infra?.schedulerStatus) &&
        (infra?.graph_status ?? infra?.graphStatus) &&
        vector?.knowledge &&
        vector?.memories)
  );
};

export const normalizeStatus = (status: string | undefined): string =>
  (status ?? "").toLowerCase();

export const isSearchableStatus = (status: string | undefined): boolean =>
  ["graph_creation", "completed"].includes(normalizeStatus(status));

export const isTerminalFailureStatus = (status: string | undefined): boolean =>
  ["errored", "failed"].includes(normalizeStatus(status));

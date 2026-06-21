/**
 * Minimal bounded HydraDB v2 lifecycle example.
 *
 * Prerequisites:
 *   npm install @hydradb/sdk@^2
 *   export HYDRA_DB_API_KEY="..."
 *
 * Use a non-production tenant ID for this example.
 */

import { HydraDBClient } from "@hydradb/sdk";

const sleep = (milliseconds: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

async function waitUntil<T>(options: {
  operation: () => Promise<T | undefined>;
  timeoutMs: number;
  intervalMs: number;
  description: string;
}): Promise<T> {
  const deadline = Date.now() + options.timeoutMs;
  while (Date.now() < deadline) {
    const result = await options.operation();
    if (result !== undefined) return result;
    await sleep(options.intervalMs);
  }
  throw new Error(`Timed out waiting for ${options.description}`);
}

async function main(): Promise<void> {
  const token = process.env.HYDRA_DB_API_KEY;
  if (!token) throw new Error("HYDRA_DB_API_KEY is not configured");

  const tenantId = process.env.HYDRA_TENANT_ID ?? "hydradb_skill_demo";
  const subTenantId = process.env.HYDRA_SUB_TENANT_ID ?? "user_demo";
  const memoryId = "user_demo_answer_style";

  const client = new HydraDBClient({ token });

  // For repeated runs, reconcile an existing tenant according to your app's
  // desired-state logic rather than swallowing every create error.
  await client.tenants.create({ tenantId });

  await waitUntil({
    description: `tenant ${tenantId} to become ready`,
    timeoutMs: 300_000,
    intervalMs: 5_000,
    operation: async () => {
      const response = await client.tenants.status({ tenantId });
      return response.data.infra.readyForIngestion ? true : undefined;
    },
  });

  const ingest = await client.context.ingest({
    type: "memory",
    tenantId,
    subTenantId,
    memories: JSON.stringify([
      {
        id: memoryId,
        title: "Answer style",
        text: "The user prefers concise answers with concrete examples.",
        infer: false,
        additional_metadata: { source: "hydradb-skill-demo" },
      },
    ]),
  });
  const contextId = ingest.data.results[0].id;

  const state = await waitUntil<string>({
    description: `context ${contextId} to become searchable`,
    timeoutMs: 300_000,
    intervalMs: 2_000,
    operation: async () => {
      const response = await client.context.status({
        tenantId,
        subTenantId,
        ids: [contextId],
      });
      const item = response.data.statuses[0];
      const status = item.indexingStatus as string;
      if (["graph_creation", "completed"].includes(status)) return status;
      if (["errored", "failed"].includes(status)) {
        throw new Error(
          `Context ${contextId} failed: ${item.errorMessage ?? "indexing failed"}`
        );
      }
      return undefined;
    },
  });

  const result = await client.query({
    tenantId,
    subTenantId,
    query: "How should responses be written for this user?",
    type: "memory",
    queryBy: "hybrid",
    mode: "thinking",
    maxResults: 5,
  });

  console.log(`Context state: ${state}`);
  for (const chunk of result.data.chunks) {
    const value = chunk as unknown as {
      chunkContent?: string;
      chunk_content?: string;
    };
    console.log(`- ${value.chunkContent ?? value.chunk_content ?? ""}`);
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});

import { getAgentProfile } from "@mynd-memory/memory-core";
import { describe, expect, it } from "vitest";
import {
  buildCreateTenantRequest,
  buildMemoriesForm,
  buildQueryRequest,
  describeQueryPlan,
  getProfileSubTenantId,
} from "./contract.js";
import type { HydraConfig } from "./types.js";

const config: HydraConfig = {
  apiKey: "not-used",
  baseUrl: "https://api.hydradb.com",
  tenantId: "myndmemory_demo",
  sharedSubTenantId: "demo_shared",
  demoUserId: "demo_user",
};

describe("HydraDB v2 request contract", () => {
  it("uses snake_case raw HTTP fields for v2 tenant creation", () => {
    const request = buildCreateTenantRequest(config);

    expect(request.tenant_id).toBe("myndmemory_demo");
    expect(request.tenant_metadata_schema.map((item) => item.name)).toContain(
      "agent_id"
    );
  });

  it("keeps profile writes and reads in the same sub-tenant", () => {
    const profile = getAgentProfile("one-month");
    const form = buildMemoriesForm(config, profile);
    const query = buildQueryRequest(config, profile, "weekly status update");

    expect(form.get("sub_tenant_id")).toBe(
      getProfileSubTenantId(config, profile.id)
    );
    expect(query.sub_tenant_id).toBe(form.get("sub_tenant_id"));
    expect(query.type).toBe("all");
  });

  it("derives a retrieval plan that flips fast/thinking with long-term recall", () => {
    const newAgent = describeQueryPlan(getAgentProfile("new-agent").parameters);
    const oneMonth = describeQueryPlan(getAgentProfile("one-month").parameters);

    expect(newAgent.mode).toBe("fast");
    expect(oneMonth.mode).toBe("thinking");
    // Forceful relations are only effective in thinking mode.
    expect(newAgent.forcefulRelations).toBe(false);
    expect(oneMonth.forcefulRelations).toBe(true);
    expect(oneMonth.summary).toContain("thinking mode");
  });

  it("keeps memory metadata objects for live multipart memory ingestion", () => {
    const profile = getAgentProfile("one-month");
    const form = buildMemoriesForm(config, profile);
    const memories = JSON.parse(String(form.get("memories"))) as Array<{
      metadata: { agent_id: string };
      additional_metadata: { importance: number };
      infer: boolean;
    }>;

    expect(memories.length).toBeGreaterThan(0);
    expect(memories[0]?.infer).toBe(false);
    expect(memories[0]!.metadata.agent_id).toBe(profile.id);
    expect(memories[0]!.additional_metadata.importance).toBeTypeOf("number");
  });
});

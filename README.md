# MyndMemory

MyndMemory is a hackathon demo for persistent agent memory. It pairs a branded
product landing page with a live control room where you can compare agent
profiles, chat with them, watch memories form and decay, tune memory parameters,
and see retrieval grounded by two sponsor platforms: HydraDB v2 (vector memory)
and Nebius Token Factory (model-authored answers and semantic re-ranking).

## Structure

- `apps/web` is the Astro + React demo app configured for Cloudflare Workers.
- `packages/memory-core` contains seeded agents and deterministic memory
  simulator logic.
- `packages/hydradb` contains the HydraDB v2 tenancy, ingestion, polling, query,
  and prompt-context integration.
- `packages/inference` contains the ability contract for AI SDK responses
  (Nebius by default; OpenAI, Gemini, AI Gateway, or local fallback) plus the
  Nebius embeddings re-ranking ability.
- `DEMO_SCRIPT.md` contains the two-minute hackathon demo path.
- Internal packages should use the `@mynd-memory/*` scope.

## HydraDB Contract

- Raw HTTP base URL: `https://api.hydradb.com`.
- Auth: `Authorization: Bearer $HYDRA_DB_API_KEY` and `API-Version: 2`.
- `tenant_id`: environment/customer boundary, default `myndmemory_demo`.
- `sub_tenant_id`: profile-scoped demo user boundary, for example
  `demo_user_one_month`.
- Knowledge: agent profile blueprints and demo scripts, ingested as app
  Knowledge into the same profile sub-tenant used for reads.
- Memories: seeded profile history and live chat-derived memories, ingested as
  Memories with stable IDs.
- Query: `type: "all"`, `query_by: "hybrid"`, profile sub-tenant scope, ranked
  order preserved.

Secrets are never committed. For local Cloudflare-style dev, copy
`apps/web/.dev.vars.example` to `apps/web/.dev.vars` and set `HYDRA_DB_API_KEY`
plus `NEBIUS_API_KEY` (the default inference and embedding provider). Other
providers (`AI_GATEWAY_API_KEY`, `OPENAI_API_KEY`,
`GEMINI_AI_STUDIO` / `GOOGLE_GENERATIVE_AI_API_KEY`) stay available by changing
`MYND_MEMORY_INFERENCE_PROVIDER`. The app keeps provider keys in Cloudflare
bindings and only sends retrieved memory context to the browser.

## Inference Contract

- Ability package: `@mynd-memory/inference`.
- Providers: `nebius` (default), `aiGateway`, `openAI`, `googleGenAI`, `local`.
- Nebius Token Factory is OpenAI-compatible at
  `https://api.tokenfactory.nebius.com/v1/`. It implements the Chat Completions
  API (not the OpenAI Responses API), so the ability pins
  `createOpenAI(...).chat(model)`.
- Default Nebius chat model: `meta-llama/Llama-3.3-70B-Instruct`
  (`MYND_MEMORY_NEBIUS_MODEL`). Default embedding model: `Qwen/Qwen3-Embedding-8B`
  (`NEBIUS_EMBED_MODEL`). Confirm both against `client.models.list()` for your
  account.
- Selection order: explicit `MYND_MEMORY_INFERENCE_PROVIDER` (shipped as
  `nebius`), then `AI_GATEWAY_API_KEY`, `OPENAI_API_KEY`, a Gemini key, the
  Nebius key, and finally the deterministic local fallback.
- The prompt includes local simulator memories plus HydraDB chunks and asks the
  model to cite memory-backed claims with `[M#]` or `[H#]`.

## Nebius Semantic Recall

- `embedMemoriesAbility` (`@mynd-memory/inference`) calls Nebius embeddings to
  cosine-rank candidate memories against the query.
- API route `POST /api/memory/retrieve` exposes it. The control room shows the
  Nebius "meaning" score next to the local lexical score and degrades to lexical
  scoring when no `NEBIUS_API_KEY` is set.

## Commands

- `pnpm install` installs the workspace.
- `pnpm web:dev` runs the Astro demo locally.
- `pnpm web:build` builds the Cloudflare Worker app.
- `pnpm hydra:seed` creates/reconciles the HydraDB tenant and seeds demo
  Knowledge/Memories.
- `pnpm hydra:seed -- --wait` also polls indexing until searchable where
  possible.
- `pnpm check` runs workspace checks.
- `pnpm lint` runs Biome checks.
- `pnpm harness:validate` validates Harness config.
- `pnpm harness:preview` previews generated Codex and Claude surfaces.
- `pnpm harness:activate` applies generated Harness outputs.

## Cloudflare

The web app follows the Astro/Cloudflare pattern used in
`/Users/jalillaaraichi/workspaces-hub`: `@astrojs/cloudflare`, `wrangler.jsonc`,
runtime env bindings, and `astro build && wrangler deploy`.

Production domain:

- `https://myndmemory.com`
- Wrangler config uses a Worker Custom Domain route:
  `pattern: "myndmemory.com", custom_domain: true`.

Local runtime variables:

```bash
cp apps/web/.dev.vars.example apps/web/.dev.vars
```

Deploy secrets:

```bash
pnpm --filter @mynd-memory/web wrangler secret put HYDRA_DB_API_KEY
pnpm --filter @mynd-memory/web wrangler secret put NEBIUS_API_KEY
# optional alternative providers:
# pnpm --filter @mynd-memory/web wrangler secret put AI_GATEWAY_API_KEY
# pnpm --filter @mynd-memory/web wrangler secret put OPENAI_API_KEY
# pnpm --filter @mynd-memory/web wrangler secret put GEMINI_AI_STUDIO
pnpm --filter @mynd-memory/web run deploy
```

## Agent Config

Durable agent configuration is owned by `.harness` source. Run
`pnpm harness:validate` and `pnpm harness:preview` before applying changes with
`pnpm harness:activate`. Generated `.agents`, `.claude`, `AGENTS.md`, and
`CLAUDE.md` outputs are ignored by Git and can be regenerated from `.harness`.

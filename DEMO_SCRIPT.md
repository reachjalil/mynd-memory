# MyndMemory Demo Script

A ~2-minute presenter flow. It shows persistent agent memory grounded by two
sponsor platforms doing real work on screen: **HydraDB v2** (vector recall) and
**Nebius Token Factory** (model-authored answers + semantic re-ranking).

## Setup (once, before presenting)

```bash
cp apps/web/.dev.vars.example apps/web/.dev.vars
# set HYDRA_DB_API_KEY and NEBIUS_API_KEY in apps/web/.dev.vars
pnpm hydra:seed -- --wait   # seed HydraDB knowledge + memories (idempotent)
pnpm web:dev
```

Provider defaults are already `nebius` (`meta-llama/Llama-3.3-70B-Instruct` for
answers, `Qwen/Qwen3-Embedding-8B` for embeddings). With no keys the app
degrades cleanly to the local deterministic simulator + lexical scoring. The
control room also exposes a `Seed HydraDB` button that runs the same v2
lifecycle from Cloudflare-safe API routes.

## Flow

1. **Open the landing page.** "MyndMemory — Your memory. Structured. Alive."
   One line: *agents shouldn't have amnesia; memory should be a system you can
   watch, tune, persist, and query.* Click **Launch demo**.
2. **Brand-New Agent.** Ask: `What should I focus on for this hackathon demo?`
   The answer is generic and the retrieval trace is near-empty — no history.
3. **Switch to One-Month Agent.** Ask the same question.
   - The answer changes: a **Nebius**-authored response grounded in retrieved
     context, citing `[H#]` chunks. The Inference box reads
     `nebius/meta-llama/Llama-3.3-70B-Instruct grounded the answer with N HydraDB
     chunks`.
   - The **HydraDB Retrieval** glass box shows the live query: mode (`thinking`
     for this profile), `hybrid`, alpha, top-N, graph on/off, latency, and a
     copyable **request id** — plus ranked chunks with relevancy bars.
   - The **Nebius semantic re-rank** panel shows each memory's **lexical** score
     next to its **meaning** score (e.g. *lex 0.95 / sem 0.80*).
   - The **Event Log** interleaves it all: *Nebius re-ranked N memories →
     HydraDB query (request id) → recalled → reinforced → encoded.*
4. **Tune the brain live.** Drag **Long-term recall** below 0.65 and watch the
   plan line flip `thinking → fast`; drag **Theme linking** under 0.55 to flip
   `graph ON → OFF` — *the sliders visibly rewire HydraDB's retrieval strategy
   before you even send.*
5. **Make a memory.** `Remember that I want judges to see every memory state
   transition.` Show the new short-term memory + the live HydraDB sync event.
6. **Advance time + consolidate.** Click **1 week**, then **Consolidate**; show
   promoted long-term / candidate memories and the decay of low-salience ones.
7. **Create an agent.** Spin up `Demo Ops Agent` from the profile panel to show
   memory is per-profile, not global.

## Judge Sound Bite

Agents should not have amnesia. MyndMemory makes memory a system you can watch,
tune, persist, and query — with HydraDB storing and ranking it and Nebius both
understanding it (embeddings) and speaking from it (grounded answers), live and
inspectable instead of buried in invisible prompt glue.

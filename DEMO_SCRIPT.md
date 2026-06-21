# MyndMemory Walkthrough

A ~2-minute walkthrough of persistent agent memory grounded by two platforms
doing real work on screen: **HydraDB v2** (vector recall) and **Nebius Token
Factory** (model-authored answers + semantic re-ranking).

## Setup (once)

```bash
cp apps/web/.dev.vars.example apps/web/.dev.vars
# set HYDRA_DB_API_KEY and NEBIUS_API_KEY in apps/web/.dev.vars
pnpm hydra:seed -- --wait   # seed HydraDB knowledge + memories (idempotent)
pnpm web:dev
```

Provider defaults are already `nebius` (`meta-llama/Llama-3.3-70B-Instruct` for
answers, `Qwen/Qwen3-Embedding-8B` for embeddings). With no keys the app degrades
cleanly to the local deterministic simulator + lexical scoring. The console also
exposes a `Seed HydraDB` button that runs the same v2 lifecycle from
Cloudflare-safe API routes.

## Flow

1. **Open the landing page.** One line: *agents shouldn't have amnesia; memory
   should be a system you can watch, tune, persist, and query.* Click **Launch
   console**.
2. **Blank-Slate Agent.** Ask: `What should I prioritize this week?`
   The answer is generic and the retrieval trace is empty — no history.
3. **Switch to the Productivity Copilot.** Ask the same question.
   - The answer changes: a **Nebius**-authored response grounded in retrieved
     context, citing `[M#]`/`[H#]`. The Inference box reads
     `nebius/meta-llama/Llama-3.3-70B-Instruct grounded the answer ...`.
   - The **HydraDB Retrieval** glass box shows the live query: mode, `hybrid`,
     alpha, top-N, graph on/off, latency, and a copyable **request id** — plus
     ranked chunks with relevancy bars.
   - The **Nebius semantic re-rank** panel shows each memory's **lexical** score
     next to its **meaning** score (e.g. *lex 0.95 / sem 0.80*).
   - The **Event Log** interleaves it: *Nebius re-ranked N memories → HydraDB
     query (request id) → recalled → reinforced → encoded.*
4. **Compare scenarios.** Switch between the **Sales Account Agent**,
   **Engineering Copilot**, and **Support Agent** to show different real-world
   memory sets and how each profile's parameters change what gets recalled.
5. **Tune the brain live.** Drag **Long-term recall** below 0.65 and watch the
   plan line flip `thinking → fast`; drag **Theme linking** under 0.55 to flip
   `graph ON → OFF` — the sliders visibly rewire HydraDB's retrieval strategy
   before you even send.
6. **Make a memory.** `Remember that I prefer Friday status updates in bullet
   points.` Show the new short-term memory (encoded as a preference) and the live
   HydraDB sync event.
7. **Advance time + consolidate.** Click **1 week**, then **Consolidate**; show
   promoted long-term / candidate memories and the decay of low-salience ones.
8. **Create an agent.** Spin up a custom agent from the profile panel to show
   memory is per-profile, not global.

## The Pitch

Agents should not have amnesia. MyndMemory makes memory a system you can watch,
tune, persist, and query — with HydraDB storing and ranking it and Nebius both
understanding it (embeddings) and speaking from it (grounded answers), live and
inspectable instead of buried in invisible prompt glue.

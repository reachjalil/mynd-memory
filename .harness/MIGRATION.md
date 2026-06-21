# Harness Migration Ledger

Skill guide: `2026-06-05.profile-isolation-packs`

This repository started as an empty TypeScript monorepo with no existing
`AGENTS.md`, `CLAUDE.md`, `.agents`, or `.claude` surfaces.

| Item | Classification | Decision |
| --- | --- | --- |
| `.agents` | Generated Codex target | Declared as `[[targets]]`; generated from `.harness/resources`. |
| `.claude` | Generated Claude target | Declared as `[[targets]]`; generated from `.harness/resources`. |
| `AGENTS.md` | Generated root instruction output | Sourced from `.harness/dir/AGENTS.md`. |
| `CLAUDE.md` | Generated root instruction output | Sourced from `.harness/dir/CLAUDE.md`. |
| `.claude/settings.json` | Not present | No mutable seed needed. |
| `tmp/hydradb-integration-skill` | Durable skill source | Moved to `.harness/resources/skills/hydradb-integration-skill` and projected to `.agents` and `.claude`. |
| `tmp/nebius-platform-skill-bundle` | Durable skill source | Moved `nebius-platform-skill` to `.harness/resources/skills/nebius-platform-skill` (added `manifest.txt`); projected to `.agents` and `.claude`. |
| Existing prompts, rules, hooks, plugins, agents | Not present | No durable resources to migrate yet. |
| Tracked generated outputs | None | No `git rm --cached` needed. |

Generated surfaces are root-ignored in `.gitignore`; `.harness` remains the
reviewed source of truth for future durable agent configuration.

# Repository Guidelines

## Harness Config

- Durable agent configuration is owned by `.harness` source.
- Update shared skills, prompts, rules, hooks, plugins, agents, and target-level
  seeds under `.harness/resources`.
- Update root agent instructions under `.harness/dir`.
- Preview and apply generated surfaces with `pnpm harness:preview` and
  `pnpm harness:activate`.
- Do not edit generated `.agents`, `.claude`, `AGENTS.md`, or `CLAUDE.md`
  directly except for local runtime state that is intentionally unmanaged.

## Project Structure

- `apps/` holds runnable applications.
- `packages/` holds shared TypeScript packages.
- Internal packages should use the `@mynd-memory/*` scope.

## Tooling

- Package manager: `pnpm`.
- Runtime: Node.js 22.12 or newer.
- TypeScript is strict by default.
- Biome is the formatter and linter.
- Turbo coordinates workspace `build`, `check`, and `dev` tasks.

## Validation

- Run the narrowest relevant command first.
- Use `pnpm check` before handing off larger changes.
- Use `pnpm lint` when formatting or import organization changes are involved.
- Use `pnpm harness:validate` and `pnpm harness:preview` before changing
  generated agent surfaces.

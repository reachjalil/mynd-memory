# Claude Repository Guidelines

Follow the root repository guidance in `AGENTS.md`.

## Harness Config

- Durable Claude and shared agent configuration is owned by `.harness` source.
- Update shared resources under `.harness/resources` and root instructions under
  `.harness/dir`.
- Run `pnpm harness:validate` and `pnpm harness:preview` before applying changes
  with `pnpm harness:activate`.
- Treat `.claude` and `CLAUDE.md` as generated outputs unless a file is
  explicitly documented as runtime-owned local state.

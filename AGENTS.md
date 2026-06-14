# Dev Process

- **TDD style**: Write tests first (red), implement, then verify (green).
- **Non-null assertions (`!`)**: Never use. Use optional chaining (`?.`) or proper narrowing instead.
- **`any`**: Never use. Always type explicitly.
- **Lint**: Don't run `bun run lint` manually. The pre-commit hook handles it.
- **Lint fix**: Run `bun run lint:fix` for safe auto-fixes only. Never run `--unsafe`.
- **Build**: Always verify with `bun run build` before committing.
- **Tests**: Run `bun test` against a running Uptime Kuma instance.
- **Uptime Kuma**: Start via `bun run kuma:start` (docker compose + credentials setup).
- **Credentials**: `.env` has `UPTIME_KUMA_URL`, `UPTIME_KUMA_USERNAME`, `UPTIME_KUMA_PASSWORD`.

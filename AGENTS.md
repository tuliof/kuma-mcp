# Dev Process

- **TDD style**: Write tests first (red), implement, then verify (green).
- **Non-null assertions (`!`)**: Never use. Use optional chaining (`?.`) or proper narrowing instead.
- **`any`**: Never use. Always type explicitly.
- **Lint**: Don't run `bun run lint` manually. The pre-commit hook handles it.
- **Lint fix**: Run `bun run lint:fix` for safe auto-fixes only. Never run `--unsafe`.
- **Build**: Always verify with `bun run build` before committing.
- **Tests**: Run `bun test` against a running Uptime Kuma instance.
- **Uptime Kuma**: Start via `bun run kuma:start` (docker compose + credentials setup), stop via `bun run kuma:stop` (with volumes cleanup).
- **Credentials**: `.env` has `UPTIME_KUMA_URL`, `UPTIME_KUMA_USERNAME`, `UPTIME_KUMA_PASSWORD`.
- **Cleanup**: After any investigation (probe scripts, browser artifacts, temp files), delete all investigation artifacts before finalizing. Run `bun run full-check` at the end — it catches stray files that Biome would scan.
- **Commits**: Use semantic commit prefixes (`feat:`, `fix:`, `test:`, `chore:`). Group related changes into separate commits — never one giant commit.

# Architecture

## Project Layout

```
src/
├── index.ts            # Entry point: reads env, creates MCP server, attaches transport
├── mcp.ts              # MCP server: tool definitions + request handler switch
├── api/
│   ├── index.ts        # UptimeKumaClient: Socket.IO lifecycle + auth + method wrappers
│   ├── monitors.ts     # Socket.IO emit/callback calls (one function per operation)
│   ├── schemas.ts      # Zod schemas + inferred types for tool inputs
│   ├── types.ts        # Shared TS interfaces (Monitor, SocketContext, BulkResult, etc.)
│   └── utils.ts        # Payload transform helpers
tests/
├── integration.test.ts # End-to-end tests against a real Uptime Kuma instance
└── unit/
    ├── env.test.ts
    ├── schemas.test.ts
    └── utils.test.ts
```

## Adding a New MCP Tool — Recipe

Every tool follows a 5-step pattern. Apply them in this order:

### 1. Schema (`schemas.ts`)
Define input validation with Zod. Export both the schema and its inferred type.

```ts
export const MyToolInputSchema = z.object({
  ids: z.array(z.number()).min(1).describe('...'),
  optionalFlag: z.boolean().optional().default(false),
})
export type MyToolInput = z.infer<typeof MyToolInputSchema>
```

**Philosophy:** Parse, don't validate. Reject bad data at the boundary. Extract shared schemas (e.g. `IdsInputSchema`) to avoid duplication.

### 2. API function (`monitors.ts`)
Write the Socket.IO operation. Each function takes `SocketContext` + its payload and returns a `Promise`. Use `emitWithAck` when available; fall back to `emit(event, payload, callback)` for older events.

```ts
export async function myOperation(context: SocketContext, ids: number[]): Promise<MyResult> {
  const results = await Promise.all(ids.map(async (id) => {
    // ... socket call
  }))
  return { count: results.length, items: results }
}
```

**Philosophy:** Fail fast on socket errors — a rejected ID should reject the whole batch call. The caller pre-validates with `find_monitors_by_name` if needed.

### 3. Client method (`index.ts`)
Add a public method on `UptimeKumaClient`. Gate with `ensureAuthenticated()`, delegate to the `monitors.ts` function.

```ts
async myOperation(ids: number[]) {
  await this.ensureAuthenticated()
  return monitors.myOperation(this.getContext(), ids)
}
```

### 4. Tool definition + handler (`mcp.ts`)
Two changes in the same file:

- Add entry to `TOOL_DEFINITIONS[]`:
```ts
{
  name: 'my_operation',
  description: '...',
  inputSchema: zodSchemaToToolInputSchema(MyToolInputSchema) as Tool['inputSchema'],
},
```

- Add `case` to the `setupHandlers()` switch:
```ts
case 'my_operation': {
  const input = MyToolInputSchema.parse(request.params.arguments)
  const result = await this.client.myOperation(input.ids)
  return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
}
```

### 5. Tests
- **Unit tests** in `tests/unit/schemas.test.ts` for schema edge cases
- **Integration tests** in `tests/integration.test.ts` for the full flow against real Uptime Kuma

## Naming Conventions

| Rule                                                              | Example                               | Why                                                  |
| ----------------------------------------------------------------- | ------------------------------------- | ---------------------------------------------------- |
| Action tools that accept multiple IDs get **plural imperative** names | `pause_monitors`, `remove_monitors`       | Matches batch semantics                              |
| Discovery/lookup tools that return summaries stay **singular**        | `find_monitors_by_name`                 | Returns a list of matches, but the purpose is lookup |
| `snake_case` for tool names and schemas                             | `get_monitor_status`, `MyToolInputSchema` | MCP convention                                       |

## The Lookup → Action Bridge

This is the core interaction pattern:

```
find_monitors_by_name("prod-*") ──→ [{id: 3, name}, {id: 7, name}]
                                          │
                          ┌───────────────┼───────────────┐
                          ▼               ▼               ▼
              get_monitors({ids:[3,7]})   pause_monitors({ids:[3,7]})   remove_monitors({ids:[3,7]})
```

- `find_monitors_by_name` returns lightweight summaries (id, name, type, url). It's cheap — use it for exploration.
- All action tools accept `ids: number[]`. A single target is `{ids: [42]}`.
- There is **no** mixed `id | searchTerm | ids` schema. Action tools get IDs; `find_monitors_by_name` bridges names to IDs.
- If a tool is inherently scoped to a single monitor (heartbeats, summary), keep it ID-only with `_by_id` suffix.

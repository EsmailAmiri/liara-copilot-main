# Repository structure

```
liara-copilot/
├─ AGENTS.md  CLAUDE.md  README.md  START_HERE.md
├─ package.json  pnpm-workspace.yaml  tsconfig.base.json  .env.example
├─ docs/
│  ├─ ARCHITECTURE.md  STRUCTURE.md  PLAN.md  TOOLS_SPEC.md  AGENT_SPEC.md
│  ├─ SAFETY_MODEL.md  LIARA_API.md  LIARA_CAPABILITIES.md (generated)
│  ├─ UI_SPEC.md  DEMO_APP_AND_SCENARIOS.md  DEPLOYMENT.md  DECISIONS.md
├─ scripts/                      # dev helpers (seed, record-demo notes)
├─ packages/
│  ├─ shared/                    # zod schemas, event types, risk tiers, i18n keys, Result type
│  ├─ liara-client/
│  │  ├─ src/endpoints.ts        # THE endpoint map, each entry verified: boolean
│  │  ├─ src/client.ts           # LiaraClient interface
│  │  ├─ src/http-client.ts      # live implementation (fetch, retries, error normalization)
│  │  ├─ src/cli-driver.ts       # wraps `liara` CLI with --api-token (deploy fallback)
│  │  ├─ src/mock/               # stateful simulator + scenarios
│  │  ├─ src/capabilities.ts     # capability matrix model
│  │  └─ scripts/probe.ts        # `pnpm probe`
│  ├─ tools/
│  │  ├─ src/registry.ts         # all tools, risk tier, schemas
│  │  ├─ src/risk-policy.ts      # tier rules + overrides
│  │  ├─ src/redact.ts
│  │  ├─ src/read/*.ts  src/write/*.ts  src/analysis/*.ts
│  │  └─ src/context.ts          # ToolContext (client, http prober, clock, audit)
│  └─ agent/
│     ├─ src/llm/{openai.ts,mock.ts,types.ts}
│     ├─ src/loop.ts             # agent loop (tool calling, step limits)
│     ├─ src/evidence.ts         # collect_evidence
│     ├─ src/detectors/*.ts      # rule-based diagnosis
│     ├─ src/diagnosis.ts        # rank + merge hypotheses
│     ├─ src/verify.ts           # verify_fix before/after
│     ├─ src/prompts/{system.fa.ts,system.en.ts}
│     └─ src/project-analyzer.ts # framework detection + plan recommendation
├─ apps/
│  ├─ server/                    # Fastify API, SSE, auth, approvals, audit, monitor, `scenario` CLI
│  ├─ web/                       # Next.js UI (see UI_SPEC)
│  ├─ mcp/                       # MCP stdio server wrapping packages/tools
│  └─ demo-app/                  # faulty sample site (FAULT env var)
```

## Package names
`@copilot/shared`, `@copilot/liara-client`, `@copilot/tools`, `@copilot/agent`, `@copilot/server`, `@copilot/web`, `@copilot/mcp`, `@copilot/demo-app`.

## Dependency rules (enforce with eslint `no-restricted-imports` or dependency-cruiser)
```
shared  <-  liara-client  <-  tools  <-  agent  <-  server
                                   ^                  
                                   └──────── mcp
web  -> (HTTP only) -> server ; web may import @copilot/shared (types/schemas) only
demo-app -> nothing internal
```
- `liara-client` knows nothing about tools or LLMs.
- `tools` knows nothing about LLMs; it exposes JSON-schema-able tool definitions.
- `agent` owns prompts/LLM adapters and calls tools only through the registry + approval gate interface.
- `server` owns persistence, auth, SSE, approval store, scheduler.

## Naming
Files kebab-case; types PascalCase; tool names `snake_case` (they're model-visible); event names dot.case.

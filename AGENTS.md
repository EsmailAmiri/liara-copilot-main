# AGENTS.md — Liara Copilot

You are the implementing agent for **Liara Copilot**: an AI technical teammate that helps website owners deploy, monitor, and troubleshoot apps on **Liara** (Iranian cloud/PaaS) through Liara's APIs, with human approval for risky actions.
This is a competition MVP. It is judged on a ~5 min demo video plus a GitHub README. Read `docs/` in the order below before writing code.

## Read order
1. `docs/ARCHITECTURE.md` — what we're building and why
2. `docs/STRUCTURE.md` — repo layout and dependency rules
3. `docs/PLAN.md` — phased tasks with acceptance criteria (**your work queue**)
4. `docs/TOOLS_SPEC.md`, `docs/AGENT_SPEC.md`, `docs/SAFETY_MODEL.md`
5. `docs/LIARA_API.md` — what is known/unverified about Liara's API
6. `docs/UI_SPEC.md`, `docs/DEMO_APP_AND_SCENARIOS.md`, `docs/DEPLOYMENT.md`

## Stack (fixed — do not substitute)
- Node 22, TypeScript (strict, ESM), **pnpm workspaces**
- Backend: **Fastify 5**, zod, better-sqlite3, SSE for streaming
- Frontend: **Next.js (App Router) + React + Tailwind + shadcn/ui**, Persian-first RTL with English toggle
- LLM: any **OpenAI-compatible chat-completions API with tool calling**, via the `openai` npm SDK and env vars (`LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL`)
- Tests: vitest. Lint: eslint + prettier.
- Use latest stable versions at install time; the lockfile pins them.

## Non-negotiable rules
1. **No secrets in the repo, logs, prompts, or browser.** The Liara token and LLM key live only in server env. The owner fills `.env` after the build — never ask for them, never invent them.
2. **Everything must run offline first.** Implement `LIARA_MODE=mock` and `LLM_MODE=mock` so every feature, test, and the full demo scenarios work with zero credentials. Live mode is the same code path with a different client.
3. **The approval gate is code, not prompt.** The model can only *propose* sensitive actions. Execution requires a server-issued approval. See `docs/SAFETY_MODEL.md`. Never add a code path that executes a `high` tier tool without an approved `PendingAction`.
4. **Never fabricate Liara API behavior.** All endpoints live in `packages/liara-client/src/endpoints.ts`, each marked `verified: true|false`. Unverified ones must be confirmed by `pnpm probe` (live) or Liara's docs before being relied on. If something isn't available via API, surface it through the capability system (`docs/LIARA_API.md`) — don't hide it.
5. **Redact before the LLM.** All tool output passes `redact()` before reaching the model or the UI (tokens, passwords, env values except allowlisted keys, connection strings).
6. **Persian-first UX.** All user-facing strings go through the i18n dictionary (`fa` default, `en`). No hardcoded UI strings in components.
7. **Deterministic first, LLM second.** Diagnosis uses rule-based detectors + evidence; the LLM ranks/explains/cites evidence IDs. Don't ask the LLM to "figure it out from raw logs" alone.
8. **Small, verifiable steps.** One task from `docs/PLAN.md` at a time. Don't start a phase before the previous phase's acceptance checks pass.

## Workflow
- Pick the first unchecked task in `docs/PLAN.md`. Implement it, run its acceptance commands, tick the box, commit (`feat(scope): ...`, conventional commits).
- If a spec is ambiguous, choose the simplest option consistent with the rules above, record the decision in `docs/DECISIONS.md` (append: date, decision, reason), and continue. Do not stop to ask unless blocked by missing credentials for a *live-only* step (those are in `START_HERE.md` → human tasks).
- If real Liara behavior contradicts a doc, **update the doc** and `endpoints.ts`, and note it in `docs/DECISIONS.md`.
- Keep `docs/LIARA_CAPABILITIES.md` and the root `README.md` truthful; they are graded deliverables.

## Commands (create these scripts in Phase 0)
```
pnpm install
pnpm dev            # server + web (+ demo-app) with mock mode by default
pnpm build
pnpm test           # vitest across workspaces
pnpm typecheck
pnpm lint
pnpm probe          # LIVE: read-only API probe -> docs/LIARA_CAPABILITIES.md + capabilities.json
pnpm scenario <id>  # run a demo scenario headlessly against mock (or live) and print the transcript
pnpm mcp            # start MCP stdio server
```

## Code conventions
- Strict TS, no `any` (use `unknown` + zod). Shared types/schemas only in `packages/shared`.
- Packages never import from `apps/*`. `apps/web` never imports server-only packages; it talks to the server over HTTP/SSE only.
- Every tool: zod input schema, `risk` tier, `describe()` for approval cards, `execute()`. No logic in the agent loop that special-cases a tool by name except via the risk policy.
- Errors: return typed `Result`-style objects from tools (`{ ok:false, code, message, hint }`), never throw across the tool boundary. Liara 4xx/5xx and "not supported by API" are distinct codes.
- Logging: pino, JSON, redacted. Each request/tool call gets a `traceId` shown in the UI timeline and audit log.
- Tests: unit tests for risk policy, redaction, diagnosis rules, approval gate (replay/expiry/arg-tamper), and scenario tests for every demo scenario in mock mode.

## Definition of done (whole project)
See the final checklist in `docs/PLAN.md` (Phase 9). In short: all scenarios pass in mock; live probe produced the capability matrix; the stack is deployed on Liara; README + demo script are complete.

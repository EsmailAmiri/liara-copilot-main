# Implementation plan (agent work queue)

Rules: do tasks in order; each task ends with its acceptance check passing; tick the box; commit. Mock-first: nothing below Phase 9's live steps needs credentials.

## Phase 0 — Bootstrap
- [x] 0.1 `git init`; keep root configs already provided (package.json, pnpm-workspace.yaml, tsconfig.base.json, .gitignore, .env.example). Add `.nvmrc` (22), eslint + prettier + vitest configs, `.editorconfig`.
- [x] 0.2 Create workspace packages with `package.json`/`tsconfig.json`/`src/index.ts` stubs per `docs/STRUCTURE.md` (names `@copilot/*`). Create `apps/web` with `create-next-app` (TypeScript, App Router, Tailwind, ESLint, src dir) then init shadcn/ui.
- [x] 0.3 Wire root scripts (see AGENTS.md Commands); add dependency-boundary lint rule.
- [x] 0.4 Create `docs/DECISIONS.md` (empty log) and a root `README.md` skeleton (sections from "README deliverable" below).
**Accept:** `pnpm install && pnpm build && pnpm typecheck && pnpm lint && pnpm test` all green (tests may be placeholders).

## Phase 1 — Shared + Liara client + mock
- [x] 1.1 `@copilot/shared`: `Result`, `ErrCode`, `Risk`, event schemas (`events.ts`), `ApprovalCard`, `EvidenceItem`, `Hypothesis`, `VerificationResult`, i18n key types.
- [x] 1.2 `@copilot/liara-client`: `LiaraClient` interface (apps list/get/create/delete, deploy, restart, stop/start, logs, metrics, env list/set/unset, plans, domains, releases) + `endpoints.ts` (all `verified:false` initially) + `capabilities.ts` model.
- [x] 1.3 `HttpLiaraClient`: fetch wrapper (bearer auth, team header/param if configured, timeout, retry w/ backoff on 429/5xx, error normalization, zod-tolerant parsing, redacted debug logging).
- [x] 1.4 Mock simulator + all scenarios from `docs/DEMO_APP_AND_SCENARIOS.md` with controllable clock and state transitions.
- [x] 1.5 `cli-driver.ts` (spawn `liara` with arg arrays, stream/redact output, kill on abort) — unit-test with a fake binary.
- [x] 1.6 `scripts/probe.ts` + `pnpm probe` (read-only default, `--allow-write` disposable-app flow) generating `docs/LIARA_CAPABILITIES.md` + `capabilities.json`. In mock mode, it runs against the simulator for test purposes.
**Accept:** unit tests for client error normalization, scenario state transitions, probe output generation (mock). Read `liara-cloud/docs` repo (clone to a temp dir, not committed) and update `docs/LIARA_API.md` with anything confirmed.

## Phase 2 — Tools + safety core
- [x] 2.1 `redact()` with thorough tests (tokens, URLs with creds, env values, PEM, long secrets).
- [x] 2.2 Tool framework (`ToolDef`, registry, `ToolContext`), risk policy + `classify` with tests (unknown → high).
- [x] 2.3 Read tools: list_apps, get_app, get_logs, get_metrics, list_env, list_releases, list_plans, check_http, dns_lookup, get_capabilities.
- [x] 2.4 Write tools w/ `describe()` cards: create_app, set_env, unset_env, deploy, restart_app, stop_app, start_app, change_plan, add_domain.
- [x] 2.5 Approval gate (`apps/server/src/approvals/`): PendingAction store (SQLite), propose/approve/reject/expire, argsHash, single-use, audit events.
**Accept:** tests: replay, expiry, tamper, cross-conversation, unknown tool → high, redaction in tool outputs, capability-gated `NOT_SUPPORTED_BY_API` path.

## Phase 3 — Agent intelligence
- [x] 3.1 LLM adapter interface + OpenAI-compatible implementation + JSON-action fallback + mock scripted LLM.
- [x] 3.2 `evidence.ts` (parallel, timeouts, gaps) + `collect_evidence` tool.
- [x] 3.3 Detectors (all in AGENT_SPEC) each with unit tests using fixture logs/metrics.
- [x] 3.4 `diagnosis.ts` merge/rank + citation validation.
- [x] 3.5 `verify.ts` + `verify_fix` tool + before/after model.
- [x] 3.6 `project-analyzer.ts` + `recommend_plan` (fixtures for Node/Next/Python/Laravel/Docker/static/Flutter-web).
- [x] 3.7 Agent loop, system prompts (fa/en), continuation-after-approval turn, step limits, conversation summary.
**Accept:** `pnpm scenario <id> --auto-approve` ends with expected verdict for: `missing_env_500`→fixed, `memory_leak_oom`→fixed/improved, `wrong_port`→fixed, `fresh_project`→deployed+healthy, `db_down`→honest "can't auto-fix" explanation, `api_gap`→limitation message.

## Phase 4 — Server
- [x] 4.1 Fastify app skeleton: config (zod env parse, fail fast with clear messages), pino logging, `/healthz`, `GET /api/config/status`.
- [x] 4.2 SQLite schema/migrations; repositories.
- [x] 4.3 Auth: passcode login, signed session cookie, rate-limit, CSRF token for state-changing routes.
- [x] 4.4 `POST /api/chat` (SSE) wiring agent + event bus; conversation persistence; abort handling.
- [x] 4.5 Approvals routes + continuation turn trigger; audit routes; capabilities route; apps/dashboard route (cached 15s).
- [x] 4.6 Monitor scheduler: poll health+metrics per app (`MONITOR_INTERVAL_SECONDS`), store samples, alert rules (HTTP non-2xx, RAM ≥85%, restart count ↑, log error burst), dedupe/cooldown, SSE `alert` broadcast channel.
- [x] 4.7 `pnpm scenario` CLI.
**Accept:** integration tests via `fastify.inject` for auth, chat SSE (mock LLM), approval flow end-to-end, monitor raising/deduping an alert on `memory_leak_oom`.

## Phase 5 — Web UI
- [x] 5.1 i18n + RTL layout + theme + MODE badge + login page.
- [x] 5.2 API proxy route handler (unbuffered SSE) + `sse.ts` client + typed event store (zustand or reducer).
- [x] 5.3 Chat + suggested prompts + upload.
- [x] 5.4 Timeline panel.
- [x] 5.5 Cards: Approval, Diagnosis, Verification, PlanRecommendation, Limitation, AlertBanner.
- [x] 5.6 Pages: alerts, audit, capabilities, (optional) dashboard.
- [x] 5.7 Polish: empty/error states, loading skeletons, mobile layout, a11y pass.
**Accept:** Playwright smoke test in mock mode: login → "my site is slow" → diagnosis card → approve → verification card "fixed". Screenshots saved to `docs/img/` for README.

## Phase 6 — Demo app
- [x] 6.1 `apps/demo-app` with FAULT modes per spec; Dockerfile; local run script.
- [x] 6.2 `scripts/set-fault.ts` helper; document in README.
**Accept:** each FAULT mode produces the documented symptom locally; logs match detector signatures (add them as detector fixtures).

## Phase 7 — MCP wrapper
- [x] 7.1 `apps/mcp` using `@modelcontextprotocol/sdk` (stdio): expose `read` + `low` tools and `collect_evidence`/`diagnose`/`verify_fix`. `high` tools: only if the client supports MCP elicitation for confirmation; otherwise **disabled** (read-only mode) and clearly described. Same redaction + audit.
- [x] 7.2 Docs: config snippet for Claude Desktop / Cursor in README.
**Accept:** MCP inspector lists tools; calling a high tool without confirmation returns `APPROVAL_REQUIRED`.

## Phase 8 — Docs deliverables
- [x] 8.1 Root `README.md` complete: pitch, screenshots, **short architecture** (diagram), **how it connects to Liara APIs** (auth, token, endpoints actually verified, CLI fallback), **limitations** (from capability matrix, mock vs live, storage, single-user), **how the user interacts** (flows + example prompts), run/deploy instructions, safety model summary, MCP usage.
- [x] 8.2 Finalize `docs/DEMO_APP_AND_SCENARIOS.md` demo script with real timings after rehearsal (human).

## Phase 9 — Live integration & deployment (needs owner credentials — see START_HERE.md)
- [ ] 9.1 Owner fills `.env` (live). Run `pnpm probe`; commit `docs/LIARA_CAPABILITIES.md`; update `endpoints.ts` verified flags and tool risk tiers (restart behavior) based on results; log in DECISIONS.md.
- [ ] 9.2 Fix mismatches between mock and real API shapes; make live flows (create → env → deploy → restart → logs → metrics) work against a disposable app.
- [ ] 9.3 Dockerfiles + `liara.json` per `docs/DEPLOYMENT.md`; deploy demo-app, server, web to Liara.
- [ ] 9.4 Run every scenario live at least once; capture screenshots; fix prompt/detector gaps found.
- [ ] 9.5 Final checklist below.

### Final checklist
- [ ] All scenarios pass in mock; the 3 headline demos pass live
- [ ] Capability matrix generated from a real probe and referenced in README
- [ ] High-tier actions impossible without approval (tests green)
- [ ] No secrets in repo/history (`git log -p | grep -i token` clean; gitleaks if available)
- [ ] README has the 4 required sections; demo script rehearsed; MODE badge shows LIVE in the recording
- [ ] Deployed URLs work; `FAULT` reset to `none`; Liara token expiry shortened/rotated after recording

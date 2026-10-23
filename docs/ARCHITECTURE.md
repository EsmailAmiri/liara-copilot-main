# Architecture

## 1. Product in one paragraph
Liara Copilot is a chat-first technical teammate for website owners on Liara. A non-technical user says "deploy my site" or "my site is slow"; the Copilot gathers evidence through Liara's APIs, explains what's wrong in plain Persian, proposes a fix, asks for approval on risky steps, executes, and **verifies** the result with before/after evidence.

## 2. Judging criteria → design mapping (300 pts)
| Criterion (pts) | Design response |
|---|---|
| Liara integration (100) | Typed `liara-client`, capability probe, real create/deploy/env/restart/logs/metrics flows, CLI fallback for deploy if API lacks source upload |
| Intelligence (100) | Evidence collector → rule-based detectors → ranked hypotheses → LLM explanation with evidence citations → fix → **verification loop** |
| UX (50) | Persian-first chat + live operation timeline + plain-language approval cards + dashboard |
| Reliability/security (50) | Risk-tiered tools, server-enforced approvals, redaction, audit log, background monitor, explicit limitations panel |

## 3. Components
```
 Browser (Next.js, RTL)
    │  HTTP + SSE (same-origin proxy)
 apps/server (Fastify)
    ├─ auth (passcode session)
    ├─ chat route ──► packages/agent ──► LLM (OpenAI-compatible | mock)
    │                     │
    │                     ▼
    │               packages/tools ──► packages/liara-client ──► Liara API (live | mock)
    │                     │                                   └─► Liara CLI (deploy fallback)
    ├─ approval gate (PendingAction store, SQLite)
    ├─ audit log (SQLite)
    ├─ monitor (scheduler → alerts)
    └─ SSE event bus
 apps/mcp  ──► packages/tools (read/low tier by default)
 apps/demo-app  (intentionally faulty site deployed on Liara for demos)
```

## 4. Key flows
**Deploy:** user describes/uploads project → `analyze_project` → `recommend_plan` → proposal card (create app + plan) → approve → `create_app` → `set_env` → `deploy` (approval) → timeline streams build/release status → `check_http` verifies the site responds → domain checklist (IRNIC / nameservers) for the manual steps.

**Troubleshoot:** trigger = user message OR monitor alert → `collect_evidence(app)` (status, metrics, logs, HTTP probe, env *names*, releases, plan limits) → detectors produce hypotheses → agent explains top causes with evidence IDs → proposes action(s) → approval → execute → `verify_fix` polls for N seconds and compares before/after → verdict card.

**Monitor:** scheduler polls health + metrics per app; threshold/pattern breaches create alerts; opening an alert starts a troubleshoot flow pre-seeded with evidence.

## 5. Modes
`LIARA_MODE` and `LLM_MODE` are independent: `mock|live`. Mock Liara is a stateful in-process simulator (scenarios in `docs/DEMO_APP_AND_SCENARIOS.md`) — actions change state (adding an env var + restart turns a 500 into 200). The UI shows a visible **MOCK** badge whenever either side is mock. The demo video must be recorded in live/live.

## 6. Data
SQLite (`DATA_DIR/copilot.sqlite`): `conversations`, `messages`, `pending_actions`, `audit_log`, `alerts`, `metric_samples`, `capabilities_cache`. No secrets stored. Ephemeral storage on Liara is acceptable for the MVP (note in README); optionally mount a Liara disk at `DATA_DIR`.

## 7. Streaming protocol (SSE event types)
`message.delta`, `message.done`, `tool.started`, `tool.finished`, `timeline.step`, `approval.required`, `approval.resolved`, `diagnosis.ready`, `verification.result`, `alert`, `error`. Schemas live in `packages/shared/src/events.ts`; both server and web import them.

## 8. Explicit non-goals
Billing/payments, multi-user RBAC, managing every Liara service (focus: apps, env, domains/DNS where API allows, logs, metrics, plans, DBs read-only if exposed), self-healing without approval.

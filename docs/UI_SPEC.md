# UI spec (apps/web — Next.js App Router, Tailwind, shadcn/ui)

## Principles
Persian-first, RTL (`<html lang="fa" dir="rtl">`), toggle to English/LTR. Font: Vazirmatn (self-hosted via `next/font` or local files; no runtime CDN dependency). Calm, trustworthy, minimal jargon. Mobile-friendly. Dark + light.
All strings in `apps/web/src/i18n/{fa,en}.ts`; Persian digits option for numbers/dates (Jalali date display optional, nice-to-have).

## Auth
`/login`: passcode field → `POST /api/auth/login`. Everything else requires a session.

## Layout (`/`)
Three regions (collapse to tabs on mobile):
1. **Sidebar:** app list with live health dot (from `/api/apps`), plan badge, "new deployment" button, nav: Chat · Alerts · Audit · Capabilities.
2. **Main: Chat** — streaming messages, suggested prompts (fa: «سایتم رو دیپلوی کن», «سایتم کند شده», «چرا خطای ۵۰۰ می‌گیرم؟», «وضعیت سرویس‌هام چطوره؟»), file/zip upload for project analysis.
3. **Right panel: Operation timeline** — live steps from `timeline.step` events: pending → running → done/failed, with duration, tool name, source badge (API / CLI / probe), expandable redacted details.

## Inline rich cards (rendered from SSE events)
- **ApprovalCard** (`approval.required`): title, plain-language summary, "what will happen", impact bullets (e.g. «سایت حدود ۱۰ ثانیه در دسترس نیست»), rollback note, details table, risk chip, **Approve / Reject** buttons, countdown to expiry. States: pending/approved/running/done/failed/expired/rejected. Buttons disabled after resolution.
- **DiagnosisCard** (`diagnosis.ready`): ranked hypotheses with confidence bars, evidence chips (E3 → click to expand the redacted excerpt), suggested actions.
- **VerificationCard** (`verification.result`): before/after columns (HTTP status, latency, RAM %, error count), verdict badge (fixed/improved/unchanged/worse/inconclusive), per-check pass/fail.
- **PlanRecommendationCard**: detected stack, recommended Liara platform/plan, why, cost/resource note, "Proceed" (starts approval flow).
- **LimitationCard**: shown when a tool returns `NOT_SUPPORTED_BY_API`: what the API can't do + numbered manual steps + "mark done" button where useful (domain/IRNIC checklist).
- **AlertBanner** (`alert`): from the monitor; click → opens chat with that app's evidence preloaded.

## Other pages
- `/alerts`: list with severity, app, first seen, status; "Investigate" starts troubleshoot flow.
- `/audit`: table (time, actor: user|agent|monitor, tool, tier, outcome, traceId), filters, JSON export.
- `/capabilities`: the capability matrix (supported/partial/unsupported/unknown, via api/cli), last probe time. This page is a scored deliverable: "announce API limitations".
- `/dashboard` (optional): per-app CPU/RAM sparkline (recharts), status, last release.

## Global elements
- **MODE badge** top bar: `MOCK` (amber) when `LIARA_MODE` or `LLM_MODE` is mock; `LIVE` (green) otherwise. From `GET /api/config/status` (no secrets).
- Connection state indicator for SSE with auto-reconnect.
- Empty/error states in Persian for every card; never show raw stack traces.

## SSE client
`apps/web/src/lib/sse.ts`: `fetch` + `ReadableStream` parser (POST with body), typed with `@copilot/shared` event schemas, reconnect/backoff, abort on navigation.

## Same-origin proxy
Browser calls `/api/*` on the Next origin. Implement as a **Route Handler** (`app/api/[...path]/route.ts`) that forwards to `API_URL`, forwards cookies/headers, and **pipes the response body unbuffered** (`export const dynamic='force-dynamic'`, `runtime='nodejs'`, set `Cache-Control: no-store`, `X-Accel-Buffering: no`). Verify SSE streams token-by-token through it in dev and on Liara. If a platform buffer breaks SSE, fallback: browser calls API origin directly with CORS (`WEB_ORIGIN`) and cookie `SameSite=None; Secure`.

## Accessibility & polish
Keyboard-operable approval buttons, focus management on new cards, aria-live for streaming, sufficient contrast, skeleton loaders. Demo-friendly: good default window size (1440×900), no console errors.

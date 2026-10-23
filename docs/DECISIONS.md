# Decisions log
Append entries: `YYYY-MM-DD — decision — reason`.

- Stack fixed by owner: React + Next.js frontend, Node backend.
- Mock-first development; live credentials added by owner at the end.
- Tool approvals enforced server-side; the model can only propose high-risk actions.
- Liara endpoints from community projects are UNVERIFIED until probed/confirmed.
- 2026-10-23 — Confirmed Liara CLI non-interactive syntax and flags (`--api-token`, `--team-id`, `--app`, `-f`, `env:set/unset/ls --output=json`, `deploy --no-app-logs`) from official liara-cloud/docs repo. Confirmed env mutations cause app restart, validating the high-risk classification for set_env/unset_env.
- 2026-10-23 — Implemented ControllableClock and full state transitions in MockLiaraClient for deterministic headless scenario verification.
- 2026-10-23 — Verified complete API schemas against official Liara OpenAPI 3.0 specs at https://developers.liara.ir (paas.yaml, me.yaml, billing.yaml, dns.yaml, dbaas.yaml). Closed previous API gaps:
  1. Base URL verified as `https://api.liara.ir` for PaaS/DBaaS and `https://dns-service.liara.ir` for DNS.
  2. Verified env updates use `POST /v1/projects/update-envs` with `{ project, variables: [{ key, value }] }` and reading envs is directly accessible from `project.envs` in `GET /v1/projects/{name}`.
  3. Verified start/stop uses `POST /v1/projects/{name}/actions/scale` with `{ scale: 1|0 }`.
  4. Verified plan resizing uses `POST /v1/projects/{name}/resize` with `{ planID }`.
  5. Verified user balance endpoint is `GET /v1/billing` (`user.balance`) and user info is `GET /v1/me`.
  6. All endpoints in `endpoints.ts` marked `verified: true`.

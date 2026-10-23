# Deploying Liara Copilot (and the demo app) on Liara

> All `liara.json` keys and CLI flags below must be **verified against docs.liara.ir / `liara --help`** before use (record results in `docs/DECISIONS.md`). Prefer the Docker platform for the monorepo apps — it avoids platform-specific monorepo build quirks.

## Apps to create on Liara (owner does this in the console or via CLI)
| Liara app | Source | Port | Notes |
|---|---|---|---|
| `copilot-api` | `apps/server` (Dockerfile) | 3001 | needs env vars; has `liara` CLI installed in image for deploy fallback |
| `copilot-web` | `apps/web` (Dockerfile) | 3000 | `API_URL=https://<copilot-api domain>` (or internal URL) |
| `demo-shop` | `apps/demo-app` (Dockerfile) | 3000 (3002 in local dev) | env `FAULT`, `DATABASE_URL` — the thing the Copilot manages |
(App names must be globally unique on Liara — choose your own.)
Optionally attach a Liara disk mounted at `DATA_DIR` for SQLite persistence.

## Dockerfiles (Already created in repo)
- `apps/server/Dockerfile`: Multi-stage build; installs pnpm and `@liara/cli`; compiles `@copilot/server` and dependencies; exposes port 3001.
- `apps/web/Dockerfile`: Multi-stage Next.js production container; exposes port 3000.
- `apps/demo-app/Dockerfile`: Lightweight Node container for the faulty demo store; exposes port 3000.
Each app directory contains a pre-configured `liara.json`:
- `apps/server/liara.json` (`{ "app": "copilot-api", "platform": "docker", "port": 3001 }`)
- `apps/web/liara.json` (`{ "app": "copilot-web", "platform": "docker", "port": 3000 }`)
- `apps/demo-app/liara.json` (`{ "app": "demo-shop", "platform": "docker", "port": 3000 }`)

## Environment variables per app
- `copilot-api`: everything in `.env.example` Server + Liara + LLM sections; set `LIARA_MODE=live`, `LLM_MODE=live`, strong `APP_PASSCODE`, `SESSION_SECRET`, `WEB_ORIGIN`.
- `copilot-web`: `API_URL`.
- `demo-shop`: `FAULT`, optional `DATABASE_URL`.
Set secrets in Liara's env settings (not in the repo/Dockerfile).

## Deploy commands (owner, after `liara login` or with `--api-token`)
```
cd apps/demo-app && liara deploy --app <demo-shop> --platform docker --port 3000
cd apps/server   && liara deploy --app <copilot-api> --platform docker --port 3001
cd apps/web      && liara deploy --app <copilot-web> --platform docker --port 3000
```
(For monorepo Docker builds the build context must include the workspace root; if `liara deploy` from a subfolder can't see it, deploy from root with `--path .` and `-f`/Dockerfile path option — verify; or use a root-level `Dockerfile.server` / `Dockerfile.web`.)

## Post-deploy checks
1. `GET https://<copilot-api>/healthz` → 200 `{mode:{liara:'live',llm:'live'}}`.
2. Login works; SSE streams through the web proxy token-by-token.
3. Run `pnpm probe` locally with the token → commit `docs/LIARA_CAPABILITIES.md`.
4. Run each demo scenario live once; fix tier assignments if probe showed restart behavior differs.
5. Rotate/shorten the Liara token expiry after the demo.

## Cost & hygiene
Use the smallest plans for demo apps; delete probe apps; token has expiry; don't leave `FAULT=memory_leak` running.

# START HERE

## 0. Create the repo
```
mkdir liara-copilot && cd liara-copilot
# copy every file from this pack into it (keep the structure), then:
git init && git add -A && git commit -m "chore: add agent docs and root config"
```
Prereqs: Node 22+, pnpm 9 (`corepack enable`), git. Optional later: the `liara` CLI (`npm i -g @liara/cli` — verify package name in Liara docs).

## 1. Kickoff prompt for your coding agent (Claude Code / Cursor / Codex)
Paste this as the first message:

> You are the implementing agent for this repository. Read `AGENTS.md` first, then every file under `docs/` in the order it lists. Then execute `docs/PLAN.md` from Phase 0 through Phase 8 autonomously, one task at a time, ticking boxes and committing as you go. Everything must work in mock mode with no credentials. Follow the rules in AGENTS.md strictly (especially: server-enforced approval gate, redaction, no fabricated Liara API behavior, Persian-first UI). Log ambiguities and decisions in `docs/DECISIONS.md` instead of stopping. Stop after Phase 8 and give me a summary of what works, what is unverified, and exactly what I need to do for Phase 9.

Tip: if the agent runs out of context, restart it with the same prompt — `docs/PLAN.md` checkboxes and `docs/DECISIONS.md` carry the state.

## 2. Human tasks (you) — after Phase 8
1. `cp .env.example .env`, then fill:
   - `LIARA_API_TOKEN` (console.liara.ir → API → new key; pick an expiry long enough for the demo) and `LIARA_TEAM_ID` if you use a team
   - `LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL` (OpenAI-compatible, tool calling). If your model can't do native tool calls, set `LLM_NATIVE_TOOLS=0`
   - set `LIARA_MODE=live`, `LLM_MODE=live`, strong `APP_PASSCODE` and `SESSION_SECRET`
2. Run `pnpm probe` (add `--allow-write` once, deliberately, to exercise create/env/restart on a disposable app). Review `docs/LIARA_CAPABILITIES.md`.
3. Hand the results back to the agent: "Execute Phase 9 from docs/PLAN.md" (it will adjust endpoints, tiers, and docs from real behavior).
4. Create the three Liara apps (copilot-api, copilot-web, demo-shop) and deploy per `docs/DEPLOYMENT.md`.
5. Rehearse the demo script in `docs/DEMO_APP_AND_SCENARIOS.md` in LIVE mode, then record (~5 min, with voice; show output, not code).
6. Make the GitHub repo public (or as required), confirm no secrets in history, submit README + video.

## 3. Things only you can do (the assistant can't)
Registrar/IRNIC steps, paying for plans, the Liara token/LLM key, recording the video.

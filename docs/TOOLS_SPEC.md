# Tools spec

Defined in `packages/tools`. Each tool:
```ts
interface ToolDef<I, O> {
  name: string;                       // snake_case, model-visible
  description: string;                // for the LLM, concise, says when to use it
  input: z.ZodType<I>;
  risk: Risk | ((args:I, ctx)=>Risk); // 'read' | 'low' | 'high'
  capability?: CapabilityId;          // gate on capability matrix
  describe?(args:I, ctx): ApprovalCard; // REQUIRED for low/high: summary, impact, rollback, details[]
  execute(args:I, ctx): Promise<Result<O>>;
}
type Result<O> = {ok:true,data:O} | {ok:false,code:ErrCode,message:string,hint?:string};
```
`ErrCode`: `NOT_SUPPORTED_BY_API | UNAUTHORIZED | FORBIDDEN | NOT_FOUND | RATE_LIMITED | LIARA_ERROR | UNEXPECTED_SHAPE | VALIDATION | APPROVAL_REQUIRED | NOT_ALLOWED | TIMEOUT`.

## Registry (initial set)
### Read
| Tool | Purpose |
|---|---|
| `list_apps` | Apps in account (name, platform, status, plan) |
| `get_app` | Details: status, plan/resources, domains, last release |
| `get_logs` | Recent logs (limit/since/until/level filter; redacted; truncated) |
| `get_metrics` | CPU/RAM/(disk/net) over a window + latest + trend |
| `list_env` | Env var **names** (+ allowlisted values) |
| `list_releases` | Recent deployments/releases if API exposes |
| `list_plans` | Available plans/resources for recommendations |
| `check_http` | Probe public URL(s): status, latency, redirect chain, TLS ok, body snippet (≤1KB, redacted) |
| `dns_lookup` | A/AAAA/CNAME/NS/TXT for a domain (Node `dns` module) |
| `analyze_project` | Detect framework/runtime/port/build/start/env needs from an uploaded project dir/zip or repo URL |
| `recommend_plan` | Map project needs → Liara platform + plan with reasoning |
| `collect_evidence` | Bundle: status + metrics + logs + http probe + env names + releases + plan (see AGENT_SPEC) |
| `diagnose` | Run detectors on an evidence bundle → ranked hypotheses |
| `get_capabilities` | Return capability matrix (so agent can state limits) |
### Low / High (writes)
| Tool | Default risk | Notes |
|---|---|---|
| `create_app` | low (high if it costs money per probe/billing info) | Empty app; name validation |
| `set_env` | high | Setting environment variables causes app restart (verified in official docs) |
| `unset_env` | high | |
| `deploy` | high | API upload or CLI driver; streams `timeline.step` |
| `restart_app` | high | |
| `stop_app` / `start_app` | high | |
| `change_plan` | high | Show cost/resource delta if known |
| `add_domain` | high | Returns registrar checklist |
| `verify_fix` | read | Polls health/logs/metrics for N seconds, compares to baseline evidence |

## Approval card (`describe()`)
```ts
{ title: string, summary: string, impact: string[], rollback?: string, risk:'low'|'high',
  details: {label:string,value:string}[], capabilityVia:'api'|'cli' }
```
All strings are produced via i18n keys (fa/en), never by the LLM.

## Tool output rules
- Always redacted; size-capped (logs ≤20KB, evidence bundle ≤40KB to the model).
- Include `traceId`, `durationMs`, `source: 'liara-api'|'liara-cli'|'http-probe'|'mock'`.
- Provide `evidenceId`s (E1, E2…) for items the agent may cite.

# Demo app and scenarios

## `apps/demo-app` — intentionally faulty site
Tiny Node (Fastify/Express) site "فروشگاه نمونه" with: `GET /` (HTML page), `GET /api/items`, `GET /health`. Structured JSON logs to stdout. Behavior controlled by env **`FAULT`**:
| FAULT | Behavior | Expected diagnosis |
|---|---|---|
| `none` | healthy | — |
| `missing_env` | requires `DATABASE_URL`; if absent → every request 500, log `Error: Missing required env DATABASE_URL` | `missing_env` → propose `set_env DATABASE_URL` (user supplies value; for demo use a harmless placeholder + `FAULT` flip) → restart → verify 200 |
| `memory_leak` | each request retains ~2–5 MB; RAM climbs; eventually OOM/restart; latency grows | `memory_pressure`/`oom_kill` → propose plan upgrade (+ note "root cause is app code leak") → verify RAM headroom |
| `wrong_port` | listens on 8080 while Liara app configured for 3000 | `port_mismatch` → propose set `PORT` env or restart with correct port → verify 200 |
| `db_down` | tries to connect to an unreachable host; 500 on data routes; logs ECONNREFUSED | `db_connection` → explain, propose checking DB env/host; no auto-fix (shows honest limits) |
The demo can flip faults by changing the `FAULT` env var through the Copilot itself (safe-by-design: it's the demo's own app) or via `scripts/set-fault.ts`.

## Mock scenarios (`packages/liara-client/src/mock/scenarios/*.ts`)
Each scenario defines initial app state (status, plan, env, metrics generator, log generator, HTTP probe response) and **state transitions** triggered by actions:
- `healthy`: steady metrics, 200s.
- `fresh_project`: no app yet; `create_app` → `deploy` goes through queued→building→running over a few simulated seconds with realistic build logs; ends healthy.
- `missing_env_500`: 500s with log signature; `set_env(DATABASE_URL)` + `restart_app` → healthy.
- `memory_leak_oom`: RAM ramps to 95%, OOM-kill logs, restarts; `change_plan` up → stable.
- `wrong_port`: probe refused; port env fix → healthy.
- `db_down`: 500s on data routes, ECONNREFUSED; no fix available (expected honest outcome).
- `api_gap`: a capability returns `NOT_SUPPORTED_BY_API` (e.g. logs streaming or domain NS read) to exercise LimitationCard.
Simulated time is controllable (`clock.advance`) so tests are fast and deterministic.

## Scenario runner
`pnpm scenario <id> [--live]` runs the full agent loop headlessly with the scripted/mock LLM (or live LLM), auto-approving **only when `--auto-approve` is passed** (tests), and prints transcript + final verification verdict. Used in CI-style tests: every scenario must end with its expected verdict.

## Demo video script (~5:00, narrate in Persian; record in LIVE/LIVE)

| زمان | بخش ویدیو (Beat) | آنچه روی صفحه نمایش داده می‌شود | متن پیشنهادی گوینده (فارسی) |
|---|---|---|---|
| **0:00–0:30** | **مقدمه و طرح مسئله:** همکار فنی هوشمند برای مدیریت زیرساخت روی لیارا | صفحه اصلی پنل، بج سبز رنگ `LIVE` در بالای صفحه، معرفی اجمالی سیستم | «سلام. مدیریت سرور و زیرساخت برای بسیاری از صاحبان سایت‌ها و وب‌مسترها کار دشوار و پرریسکی است. امروز لیارا کوپایلوت را معرفی می‌کنیم؛ یک همکار فنی هوشمند که به صورت مستقیم با APIهای لیارا یکپارچه شده تا استقرار، مانیتورینگ و رفع خطای برنامه‌ها را بدون نیاز به دانش پیچیده دواپس انجام دهد.» |
| **0:30–1:45** | **استقرار از صفر (Deploy from Zero):** آنالیز سورس -> پیشنهاد پلن -> کارت تأیید -> استقرار لایو | کلیک روی دکمه «استقرار جدید»، ظاهر شدن `PlanRecommendationCard`، صدور کارت تأیید، اجرای زنده در تایم‌لاین و بررسی پروب سلامت ۲۰۰ | «کاربر به سادگی می‌گوید پروژه جدیدم را دیپلوی کن. کوپایلوت ساختار پروژه را آنالیز کرده، فریم‌ورک و پورت را تشخیص می‌دهد و پلن مناسب را پیشنهاد می‌کند. با تأیید کاربر، برنامه ساخته شده و پروژه با درایور CLI روی کانتینر ابری لیارا دیپلوی می‌شود و سلامت آن با پروب HTTP تایید می‌گردد.» |
| **1:45–3:00** | **عیب‌یابی کندی و مانیتورینگ:** هشدار خودکار مصرف رم -> کارت تشخیص ریشه‌ای -> ارتقای پلن -> اعتبارسنجی قبل و بعد | کلیک روی بنر هشدار مانیتورینگ، بارگذاری خودکار شواهد، نمایش `DiagnosisCard` با نوار اطمینان و استناد به شواهد E2، صدور کارت تأیید ارتقای پلن، نمایش `VerificationCard` | «سیستم مانیتورینگ متوجه پر شدن ۹۵ درصدی رم برنامه demo-shop می‌شود. کوپایلوت فوراً شواهد را جمع‌آوری کرده و در کارت عیب‌یابی علت ریشه‌ای را با ارجاع به مدرک E2 نشان می‌دهد. با تأیید مدیر، پلن برنامه ارتقا یافته و در کارت اعتبارسنجی می‌بینیم که وضعیت رم به محدوده امن برگشته است.» |
| **3:00–3:45** | **رفع خطای ۵۰۰ (Missing Env):** یافتن فقدان متغیر در لاگ -> تنظیم متغیر محیطی -> ری‌استارت کانتینر -> بازگشت وضعیت ۲۰۰ | ارسال پرامپت «چرا خطای ۵۰۰ می‌گیرم؟»، چیپ‌های شواهد لاگ، کارت تأیید `set_env` با سانسور مقادیر حساس، کارنامه سلامت | «در سناریوی خطای ۵۰۰، کوپایلوت در لاگ‌ها متوجه نبود DATABASE_URL می‌شود. برای رفع آن، کارت تأیید صادر می‌شود که مقادیر حساس را سانسور کرده است. پس از تأیید و ری‌استارت، اعتبارسنجی خودکار تایید می‌کند که خطای ۵۰۰ رفع شده و سایت با کد ۲۰۰ پاسخ می‌دهد.» |
| **3:45–4:20** | **شفافیت در محدودیت‌ها و صفحه Capabilities:** کار با دامنه و ایرنیک -> کارت محدودیت | کارت `LimitationCard` با چک‌لیست مراحل دستی در ایرنیک، باز کردن صفحه `/capabilities` | «کوپایلوت هیچ‌گاه وعده دروغین نمی‌دهد؛ برای عملیاتی که نیازمند اقدام در پنل رجیسترار است (مانند ست کردن نیم‌سرورها در ایرنیک)، کارت محدودیت و چک‌لیست گام‌به‌گام ارائه می‌کند. همچنین در صفحه ماتریس توانمندی‌ها، وضعیت تمامی امکانات API شفاف بیان شده است.» |
| **4:20–5:00** | **امنیت، لاگ ممیزی و سرور MCP:** نمایش `/audit` و اتصال به Claude Desktop | صفحه گزارش وقایع `/audit` با دکمه دانلود JSON، نمایش ابزارها در سرور MCP | «تمامی اقدامات پرریسک نیازمند تأیید در سطح سرور هستند و تاریخچه کامل آن‌ها در صفحه وقایع ثبت می‌شود. علاوه بر وب، کلیه ابزارها از طریق سرور استاندارد MCP در دسترس ابزارهایی مانند Claude و Cursor قرار دارند.» |

### نکات کلیدی ضبط ویدیو
1. **پیش‌گرمایش (Pre-warm):** قبل از شروع رکورد، یک بار برنامه `demo-shop` و سرورها را اجرا کنید تا پاسخ‌ها سریع باشند.
2. **عدم نمایش کدهای برنامه:** در ویدیو خروجی‌ها، رابط کاربری و عملکرد واقعی ابزارها را نمایش دهید، نه کدهای منبع.
3. **وضوح تصویر:** رزولوشن پیشنهادی 1440x900 یا 1080p با مقیاس مناسب فونت فارسی.


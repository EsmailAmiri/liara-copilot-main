# Liara API Capabilities Matrix

> Automatically generated on **2026-10-23T13:35:24.719Z** (Mode: **MOCK**).

| Capability | Status | Channel | Restarts App | Notes |
|---|---|---|---|---|
| **auth.verify** (احراز هویت توکن API / Token verification) | ✅ Supported | `api` | No | Verified (demo@liara.ir) |
| **apps.list** (لیست برنامه‌ها / List apps) | ✅ Supported | `api` | No | Found 1 apps |
| **apps.get** (جزئیات برنامه / App details) | ✅ Supported | `api` | No | - |
| **apps.create** (ایجاد برنامه جدید / Create app) | ✅ Supported | `api` | No | - |
| **apps.delete** (حذف برنامه / Delete app) | ✅ Supported | `api` | No | - |
| **apps.deploy.source** (استقرار سورس کد / Deploy from source) | ✅ Supported | `cli` | No | استقرار کامل سورس کد محلی از طریق دستور liara deploy در CLI انجام می‌شود |
| **apps.deploy.image** (استقرار ایمیج داکر / Deploy Docker image) | ✅ Supported | `api` | No | - |
| **apps.releases.list** (لیست رلیزها / List releases) | ✅ Supported | `api` | No | - |
| **apps.restart** (ری‌استارت برنامه / Restart app) | ✅ Supported | `api` | Yes | - |
| **apps.stop_start** (توقف و شروع برنامه / Stop & start app) | ✅ Supported | `api` | Yes | - |
| **apps.logs.read** (خواندن لاگ‌ها / Read app logs) | ✅ Supported | `api` | No | - |
| **apps.logs.stream** (استریم زنده لاگ‌ها / Stream logs) | ⚠️ Partial | `cli` | No | استریم بلادرنگ لاگ‌ها از طریق دستور liara app:logs -f در CLI انجام می‌شود |
| **apps.metrics.read** (خواندن متریک‌ها (CPU/RAM) / Read metrics) | ✅ Supported | `api` | No | - |
| **apps.env.list** (مشاهده متغیرهای محیطی / List env vars) | ✅ Supported | `api` | No | - |
| **apps.env.set** (تنظیم متغیر محیطی / Set env var) | ✅ Supported | `api` | Yes | - |
| **apps.env.unset** (حذف متغیر محیطی / Unset env var) | ✅ Supported | `api` | Yes | - |
| **apps.plan.list** (لیست پلن‌ها و منابع / List plans) | ✅ Supported | `api` | No | 4 plans available |
| **apps.plan.change** (تغییر پلن و ارتقا / Change plan/resize) | ✅ Supported | `api` | Yes | - |
| **apps.domains.list** (مشاهده دامنه‌ها / List domains) | ✅ Supported | `api` | No | - |
| **apps.domains.add** (افزودن دامنه / Add domain) | ✅ Supported | `api` | No | - |
| **dns.records.list** (مشاهده رکوردهای DNS / List DNS records) | ⚠️ Partial | `api` | No | تنها برای دامنه‌های مدیریت‌شده روی DNS لیارا |
| **dns.records.add** (ثبت رکورد DNS / Add DNS record) | ⚠️ Partial | `api` | No | - |
| **databases.list** (لیست دیتابیس‌ها / List databases) | ✅ Supported | `api` | No | - |
| **account.balance** (موجودی و وضعیت حساب / Account balance) | ✅ Supported | `api` | No | Balance: 5000000 |

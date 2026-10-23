export type CapabilityStatus = 'supported' | 'partial' | 'unsupported' | 'unknown';

export type CapabilityId =
  | 'auth.verify'
  | 'apps.list'
  | 'apps.get'
  | 'apps.create'
  | 'apps.delete'
  | 'apps.deploy.source'
  | 'apps.deploy.image'
  | 'apps.releases.list'
  | 'apps.restart'
  | 'apps.stop_start'
  | 'apps.logs.read'
  | 'apps.logs.stream'
  | 'apps.metrics.read'
  | 'apps.env.list'
  | 'apps.env.set'
  | 'apps.env.unset'
  | 'apps.plan.list'
  | 'apps.plan.change'
  | 'apps.domains.list'
  | 'apps.domains.add'
  | 'dns.records.list'
  | 'dns.records.add'
  | 'databases.list'
  | 'account.balance';

export interface CapabilityEntry {
  id: CapabilityId;
  label: string;
  status: CapabilityStatus;
  via: 'api' | 'cli' | 'none';
  notes?: string;
  lastCheckedAt?: string;
  restartsApp?: boolean;
}

export const INITIAL_CAPABILITIES: CapabilityEntry[] = [
  {
    id: 'auth.verify',
    label: 'احراز هویت توکن API / Token verification',
    status: 'supported',
    via: 'api',
    notes: 'تأیید توکن از طریق endpoint حساب کاربری',
  },
  {
    id: 'apps.list',
    label: 'لیست برنامه‌ها / List apps',
    status: 'supported',
    via: 'api',
  },
  {
    id: 'apps.get',
    label: 'جزئیات برنامه / App details',
    status: 'supported',
    via: 'api',
  },
  {
    id: 'apps.create',
    label: 'ایجاد برنامه جدید / Create app',
    status: 'supported',
    via: 'api',
  },
  {
    id: 'apps.delete',
    label: 'حذف برنامه / Delete app',
    status: 'supported',
    via: 'api',
  },
  {
    id: 'apps.deploy.source',
    label: 'استقرار سورس کد / Deploy from source',
    status: 'supported',
    via: 'cli',
    notes: 'استقرار کامل سورس کد محلی از طریق دستور liara deploy در CLI انجام می‌شود',
  },
  {
    id: 'apps.deploy.image',
    label: 'استقرار ایمیج داکر / Deploy Docker image',
    status: 'supported',
    via: 'api',
  },
  {
    id: 'apps.releases.list',
    label: 'لیست رلیزها / List releases',
    status: 'supported',
    via: 'api',
  },
  {
    id: 'apps.restart',
    label: 'ری‌استارت برنامه / Restart app',
    status: 'supported',
    via: 'api',
    restartsApp: true,
  },
  {
    id: 'apps.stop_start',
    label: 'توقف و شروع برنامه / Stop & start app',
    status: 'supported',
    via: 'api',
    restartsApp: true,
  },
  {
    id: 'apps.logs.read',
    label: 'خواندن لاگ‌ها / Read app logs',
    status: 'supported',
    via: 'api',
  },
  {
    id: 'apps.logs.stream',
    label: 'استریم زنده لاگ‌ها / Stream logs',
    status: 'partial',
    via: 'cli',
    notes: 'استریم بلادرنگ لاگ‌ها از طریق دستور liara app:logs -f در CLI انجام می‌شود',
  },
  {
    id: 'apps.metrics.read',
    label: 'خواندن متریک‌ها (CPU/RAM) / Read metrics',
    status: 'supported',
    via: 'api',
  },
  {
    id: 'apps.env.list',
    label: 'مشاهده متغیرهای محیطی / List env vars',
    status: 'supported',
    via: 'api',
  },
  {
    id: 'apps.env.set',
    label: 'تنظیم متغیر محیطی / Set env var',
    status: 'supported',
    via: 'api',
    restartsApp: true,
  },
  {
    id: 'apps.env.unset',
    label: 'حذف متغیر محیطی / Unset env var',
    status: 'supported',
    via: 'api',
    restartsApp: true,
  },
  {
    id: 'apps.plan.list',
    label: 'لیست پلن‌ها و منابع / List plans',
    status: 'supported',
    via: 'api',
  },
  {
    id: 'apps.plan.change',
    label: 'تغییر پلن و ارتقا / Change plan/resize',
    status: 'supported',
    via: 'api',
    restartsApp: true,
  },
  {
    id: 'apps.domains.list',
    label: 'مشاهده دامنه‌ها / List domains',
    status: 'supported',
    via: 'api',
  },
  {
    id: 'apps.domains.add',
    label: 'افزودن دامنه / Add domain',
    status: 'supported',
    via: 'api',
  },
  {
    id: 'dns.records.list',
    label: 'مشاهده رکوردهای DNS / List DNS records',
    status: 'partial',
    via: 'api',
    notes: 'تنها برای دامنه‌های مدیریت‌شده روی DNS لیارا',
  },
  {
    id: 'dns.records.add',
    label: 'ثبت رکورد DNS / Add DNS record',
    status: 'partial',
    via: 'api',
  },
  {
    id: 'databases.list',
    label: 'لیست دیتابیس‌ها / List databases',
    status: 'supported',
    via: 'api',
  },
  {
    id: 'account.balance',
    label: 'موجودی و وضعیت حساب / Account balance',
    status: 'supported',
    via: 'api',
  },
];

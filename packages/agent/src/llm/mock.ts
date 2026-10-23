import type { LLMAdapter, LLMAdapterOptions, LLMChunk } from './types.js';

export class MockScriptedLLM implements LLMAdapter {
  private scenario: string;

  constructor(scenario = 'missing_env_500') {
    this.scenario = scenario;
  }

  setScenario(scenario: string) {
    this.scenario = scenario;
  }

  async *chat(options: LLMAdapterOptions): AsyncIterable<LLMChunk> {
    const messages = options.messages;

    const hasEvidence = messages.some((m) => m.role === 'tool' && m.name === 'collect_evidence');
    const hasDiagnosis = messages.some((m) => m.role === 'tool' && m.name === 'diagnose');
    const hasVerification = messages.some((m) => m.role === 'tool' && m.name === 'verify_fix');
    const hasRestart = messages.some((m) => m.role === 'tool' && m.name === 'restart_app');
    const hasSetEnv = messages.some((m) => m.role === 'tool' && m.name === 'set_env');
    const hasPlanChange = messages.some((m) => m.role === 'tool' && m.name === 'change_plan');

    // SCENARIO 1: fresh_project
    if (this.scenario === 'fresh_project') {
      const hasAnalyzed = messages.some((m) => m.role === 'tool' && m.name === 'analyze_project');
      const hasRecommended = messages.some((m) => m.role === 'tool' && m.name === 'recommend_plan');
      const hasCreated = messages.some((m) => m.role === 'tool' && m.name === 'create_app');
      const hasDeployed = messages.some((m) => m.role === 'tool' && m.name === 'deploy');

      if (!hasAnalyzed) {
        yield { type: 'text.delta', delta: 'در حال بررسی ساختار پروژه و فایل‌های کانفیگ...\n' };
        yield {
          type: 'tool_call',
          toolCall: {
            id: 'tc_analyze',
            name: 'analyze_project',
            args: { projectDir: '.' },
          },
        };
        yield { type: 'done' };
        return;
      }

      if (!hasRecommended) {
        yield { type: 'text.delta', delta: 'بر اساس ساختار پروژه، پلن مناسب را پیشنهاد می‌دهم.\n' };
        yield {
          type: 'tool_call',
          toolCall: {
            id: 'tc_rec',
            name: 'recommend_plan',
            args: { platform: 'node', expectedRamMB: 512 },
          },
        };
        yield { type: 'done' };
        return;
      }

      if (!hasCreated) {
        yield { type: 'text.delta', delta: 'پیشنهاد ایجاد برنامه و استقرار سورس کد:\n' };
        yield {
          type: 'tool_call',
          toolCall: {
            id: 'tc_create',
            name: 'create_app',
            args: { name: 'my-new-site', platform: 'node', plan: 'standard-1g' },
          },
        };
        yield { type: 'done' };
        return;
      }

      if (!hasDeployed) {
        yield {
          type: 'text.delta',
          delta: 'برنامه ایجاد شد. حالا نسخه اولیه را دیپلوی می‌کنیم.\n',
        };
        yield {
          type: 'tool_call',
          toolCall: {
            id: 'tc_deploy',
            name: 'deploy',
            args: { app: 'my-new-site', sourcePath: '.' },
          },
        };
        yield { type: 'done' };
        return;
      }

      if (!hasVerification) {
        yield { type: 'text.delta', delta: 'استقرار انجام شد. در حال اعتبارسنجی پاسخ سایت...\n' };
        yield {
          type: 'tool_call',
          toolCall: {
            id: 'tc_verify',
            name: 'verify_fix',
            args: { app: 'my-new-site' },
          },
        };
        yield { type: 'done' };
        return;
      }

      yield {
        type: 'text.delta',
        delta: '🎉 پروژه با موفقیت مستقر شد و وب‌سایت با کد ۲۰۰ و سلامت کامل در دسترس قرار دارد.',
      };
      yield { type: 'done' };
      return;
    }

    // Step 1: Collect Evidence
    if (!hasEvidence) {
      yield {
        type: 'text.delta',
        delta: 'در حال جمع‌آوری شواهد و بررسی وضعیت سرویس‌ها و لاگ‌های اخیر...\n',
      };
      yield {
        type: 'tool_call',
        toolCall: {
          id: 'tc_ev',
          name: 'collect_evidence',
          args: { app: 'demo-shop' },
        },
      };
      yield { type: 'done' };
      return;
    }

    // Step 2: Diagnose
    if (!hasDiagnosis) {
      yield { type: 'text.delta', delta: 'شواهد دریافت شد. در حال تحلیل علت ریشه‌ای...\n' };
      yield {
        type: 'tool_call',
        toolCall: {
          id: 'tc_diag',
          name: 'diagnose',
          args: { app: 'demo-shop' },
        },
      };
      yield { type: 'done' };
      return;
    }

    // Step 3: Propose fix based on scenario
    switch (this.scenario) {
      case 'missing_env_500': {
        if (!hasSetEnv) {
          yield {
            type: 'text.delta',
            delta:
              'با بررسی شواهد [E2] و [E3]، برنامه به دلیل عدم وجود متغیر محیطی DATABASE_URL با خطای ۵۰۰ مواجه شده است.\nبرای رفع مشکل، این متغیر را مقداردهی می‌کنیم.',
          };
          yield {
            type: 'tool_call',
            toolCall: {
              id: 'tc_set_env',
              name: 'set_env',
              args: {
                app: 'demo-shop',
                variables: { DATABASE_URL: 'postgres://user:pass@localhost:5432/shop' },
              },
            },
          };
          yield { type: 'done' };
          return;
        }

        if (!hasRestart) {
          yield {
            type: 'text.delta',
            delta: 'متغیر محیطی ثبت شد. اکنون برنامه را ری‌استارت می‌کنیم تا تغییرات فعال شوند.',
          };
          yield {
            type: 'tool_call',
            toolCall: {
              id: 'tc_restart',
              name: 'restart_app',
              args: { app: 'demo-shop' },
            },
          };
          yield { type: 'done' };
          return;
        }

        if (!hasVerification) {
          yield {
            type: 'text.delta',
            delta: 'ری‌استارت انجام شد. در حال اعتبارسنجی پاسخ سرور و لاگ‌ها...\n',
          };
          yield {
            type: 'tool_call',
            toolCall: {
              id: 'tc_verify',
              name: 'verify_fix',
              args: { app: 'demo-shop' },
            },
          };
          yield { type: 'done' };
          return;
        }

        yield {
          type: 'text.delta',
          delta:
            '✅ بررسی نشان می‌دهد خطای ۵۰۰ با موفقیت برطرف شد و وب‌سایت کد وضعیت ۲۰۰ برمی‌گرداند.',
        };
        yield { type: 'done' };
        return;
      }

      case 'memory_leak_oom': {
        if (!hasPlanChange) {
          yield {
            type: 'text.delta',
            delta:
              'بر اساس متریک‌های مصرف حافظه [E2] و لاگ خروج کانتینر [E3]، مصرف رم به بیش از ۹۵٪ رسیده و کانتینر دچار OOM Kill شده است.\nپیشنهاد می‌شود پلن برنامه را به standard-2g ارتقا دهیم.',
          };
          yield {
            type: 'tool_call',
            toolCall: {
              id: 'tc_change_plan',
              name: 'change_plan',
              args: { app: 'demo-shop', plan: 'standard-2g' },
            },
          };
          yield { type: 'done' };
          return;
        }

        if (!hasVerification) {
          yield {
            type: 'text.delta',
            delta: 'پلن ارتقا یافت. در حال بررسی وضعیت مصرف حافظه و پاسخ‌دهی...\n',
          };
          yield {
            type: 'tool_call',
            toolCall: {
              id: 'tc_verify',
              name: 'verify_fix',
              args: { app: 'demo-shop' },
            },
          };
          yield { type: 'done' };
          return;
        }

        yield {
          type: 'text.delta',
          delta: '✅ ارتقای منابع با موفقیت انجام شد و مصرف حافظه به زیر ۵۰٪ کاهش یافت.',
        };
        yield { type: 'done' };
        return;
      }

      case 'wrong_port': {
        if (!hasSetEnv) {
          yield {
            type: 'text.delta',
            delta:
              'بر اساس لاگ‌های برنامه [E2]، سرور روی پورت ۸۰۸۰ در حال گوش دادن است اما پورت تعریف‌شده در لیارا ۳۰۰۰ است.\nمتغیر PORT را به ۳۰۰۰ تنظیم کرده و ری‌استارت می‌کنیم.',
          };
          yield {
            type: 'tool_call',
            toolCall: {
              id: 'tc_port_fix',
              name: 'set_env',
              args: { app: 'demo-shop', variables: { PORT: '3000' } },
            },
          };
          yield { type: 'done' };
          return;
        }

        if (!hasRestart) {
          yield {
            type: 'text.delta',
            delta: 'پورت اصلاح شد. برنامه را برای اعمال تغییرات ری‌استارت می‌کنیم.',
          };
          yield {
            type: 'tool_call',
            toolCall: {
              id: 'tc_restart',
              name: 'restart_app',
              args: { app: 'demo-shop' },
            },
          };
          yield { type: 'done' };
          return;
        }

        if (!hasVerification) {
          yield {
            type: 'text.delta',
            delta: 'در حال اعتبارسنجی پاسخ سرور پس از اصلاح پورت...\n',
          };
          yield {
            type: 'tool_call',
            toolCall: {
              id: 'tc_verify',
              name: 'verify_fix',
              args: { app: 'demo-shop' },
            },
          };
          yield { type: 'done' };
          return;
        }

        yield {
          type: 'text.delta',
          delta: '✅ عدم تطابق پورت برطرف شد و خطای ۵۰۲ رفع گردید.',
        };
        yield { type: 'done' };
        return;
      }

      case 'db_down': {
        yield {
          type: 'text.delta',
          delta:
            'بر اساس لاگ‌های خطای دیتابیس [E2] (ECONNREFUSED)، سرور دیتابیس خارجی یا شبکه داخلی آن پاسخگو نیست.\n⚠️ این مشکل از سمت برنامه نیست و سرور دیتابیس به صورت خودکار قابل تعمیر نیست. لطفاً وضعیت هاست دیتابیس و اتصال شبکه را بررسی نمایید.',
        };
        yield { type: 'done' };
        return;
      }

      case 'api_gap': {
        yield {
          type: 'text.delta',
          delta:
            'بر اساس ماتریس توانمندی‌های لیارا، قابلیت استریم زنده لاگ از طریق REST API پشتیبانی نمی‌شود. لطفاً برای مشاهده استریم زنده از کنسول لیارا یا دستور `liara app:logs -f` در CLI استفاده نمایید.',
        };
        yield { type: 'done' };
        return;
      }

      default: {
        yield {
          type: 'text.delta',
          delta: 'برنامه در وضعیت پایدار و سالم قرار دارد و کلیه بررسی‌ها با موفقیت پاس شدند.',
        };
        yield { type: 'done' };
        return;
      }
    }
  }
}

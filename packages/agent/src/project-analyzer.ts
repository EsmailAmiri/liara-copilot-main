import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export interface ProjectAnalysis {
  platform: 'node' | 'python' | 'php' | 'docker' | 'static' | 'flask' | 'django' | 'laravel';
  framework?: string;
  buildCmd?: string;
  startCmd?: string;
  port: number;
  envNeeds: string[];
  notes: string[];
}

export interface PlanRecommendation {
  platform: string;
  recommendedPlan: string;
  rationale: string;
  costEstimate: string;
  alternatives: { plan: string; when: string }[];
}

export function analyzeProjectDirectory(projectDir: string): ProjectAnalysis {
  const has = (file: string) => existsSync(resolve(projectDir, file));
  const read = (file: string) => {
    try {
      return readFileSync(resolve(projectDir, file), 'utf-8');
    } catch {
      return '';
    }
  };

  // 1. Dockerfile
  if (has('Dockerfile')) {
    return {
      platform: 'docker',
      framework: 'Docker Container',
      port: 8080,
      envNeeds: ['PORT'],
      notes: ['فایل Dockerfile شناسایی شد. پروژه به صورت کانتینر داکر مستقر می‌شود.'],
    };
  }

  // 2. Flutter Web
  if (has('pubspec.yaml')) {
    const pubspec = read('pubspec.yaml');
    if (pubspec.includes('flutter:')) {
      return {
        platform: 'static',
        framework: 'Flutter Web',
        buildCmd: 'flutter build web --release',
        port: 80,
        envNeeds: [],
        notes: ['پروژه Flutter Web شناسایی شد. خروجی بیلد به صورت وب استاتیک میزبانی می‌شود.'],
      };
    }
  }

  // 3. Node.js (Next, Nuxt, Express, Nest, etc.)
  if (has('package.json')) {
    const pkgStr = read('package.json');
    let pkg: Record<string, unknown> = {};
    try {
      pkg = JSON.parse(pkgStr);
    } catch {
      // ignore
    }

    const deps: Record<string, string> = {
      ...((pkg['dependencies'] as Record<string, string>) || {}),
      ...((pkg['devDependencies'] as Record<string, string>) || {}),
    };
    const scripts = (pkg['scripts'] as Record<string, string>) || {};
    let framework = 'Node.js';
    let port = 3000;
    const envNeeds = ['NODE_ENV', 'PORT'];
    const notes: string[] = [];

    if (deps['next']) {
      framework = 'Next.js';
      port = 3000;
      notes.push('فریم‌ورک Next.js شناسایی شد. پیشنهاد می‌شود خروجی standalone فعال باشد.');
    } else if (deps['nuxt'] || deps['nuxt3']) {
      framework = 'Nuxt';
      port = 3000;
    } else if (deps['@nestjs/core']) {
      framework = 'NestJS';
      port = 3000;
    } else if (deps['express'] || deps['fastify'] || deps['koa']) {
      framework = deps['fastify'] ? 'Fastify' : deps['express'] ? 'Express' : 'Node Web';
      port = 3000;
    } else if (deps['react'] || deps['vue'] || deps['svelte']) {
      // Client-side static SPA
      return {
        platform: 'static',
        framework: deps['react'] ? 'React (SPA)' : 'Vue (SPA)',
        buildCmd: scripts['build'] || 'npm run build',
        port: 80,
        envNeeds: [],
        notes: ['پروژه تک‌صفحه‌ای فرانت‌اند (SPA) شناسایی شد.'],
      };
    }

    if (deps['pg'] || deps['mysql2'] || deps['typeorm'] || deps['prisma'] || deps['mongoose']) {
      envNeeds.push('DATABASE_URL');
      notes.push('کلاینت دیتابیس شناسایی شد؛ نیاز به تنظیم متغیر اتصال به دیتابیس وجود دارد.');
    }

    return {
      platform: 'node',
      framework,
      buildCmd: scripts['build'] ? 'npm run build' : undefined,
      startCmd: scripts['start'] ? 'npm start' : 'node index.js',
      port,
      envNeeds,
      notes,
    };
  }

  // 4. Python (Django, Flask, FastAPI)
  if (has('requirements.txt') || has('manage.py') || has('pyproject.toml')) {
    const reqs = read('requirements.txt') + read('pyproject.toml');
    if (has('manage.py') || reqs.includes('django')) {
      return {
        platform: 'django',
        framework: 'Django',
        startCmd: 'gunicorn config.wsgi:application',
        port: 8000,
        envNeeds: ['SECRET_KEY', 'DATABASE_URL'],
        notes: ['پروژه Django شناسایی شد.'],
      };
    }
    if (reqs.includes('fastapi') || reqs.includes('uvicorn')) {
      return {
        platform: 'python',
        framework: 'FastAPI',
        startCmd: 'uvicorn main:app --host 0.0.0.0 --port 8000',
        port: 8000,
        envNeeds: [],
        notes: ['پروژه FastAPI شناسایی شد.'],
      };
    }
    return {
      platform: 'flask',
      framework: 'Flask',
      port: 5000,
      envNeeds: ['FLASK_APP'],
      notes: ['پروژه پایتون / Flask شناسایی شد.'],
    };
  }

  // 5. PHP / Laravel
  if (has('composer.json')) {
    const comp = read('composer.json');
    if (comp.includes('laravel/framework')) {
      return {
        platform: 'laravel',
        framework: 'Laravel',
        port: 80,
        envNeeds: ['APP_KEY', 'DB_CONNECTION', 'DB_HOST'],
        notes: ['پروژه Laravel شناسایی شد. نیاز به تنظیم APP_KEY و متغیرهای دیتابیس.'],
      };
    }
    return {
      platform: 'php',
      framework: 'PHP',
      port: 80,
      envNeeds: [],
      notes: ['پروژه PHP خام شناسایی شد.'],
    };
  }

  // 6. Static Site fallback
  return {
    platform: 'static',
    framework: 'Static HTML',
    port: 80,
    envNeeds: [],
    notes: ['پروژه استاتیک شناسایی شد.'],
  };
}

export function recommendPlan(analysis: ProjectAnalysis): PlanRecommendation {
  if (analysis.platform === 'static') {
    return {
      platform: 'static',
      recommendedPlan: 'standard-512m',
      rationale:
        'برای سایت‌های استاتیک و بدون رندر سرور، سبک‌ترین پلن حافظه کاملاً پاسخگوی ترافیک استاندارد است.',
      costEstimate: 'حدود ۱۴۴,۰۰۰ تومان در ماه',
      alternatives: [{ plan: 'standard-1g', when: 'ترافیک ورودی بالا یا فایل‌های سنگین' }],
    };
  }

  if (
    analysis.framework === 'Next.js' ||
    analysis.platform === 'laravel' ||
    analysis.platform === 'django'
  ) {
    return {
      platform: analysis.platform,
      recommendedPlan: 'standard-1g',
      rationale: `فریم‌ورک‌های رندر سرور مانند ${analysis.framework || analysis.platform} در زمان بیلد و ران‌تایم به حداقل ۱ گیگابایت رم برای پایداری نیاز دارند.`,
      costEstimate: 'حدود ۲۸۸,۰۰۰ تومان در ماه',
      alternatives: [
        { plan: 'standard-2g', when: 'ترافیک همزمان بالا و کش سنگین در حافظه' },
        { plan: 'standard-512m', when: 'محیط تستی یا توسعه شخصی' },
      ],
    };
  }

  return {
    platform: analysis.platform,
    recommendedPlan: 'standard-1g',
    rationale: 'پلن استاندارد ۱ گیگابایت برای اکثر برنامه‌های نود و وب سبک انتخابی ایمن است.',
    costEstimate: 'حدود ۲۸۸,۰۰۰ تومان در ماه',
    alternatives: [{ plan: 'standard-2g', when: 'افزایش ترافیک کاربران' }],
  };
}

# OmniSales POS

نقطة بيع عربية (RTL) — **ويب / سطح مكتب Tauri / Android APK** من عميل React واحد.

المستودع: [github.com/mturke1996/OmniSales-POS](https://github.com/mturke1996/OmniSales-POS)

| المنصة | التقنية | الأمر |
|--------|---------|--------|
| **الويب / PWA** | React 19 + Vite 6 + IndexedDB | `pnpm dev` · `pnpm build:web` |
| **سطح المكتب** | Tauri 2 + Rust | `pnpm desktop:dev` · `pnpm desktop:build` |
| **Android APK** | Capacitor 7 | `pnpm android:apk` |
| **Vercel** | Vite static + SPA rewrite | اربط المستودع على Vercel (يستخدم `vercel.json`) |

## تشغيل سريع

```bash
cd apps/desktop
pnpm install

pnpm dev              # http://localhost:1420
pnpm tauri:dev        # تطبيق سطح المكتب (تطوير)
pnpm tauri:build      # MSI / NSIS تثبيت Windows
pnpm android:apk      # APK → apps/desktop/OmniSales-debug.apk
```

من جذر المشروع:

```bash
pnpm --dir apps/desktop install
pnpm build:web
pnpm desktop:build
pnpm android:apk
```

## النشر على Vercel

1. Import المستودع `OmniSales-POS` في [vercel.com](https://vercel.com)
2. Framework: Vite · الإعدادات مأخوذة من `vercel.json`
3. (اختياري) أضف Environment Variables من `.env.example`
4. Deploy

البناء ينتج `apps/desktop/dist` مع دعم SPA وPWA.

## متطلبات سطح المكتب (Tauri)

- Rust toolchain (`rustup`)
- Windows: WebView2 + Visual Studio Build Tools (C++)
- من `apps/desktop`: `pnpm tauri:build`
- المخرجات عادة تحت: `apps/desktop/src-tauri/target/release/bundle/`

## متطلبات Android APK

- Android Studio SDK (`%LOCALAPPDATA%\Android\Sdk`)
- JBR: `C:\Program Files\Android\Android Studio\jbr`
- بعد أول `pnpm android:sync` يُنشأ `apps/desktop/android`

## السحابة (Supabase)

```bash
cp .env.example .env.local
# املأ URL + Anon Key لمشروع OmniSales مخصص
# طبّق الهجرات supabase/migrations بالترتيب 001→010
# (009 يغلق الكتابة بمفتاح anon — استخدم حساب authenticated للمزامنة)
# (010 يضيف stock_movements + categories + stock_version)
```

## الهيكل

```
OmniSales/
  apps/desktop/       React + PWA + Capacitor + Tauri
  crates/omni-core/   منطق الأعمال (Rust)
  crates/omni-db/     SQLite
  supabase/migrations مخطط المزامنة السحابية
  vercel.json         إعداد نشر Vercel
```

## الاختبارات

```bash
pnpm test          # Vitest (عميل)
pnpm test:core     # cargo test -p omni-core
```

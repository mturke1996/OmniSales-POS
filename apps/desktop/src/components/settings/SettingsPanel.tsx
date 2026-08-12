import { useEffect, useRef, useState } from "react";
import {
  Check,
  Palette,
  Printer,
  Cloud,
  Database,
  Trash,
  ShieldCheck,
  Truck,
  DownloadSimple,
  UploadSimple,
  DeviceMobile,
  Broadcast,
} from "@phosphor-icons/react";
import { PwaInstallButton } from "../pwa/PwaInstallBanner";
import { usePwaInstall } from "../../hooks/use-pwa-install";
import { detectRuntime } from "../../lib/native";
import { AppDownloadLink } from "../AppDownloadLink";
import { isAndroidBrowser } from "../../lib/app-download";
import {
  clearAllData,
  exportBackup,
  importBackup,
  seedDemoCatalog,
} from "../../lib/api";
import { applyTheme, THEME_PRESETS, ThemePresetKey } from "../../lib/theme";
import {
  testSupabaseConnection,
  initSupabase,
  cloudSignIn,
  cloudSignOut,
  getCloudSession,
} from "../../lib/supabase";
import { cn } from "../../lib/cn";
import type { BranchSettings, PosLayout, WorkMode } from "../../lib/types";
import { UsersPanel } from "./UsersPanel";
import { useLiveState } from "../../hooks/use-live-sync";
import { listCloudDevices } from "../../lib/live-sync";
import { liveStatusLabel } from "../../lib/live-sync-core";
import { navTabLabel } from "../../lib/nav-config";
import {
  getStoredBaudRate,
  setStoredBaudRate,
} from "../../lib/print/escpos";
import { NativePrinterPanel } from "../pos/NativePrinterPanel";
import { WebSerialPrinterPanel } from "../pos/WebSerialPrinterPanel";
import { usePrinter } from "../../hooks/use-printer";
import { PageHeader } from "../layout/PageHeader";
import { PageContent } from "../layout/PageContent";

const LAYOUTS: { id: PosLayout; label: string; hint: string }[] = [
  { id: "grid_cart", label: "شبكة + سلة", hint: "الأكثر شيوعاً لنقاط البيع" },
  { id: "list_barcode", label: "قائمة + باركود", hint: "مثالي لقطع الغيار والمستودعات" },
  { id: "touch_tiles", label: "بلاطات لمس كبرى", hint: "مناسب للمطاعم والحلويات والكافيهات" },
  { id: "compact_split", label: "تقسيم مضغوط", hint: "للأجهزة اللوحية والشاشات الصغيرة" },
];

export function SettingsPanel({
  settings,
  onChange,
  onSave,
  saving,
  pendingSync = 0,
  onSync,
  currentUserId,
}: {
  settings: BranchSettings;
  onChange: (next: BranchSettings) => void;
  onSave: () => void;
  saving: boolean;
  pendingSync?: number;
  onSync?: () => void;
  currentUserId?: string;
}) {
  const [testingCloud, setTestingCloud] = useState(false);
  const [cloudMsg, setCloudMsg] = useState<string | null>(null);
  const [backupBusy, setBackupBusy] = useState(false);
  const [cloudEmail, setCloudEmail] = useState("");
  const [cloudPassword, setCloudPassword] = useState("");
  const [cloudUser, setCloudUser] = useState<string | null>(null);
  const [printerBaud, setPrinterBaud] = useState(getStoredBaudRate);
  const [printerMsg, setPrinterMsg] = useState<string | null>(null);
  const printer = usePrinter();
  const live = useLiveState();
  const [devices, setDevices] = useState<
    Array<{
      id: string;
      cashier_name: string | null;
      runtime: string;
      current_tab: string | null;
      status: string;
      last_seen_at: string;
    }>
  >([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const pwa = usePwaInstall();
  const runtime = detectRuntime();

  useEffect(() => {
    void getCloudSession().then((s) => setCloudUser(s?.user.email ?? null));
  }, [settings.supabase_url, settings.supabase_anon_key]);

  useEffect(() => {
    if (!settings.cloud_sync_enabled || !settings.supabase_url) {
      setDevices([]);
      return;
    }
    void listCloudDevices(settings).then(setDevices);
  }, [
    settings.cloud_sync_enabled,
    settings.supabase_url,
    settings.supabase_anon_key,
    settings.branch_id,
    live.lastSyncAt,
    live.status,
  ]);

  useEffect(() => {
    if (printer.lastError) setPrinterMsg(printer.lastError);
  }, [printer.lastError]);

  const handleThemeChange = (key: ThemePresetKey) => {
    applyTheme(key);
    onChange({ ...settings, theme_key: key });
  };

  const handleTestSupabase = async () => {
    if (!settings.supabase_url || !settings.supabase_anon_key) {
      setCloudMsg("يرجى كتابة Supabase URL و Anon Key أولاً");
      return;
    }
    setTestingCloud(true);
    setCloudMsg(null);
    try {
      const result = await testSupabaseConnection(
        settings.supabase_url,
        settings.supabase_anon_key
      );
      if (result.ok) {
        initSupabase(settings.supabase_url, settings.supabase_anon_key);
      }
      setCloudMsg(result.message);
    } catch (err) {
      setCloudMsg(err instanceof Error ? err.message : "فشل الاختبار");
    } finally {
      setTestingCloud(false);
    }
  };

  const handleClearData = async () => {
    if (
      confirm(
        "هل أنت متأكد من مسح جميع البيانات المحلية والبدء بمحل نظيف؟ لا يمكن التراجع."
      )
    ) {
      await clearAllData();
      alert("تم مسح البيانات. أعد تسمية الفرع من الإعدادات بعد الدخول.");
      window.location.reload();
    }
  };

  const handleSeedDemo = async () => {
    if (
      !confirm(
        "تحميل أصناف وعملاء تجريبيين للتدريب؟ يعمل فقط إذا كان المخزون فارغاً."
      )
    ) {
      return;
    }
    try {
      await seedDemoCatalog();
      alert("تم تحميل البذرة التجريبية. حدّث الصفحة إن لزم.");
      window.location.reload();
    } catch (e) {
      alert(e instanceof Error ? e.message : "فشل تحميل البذرة");
    }
  };

  const handleExportBackup = async () => {
    setBackupBusy(true);
    try {
      const data = await exportBackup();
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `omnisales-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert(e instanceof Error ? e.message : "فشل التصدير");
    } finally {
      setBackupBusy(false);
    }
  };

  const handleImportBackup = async (file: File) => {
    if (
      !confirm(
        "استيراد نسخة احتياطية سيستبدل البيانات المحلية الحالية. هل تريد المتابعة؟"
      )
    ) {
      return;
    }
    setBackupBusy(true);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as Record<string, unknown>;
      await importBackup(parsed);
      alert("تم الاستيراد بنجاح");
      window.location.reload();
    } catch (e) {
      alert(e instanceof Error ? e.message : "فشل الاستيراد");
    } finally {
      setBackupBusy(false);
    }
  };

  return (
    <>
      <PageHeader
        title="إعدادات المنظومة"
        description="الثيم، النشاط التجاري، الخزينة، الطابعة، والمزامنة السحابية"
        breadcrumbs={[{ label: "OmniSales" }, { label: "الإدارة" }, { label: "الإعدادات" }]}
        actions={
          <button
            type="button"
            className="btn-primary text-xs font-bold"
            disabled={saving}
            onClick={onSave}
          >
            {saving ? "جاري الحفظ…" : "حفظ التغييرات"}
          </button>
        }
      />
      <PageContent size="narrow" className="space-y-8 pb-[max(3rem,env(safe-area-inset-bottom))]">

      {runtime === "pwa" && (
        <div className="panel space-y-3 p-4">
          <div className="flex items-center gap-2">
            <DeviceMobile size={20} className="text-highlight" weight="duotone" />
            <h2 className="text-base font-bold text-ink">تطبيق الهاتف (PWA)</h2>
          </div>
          <p className="text-xs text-ink-mute">
            ثبّت OmniSales على الشاشة الرئيسية ليعمل بملء الشاشة ودون اتصال.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {pwa.installed ? (
              <span className="rounded-full bg-success/12 px-3 py-1.5 text-[11px] font-bold text-success">
                مثبت ويعمل كتطبيق
              </span>
            ) : (
              <PwaInstallButton className="btn-primary gap-1.5 px-4 py-2 text-xs font-bold" />
            )}
            <span className="text-[11px] text-ink-mute">
              وضع العرض: {pwa.installed ? "standalone" : "متصفح"}
            </span>
          </div>
          {isAndroidBrowser() && (
            <AppDownloadLink className="border-ink/10 bg-paper text-ink hover:bg-paper-raised" />
          )}
        </div>
      )}

      {/* Theme & Aesthetics Selection Section */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Palette size={20} className="text-highlight" weight="duotone" />
          <h2 className="text-base font-bold text-ink">مظهر النظام والألوان</h2>
        </div>
        <p className="text-xs text-ink-mute">
          5 ثيمات SaaS نظيفة (Scout الافتراضي) — سايدبار داكن + سطح فاتح.
        </p>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {THEME_PRESETS.map((t) => {
            const active = settings.theme_key === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => handleThemeChange(t.key)}
                className={cn(
                  "flex h-32 flex-col justify-between rounded-2xl border p-4 text-right transition duration-200 ease-spring active:scale-[0.98]",
                  active
                    ? "border-highlight bg-paper-raised shadow-soft ring-2 ring-highlight/40"
                    : "border-ink/[0.08] bg-paper hover:border-highlight/40 hover:shadow-soft"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <span className="block text-sm font-bold text-ink">{t.label_ar}</span>
                    <span className="mt-0.5 block text-[11px] text-ink-mute">
                      {t.description_ar}
                    </span>
                  </div>
                  {active && (
                    <span className="shrink-0 rounded-full bg-highlight p-1 text-white">
                      <Check size={12} weight="bold" />
                    </span>
                  )}
                </div>

                <div className="mt-3 flex items-center gap-1.5">
                  <span
                    className="h-7 flex-1 rounded-lg border border-black/10"
                    style={{ background: t.sidebar }}
                  />
                  <span
                    className="h-7 w-7 rounded-lg border border-black/10"
                    style={{ background: t.highlight }}
                  />
                  <span
                    className="h-7 w-7 rounded-lg border border-black/10"
                    style={{ background: t.paper }}
                  />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Cloud Sync Supabase Section */}
      <div className="panel p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-paper-line pb-2">
          <div className="flex items-center gap-2">
            <Cloud size={20} className="text-blue-600" />
            <h2 className="text-sm font-bold text-ink">المزامنة السحابية المباشرة</h2>
          </div>

          <label className="flex items-center gap-2 text-xs font-bold cursor-pointer">
            <input
              type="checkbox"
              checked={settings.cloud_sync_enabled || false}
              onChange={(e) => onChange({ ...settings, cloud_sync_enabled: e.target.checked })}
              className="h-4 w-4 accent-ink"
            />
            <span>تفعيل الربط السحابي</span>
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-ink">رابط المشروع (Supabase URL)</label>
            <input
              type="text"
              placeholder="https://xyz.supabase.co"
              value={settings.supabase_url || ""}
              onChange={(e) => onChange({ ...settings, supabase_url: e.target.value })}
              className="mt-1 w-full rounded-xl border border-paper-line bg-paper px-3 py-2 text-xs font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-ink">المفتاح العام (Supabase Anon Key)</label>
            <input
              type="password"
              placeholder="eyJhbGciOiJIUzI1Ni..."
              value={settings.supabase_anon_key || ""}
              onChange={(e) => onChange({ ...settings, supabase_anon_key: e.target.value })}
              className="mt-1 w-full rounded-xl border border-paper-line bg-paper px-3 py-2 text-xs font-mono"
            />
          </div>
        </div>

        <p className="text-[11px] leading-relaxed text-ink-mute">
          أنشئ مشروعاً <strong>جديداً</strong> في Supabase خاص بـ OmniSales، ثم نفّذ
          ملفات الهجرات بالترتيب <code className="font-mono">001→012</code> من مجلد
          <code className="font-mono"> supabase/migrations</code>. لا تستخدم مشروع تطبيق آخر.
          بعد تسجيل الدخول السحابي يعمل البث الفوري تلقائياً: رفع محلي فوري + سحب عند تغيّر القاعدة.
        </p>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <input
            type="email"
            className="input text-xs"
            placeholder="بريد سحابي (اختياري)"
            value={cloudEmail}
            onChange={(e) => setCloudEmail(e.target.value)}
          />
          <input
            type="password"
            className="input text-xs"
            placeholder="كلمة مرور السحابة"
            value={cloudPassword}
            onChange={(e) => setCloudPassword(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="btn-ghost text-xs font-bold"
            onClick={() => {
              if (!settings.supabase_url || !settings.supabase_anon_key) {
                setCloudMsg("أدخل رابط ومفتاح Supabase أولاً");
                return;
              }
              void cloudSignIn(
                settings.supabase_url,
                settings.supabase_anon_key,
                cloudEmail,
                cloudPassword
              )
                .then((session) => {
                  setCloudUser(session?.user.email ?? cloudEmail);
                  setCloudMsg("تم تسجيل الدخول السحابي");
                })
                .catch((err) =>
                  setCloudMsg(
                    err instanceof Error ? err.message : "فشل تسجيل الدخول"
                  )
                );
            }}
          >
            دخول سحابي
          </button>
          {cloudUser && (
            <button
              type="button"
              className="btn-ghost text-xs"
              onClick={() =>
                void cloudSignOut().then(() => {
                  setCloudUser(null);
                  setCloudMsg("تم تسجيل الخروج السحابي");
                })
              }
            >
              خروج ({cloudUser})
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
          <p className="text-[11px] text-ink-mute">
            {pendingSync > 0
              ? settings.cloud_sync_enabled
                ? `طابور المزامنة: ${pendingSync} عملية بانتظار الرفع`
                : `طابور محلي: ${pendingSync} عملية — فعّل الربط السحابي للرفع`
              : "طابور المزامنة فارغ"}
          </p>
          <div className="flex flex-wrap gap-2">
          {onSync && (
            <button
              type="button"
              onClick={onSync}
              disabled={!settings.cloud_sync_enabled}
              className="btn-ghost text-xs disabled:opacity-40"
            >
              مزامنة الآن (رفع + سحب)
            </button>
          )}
          <button
            type="button"
            onClick={() => void handleTestSupabase()}
            disabled={testingCloud}
            className="btn-ghost text-xs font-bold inline-flex items-center gap-1.5"
          >
            <ShieldCheck size={16} className="text-highlight" />
            {testingCloud ? "جاري اختبار الاتصال..." : "اختبار الاتصال بالسحابة"}
          </button>
          </div>
          {cloudMsg && <span className="w-full text-xs font-bold text-ink">{cloudMsg}</span>}
        </div>

        {settings.cloud_sync_enabled && (
          <div className="space-y-3 rounded-2xl border border-paper-line bg-paper/50 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="inline-flex items-center gap-1.5 text-xs font-bold text-ink">
                <Broadcast
                  size={14}
                  weight="fill"
                  className={live.status === "live" ? "text-success" : "text-ink-mute"}
                />
                البث الفوري: {liveStatusLabel(live.status)}
              </p>
              {live.lastSyncAt && (
                <span className="text-[10px] text-ink-mute">
                  آخر مزامنة{" "}
                  {new Date(live.lastSyncAt).toLocaleTimeString("ar-LY", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              )}
            </div>
            {live.lastError && (
              <p className="text-[11px] font-semibold text-danger">{live.lastError}</p>
            )}
            <p className="text-[11px] text-ink-mute">
              الأجهزة المتصلة الآن: {live.peers.length} · المسجّلة في القاعدة: {devices.length}
            </p>
            {(live.peers.length > 0 || devices.length > 0) && (
              <ul className="space-y-1.5">
                {live.peers.map((p) => (
                  <li
                    key={p.deviceId}
                    className="flex items-center justify-between gap-2 rounded-xl bg-paper-raised px-3 py-2 text-[11px]"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-bold text-ink">{p.cashierName}</span>
                      <span className="text-ink-mute">{navTabLabel(p.tab || "")}</span>
                    </span>
                    <span className="shrink-0 text-success">مباشر · {p.runtime}</span>
                  </li>
                ))}
                {devices
                  .filter((d) => !live.peers.some((p) => p.deviceId === d.id))
                  .slice(0, 8)
                  .map((d) => (
                    <li
                      key={d.id}
                      className="flex items-center justify-between gap-2 rounded-xl bg-paper-raised px-3 py-2 text-[11px]"
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-semibold text-ink">
                          {d.cashier_name || "جهاز"}
                        </span>
                        <span className="text-ink-mute">
                          {navTabLabel(d.current_tab || "")}
                        </span>
                      </span>
                      <span className="shrink-0 text-ink-mute">
                        {d.runtime} ·{" "}
                        {new Date(d.last_seen_at).toLocaleString("ar-LY")}
                      </span>
                    </li>
                  ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Store Profile Settings */}
      <div className="panel p-5 space-y-4">
        <h2 className="text-sm font-bold text-ink border-b border-paper-line pb-2">بيانات المتجر والفرع</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-ink">اسم المتجر / الفرع *</label>
            <input
              className="mt-1 w-full rounded-xl border border-paper-line bg-paper px-3 py-2 text-xs outline-none focus:border-ink font-bold"
              value={settings.name}
              onChange={(e) => onChange({ ...settings, name: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-ink">رقم الهاتف</label>
            <input
              className="mt-1 w-full rounded-xl border border-paper-line bg-paper px-3 py-2 text-xs outline-none focus:border-ink"
              value={settings.phone}
              onChange={(e) => onChange({ ...settings, phone: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-ink">العنوان</label>
            <input
              className="mt-1 w-full rounded-xl border border-paper-line bg-paper px-3 py-2 text-xs outline-none focus:border-ink"
              value={settings.address}
              onChange={(e) => onChange({ ...settings, address: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-ink">رمز العملة (مثال: د.ل)</label>
            <input
              className="mt-1 w-full rounded-xl border border-paper-line bg-paper px-3 py-2 text-xs outline-none focus:border-ink font-bold"
              value={settings.currency_symbol}
              onChange={(e) => onChange({ ...settings, currency_symbol: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-ink">واتساب المالك (ملخص يومي)</label>
            <input
              className="mt-1 w-full rounded-xl border border-paper-line bg-paper px-3 py-2 text-xs outline-none focus:border-ink font-mono"
              placeholder="091xxxxxxx"
              value={settings.owner_whatsapp || ""}
              onChange={(e) =>
                onChange({ ...settings, owner_whatsapp: e.target.value })
              }
            />
          </div>
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-ink">
              <Truck size={14} className="text-highlight" />
              رسوم التوصيل الافتراضية
            </label>
            <input
              type="number"
              min={0}
              step={0.5}
              className="mt-1 w-full rounded-xl border border-paper-line bg-paper px-3 py-2 text-xs outline-none focus:border-ink font-mono font-bold"
              value={settings.default_delivery_fee ?? 5}
              onChange={(e) =>
                onChange({
                  ...settings,
                  default_delivery_fee: Number(e.target.value) || 0,
                })
              }
            />
          </div>
        </div>
      </div>

      <UsersPanel currentUserId={currentUserId} />

      {/* Backup / Restore */}
      <div className="panel space-y-3 p-5">
        <h2 className="flex items-center gap-2 border-b border-paper-line pb-2 text-sm font-bold text-ink">
          <Database size={18} className="text-highlight" />
          نسخة احتياطية محلية
        </h2>
        <p className="text-xs text-ink-mute">
          صدّر كل البيانات (منتجات، مبيعات، عملاء، مشتريات…) كملف JSON أو استورد نسخة سابقة.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={backupBusy}
            onClick={() => void handleExportBackup()}
            className="btn-primary inline-flex items-center gap-1.5 text-xs font-bold"
          >
            <DownloadSimple size={16} />
            تصدير نسخة
          </button>
          <button
            type="button"
            disabled={backupBusy}
            onClick={() => fileRef.current?.click()}
            className="btn-ghost inline-flex items-center gap-1.5 text-xs font-bold"
          >
            <UploadSimple size={16} />
            استيراد نسخة
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleImportBackup(f);
              e.target.value = "";
            }}
          />
        </div>
      </div>

      {/* Unified System Capabilities */}
      <div className="space-y-3">
        <h2 className="text-base font-bold text-ink">نظام OmniSales الشامل</h2>
        <div className="rounded-2xl border border-highlight/30 bg-highlight/8 p-4 text-right">
          <div className="flex items-center gap-2 text-sm font-bold text-highlight">
            <Check size={18} weight="bold" />
            <span>منظومة متكاملة - جميع المميزات والخصائص مفعّلة تلقائياً</span>
          </div>
          <p className="mt-1 text-xs text-ink-mute">
            يدعم النظام تتبع الأرقام التسلسلية (Serial/IMEI)، تواريخ الصلاحية، الموازين الإلكترونية، قطع الغيار والملاءمة، وتفاصيل الوجبات والتعديلات لجميع الأصناف دون قيود.
          </p>
        </div>
      </div>

      {/* Work Mode & Layout Selection */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-ink">طريقة العمل الخزينة</h2>
          <div className="space-y-2">
            {(
              [
                {
                  id: "shift_based" as WorkMode,
                  title: "نظام الورديات",
                  body: "إلزام فتح وإغلاق الوردية مع تقرير الإغلاق.",
                },
                {
                  id: "open_sales" as WorkMode,
                  title: "مبيعات مفتوحة",
                  body: "بيع فوري متاح دائماً بدون اشتراط فتح وردية.",
                },
              ] as const
            ).map((mode) => {
              const active = settings.work_mode === mode.id;
              return (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => onChange({ ...settings, work_mode: mode.id })}
                  className={cn(
                    "w-full rounded-2xl border p-3.5 text-right transition active:scale-[0.99]",
                    active
                      ? "border-ink bg-ink text-paper"
                      : "border-paper-line bg-paper-raised hover:border-ink/30"
                  )}
                >
                  <p className="font-bold text-xs">{mode.title}</p>
                  <p className={cn("mt-1 text-[11px]", active ? "text-paper/70" : "text-ink-mute")}>
                    {mode.body}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-3">
          <h2 className="text-sm font-bold text-ink">تخطيط واجهة نقطة البيع</h2>
          <div className="grid grid-cols-2 gap-2">
            {LAYOUTS.map((layout) => {
              const active = settings.pos_layout === layout.id;
              return (
                <button
                  key={layout.id}
                  type="button"
                  onClick={() => onChange({ ...settings, pos_layout: layout.id })}
                  className={cn(
                    "rounded-2xl border p-3 text-right transition active:scale-[0.99]",
                    active
                      ? "border-ink bg-ink text-paper font-bold"
                      : "border-paper-line bg-paper-raised hover:border-ink/30"
                  )}
                >
                  <p className="text-xs">{layout.label}</p>
                  <p className={cn("mt-1 text-[10px]", active ? "text-paper/70" : "text-ink-mute")}>
                    {layout.hint}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Thermal Printer Settings */}
      <div className="panel space-y-3 p-5">
        <h2 className="flex items-center gap-2 border-b border-paper-line pb-2 text-sm font-bold text-ink">
          <Printer size={18} />
          الطابعة الحرارية ESC/POS
        </h2>
        <p className="text-[11px] leading-relaxed text-ink-mute">
          اربط طابعة USB حرارية (Epson/Xprinter/Goojprt…) عبر Chrome أو Edge.
          النظام يحفظ الجهاز ويعيد الاتصال تلقائياً، ويطبع العربي كصورة نقطية ثابتة.
          على الموبايل تُستخدم طباعة المتصفح كبديل.
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-semibold text-ink">عرض الورق</label>
            <select
              value={settings.thermal_width_mm}
              onChange={(e) =>
                onChange({ ...settings, thermal_width_mm: Number(e.target.value) })
              }
              className="mt-1 w-full rounded-xl border border-paper-line bg-paper px-3 py-2 text-xs font-bold"
            >
              <option value={80}>80 ملم</option>
              <option value={58}>58 ملم</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-ink">Baud Rate</label>
            <select
              value={printerBaud}
              onChange={(e) => {
                const baud = Number(e.target.value);
                setPrinterBaud(baud);
                setStoredBaudRate(baud);
              }}
              className="mt-1 w-full rounded-xl border border-paper-line bg-paper px-3 py-2 text-xs font-mono font-bold"
            >
              <option value={9600}>9600 (الأكثر شيوعاً)</option>
              <option value={19200}>19200</option>
              <option value={38400}>38400</option>
              <option value={115200}>115200</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-ink">تذييل الفاتورة</label>
            <input
              type="text"
              value={settings.receipt_footer}
              onChange={(e) =>
                onChange({ ...settings, receipt_footer: e.target.value })
              }
              className="mt-1 w-full rounded-xl border border-paper-line bg-paper px-3 py-2 text-xs"
            />
          </div>
          <label className="flex items-start gap-2 rounded-xl border border-paper-line bg-paper px-3 py-2.5 sm:col-span-2">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={settings.auto_pin_top_sellers !== false}
              onChange={(e) =>
                onChange({ ...settings, auto_pin_top_sellers: e.target.checked })
              }
            />
            <span className="text-xs leading-relaxed">
              <span className="font-bold text-ink">تثبيت الأكثر مبيعاً تلقائياً</span>
              <span className="mt-0.5 block text-[11px] text-ink-mute">
                يُضاف أفضل 4 أصناف (آخر 7 أيام) إلى شريط المفضلة في نقطة البيع
              </span>
            </span>
          </label>
          <label className="flex items-start gap-2 rounded-xl border border-paper-line bg-paper px-3 py-2.5 sm:col-span-2">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={settings.auto_print_kitchen !== false}
              onChange={(e) =>
                onChange({ ...settings, auto_print_kitchen: e.target.checked })
              }
            />
            <span className="text-xs leading-relaxed">
              <span className="font-bold text-ink">طباعة تذكرة مطبخ تلقائياً</span>
              <span className="mt-0.5 block text-[11px] text-ink-mute">
                عند بدء تحضير طلب توصيل/مناسبة تُطبع تذكرة المطبخ حرارياً
              </span>
            </span>
          </label>
          <label className="flex items-start gap-2 rounded-xl border border-paper-line bg-paper px-3 py-2.5 sm:col-span-2">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={settings.auto_print_thermal !== false}
              onChange={(e) =>
                onChange({ ...settings, auto_print_thermal: e.target.checked })
              }
            />
            <span className="text-xs leading-relaxed">
              <span className="font-bold text-ink">طباعة تلقائية بعد إتمام البيع</span>
              <span className="mt-0.5 block text-[11px] text-ink-mute">
                تُطبع الفاتورة فوراً (حرارياً أو عبر المتصفح/AirPrint على الموبايل)
              </span>
            </span>
          </label>
        </div>
        <div className="space-y-3">
          <WebSerialPrinterPanel
            thermalWidthMm={settings.thermal_width_mm === 58 ? 58 : 80}
            onMessage={setPrinterMsg}
          />
          <span
            className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
              printer.connected
                ? "bg-success/15 text-success"
                : "bg-paper text-ink-mute"
            }`}
          >
            {printer.connected
              ? `متصلة${printer.label ? ` · ${printer.label}` : ""}${
                  printer.transport === "bluetooth"
                    ? " (BT)"
                    : printer.transport === "usb_otg"
                      ? " (USB OTG)"
                      : printer.transport === "network"
                        ? " (LAN)"
                        : printer.transport === "usb_serial"
                        ? " (USB)"
                        : ""
                }`
              : printer.supported
                ? "غير متصلة"
                : printer.supportMessage}
          </span>
        </div>
        {runtime === "capacitor" && (
          <NativePrinterPanel
            thermalWidthMm={settings.thermal_width_mm === 58 ? 58 : 80}
            onMessage={setPrinterMsg}
          />
        )}
        {printerMsg && (
          <p className="text-xs font-semibold text-ink">{printerMsg}</p>
        )}
        <ol className="list-decimal space-y-1 pr-4 text-[11px] leading-relaxed text-ink-mute">
          {runtime === "capacitor" ? (
            <>
              <li>Android: USB أو LAN (IP:9100) أو Bluetooth — من لوحة الطابعة أدناه</li>
              <li>اطبع «اختبار حرارية» — إن ظهرت الورقة فأنت جاهز</li>
            </>
          ) : (
            <>
              <li>وصّل الطابعة USB وشغّل الطاقة</li>
              <li>اضغط «اختيار / ربط طابعة USB» واختر الجهاز من نافذة المتصفح</li>
              <li>اطبع ورقة اختبار — إن ظهرت فالاتصال جاهز للبيع</li>
            </>
          )}
        </ol>
      </div>

      {/* Database Reset & Clean Start Section */}
      <div className="rounded-2xl border border-red-200 bg-red-50/50 p-5 space-y-3">
        <div className="flex items-center gap-2 text-red-700 font-bold text-sm">
          <Database size={18} />
          <span>بيانات المحل</span>
        </div>
        <p className="text-xs text-red-600 leading-relaxed">
          المحل يبدأ فارغاً. يمكنك تحميل بذرة تدريب اختيارية، أو مسح كل شيء للبدء من الصفر.
        </p>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void handleSeedDemo()}
            className="inline-flex items-center gap-1.5 rounded-full border border-ink/15 bg-paper-raised px-4 py-2 text-xs font-bold text-ink hover:bg-paper transition"
          >
            <Database size={16} />
            تحميل بيانات تجريبية (تدريب)
          </button>
          <button
            type="button"
            onClick={() => void handleClearData()}
            className="inline-flex items-center gap-1.5 rounded-full border border-red-300 bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700 transition"
          >
            <Trash size={16} />
            مسح كل البيانات المحلية
          </button>
        </div>
      </div>

      <div className="pt-2">
        <button
          type="button"
          className="btn-primary w-full sm:w-auto font-bold py-3 px-8 text-xs"
          disabled={saving}
          onClick={onSave}
        >
          {saving ? "جاري الحفظ..." : "حفظ التغييرات الآن"}
        </button>
      </div>
      </PageContent>
    </>
  );
}

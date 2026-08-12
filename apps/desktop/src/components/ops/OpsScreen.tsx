import { useMemo, useState } from "react";
import { Percent, ShieldCheck, Printer, ShareNetwork } from "@phosphor-icons/react";
import { addPromotion, setPromotionActive } from "../../lib/api";
import { formatMoney } from "../../lib/format";
import { buildDailyOwnerSummary, openWhatsApp } from "../../lib/whatsapp";
import {
  computeDailySummary,
  printDailySummarySmart,
} from "../../lib/daily-summary";
import { canShareReceipt, shareTextReceipt } from "../../lib/share-receipt";
import type {
  AuditEntry,
  BranchSettings,
  Order,
  Promotion,
  Expense,
  Customer,
  Product,
  Purchase,
  ReturnRecord,
  Supplier,
} from "../../lib/types";
import { PageHeader } from "../layout/PageHeader";
import { PageContent } from "../layout/PageContent";
import { DataTable } from "../ui/DataTable";
import { MobileDataCard, MobileDataList } from "../ui/MobileDataList";
import { PosSyncBar } from "../pos/PosSyncBar";
import { usePageSync } from "../../hooks/use-page-sync";
import type { ColumnDef } from "@tanstack/react-table";
import { cn } from "../../lib/cn";

export function OpsScreen({
  promotions,
  auditLog,
  settings,
  orders,
  expenses,
  customers,
  returns = [],
  products = [],
  purchases = [],
  suppliers = [],
  onRefreshData,
  pendingSync = 0,
  onSync,
}: {
  promotions: Promotion[];
  auditLog: AuditEntry[];
  settings: BranchSettings;
  orders: Order[];
  expenses: Expense[];
  customers: Customer[];
  returns?: ReturnRecord[];
  products?: Product[];
  purchases?: Purchase[];
  suppliers?: Supplier[];
  onRefreshData: () => void;
  pendingSync?: number;
  onSync?: () => void | Promise<void>;
}) {
  const [tab, setTab] = useState<"promos" | "audit" | "daily">("promos");
  const [name, setName] = useState("");
  const [kind, setKind] = useState<"percent" | "fixed">("percent");
  const [value, setValue] = useState(10);
  const [msg, setMsg] = useState<string | null>(null);
  const [msgKind, setMsgKind] = useState<"success" | "error" | "info">("info");
  const [busyPromoId, setBusyPromoId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [printing, setPrinting] = useState(false);
  const { online, syncing, handleSyncNow } = usePageSync(onSync);

  const audits = useMemo(
    () =>
      [...auditLog].sort(
        (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()
      ),
    [auditLog]
  );

  const auditRows = useMemo(() => audits.slice(0, 100), [audits]);

  const auditColumns: ColumnDef<AuditEntry, unknown>[] = useMemo(
    () => [
      {
        accessorKey: "at",
        header: "الوقت",
        cell: ({ row }) => (
          <span className="text-ink-mute">
            {new Date(row.original.at).toLocaleString("ar-LY")}
          </span>
        ),
      },
      {
        id: "actor",
        header: "المستخدم",
        cell: ({ row }) => row.original.actor_name || "—",
      },
      {
        accessorKey: "action",
        header: "الإجراء",
        cell: ({ row }) => (
          <span className="font-mono text-[11px]">{row.original.action}</span>
        ),
      },
      {
        accessorKey: "summary",
        header: "الملخص",
        cell: ({ row }) => (
          <span className="font-bold text-ink">{row.original.summary}</span>
        ),
      },
    ],
    []
  );

  const summaryInput = useMemo(
    () => ({
      settings,
      orders,
      expenses,
      customers,
      returns,
      products,
      purchases,
      suppliers,
    }),
    [settings, orders, expenses, customers, returns, products, purchases, suppliers]
  );

  const daily = useMemo(
    () => computeDailySummary(summaryInput),
    [summaryInput]
  );

  const whatsAppSummary = buildDailyOwnerSummary({
    branchName: settings.name,
    sales: daily.sales,
    expenses: daily.expenses,
    debts: daily.debts,
    symbol: settings.currency_symbol,
    deliveryOpen: daily.deliveryOpen,
    returns: daily.returns,
    purchases: daily.purchases,
    lowStock: daily.lowStock,
    payables: daily.payables,
  });

  return (
    <>
      <PosSyncBar
        online={online}
        pendingSync={pendingSync}
        cloudEnabled={settings.cloud_sync_enabled}
        syncing={syncing}
        onSync={onSync ? handleSyncNow : undefined}
        compact
      />
      <PageHeader
        title="العروض والتدقيق"
        description="إدارة ترويجية وحوكمة يومية وملخص المالك"
        breadcrumbs={[{ label: "OmniSales" }, { label: "الإدارة" }, { label: "عروض وتدقيق" }]}
      />
      <PageContent size="narrow" className="space-y-6">

      {msg && (
        <div
          className={cn(
            "rounded-xl px-3 py-2 text-xs font-medium",
            msgKind === "success"
              ? "bg-success/10 text-success"
              : msgKind === "error"
                ? "bg-danger/10 text-danger"
                : "bg-highlight/10 text-highlight"
          )}
        >
          {msg}
        </div>
      )}

      <div className="flex gap-1 rounded-2xl border border-paper-line bg-paper-raised p-1">
        {(
          [
            ["promos", "العروض"],
            ["audit", "سجل التدقيق"],
            ["daily", "ملخص يومي"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`rounded-xl px-4 py-2 text-xs font-bold ${
              tab === id ? "bg-ink text-paper" : "text-ink-mute"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "promos" && (
        <div className="space-y-4">
          <form
            className="panel grid gap-2 p-4 sm:grid-cols-4"
            onSubmit={(e) => {
              e.preventDefault();
              setSubmitting(true);
              setMsg(null);
              void addPromotion({
                name,
                kind,
                value,
                active: true,
                min_subtotal: 0,
              })
                .then(() => {
                  setName("");
                  setMsgKind("success");
                  setMsg("تم إضافة العرض");
                  onRefreshData();
                })
                .catch((err) => {
                  setMsgKind("error");
                  setMsg(err instanceof Error ? err.message : "فشل إضافة العرض");
                })
                .finally(() => setSubmitting(false));
            }}
          >
            <input
              className="input text-xs sm:col-span-2"
              placeholder="اسم العرض"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <select
              className="input text-xs"
              value={kind}
              onChange={(e) => setKind(e.target.value as "percent" | "fixed")}
            >
              <option value="percent">نسبة %</option>
              <option value="fixed">مبلغ ثابت</option>
            </select>
            <input
              type="number"
              className="input font-mono text-xs"
              value={value}
              min={1}
              onChange={(e) => setValue(Number(e.target.value))}
            />
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary text-xs font-bold sm:col-span-4 disabled:opacity-50"
            >
              <Percent size={14} className="inline" />{" "}
              {submitting ? "جاري الإضافة…" : "إضافة عرض"}
            </button>
          </form>
          {!promotions.length ? (
            <div className="panel grid place-items-center py-12 text-center text-xs text-ink-mute">
              <div>
                <Percent size={32} className="mx-auto mb-2 text-highlight" />
                <p className="font-bold text-ink">لا توجد عروض بعد</p>
                <p className="mt-1">أضف عرضاً نسبياً أو مبلغاً ثابتاً — يُطبّق تلقائياً في نقطة البيع</p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {promotions.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between rounded-xl border border-paper-line bg-paper-raised px-4 py-3 text-xs"
                >
                  <div>
                    <p className="font-bold text-ink">{p.name}</p>
                    <p className="text-ink-mute">
                      {p.kind === "percent"
                        ? `${p.value}%`
                        : formatMoney(p.value, settings.currency_symbol)}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={busyPromoId === p.id}
                    className={`rounded-full px-3 py-1 font-bold disabled:opacity-50 ${
                      p.active ? "bg-success/15 text-success" : "bg-paper text-ink-mute"
                    }`}
                    onClick={() => {
                      setBusyPromoId(p.id);
                      void setPromotionActive(p.id, !p.active)
                        .then(onRefreshData)
                        .catch((err) => {
                          setMsgKind("error");
                          setMsg(err instanceof Error ? err.message : "فشل تحديث العرض");
                        })
                        .finally(() => setBusyPromoId(null));
                    }}
                  >
                    {busyPromoId === p.id ? "…" : p.active ? "مفعّل" : "متوقف"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "audit" && (
        <>
          <MobileDataList empty={!auditRows.length} emptyLabel="لا توجد أحداث بعد">
            {auditRows.map((a) => (
              <MobileDataCard
                key={a.id}
                title={a.summary}
                subtitle={a.action}
                meta={`${a.actor_name || "—"} · ${new Date(a.at).toLocaleString("ar-LY")}`}
              />
            ))}
          </MobileDataList>
          <div className="panel hidden overflow-hidden p-0 md:block">
            <DataTable
              data={auditRows}
              columns={auditColumns}
              emptyMessage="لا توجد أحداث بعد"
              className="rounded-none border-0"
            />
          </div>
        </>
      )}

      {tab === "daily" && (
        <div className="panel space-y-4 p-5">
          <div className="flex items-center gap-2 font-bold text-ink">
            <ShieldCheck size={18} className="text-highlight" />
            ملخص اليوم للمالك
          </div>
          <p className="text-[11px] text-ink-mute">{daily.dateLabel}</p>
          <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
            <div className="rounded-xl bg-paper p-3">
              <p className="text-ink-mute">مبيعات مكتملة</p>
              <p className="font-mono font-bold">
                {formatMoney(daily.sales, settings.currency_symbol)}
              </p>
            </div>
            <div className="rounded-xl bg-paper p-3">
              <p className="text-ink-mute">مرتجعات</p>
              <p className="font-mono font-bold text-danger">
                {formatMoney(daily.returns, settings.currency_symbol)}
              </p>
            </div>
            <div className="rounded-xl bg-paper p-3">
              <p className="text-ink-mute">مصروفات</p>
              <p className="font-mono font-bold">
                {formatMoney(daily.expenses, settings.currency_symbol)}
              </p>
            </div>
            <div className="rounded-xl bg-paper p-3">
              <p className="text-ink-mute">صافي اليوم</p>
              <p className="font-mono font-bold text-success">
                {formatMoney(daily.net, settings.currency_symbol)}
              </p>
            </div>
            <div className="rounded-xl bg-paper p-3">
              <p className="text-ink-mute">ديون العملاء</p>
              <p className="font-mono font-bold text-danger">
                {formatMoney(daily.debts, settings.currency_symbol)}
              </p>
            </div>
            <div className="rounded-xl bg-paper p-3">
              <p className="text-ink-mute">مشتريات مستلمة</p>
              <p className="font-mono font-bold">
                {formatMoney(daily.purchases, settings.currency_symbol)}
              </p>
            </div>
            <div className="rounded-xl bg-paper p-3">
              <p className="text-ink-mute">ذمم الموردين</p>
              <p className="font-mono font-bold text-warning">
                {formatMoney(daily.payables, settings.currency_symbol)}
              </p>
            </div>
            <div className="rounded-xl bg-paper p-3">
              <p className="text-ink-mute">نواقص / توصيل</p>
              <p className="font-mono font-bold">
                {daily.lowStock} · {daily.deliveryOpen}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <button
              type="button"
              disabled={printing}
              className="btn-primary inline-flex items-center justify-center gap-2 text-xs font-bold disabled:opacity-50"
              onClick={() => {
                setPrinting(true);
                setMsg(null);
                void printDailySummarySmart(summaryInput)
                  .then((mode) => {
                    setMsgKind("success");
                    setMsg(
                      mode === "escpos"
                        ? "طُبع الملخص حرارياً"
                        : "فُتح الملخص للطباعة"
                    );
                  })
                  .catch((e) => {
                    setMsgKind("error");
                    setMsg(e instanceof Error ? e.message : "فشلت الطباعة");
                  })
                  .finally(() => setPrinting(false));
              }}
            >
              <Printer size={16} />
              {printing ? "جاري الطباعة…" : "طباعة ملخص حراري"}
            </button>
            {canShareReceipt() && (
              <button
                type="button"
                className="btn-ghost inline-flex items-center justify-center gap-2 text-xs font-bold"
                onClick={() =>
                  void shareTextReceipt({
                    title: `ملخص ${settings.name}`,
                    text: whatsAppSummary.replace(/\*/g, ""),
                  })
                    .then((ok) => {
                      if (ok) {
                        setMsgKind("success");
                        setMsg("تم فتح المشاركة");
                      }
                    })
                    .catch((e) => {
                      setMsgKind("error");
                      setMsg(e instanceof Error ? e.message : "فشل المشاركة");
                    })
                }
              >
                <ShareNetwork size={16} />
                مشاركة الملخص
              </button>
            )}
            <button
              type="button"
              className="btn-ghost text-xs font-bold sm:col-span-2"
              onClick={() => {
                const phone = settings.owner_whatsapp || settings.phone;
                if (!phone) {
                  setMsgKind("error");
                  setMsg("أضف رقم واتساب المالك من الإعدادات");
                  return;
                }
                openWhatsApp(phone, whatsAppSummary);
                setMsgKind("success");
                setMsg("فُتح واتساب");
              }}
            >
              إرسال الملخص واتساب للمالك
            </button>
          </div>
        </div>
      )}
      </PageContent>
    </>
  );
}

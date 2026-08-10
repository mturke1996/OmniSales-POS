import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import {
  PencilSimple,
  PlusCircle,
  Receipt,
  User,
  Wallet,
  ClockCounterClockwise,
  Package,
} from "@phosphor-icons/react";
import {
  recordCustomerPayment,
  updateCustomer,
} from "../../lib/api";
import { formatMoney } from "../../lib/format";
import {
  debtReminderMessage,
  paymentReceiptMessage,
  saleShareMessage,
} from "../../lib/whatsapp";
import { WhatsAppButton } from "../ui/WhatsAppButton";
import { MobileDataCard, MobileDataList } from "../ui/MobileDataList";
import { PAYMENT_AR, STATUS_AR } from "../../lib/pdf/pdfBrand";
import { cn } from "../../lib/cn";
import { PageHeader } from "../layout/PageHeader";
import { PageContent } from "../layout/PageContent";
import { DataTable } from "../ui/DataTable";
import type { ColumnDef } from "@tanstack/react-table";
import type {
  BranchSettings,
  Customer,
  CustomerLedgerEntry,
  Order,
  ReturnRecord,
} from "../../lib/types";

type ProfileTab = "overview" | "sales" | "ledger" | "returns";

interface CustomerProfileScreenProps {
  customer: Customer;
  orders: Order[];
  returns: ReturnRecord[];
  ledger: CustomerLedgerEntry[];
  settings: BranchSettings;
  onBack: () => void;
  onRefreshData: () => void;
  onOpenInvoice?: (orderId: string) => void;
  onStartReturn?: (orderId: string) => void;
}

export function CustomerProfileScreen({
  customer,
  orders,
  returns,
  ledger,
  settings,
  onBack,
  onRefreshData,
  onOpenInvoice,
  onStartReturn,
}: CustomerProfileScreenProps) {
  const [tab, setTab] = useState<ProfileTab>("overview");
  const [showPay, setShowPay] = useState(false);
  const [showEdit, setShowEdit] = useState(false);

  const sales = useMemo(
    () =>
      orders
        .filter((o) => o.customer_id === customer.id)
        .sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        ),
    [orders, customer.id]
  );

  const custReturns = useMemo(
    () =>
      returns
        .filter((r) => r.customer_id === customer.id)
        .sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        ),
    [returns, customer.id]
  );

  const entries = useMemo(
    () =>
      ledger
        .filter((e) => e.customer_id === customer.id)
        .sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        ),
    [ledger, customer.id]
  );

  const totalSales = sales.reduce((s, o) => s + o.total_amount, 0);
  const totalPaid = entries
    .filter((e) => e.type === "credit")
    .reduce((s, e) => s + e.amount, 0);
  const creditUsedPct =
    customer.credit_limit > 0
      ? Math.min(100, (customer.balance / customer.credit_limit) * 100)
      : 0;

  const tabs: { id: ProfileTab; label: string; count?: number }[] = [
    { id: "overview", label: "نظرة عامة" },
    { id: "sales", label: "المبيعات", count: sales.length },
    { id: "ledger", label: "كشف الحساب", count: entries.length },
    { id: "returns", label: "المرتجعات", count: custReturns.length },
  ];

  const salesColumns: ColumnDef<Order, unknown>[] = useMemo(
    () => [
      {
        accessorKey: "order_number",
        header: "الفاتورة",
        cell: ({ row }) => (
          <span className="font-bold text-ink">{row.original.order_number}</span>
        ),
      },
      {
        accessorKey: "created_at",
        header: "التاريخ",
        cell: ({ row }) =>
          new Date(row.original.created_at).toLocaleString("ar-LY"),
      },
      {
        id: "payment",
        header: "الدفع",
        cell: ({ row }) =>
          PAYMENT_AR[row.original.payment_method] || row.original.payment_method,
      },
      {
        id: "status",
        header: "الحالة",
        cell: ({ row }) => STATUS_AR[row.original.status] || row.original.status,
      },
      {
        accessorKey: "total_amount",
        header: "الإجمالي",
        cell: ({ row }) => (
          <span className="font-mono font-bold">
            {formatMoney(row.original.total_amount, settings.currency_symbol)}
          </span>
        ),
      },
      {
        id: "actions",
        header: "إجراء",
        enableSorting: false,
        cell: ({ row }) => {
          const o = row.original;
          return (
            <div className="inline-flex flex-wrap gap-1.5">
              <WhatsAppButton
                phone={customer.phone}
                message={saleShareMessage(
                  o.order_number,
                  o.total_amount,
                  settings.currency_symbol,
                  settings.name,
                  customer.name
                )}
                label="واتساب"
                variant="ghost"
              />
              {onOpenInvoice && (
                <button
                  type="button"
                  className="text-[11px] font-bold text-highlight"
                  onClick={() => onOpenInvoice(o.id)}
                >
                  الفاتورة
                </button>
              )}
              {onStartReturn && o.status === "completed" && (
                <button
                  type="button"
                  className="text-[11px] font-bold text-ink-mute"
                  onClick={() => onStartReturn(o.id)}
                >
                  مرتجع
                </button>
              )}
            </div>
          );
        },
      },
    ],
    [customer, settings, onOpenInvoice, onStartReturn]
  );

  const ledgerColumns: ColumnDef<CustomerLedgerEntry, unknown>[] = useMemo(
    () => [
      {
        accessorKey: "created_at",
        header: "التاريخ",
        cell: ({ row }) =>
          new Date(row.original.created_at).toLocaleString("ar-LY"),
      },
      {
        id: "type",
        header: "النوع",
        cell: ({ row }) => (
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[11px] font-bold",
              row.original.type === "debit"
                ? "bg-danger/12 text-danger"
                : "bg-success/12 text-success"
            )}
          >
            {row.original.type === "debit" ? "مدين (بيع)" : "دائن (سداد)"}
          </span>
        ),
      },
      {
        accessorKey: "reference",
        header: "المرجع",
        cell: ({ row }) => (
          <span className="font-mono">{row.original.reference}</span>
        ),
      },
      {
        accessorKey: "description",
        header: "الوصف",
      },
      {
        accessorKey: "amount",
        header: "المبلغ",
        cell: ({ row }) => (
          <span
            className={cn(
              "font-mono font-bold",
              row.original.type === "debit" ? "text-danger" : "text-success"
            )}
          >
            {row.original.type === "debit" ? "+" : "−"}
            {formatMoney(row.original.amount, settings.currency_symbol)}
          </span>
        ),
      },
    ],
    [settings.currency_symbol]
  );

  const returnsColumns: ColumnDef<ReturnRecord, unknown>[] = useMemo(
    () => [
      {
        accessorKey: "return_number",
        header: "رقم المرتجع",
        cell: ({ row }) => (
          <span className="font-bold text-ink">{row.original.return_number}</span>
        ),
      },
      {
        accessorKey: "order_number",
        header: "الفاتورة",
      },
      {
        accessorKey: "created_at",
        header: "التاريخ",
        cell: ({ row }) =>
          new Date(row.original.created_at).toLocaleString("ar-LY"),
      },
      {
        accessorKey: "total_refund",
        header: "المبلغ",
        cell: ({ row }) => (
          <span className="font-mono font-bold text-danger">
            {formatMoney(row.original.total_refund, settings.currency_symbol)}
          </span>
        ),
      },
    ],
    [settings.currency_symbol]
  );

  return (
    <>
      <PageHeader
        title={customer.name}
        description={customer.phone}
        onBack={onBack}
        breadcrumbs={[
          { label: "OmniSales" },
          { label: "العملاء", onClick: onBack },
          { label: customer.name },
        ]}
        actions={
          <>
            <WhatsAppButton
              phone={customer.phone}
              message={
                customer.balance > 0
                  ? debtReminderMessage(
                      customer.name,
                      customer.balance,
                      settings.currency_symbol,
                      settings.name
                    )
                  : `السلام عليكم ${customer.name}، تحية من ${settings.name}`
              }
              label={customer.balance > 0 ? "تذكير واتساب" : "واتساب"}
              size="md"
            />
            {customer.balance > 0 && (
              <button
                type="button"
                onClick={() => setShowPay(true)}
                className="btn-primary inline-flex items-center gap-1.5 text-xs font-bold"
              >
                <PlusCircle size={16} />
                تسديد
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowEdit(true)}
              className="btn-ghost inline-flex items-center gap-1.5 text-xs font-bold"
            >
              <PencilSimple size={16} />
              تعديل
            </button>
            {customer.balance > 0 ? (
              <span className="rounded-full bg-danger/12 px-2.5 py-1 text-[11px] font-bold text-danger">
                عليه دين
              </span>
            ) : (
              <span className="rounded-full bg-success/12 px-2.5 py-1 text-[11px] font-bold text-success">
                حساب سليم
              </span>
            )}
          </>
        }
      />
      <PageContent className="space-y-5">

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          icon={<Wallet size={18} className="text-danger" />}
          label="رصيد الدين"
          value={formatMoney(customer.balance, settings.currency_symbol)}
          danger={customer.balance > 0}
        />
        <StatCard
          icon={<Receipt size={18} className="text-highlight" />}
          label="إجمالي المبيعات"
          value={formatMoney(totalSales, settings.currency_symbol)}
        />
        <StatCard
          icon={<Package size={18} />}
          label="عدد الفواتير"
          value={String(sales.length)}
        />
        <StatCard
          icon={<ClockCounterClockwise size={18} />}
          label="المحصّل"
          value={formatMoney(totalPaid, settings.currency_symbol)}
        />
      </div>

      <div className="flex flex-wrap gap-1.5 rounded-2xl border border-paper-line bg-paper-raised p-1.5">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "rounded-xl px-3.5 py-2 text-xs font-bold transition",
              tab === t.id
                ? "bg-ink text-paper"
                : "text-ink-mute hover:bg-paper hover:text-ink"
            )}
          >
            {t.label}
            {typeof t.count === "number" && (
              <span className="ms-1.5 opacity-70">({t.count})</span>
            )}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="grid gap-4 lg:grid-cols-5">
          <div className="panel space-y-3 p-5 lg:col-span-2">
            <div className="flex items-center gap-2 text-sm font-bold text-ink">
              <User size={18} weight="duotone" />
              بيانات العميل
            </div>
            <InfoRow label="الاسم" value={customer.name} />
            <InfoRow label="الهاتف" value={customer.phone} mono />
            <InfoRow label="البريد" value={customer.email || "—"} />
            <InfoRow label="العنوان" value={customer.address || "—"} />
            <InfoRow
              label="حد الائتمان"
              value={formatMoney(customer.credit_limit, settings.currency_symbol)}
            />
            <InfoRow
              label="تاريخ التسجيل"
              value={new Date(customer.created_at).toLocaleDateString("ar-LY")}
            />
            <div className="pt-2">
              <div className="mb-1 flex justify-between text-[11px] text-ink-mute">
                <span>استخدام الائتمان</span>
                <span>{creditUsedPct.toFixed(0)}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-paper-line">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    creditUsedPct > 85
                      ? "bg-danger"
                      : creditUsedPct > 60
                        ? "bg-warning"
                        : "bg-success"
                  )}
                  style={{ width: `${creditUsedPct}%` }}
                />
              </div>
            </div>
          </div>

          <div className="panel space-y-3 p-5 lg:col-span-3">
            <h3 className="text-sm font-bold text-ink">آخر الحركات</h3>
            {!entries.length && !sales.length ? (
              <p className="py-8 text-center text-xs text-ink-mute">
                لا توجد حركات بعد — ابدأ ببيع أو تسجيل دفعة
              </p>
            ) : (
              <ul className="divide-y divide-paper-line text-xs">
                {[
                  ...entries.slice(0, 4).map((e) => ({
                    id: e.id,
                    when: e.created_at,
                    title:
                      e.type === "debit"
                        ? e.description || "بيع آجل"
                        : e.description || "سداد",
                    amount: e.amount,
                    tone: e.type === "debit" ? "danger" : "success",
                    sign: e.type === "debit" ? "+" : "−",
                  })),
                  ...sales.slice(0, 3).map((o) => ({
                    id: o.id,
                    when: o.created_at,
                    title: `فاتورة ${o.order_number}`,
                    amount: o.total_amount,
                    tone: "neutral" as const,
                    sign: "",
                  })),
                ]
                  .sort(
                    (a, b) =>
                      new Date(b.when).getTime() - new Date(a.when).getTime()
                  )
                  .slice(0, 8)
                  .map((row) => (
                    <li
                      key={row.id}
                      className="flex items-center justify-between gap-3 py-2.5"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-bold text-ink">{row.title}</p>
                        <p className="text-[11px] text-ink-mute">
                          {new Date(row.when).toLocaleString("ar-LY")}
                        </p>
                      </div>
                      <span
                        className={cn(
                          "shrink-0 font-mono font-bold",
                          row.tone === "danger" && "text-danger",
                          row.tone === "success" && "text-success",
                          row.tone === "neutral" && "text-ink"
                        )}
                      >
                        {row.sign}
                        {formatMoney(row.amount, settings.currency_symbol)}
                      </span>
                    </li>
                  ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {tab === "sales" && (
        <>
          <MobileDataList empty={!sales.length} emptyLabel="لا توجد مبيعات لهذا العميل">
            {sales.map((o) => (
              <MobileDataCard
                key={o.id}
                title={o.order_number}
                subtitle={new Date(o.created_at).toLocaleString("ar-LY")}
                meta={
                  <>
                    <span>{PAYMENT_AR[o.payment_method] || o.payment_method}</span>
                    <span>{STATUS_AR[o.status] || o.status}</span>
                  </>
                }
                badge={
                  <span className="font-mono text-sm font-bold">
                    {formatMoney(o.total_amount, settings.currency_symbol)}
                  </span>
                }
                actions={
                  <>
                    <WhatsAppButton
                      phone={customer.phone}
                      message={saleShareMessage(
                        o.order_number,
                        o.total_amount,
                        settings.currency_symbol,
                        settings.name,
                        customer.name
                      )}
                      label="واتساب"
                      variant="ghost"
                    />
                    {onOpenInvoice && (
                      <button
                        type="button"
                        className="text-[11px] font-bold text-highlight"
                        onClick={() => onOpenInvoice(o.id)}
                      >
                        الفاتورة
                      </button>
                    )}
                    {onStartReturn && o.status === "completed" && (
                      <button
                        type="button"
                        className="text-[11px] font-bold text-ink-mute"
                        onClick={() => onStartReturn(o.id)}
                      >
                        مرتجع
                      </button>
                    )}
                  </>
                }
              />
            ))}
          </MobileDataList>
          <div className="hidden md:block">
            <DataTable
              data={sales}
              columns={salesColumns}
              emptyMessage="لا توجد مبيعات لهذا العميل"
            />
          </div>
        </>
      )}

      {tab === "ledger" && (
        <>
          <MobileDataList empty={!entries.length} emptyLabel="كشف الحساب فارغ">
            {entries.map((e) => (
              <MobileDataCard
                key={e.id}
                title={e.description || e.reference}
                subtitle={new Date(e.created_at).toLocaleString("ar-LY")}
                meta={<span className="font-mono">{e.reference}</span>}
                badge={
                  <span
                    className={cn(
                      "font-mono text-sm font-bold",
                      e.type === "debit" ? "text-danger" : "text-success"
                    )}
                  >
                    {e.type === "debit" ? "+" : "−"}
                    {formatMoney(e.amount, settings.currency_symbol)}
                  </span>
                }
                actions={
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[11px] font-bold",
                      e.type === "debit"
                        ? "bg-danger/12 text-danger"
                        : "bg-success/12 text-success"
                    )}
                  >
                    {e.type === "debit" ? "مدين (بيع)" : "دائن (سداد)"}
                  </span>
                }
              />
            ))}
          </MobileDataList>
          <div className="hidden md:block">
            <DataTable
              data={entries}
              columns={ledgerColumns}
              emptyMessage="كشف الحساب فارغ"
            />
          </div>
        </>
      )}

      {tab === "returns" && (
        <>
          <MobileDataList empty={!custReturns.length} emptyLabel="لا توجد مرتجعات">
            {custReturns.map((r) => (
              <MobileDataCard
                key={r.id}
                title={r.return_number}
                subtitle={r.order_number}
                meta={
                  <span>{new Date(r.created_at).toLocaleString("ar-LY")}</span>
                }
                badge={
                  <span className="font-mono text-sm font-bold text-danger">
                    {formatMoney(r.total_refund, settings.currency_symbol)}
                  </span>
                }
              />
            ))}
          </MobileDataList>
          <div className="hidden md:block">
            <DataTable
              data={custReturns}
              columns={returnsColumns}
              emptyMessage="لا توجد مرتجعات"
            />
          </div>
        </>
      )}

      {showPay && (
        <ProfilePaymentModal
          customer={customer}
          settings={settings}
          onClose={() => setShowPay(false)}
          onSuccess={() => {
            setShowPay(false);
            onRefreshData();
          }}
        />
      )}

      {showEdit && (
        <EditCustomerModal
          customer={customer}
          onClose={() => setShowEdit(false)}
          onSuccess={() => {
            setShowEdit(false);
            onRefreshData();
          }}
        />
      )}
      </PageContent>
    </>
  );
}

function StatCard({
  icon,
  label,
  value,
  danger,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  danger?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-paper-line bg-paper-raised p-4 shadow-xs">
      <div className="flex items-center gap-2 text-[11px] text-ink-mute">
        {icon}
        {label}
      </div>
      <div
        className={cn(
          "mt-1 text-base font-extrabold font-mono",
          danger ? "text-danger" : "text-ink"
        )}
      >
        {value}
      </div>
    </div>
  );
}

function InfoRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-paper-line/70 py-2 text-xs last:border-0">
      <span className="text-ink-mute">{label}</span>
      <span className={cn("text-end font-bold text-ink", mono && "font-mono")}>
        {value}
      </span>
    </div>
  );
}

function ProfilePaymentModal({
  customer,
  settings,
  onClose,
  onSuccess,
}: {
  customer: Customer;
  settings: BranchSettings;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [amount, setAmount] = useState(customer.balance);
  const [note, setNote] = useState("سداد دفعة حساب نقداً");
  const [saving, setSaving] = useState(false);
  const [sendWa, setSendWa] = useState(true);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!amount || amount <= 0) return;
    setSaving(true);
    try {
      const updated = await recordCustomerPayment(
        customer.id,
        Number(amount),
        note
      );
      if (sendWa && customer.phone) {
        const { openWhatsApp } = await import("../../lib/whatsapp");
        openWhatsApp(
          customer.phone,
          paymentReceiptMessage(
            customer.name,
            Number(amount),
            updated.balance,
            settings.currency_symbol,
            settings.name
          )
        );
      }
      onSuccess();
    } catch (err) {
      alert(err instanceof Error ? err.message : "فشل تسجيل الدفعة");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4 backdrop-blur-sm">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md space-y-3 rounded-2xl border border-paper-line bg-paper-raised p-6 shadow-lift"
      >
        <h3 className="font-bold text-ink">تسديد دفعة — {customer.name}</h3>
        <p className="text-xs text-ink-mute">
          الدين الحالي:{" "}
          <span className="font-mono font-bold text-danger">
            {formatMoney(customer.balance, settings.currency_symbol)}
          </span>
        </p>
        <input
          type="number"
          step="0.01"
          required
          max={customer.balance}
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
          className="input font-mono font-bold"
        />
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="input"
          placeholder="ملاحظة"
        />
        <label className="flex items-center gap-2 text-xs font-semibold text-ink">
          <input
            type="checkbox"
            checked={sendWa}
            onChange={(e) => setSendWa(e.target.checked)}
          />
          إرسال إشعار واتساب بعد السداد
        </label>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-ghost text-xs" onClick={onClose}>
            إلغاء
          </button>
          <button type="submit" disabled={saving} className="btn-primary text-xs font-bold">
            {saving ? "جاري…" : "تأكيد الاستلام"}
          </button>
        </div>
      </form>
    </div>
  );
}

function EditCustomerModal({
  customer,
  onClose,
  onSuccess,
}: {
  customer: Customer;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [name, setName] = useState(customer.name);
  const [phone, setPhone] = useState(customer.phone);
  const [email, setEmail] = useState(customer.email || "");
  const [address, setAddress] = useState(customer.address || "");
  const [creditLimit, setCreditLimit] = useState(customer.credit_limit);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateCustomer(customer.id, {
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        address: address.trim() || undefined,
        credit_limit: Number(creditLimit),
      });
      onSuccess();
    } catch (err) {
      alert(err instanceof Error ? err.message : "فشل التعديل");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4 backdrop-blur-sm">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md space-y-3 rounded-2xl border border-paper-line bg-paper-raised p-6 shadow-lift"
      >
        <h3 className="font-bold text-ink">تعديل بيانات العميل</h3>
        <input className="input" required value={name} onChange={(e) => setName(e.target.value)} placeholder="الاسم" />
        <input className="input font-mono" required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="الهاتف" />
        <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="البريد" />
        <input className="input" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="العنوان" />
        <input
          className="input font-mono"
          type="number"
          value={creditLimit}
          onChange={(e) => setCreditLimit(Number(e.target.value))}
          placeholder="حد الائتمان"
        />
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-ghost text-xs" onClick={onClose}>
            إلغاء
          </button>
          <button type="submit" disabled={saving} className="btn-primary text-xs font-bold">
            {saving ? "جاري…" : "حفظ"}
          </button>
        </div>
      </form>
    </div>
  );
}

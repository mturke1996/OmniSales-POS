import {
  Minus,
  Plus,
  Trash,
  User,
  Pause,
  CreditCard,
  Bank,
  Wallet,
  Receipt,
  Storefront,
  Truck,
} from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { cn } from "../../lib/cn";
import { formatMoney } from "../../lib/format";
import type { BranchSettings, Customer, PaymentMethod, Promotion, CartLine } from "../../lib/types";
import { PosNumpad } from "./PosNumpad";

type PromoPreview = {
  promotion: Promotion;
  amount: number;
} | null;

type StockIssue = { name: string; available: number };

export function PosCartPanel({
  settings,
  lines,
  totalItemsCount,
  selectedCustomer,
  saleMode,
  priceMode,
  deliveryPhone,
  deliveryAddress,
  deliveryDate,
  deliveryFee,
  activePromos,
  promoChoice,
  promoPreview,
  discount,
  note,
  method,
  cash,
  stockIssues,
  cartSubtotal,
  totals,
  feeNum,
  grandTotal,
  message,
  busy,
  needsShift,
  isMobile = false,
  onHold,
  onClear,
  onRemoveLine,
  onSetQty,
  onSaleModeChange,
  onPriceModeChange,
  onDeliveryPhoneChange,
  onDeliveryAddressChange,
  onDeliveryDateChange,
  onDeliveryFeeChange,
  onPromoChoiceChange,
  onDiscountChange,
  onNoteChange,
  onMethodChange,
  onCashChange,
  onCustomerClick,
  onCheckout,
}: {
  settings: BranchSettings;
  lines: CartLine[];
  totalItemsCount: number;
  selectedCustomer: Customer | null;
  saleMode: "walk_in" | "delivery";
  priceMode: "retail" | "wholesale";
  deliveryPhone: string;
  deliveryAddress: string;
  deliveryDate: string;
  deliveryFee: string;
  activePromos: Promotion[];
  promoChoice: string;
  promoPreview: PromoPreview;
  discount: number;
  note: string;
  method: PaymentMethod;
  cash: string;
  stockIssues: StockIssue[];
  cartSubtotal: number;
  totals: { subtotal: number; tax: number; total: number };
  feeNum: number;
  grandTotal: number;
  message: string | null;
  busy: boolean;
  needsShift: boolean;
  isMobile?: boolean;
  onHold: () => void;
  onClear: () => void;
  onRemoveLine: (productId: string, key: string) => void;
  onSetQty: (productId: string, qty: number) => void;
  onSaleModeChange: (mode: "walk_in" | "delivery") => void;
  onPriceModeChange: (mode: "retail" | "wholesale") => void;
  onDeliveryPhoneChange: (v: string) => void;
  onDeliveryAddressChange: (v: string) => void;
  onDeliveryDateChange: (v: string) => void;
  onDeliveryFeeChange: (v: string) => void;
  onPromoChoiceChange: (v: string) => void;
  onDiscountChange: (v: number) => void;
  onNoteChange: (v: string) => void;
  onMethodChange: (m: PaymentMethod) => void;
  onCashChange: (v: string) => void;
  onCustomerClick: () => void;
  onCheckout: () => void;
}) {
  const showNumpad = isMobile && (method === "cash" || method === "mixed");

  return (
    <div className="flex h-full min-h-0 flex-col">
      {!isMobile && (
        <div className="pos-chrome flex items-center justify-between px-4 py-3">
          <div>
            <p className="text-sm font-bold text-ink">سلة المبيعات</p>
            <p className="text-xs text-ink-mute">
              {lines.length} أصناف · {totalItemsCount} قطعة
            </p>
          </div>
          {lines.length > 0 && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={onHold}
                className="inline-flex items-center gap-1.5 rounded-lg border border-ink/[0.08] bg-paper px-2.5 py-1.5 text-xs font-semibold text-ink transition hover:border-highlight/40"
              >
                <Pause size={14} />
                <span>تعليق</span>
                {!isMobile && <span className="pos-key-badge">F4</span>}
              </button>
              <button
                type="button"
                onClick={onClear}
                className="rounded-lg p-1.5 text-ink-mute transition hover:bg-danger/10 hover:text-danger"
                aria-label="مسح السلة"
              >
                <Trash size={16} />
              </button>
            </div>
          )}
        </div>
      )}

      {isMobile && lines.length > 0 && (
        <div className="flex items-center justify-between border-b border-paper-line/60 px-3 py-2">
          <p className="text-xs font-bold text-ink">
            {lines.length} أصناف · {totalItemsCount} قطعة
          </p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onHold}
              disabled={!lines.length}
              className="rounded-lg px-2.5 py-1.5 text-xs font-bold text-highlight"
            >
              تعليق
            </button>
            <button
              type="button"
              onClick={onClear}
              className="rounded-lg p-1.5 text-ink-mute"
              aria-label="مسح السلة"
            >
              <Trash size={16} />
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 space-y-2 overflow-y-auto overscroll-contain px-3 py-3">
        {lines.map((line, lineIdx) => (
          <div
            key={`${line.product_id}-${line.imei || ""}-${line.serial || ""}-${lineIdx}`}
            className="rounded-xl border border-paper-line/70 bg-paper-raised px-3 py-3 shadow-soft"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-ink">{line.name}</p>
                {(line.imei || line.serial) && (
                  <p className="mt-0.5 font-mono text-[10px] text-ink-mute">
                    {line.imei ? `IMEI ${line.imei}` : ""}
                    {line.imei && line.serial ? " · " : ""}
                    {line.serial ? `S/N ${line.serial}` : ""}
                  </p>
                )}
                <p className="mt-0.5 text-[10px] text-ink-mute">
                  {formatMoney(line.unit_price, settings.currency_symbol)} / وحدة
                </p>
              </div>
              <button
                type="button"
                aria-label="حذف"
                onClick={() =>
                  onRemoveLine(
                    line.product_id,
                    `${line.product_id}|${line.imei || ""}|${line.serial || ""}`
                  )
                }
                className="rounded-lg p-1.5 text-ink-mute hover:bg-danger/10 hover:text-danger"
              >
                <Trash size={16} />
              </button>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <div className="inline-flex items-center gap-2">
                <QtyButton onClick={() => onSetQty(line.product_id, line.quantity - 1)}>
                  <Minus size={14} weight="bold" />
                </QtyButton>
                <span className="money-big min-w-8 text-center text-sm font-bold">
                  {line.quantity}
                </span>
                <QtyButton onClick={() => onSetQty(line.product_id, line.quantity + 1)}>
                  <Plus size={14} weight="bold" />
                </QtyButton>
              </div>
              <p className="money-big text-sm font-bold text-ink">
                {formatMoney(line.unit_price * line.quantity, settings.currency_symbol)}
              </p>
            </div>
          </div>
        ))}

        {!lines.length && (
          <div className="rounded-2xl border border-dashed border-paper-line px-4 py-16 text-center">
            <p className="text-sm font-bold text-ink">السلة فارغة</p>
            <p className="mt-1 text-xs text-ink-mute">
              {isMobile
                ? "انتقل لتبويب المنتجات وأضف أصنافاً أو امسح باركوداً"
                : "اضغط أو امسح باركود أي صنف للإضافة"}
            </p>
          </div>
        )}
      </div>

      <div className="shrink-0 space-y-3 border-t border-paper-line/70 bg-paper-raised p-3">
        <ModeToggle
          saleMode={saleMode}
          priceMode={priceMode}
          onSaleModeChange={onSaleModeChange}
          onPriceModeChange={onPriceModeChange}
          selectedCustomer={selectedCustomer}
          onCustomerNeeded={onCustomerClick}
          onPrefillDelivery={() => {
            if (selectedCustomer?.phone && !deliveryPhone) {
              onDeliveryPhoneChange(selectedCustomer.phone);
            }
            if (selectedCustomer?.address && !deliveryAddress) {
              onDeliveryAddressChange(selectedCustomer.address);
            }
          }}
        />

        {stockIssues.length > 0 && (
          <Alert variant="danger">
            مخزون غير كافٍ:{" "}
            {stockIssues.map((i) => `«${i.name}» متاح ${i.available}`).join(" · ")}
          </Alert>
        )}

        {saleMode === "delivery" && (
          <div className="space-y-2 rounded-xl border border-highlight/25 bg-highlight/5 p-2.5">
            <p className="text-[11px] font-bold text-highlight">بيانات التوصيل</p>
            <input
              type="tel"
              placeholder="هاتف المستلم *"
              value={deliveryPhone}
              onChange={(e) => onDeliveryPhoneChange(e.target.value)}
              className="input-field font-mono text-xs"
            />
            <input
              type="text"
              placeholder="عنوان التوصيل *"
              value={deliveryAddress}
              onChange={(e) => onDeliveryAddressChange(e.target.value)}
              className="input-field text-xs"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                value={deliveryDate}
                onChange={(e) => onDeliveryDateChange(e.target.value)}
                className="input-field text-xs"
              />
              <input
                type="number"
                min={0}
                step="0.5"
                placeholder="رسوم التوصيل"
                value={deliveryFee}
                onChange={(e) => onDeliveryFeeChange(e.target.value)}
                className="input-field font-mono text-xs"
              />
            </div>
            <button type="button" onClick={onCustomerClick} className="btn-ghost w-full text-[11px] font-bold">
              <User size={14} className="inline" /> ربط عميل
            </button>
          </div>
        )}

        {activePromos.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[11px] font-semibold text-ink-mute">العروض</p>
            <div className="flex flex-wrap gap-1.5">
              <PromoChip active={promoChoice === "auto"} onClick={() => onPromoChoiceChange("auto")} label="أفضل عرض" />
              <PromoChip active={promoChoice === "none"} onClick={() => onPromoChoiceChange("none")} label="بدون" />
              {activePromos.map((p) => (
                <PromoChip
                  key={p.id}
                  active={promoChoice === p.id}
                  onClick={() => onPromoChoiceChange(p.id)}
                  label={
                    p.kind === "percent" ? `${p.name} · ${p.value}%` : `${p.name} · ${p.value}`
                  }
                />
              ))}
            </div>
            {promoPreview && (
              <p className="text-[11px] font-semibold text-success">
                −{formatMoney(promoPreview.amount, settings.currency_symbol)} ({promoPreview.promotion.name})
              </p>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <label className="block text-[11px] font-semibold text-ink-mute">
            خصم
            <input
              type="number"
              min={0}
              placeholder="0"
              value={discount || ""}
              onChange={(e) => onDiscountChange(Number(e.target.value) || 0)}
              className="input-field mt-1 font-mono text-xs"
            />
          </label>
          <label className="block text-[11px] font-semibold text-ink-mute">
            ملاحظة
            <input
              type="text"
              placeholder="..."
              value={note}
              onChange={(e) => onNoteChange(e.target.value)}
              className="input-field mt-1 text-xs"
            />
          </label>
        </div>

        <div
          className={cn(
            "flex gap-2 overflow-x-auto pb-1 scrollbar-none",
            !isMobile && "grid grid-cols-3 sm:grid-cols-5 gap-1.5 overflow-visible pb-0"
          )}
        >
          <PaymentTab active={method === "cash"} onClick={() => onMethodChange("cash")} icon={<Wallet size={16} />} label="نقداً" compact={isMobile} />
          <PaymentTab active={method === "card"} onClick={() => onMethodChange("card")} icon={<CreditCard size={16} />} label="بطاقة" compact={isMobile} />
          <PaymentTab active={method === "transfer"} onClick={() => onMethodChange("transfer")} icon={<Bank size={16} />} label="تحويل" compact={isMobile} />
          <PaymentTab active={method === "mixed"} onClick={() => onMethodChange("mixed")} icon={<Wallet size={16} />} label="مختلط" compact={isMobile} />
          <PaymentTab active={method === "debt"} onClick={() => onMethodChange("debt")} icon={<Receipt size={16} />} label="آجل" compact={isMobile} />
        </div>

        {(method === "cash" || method === "mixed") && !showNumpad && (
          <input
            type="number"
            inputMode="decimal"
            placeholder={method === "mixed" ? "الجزء النقدي..." : "المبلغ المستلم..."}
            value={cash}
            onChange={(e) => onCashChange(e.target.value)}
            className="input-field font-mono text-xs"
          />
        )}

        {showNumpad && (
          <div className="space-y-2">
            <div className="rounded-xl border border-paper-line bg-paper px-3 py-2.5 text-center">
              <p className="text-[10px] font-semibold text-ink-mute">المبلغ النقدي</p>
              <p className="money-big text-xl font-bold text-ink">{cash || "0"}</p>
            </div>
            <PosNumpad value={cash} onChange={onCashChange} />
            <div className="grid grid-cols-3 gap-2">
              {[grandTotal, Math.ceil(grandTotal / 5) * 5, Math.ceil(grandTotal / 10) * 10].map(
                (amount, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => onCashChange(String(amount))}
                    className="rounded-xl border border-paper-line bg-paper py-2 text-xs font-bold text-ink"
                  >
                    {formatMoney(amount, settings.currency_symbol)}
                  </button>
                )
              )}
            </div>
          </div>
        )}

        <TotalsBlock
          settings={settings}
          totals={totals}
          promoPreview={promoPreview}
          discount={discount}
          cartSubtotal={cartSubtotal}
          priceMode={priceMode}
          feeNum={feeNum}
          grandTotal={grandTotal}
        />

        {message && <Alert variant={isErrorMessage(message) ? "danger" : "success"}>{message}</Alert>}

        <button
          type="button"
          className="btn-primary flex h-14 w-full items-center justify-center gap-2 text-base font-bold"
          disabled={busy || !lines.length || needsShift || stockIssues.length > 0}
          onClick={onCheckout}
        >
          {saleMode === "delivery"
            ? "تأكيد التوصيل"
            : priceMode === "wholesale"
              ? "إتمام بيع جملة"
              : isMobile
                ? `إتمام البيع · ${formatMoney(grandTotal, settings.currency_symbol)}`
                : "إتمام البيع"}
          {!isMobile && <span className="pos-key-badge border-white/20 bg-white/10 text-accent-invert">F9</span>}
        </button>
      </div>
    </div>
  );
}

function QtyButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="grid size-10 place-items-center rounded-xl border border-paper-line bg-paper text-ink transition active:scale-[0.95]"
    >
      {children}
    </button>
  );
}

function ModeToggle({
  saleMode,
  priceMode,
  onSaleModeChange,
  onPriceModeChange,
  selectedCustomer,
  onCustomerNeeded,
  onPrefillDelivery,
}: {
  saleMode: "walk_in" | "delivery";
  priceMode: "retail" | "wholesale";
  onSaleModeChange: (m: "walk_in" | "delivery") => void;
  onPriceModeChange: (m: "retail" | "wholesale") => void;
  selectedCustomer: Customer | null;
  onCustomerNeeded: () => void;
  onPrefillDelivery: () => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-1.5 rounded-2xl bg-paper p-1">
      <button
        type="button"
        onClick={() => onSaleModeChange("walk_in")}
        className={cn(
          "inline-flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-[11px] font-bold transition",
          saleMode === "walk_in" ? "bg-ink text-paper" : "text-ink-mute"
        )}
      >
        <Storefront size={14} />
        بيع مباشر
      </button>
      <button
        type="button"
        onClick={() => {
          onPrefillDelivery();
          onSaleModeChange("delivery");
        }}
        className={cn(
          "inline-flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-[11px] font-bold transition",
          saleMode === "delivery" ? "bg-highlight text-white" : "text-ink-mute"
        )}
      >
        <Truck size={14} />
        توصيل
      </button>
      <button
        type="button"
        onClick={() => onPriceModeChange("retail")}
        className={cn(
          "rounded-xl py-2 text-[11px] font-bold transition",
          priceMode === "retail" ? "bg-success/15 text-success" : "text-ink-mute"
        )}
      >
        تجزئة
      </button>
      <button
        type="button"
        onClick={() => {
          onPriceModeChange("wholesale");
          if (!selectedCustomer) onCustomerNeeded();
        }}
        className={cn(
          "rounded-xl py-2 text-[11px] font-bold transition",
          priceMode === "wholesale" ? "bg-warning/15 text-warning" : "text-ink-mute"
        )}
      >
        جملة
      </button>
    </div>
  );
}

function TotalsBlock({
  settings,
  totals,
  promoPreview,
  discount,
  cartSubtotal,
  priceMode,
  feeNum,
  grandTotal,
}: {
  settings: BranchSettings;
  totals: { subtotal: number; tax: number; total: number };
  promoPreview: PromoPreview;
  discount: number;
  cartSubtotal: number;
  priceMode: "retail" | "wholesale";
  feeNum: number;
  grandTotal: number;
}) {
  return (
    <div className="space-y-1 rounded-xl border border-paper-line/70 bg-paper p-3 text-xs">
      <Row label="الفرعي" value={formatMoney(totals.subtotal, settings.currency_symbol)} />
      {promoPreview && promoPreview.amount > 0 && (
        <Row
          label={`عرض: ${promoPreview.promotion.name}`}
          value={`-${formatMoney(promoPreview.amount, settings.currency_symbol)}`}
          className="text-success font-semibold"
        />
      )}
      {discount > 0 && (
        <Row
          label="خصم"
          value={`-${formatMoney(Math.min(discount, cartSubtotal), settings.currency_symbol)}`}
          className="text-danger font-semibold"
        />
      )}
      {totals.tax > 0 && (
        <Row label="الضريبة" value={`+${formatMoney(totals.tax, settings.currency_symbol)}`} />
      )}
      {priceMode === "wholesale" && (
        <p className="text-[10px] font-semibold text-warning">أسعار الجملة</p>
      )}
      {feeNum > 0 && (
        <Row
          label="التوصيل"
          value={`+${formatMoney(feeNum, settings.currency_symbol)}`}
          className="text-highlight font-semibold"
        />
      )}
      <div className="flex justify-between border-t border-paper-line/70 pt-2 text-sm font-bold text-ink">
        <span>الإجمالي</span>
        <span className="money-big text-base">{formatMoney(grandTotal, settings.currency_symbol)}</span>
      </div>
    </div>
  );
}

function Row({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={cn("flex justify-between text-ink-mute", className)}>
      <span>{label}</span>
      <span className="money-big">{value}</span>
    </div>
  );
}

function Alert({ children, variant }: { children: ReactNode; variant: "danger" | "success" }) {
  return (
    <p
      role="alert"
      className={cn(
        "rounded-lg border p-2 text-center text-xs font-semibold",
        variant === "danger"
          ? "border-danger/25 bg-danger/10 text-danger"
          : "border-success/25 bg-success/10 text-success"
      )}
    >
      {children}
    </p>
  );
}

function PromoChip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-lg px-2.5 py-1 text-[10px] font-bold transition",
        active ? "bg-success/15 text-success ring-1 ring-success/30" : "bg-paper text-ink-mute"
      )}
    >
      {label}
    </button>
  );
}

function PaymentTab({
  active,
  onClick,
  icon,
  label,
  compact,
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  label: string;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex shrink-0 flex-col items-center justify-center gap-1 rounded-2xl font-bold transition active:scale-[0.97]",
        compact ? "min-w-[4.5rem] px-3 py-2.5 text-[10px]" : "py-2.5 text-[11px]",
        active ? "bg-highlight text-white shadow-soft" : "bg-paper text-ink"
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function isErrorMessage(message: string) {
  return (
    message.includes("فشل") ||
    message.includes("مطلوب") ||
    message.includes("تجاوز") ||
    message.includes("مخزون") ||
    message.includes("لا يوجد") ||
    message.includes("متعددة")
  );
}

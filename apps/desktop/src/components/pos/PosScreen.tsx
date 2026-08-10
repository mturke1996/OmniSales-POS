import { useMemo, useState, useEffect, useRef } from "react";
import {
  MagnifyingGlass,
  Minus,
  Plus,
  Trash,
  User,
  Clock,
  Pause,
  CreditCard,
  Bank,
  Wallet,
  Receipt,
  ShoppingCart,
  X,
  ArrowLeft,
  Keyboard,
  Truck,
  Storefront,
  Camera,
} from "@phosphor-icons/react";
import { checkout, addHeldCart, removeHeldCart, addCustomer } from "../../lib/api";
import { applyBestPromotion, calcTotals } from "../../lib/offline-store";
import { formatMoney } from "../../lib/format";
import { cn } from "../../lib/cn";
import { useCart } from "../../stores/cart";
import { industryCaps, promptSerialMeta } from "../../lib/industry";
import { filterCatalog, findExactCatalogMatch } from "../../lib/catalog";
import { availableForProduct, findStockIssues } from "../../lib/stock";
import { acceptScan, feedbackScan } from "../../lib/scan-feedback";
import type {
  BranchSettings,
  Customer,
  HeldCart,
  Order,
  OrderType,
  PaymentMethod,
  Product,
  ProductCategory,
  Promotion,
  Shift,
} from "../../lib/types";
import { ProductGrid } from "./ProductGrid";
import { HoldCartsModal } from "./HoldCartsModal";
import { ReceiptModal } from "./ReceiptModal";
import { CustomerSelectModal } from "./CustomerSelectModal";
import { ShortcutsModal } from "./ShortcutsModal";
import { BarcodeScannerModal } from "./BarcodeScannerModal";
import { usePhoneLayout } from "../../hooks/use-media-query";
import { usePrinter } from "../../hooks/use-printer";

export function PosScreen({
  settings,
  products,
  categories = [],
  promotions = [],
  openShiftState,
  customers,
  heldCarts,
  cashierId = "cashier-1",
  initialSearch,
  onShiftChange: _onShiftChange,
  onRefreshData,
  onExit,
  onOpenCompletedSales,
  onOpenShifts,
}: {
  settings: BranchSettings;
  products: Product[];
  categories?: ProductCategory[];
  promotions?: Promotion[];
  openShiftState: Shift | null;
  customers: Customer[];
  heldCarts: HeldCart[];
  cashierId?: string;
  initialSearch?: string;
  onShiftChange?: (shift: Shift | null) => void;
  onRefreshData: () => void;
  onExit?: () => void;
  onOpenCompletedSales?: () => void;
  onOpenShifts?: () => void;
}) {
  const {
    lines,
    discount,
    add,
    setQty,
    remove,
    clear,
    setDiscount,
    priceMode,
    setPriceMode,
  } = useCart();
  const caps = industryCaps(settings.industry);

  function addProductToCart(p: Product) {
    if (
      settings.walk_in_sales_enabled &&
      settings.work_mode === "shift_based" &&
      !openShiftState
    ) {
      setMessage("افتح وردية أولاً قبل إضافة أصناف إلى السلة");
      return;
    }
    if (!p.is_active) {
      setMessage(`الصنف «${p.name}» غير نشط`);
      return;
    }
    if (p.track_stock) {
      const avail = availableForProduct(p, lines);
      if (avail < 1) {
        setMessage(`لا يتوفر مخزون لـ «${p.name}» (المتوفر ${p.stock_quantity})`);
        return;
      }
    }
    // Only prompt for IMEI/Serial if the specific product requires serial/IMEI tracking
    const requiresSerialMeta = Boolean(p.imei || p.serial);
    if (requiresSerialMeta && (caps.track_imei || caps.track_serial)) {
      const meta = promptSerialMeta(settings, p.name);
      if (!meta) return;
      add(p, { qty: 1, ...meta, priceMode });
      return;
    }
    add(p, { qty: 1, priceMode });
  }

  function handleScanOrSearchEnter() {
    const code = query.trim();
    if (!code) return;
    // Hardware wedges often re-fire Enter bursts — debounce identical codes
    const looksLikeBarcode = /^[\dA-Za-z\-_.]{4,}$/.test(code);
    if (looksLikeBarcode && !acceptScan(code)) return;

    const exact = findExactCatalogMatch(products, code);
    if (exact) {
      addProductToCart(exact);
      feedbackScan(true);
      setQuery("");
      return;
    }
    const soft = filterCatalog(products, code);
    if (soft.length === 1) {
      addProductToCart(soft[0]);
      feedbackScan(true);
      setQuery("");
      return;
    }
    if (soft.length === 0) {
      feedbackScan(false);
      setMessage("لا يوجد صنف مطابق للباركود/البحث");
      return;
    }
    setMessage("نتائج متعددة — اختر الصنف من الشبكة أو امسح باركوداً دقيقاً");
  }

  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [cash, setCash] = useState("");
  const [note, setNote] = useState("");

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [mobileCartOpen, setMobileCartOpen] = useState(false);
  const [showHoldModal, setShowHoldModal] = useState(false);
  const [saleMode, setSaleMode] = useState<"walk_in" | "delivery">("walk_in");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [deliveryFee, setDeliveryFee] = useState(
    String(settings.default_delivery_fee ?? 5)
  );
  const [deliveryPhone, setDeliveryPhone] = useState("");
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);
  const [lastChangeDue, setLastChangeDue] = useState<number | undefined>(undefined);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const isPhone = usePhoneLayout();
  const printer = usePrinter();
  const [showScanner, setShowScanner] = useState(false);
  /** "auto" | "none" | promotion id */
  const [promoChoice, setPromoChoice] = useState<string>("auto");

  useEffect(() => {
    setDeliveryFee(String(settings.default_delivery_fee ?? 5));
  }, [settings.default_delivery_fee]);

  useEffect(() => {
    if (initialSearch) {
      setQuery(initialSearch);
      searchInputRef.current?.focus();
    }
  }, [initialSearch]);

  const filtered = useMemo(
    () => filterCatalog(products, query),
    [products, query]
  );

  const stockIssues = useMemo(
    () => findStockIssues(lines, products),
    [lines, products]
  );

  const activePromos = useMemo(
    () => promotions.filter((p) => p.active),
    [promotions]
  );

  const cartSubtotal = useMemo(
    () => lines.reduce((s, l) => s + l.unit_price * l.quantity, 0),
    [lines]
  );

  const promoPreview = useMemo(() => {
    if (promoChoice === "none") return null;
    if (promoChoice === "auto") {
      return applyBestPromotion(cartSubtotal, activePromos);
    }
    const manual = activePromos.find((p) => p.id === promoChoice);
    return manual ? applyBestPromotion(cartSubtotal, [manual]) : null;
  }, [promoChoice, cartSubtotal, activePromos]);

  const effectiveDiscount = Math.min(
    cartSubtotal,
    Math.max(0, discount) + (promoPreview?.amount || 0)
  );
  const totals = calcTotals(lines, effectiveDiscount, settings.tax_rate);
  const feeNum =
    saleMode === "delivery" ? Math.max(0, Number(deliveryFee) || 0) : 0;
  const grandTotal = Math.round((totals.total + feeNum) * 100) / 100;
  const orderType: OrderType =
    saleMode === "delivery"
      ? "delivery"
      : priceMode === "wholesale"
        ? "wholesale"
        : "pos_walk_in";
  const totalItemsCount = lines.reduce((s, i) => s + i.quantity, 0);

  const needsShift =
    settings.walk_in_sales_enabled &&
    settings.work_mode === "shift_based" &&
    !openShiftState;

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "F1") {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === "F2") {
        e.preventDefault();
        setShowCustomerModal(true);
      } else if (e.key === "F4") {
        e.preventDefault();
        if (lines.length > 0) void handleHoldCart();
      } else if (e.key === "F6") {
        e.preventDefault();
        setShowHoldModal(true);
      } else if (e.key === "F9") {
        e.preventDefault();
        if (lines.length > 0 && !needsShift && !busy) void handleCheckout();
      } else if (e.key === "Escape" && onExit) {
        e.preventDefault();
        onExit();
      } else if (e.key === "?") {
        if ((e.target as HTMLElement).tagName !== "INPUT") {
          e.preventDefault();
          setShowShortcutsModal(true);
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lines, needsShift, busy, onExit]);

  async function handleHoldCart() {
    if (!lines.length) return;
    setBusy(true);
    try {
      await addHeldCart(
        lines,
        selectedCustomer?.name || "عميل نقدي",
        note || undefined
      );
      clear();
      setNote("");
      setSelectedCustomer(null);
      setMessage("تم تعليق الفاتورة بنجاح");
      setMobileCartOpen(false);
      onRefreshData();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "فشل تعليق الفاتورة");
    } finally {
      setBusy(false);
    }
  }

  async function handleRecallCart(cart: HeldCart) {
    clear();
    cart.items.forEach((item) => {
      const p = products.find((prod) => prod.id === item.product_id);
      if (p) {
        add(p, {
          qty: item.quantity,
          imei: item.imei || undefined,
          serial: item.serial || undefined,
          note: item.note || undefined,
        });
      }
    });
    await removeHeldCart(cart.id);
    setShowHoldModal(false);
    setMessage("تم استرجاع الفاتورة المعلقة");
    onRefreshData();
  }

  async function handleCheckout() {
    setBusy(true);
    setMessage(null);
    try {
      if (stockIssues.length) {
        throw new Error(
          `مخزون غير كافٍ — ${stockIssues
            .map((i) => `«${i.name}» (${i.available})`)
            .join(" · ")}`
        );
      }
      if (saleMode === "delivery") {
        const phone = (deliveryPhone || selectedCustomer?.phone || "").trim();
        if (!phone) throw new Error("رقم هاتف التوصيل مطلوب");
        if (!deliveryAddress.trim()) throw new Error("عنوان التوصيل مطلوب");
      }
      if (priceMode === "wholesale" && !selectedCustomer) {
        throw new Error("مبيعات الجملة تتطلب اختيار عميل");
      }

      const result = await checkout({
        lines,
        discount,
        method,
        cash_tendered:
          method === "mixed"
            ? Number(cash) || 0
            : cash
              ? Number(cash)
              : grandTotal,
        customer_id: selectedCustomer?.id,
        customer_name: selectedCustomer?.name,
        customer_phone:
          saleMode === "delivery"
            ? deliveryPhone.trim() || selectedCustomer?.phone
            : selectedCustomer?.phone,
        note: note || undefined,
        settings,
        open_shift: openShiftState,
        cashier_id: cashierId,
        type: orderType,
        delivery_address:
          saleMode === "delivery" ? deliveryAddress.trim() : undefined,
        delivery_date:
          saleMode === "delivery" && deliveryDate
            ? deliveryDate
            : undefined,
        delivery_fee: saleMode === "delivery" ? feeNum : undefined,
        promotion_id:
          promoChoice === "none"
            ? null
            : promoChoice === "auto"
              ? undefined
              : promoChoice,
      });

      setCompletedOrder(result.order as Order);
      setLastChangeDue(result.change_due);

      clear();
      setCash("");
      setNote("");
      setSelectedCustomer(null);
      setDeliveryAddress("");
      setDeliveryPhone("");
      setPromoChoice("auto");
      setMobileCartOpen(false);
      setMessage(
        saleMode === "delivery"
          ? `تم تسجيل طلب التوصيل ${result.order.order_number}`
          : `تم البيع بنجاح${
              result.change_due > 0
                ? ` · الباقي ${formatMoney(result.change_due, settings.currency_symbol)}`
                : ""
            }`
      );
      onRefreshData();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "فشل إتمام عملية البيع");
    } finally {
      setBusy(false);
    }
  }

  const CartContent = (
    <div className="flex h-full flex-col">
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
              onClick={() => void handleHoldCart()}
              title="تعليق السلة (F4)"
              className="inline-flex items-center gap-1.5 rounded-lg border border-ink/[0.08] bg-paper px-2.5 py-1.5 text-xs font-semibold text-ink transition hover:border-highlight/40 hover:bg-highlight-soft"
            >
              <Pause size={14} />
              <span>تعليق</span>
              <span className="pos-key-badge">F4</span>
            </button>
            <button
              type="button"
              onClick={clear}
              title="مسح السلة"
              className="rounded-lg p-1.5 text-ink-mute transition hover:bg-danger/10 hover:text-danger"
            >
              <Trash size={16} />
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto overscroll-contain px-3 py-3">
        {lines.map((line, lineIdx) => (
          <div
            key={`${line.product_id}-${line.imei || ""}-${line.serial || ""}-${lineIdx}`}
            className="rounded-xl border border-ink/[0.08] bg-paper-raised px-3 py-2.5 transition hover:border-highlight/30"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-ink">{line.name}</p>
                {(line.imei || line.serial) && (
                  <p className="mt-0.5 font-mono text-[10px] text-ink-mute">
                    {line.imei ? `IMEI ${line.imei}` : ""}
                    {line.imei && line.serial ? " · " : ""}
                    {line.serial ? `S/N ${line.serial}` : ""}
                  </p>
                )}
              </div>
              <button
                type="button"
                aria-label="حذف"
                onClick={() =>
                  remove(
                    line.product_id,
                    `${line.product_id}|${line.imei || ""}|${line.serial || ""}`
                  )
                }
                className="text-ink-mute hover:text-danger"
              >
                <Trash size={14} />
              </button>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <div className="inline-flex items-center gap-1.5">
                <button
                  type="button"
                  className="grid size-9 place-items-center rounded-lg border border-ink/[0.08] bg-paper transition hover:bg-highlight-soft md:size-7"
                  onClick={() => setQty(line.product_id, line.quantity - 1)}
                >
                  <Minus size={12} />
                </button>
                <span className="money-big min-w-6 text-center text-xs font-bold">
                  {line.quantity}
                </span>
                <button
                  type="button"
                  className="grid size-9 place-items-center rounded-lg border border-ink/[0.08] bg-paper transition hover:bg-highlight-soft md:size-7"
                  onClick={() => setQty(line.product_id, line.quantity + 1)}
                >
                  <Plus size={12} />
                </button>
              </div>
              <p className="money-big text-xs font-bold text-ink">
                {formatMoney(line.unit_price * line.quantity, settings.currency_symbol)}
              </p>
            </div>
          </div>
        ))}

        {!lines.length && (
          <div className="rounded-xl border border-dashed border-ink/[0.12] px-4 py-14 text-center text-xs text-ink-mute">
            السلة فارغة. اضغط أو امسح باركود أي صنف للإضافة.
          </div>
        )}
      </div>

      <div className="space-y-3 border-t border-ink/[0.08] bg-gradient-to-b from-transparent to-ink/[0.03] p-3">
        <div className="grid grid-cols-2 gap-1.5 rounded-2xl bg-paper p-1">
          <button
            type="button"
            onClick={() => setSaleMode("walk_in")}
            className={cn(
              "inline-flex items-center justify-center gap-1.5 rounded-xl py-2 text-[11px] font-bold transition",
              saleMode === "walk_in"
                ? "bg-ink text-paper"
                : "text-ink-mute hover:text-ink"
            )}
          >
            <Storefront size={14} />
            بيع مباشر
          </button>
          <button
            type="button"
            onClick={() => {
              setSaleMode("delivery");
              if (selectedCustomer?.phone && !deliveryPhone) {
                setDeliveryPhone(selectedCustomer.phone);
              }
              if (selectedCustomer?.address && !deliveryAddress) {
                setDeliveryAddress(selectedCustomer.address);
              }
            }}
            className={cn(
              "inline-flex items-center justify-center gap-1.5 rounded-xl py-2 text-[11px] font-bold transition",
              saleMode === "delivery"
                ? "bg-highlight text-white"
                : "text-ink-mute hover:text-ink"
            )}
          >
            <Truck size={14} />
            توصيل
          </button>
        </div>

        <div className="grid grid-cols-2 gap-1.5 rounded-2xl border border-ink/[0.06] bg-paper-raised p-1">
          <button
            type="button"
            onClick={() => setPriceMode("retail")}
            className={cn(
              "rounded-xl py-1.5 text-[11px] font-bold transition",
              priceMode === "retail"
                ? "bg-success/15 text-success"
                : "text-ink-mute hover:text-ink"
            )}
          >
            تجزئة
          </button>
          <button
            type="button"
            onClick={() => {
              setPriceMode("wholesale");
              if (!selectedCustomer) setShowCustomerModal(true);
            }}
            className={cn(
              "rounded-xl py-1.5 text-[11px] font-bold transition",
              priceMode === "wholesale"
                ? "bg-warning/15 text-warning"
                : "text-ink-mute hover:text-ink"
            )}
          >
            جملة
          </button>
        </div>

        {stockIssues.length > 0 && (
          <p
            role="alert"
            className="rounded-lg border border-danger/25 bg-danger/10 px-2.5 py-2 text-[11px] font-semibold text-danger"
          >
            مخزون غير كافٍ:{" "}
            {stockIssues
              .map((i) => `«${i.name}» متاح ${i.available}`)
              .join(" · ")}
          </p>
        )}

        {saleMode === "delivery" && (
          <div className="space-y-2 rounded-xl border border-highlight/25 bg-highlight/5 p-2.5">
            <p className="text-[11px] font-bold text-highlight">بيانات التوصيل</p>
            <input
              type="tel"
              placeholder="هاتف المستلم *"
              value={deliveryPhone}
              onChange={(e) => setDeliveryPhone(e.target.value)}
              className="input-field font-mono text-xs"
            />
            <input
              type="text"
              placeholder="عنوان التوصيل *"
              value={deliveryAddress}
              onChange={(e) => setDeliveryAddress(e.target.value)}
              className="input-field text-xs"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                className="input-field text-xs"
              />
              <input
                type="number"
                min={0}
                step="0.5"
                placeholder="رسوم التوصيل"
                value={deliveryFee}
                onChange={(e) => setDeliveryFee(e.target.value)}
                className="input-field font-mono text-xs"
              />
            </div>
            <button
              type="button"
              onClick={() => setShowCustomerModal(true)}
              className="btn-ghost w-full text-[11px] font-bold"
            >
              <User size={14} className="inline" /> ربط عميل / اختيار من الدليل
            </button>
          </div>
        )}

        {activePromos.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[11px] font-semibold text-ink-mute">العروض</p>
            <div className="flex flex-wrap gap-1.5">
              <PromoChip
                active={promoChoice === "auto"}
                onClick={() => setPromoChoice("auto")}
                label="أفضل عرض"
              />
              <PromoChip
                active={promoChoice === "none"}
                onClick={() => setPromoChoice("none")}
                label="بدون عرض"
              />
              {activePromos.map((p) => (
                <PromoChip
                  key={p.id}
                  active={promoChoice === p.id}
                  onClick={() => setPromoChoice(p.id)}
                  label={
                    p.kind === "percent"
                      ? `${p.name} · ${p.value}%`
                      : `${p.name} · ${p.value}`
                  }
                />
              ))}
            </div>
            {promoPreview && (
              <p className="text-[11px] font-semibold text-success">
                يُطبَّق: {promoPreview.promotion.name} (−
                {formatMoney(promoPreview.amount, settings.currency_symbol)})
              </p>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <label className="block text-[11px] font-semibold text-ink-mute">
            خصم إضافي
            <input
              type="number"
              min={0}
              placeholder="0.0"
              value={discount || ""}
              onChange={(e) => setDiscount(Number(e.target.value) || 0)}
              className="input-field mt-1 font-mono text-xs"
            />
          </label>
          <label className="block text-[11px] font-semibold text-ink-mute">
            ملاحظة
            <input
              type="text"
              placeholder="ملاحظات..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="input-field mt-1 text-xs"
            />
          </label>
        </div>

        <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-5">
          <PaymentTab
            active={method === "cash"}
            onClick={() => setMethod("cash")}
            icon={<Wallet size={14} />}
            label="نقداً"
          />
          <PaymentTab
            active={method === "card"}
            onClick={() => setMethod("card")}
            icon={<CreditCard size={14} />}
            label="بطاقة"
          />
          <PaymentTab
            active={method === "transfer"}
            onClick={() => setMethod("transfer")}
            icon={<Bank size={14} />}
            label="تحويل"
          />
          <PaymentTab
            active={method === "mixed"}
            onClick={() => setMethod("mixed")}
            icon={<Wallet size={14} />}
            label="مختلط"
          />
          <PaymentTab
            active={method === "debt"}
            onClick={() => setMethod("debt")}
            icon={<Receipt size={14} />}
            label="آجل"
          />
        </div>

        {(method === "cash" || method === "mixed") && (
          <input
            type="number"
            inputMode="decimal"
            placeholder={
              method === "mixed"
                ? "الجزء النقدي من الإجمالي..."
                : "المبلغ النقدي المستلم..."
            }
            value={cash}
            onChange={(e) => setCash(e.target.value)}
            className="input-field font-mono text-xs"
          />
        )}

        <div className="space-y-1 rounded-xl border border-ink/[0.06] bg-paper-raised p-3 text-xs">
          <div className="flex justify-between text-ink-mute">
            <span>الفرعي</span>
            <span className="money-big">{formatMoney(totals.subtotal, settings.currency_symbol)}</span>
          </div>
          {promoPreview && promoPreview.amount > 0 && (
            <div className="flex justify-between font-semibold text-success">
              <span>عرض: {promoPreview.promotion.name}</span>
              <span className="money-big">
                -{formatMoney(promoPreview.amount, settings.currency_symbol)}
              </span>
            </div>
          )}
          {discount > 0 && (
            <div className="flex justify-between font-semibold text-danger">
              <span>خصم إضافي</span>
              <span className="money-big">
                -{formatMoney(Math.min(discount, cartSubtotal), settings.currency_symbol)}
              </span>
            </div>
          )}
          {totals.tax > 0 && (
            <div className="flex justify-between text-ink-mute">
              <span>الضريبة</span>
              <span className="money-big">+{formatMoney(totals.tax, settings.currency_symbol)}</span>
            </div>
          )}
          {priceMode === "wholesale" && (
            <div className="text-[10px] font-semibold text-warning">
              أسعار الجملة مفعّلة
            </div>
          )}
          {feeNum > 0 && (
            <div className="flex justify-between font-semibold text-highlight">
              <span>رسوم التوصيل</span>
              <span className="money-big">
                +{formatMoney(feeNum, settings.currency_symbol)}
              </span>
            </div>
          )}
          <div className="flex justify-between border-t border-ink/[0.06] pt-1.5 text-sm font-bold text-ink">
            <span>الإجمالي</span>
            <span className="money-big text-base">
              {formatMoney(grandTotal, settings.currency_symbol)}
            </span>
          </div>
        </div>

        {message && (
          <p
            className={cn(
              "rounded-lg border p-2 text-center text-xs font-semibold",
              message.includes("فشل") ||
              message.includes("مطلوب") ||
              message.includes("تجاوز") ||
              message.includes("مخزون") ||
              message.includes("لا يوجد") ||
              message.includes("متعددة")
                ? "border-danger/25 bg-danger/10 text-danger"
                : "border-success/25 bg-success/10 text-success"
            )}
          >
            {message}
          </p>
        )}

        <button
          type="button"
          className="btn-primary flex h-14 w-full items-center justify-center gap-2 text-base font-bold"
          disabled={
            busy || !lines.length || needsShift || stockIssues.length > 0
          }
          onClick={() => void handleCheckout()}
        >
          <span>
            {saleMode === "delivery"
              ? "تأكيد طلب التوصيل"
              : priceMode === "wholesale"
                ? "إتمام بيع جملة"
                : "إتمام البيع"}
          </span>
          <span className="pos-key-badge border-white/20 bg-white/10 text-accent-invert">F9</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="pos-console relative flex h-app min-h-0 flex-col overflow-hidden">
      <header className="pos-chrome flex shrink-0 flex-wrap items-center justify-between gap-2 px-3 py-2.5 sm:gap-3 sm:px-6 sm:py-3">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 sm:gap-2.5">
          {onExit && (
            <button
              type="button"
              onClick={onExit}
              className="inline-flex h-10 items-center gap-2 rounded-full bg-paper px-3.5 text-sm font-semibold text-ink transition hover:bg-highlight/10"
              title="العودة (Esc)"
            >
              <ArrowLeft size={16} />
              <span className="hidden sm:inline">لوحة التحكم</span>
            </button>
          )}
          <div className="pos-kpi-pill">
            <span className="text-[10px] text-ink-mute">الوردية</span>
            <span className={cn("text-sm font-bold", openShiftState ? "text-success" : "text-warning")}>
              {openShiftState ? "مفتوحة" : "مغلقة"}
            </span>
          </div>
          <div className="pos-kpi-pill hidden md:flex">
            <span className="text-[10px] text-ink-mute">الطابعة</span>
            <span
              className={cn(
                "text-sm font-bold",
                printer.connected ? "text-success" : "text-ink-mute"
              )}
            >
              {printer.connected ? "متصلة" : "—"}
            </span>
          </div>
          <div className="pos-kpi-pill hidden sm:flex">
            <span className="text-[10px] text-ink-mute">الأصناف</span>
            <span className="money-big text-sm font-bold">{products.length}</span>
          </div>
          <div
            className={cn(
              "pos-kpi-pill",
              heldCarts.length === 0 && "hidden sm:flex"
            )}
          >
            <span className="text-[10px] text-ink-mute">معلقة</span>
            <span className="money-big text-sm font-bold">{heldCarts.length}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onOpenCompletedSales && (
            <button
              type="button"
              onClick={onOpenCompletedSales}
              className="inline-flex h-10 items-center gap-2 rounded-full bg-ink px-3.5 text-sm font-bold text-paper transition hover:opacity-90"
              title="المبيعات المنفذة"
            >
              <Receipt size={16} weight="duotone" />
              <span className="hidden sm:inline">المبيعات المنفذة</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowShortcutsModal(true)}
            className="inline-flex h-10 items-center gap-2 rounded-full bg-paper px-3 text-sm font-semibold text-ink-mute transition hover:text-ink sm:px-3.5"
            aria-label="اختصارات لوحة المفاتيح"
          >
            <Keyboard size={16} />
            <span className="hidden sm:inline">اختصارات</span>
            <span className="pos-key-badge">?</span>
          </button>
        </div>
      </header>

      <div className="grid min-h-0 w-full flex-1 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(22rem,28rem)] xl:grid-cols-[minmax(0,1fr)_30rem] pb-[calc(4.5rem+env(safe-area-inset-bottom))] lg:pb-0">
        <section className="flex min-h-0 flex-col px-3 py-3 sm:px-5 sm:py-4 lg:px-6">
          <div className="flex w-full min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2.5">
            <div className="relative min-w-0 w-full flex-1 sm:min-w-[14rem]">
              <MagnifyingGlass
                className="pointer-events-none absolute end-4 top-1/2 -translate-y-1/2 text-ink-mute"
                size={20}
              />
              <input
                ref={searchInputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleScanOrSearchEnter();
                  }
                }}
                placeholder="ابحث بالاسم أو الباركود أو SKU..."
                className="input-field pe-11 ps-14 text-sm font-medium"
                inputMode="search"
                autoFocus={!isPhone}
              />
              <span className="pos-key-badge absolute start-3.5 top-1/2 -translate-y-1/2">F1</span>
            </div>

            <button
              type="button"
              onClick={() => setShowScanner(true)}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-paper-line/70 bg-paper-raised px-3.5 text-sm font-semibold text-ink shadow-soft transition hover:border-highlight/35"
              title="مسح بالكاميرا"
            >
              <Camera size={18} className="text-highlight" weight="duotone" />
              <span className="hidden sm:inline">كاميرا</span>
            </button>

            <div className="flex w-full gap-2 sm:w-auto sm:flex-initial">
            <button
              type="button"
              onClick={() => setShowCustomerModal(true)}
              className="inline-flex h-12 min-w-0 flex-1 items-center justify-center gap-2 rounded-full border border-paper-line/70 bg-paper-raised px-3 text-sm font-semibold text-ink shadow-soft transition hover:border-highlight/35 sm:flex-initial sm:px-4"
            >
              <User size={18} className="text-highlight" weight="duotone" />
              <span className="max-w-[10rem] truncate">
                {selectedCustomer ? selectedCustomer.name : "عميل"}
              </span>
              <span className="pos-key-badge">F2</span>
            </button>

            <button
              type="button"
              onClick={() => setShowHoldModal(true)}
              className="relative inline-flex h-12 min-w-0 flex-1 items-center justify-center gap-2 rounded-full border border-paper-line/70 bg-paper-raised px-3 text-sm font-semibold text-ink shadow-soft transition hover:border-highlight/35 sm:flex-initial sm:px-4"
            >
              <Clock size={18} className="text-highlight" weight="duotone" />
              <span className="hidden sm:inline">المعلقة</span>
              <span className="pos-key-badge">F6</span>
              {heldCarts.length > 0 && (
                <span className="absolute -top-1.5 -end-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-highlight px-1 text-[10px] font-bold text-white">
                  {heldCarts.length}
                </span>
              )}
            </button>
            </div>
          </div>

          {needsShift && (
            <div className="mt-3 flex flex-col gap-2 rounded-2xl border border-warning/25 bg-warning/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-bold text-warning">
                نظام الورديات مفعّل — افتح وردية قبل إضافة أصناف أو البيع.
              </p>
              <button
                type="button"
                onClick={() => (onOpenShifts ?? onExit)?.()}
                className="touch-chip shrink-0 bg-warning text-white"
              >
                فتح الوردية
              </button>
            </div>
          )}

          <ProductGrid
            products={filtered}
            categories={categories}
            layout={settings.pos_layout}
            currencySymbol={settings.currency_symbol}
            onAdd={addProductToCart}
            disabled={needsShift}
          />
        </section>

        <aside className="hidden min-h-0 flex-col border-s border-paper-line/60 bg-paper-raised lg:flex">
          {CartContent}
        </aside>
      </div>

      {/* Mobile cart bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-between border-t border-ink/[0.08] bg-paper-raised/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md lg:hidden">
        <div className="flex items-center gap-2">
          <div className="relative">
            <ShoppingCart size={22} className="text-ink" weight="duotone" />
            {totalItemsCount > 0 && (
              <span className="absolute -top-2 -end-2 grid h-5 w-5 place-items-center rounded-full bg-ink text-[10px] font-bold text-accent-invert">
                {totalItemsCount}
              </span>
            )}
          </div>
          <div>
            <div className="text-[10px] text-ink-mute">إجمالي السلة</div>
            <div className="money-big text-sm font-bold text-ink">
              {formatMoney(grandTotal, settings.currency_symbol)}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowScanner(true)}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-paper-line bg-paper text-ink transition active:scale-95"
            title="مسح باركود بالكاميرا"
          >
            <Camera size={20} weight="duotone" />
          </button>
          <button
            type="button"
            onClick={() => setMobileCartOpen(true)}
            className="btn-primary px-4 py-2.5 text-xs font-bold"
          >
            عرض السلة
          </button>
        </div>
      </div>

      {mobileCartOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-ink/50 backdrop-blur-sm lg:hidden">
          <div className="flex max-h-[min(90dvh,var(--app-height))] w-full flex-col overflow-hidden rounded-t-2xl border-t border-ink/[0.08] bg-paper-raised shadow-lift pb-[env(safe-area-inset-bottom)]">
            <div className="flex items-center justify-between border-b border-ink/[0.08] px-4 py-3">
              <span className="text-sm font-bold text-ink">سلة المبيعات</span>
              <button
                type="button"
                onClick={() => setMobileCartOpen(false)}
                className="rounded-lg p-1 text-ink-mute hover:bg-paper"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">{CartContent}</div>
          </div>
        </div>
      )}

      {showHoldModal && (
        <HoldCartsModal
          carts={heldCarts}
          onClose={() => setShowHoldModal(false)}
          onRecall={handleRecallCart}
          onDelete={async (id) => {
            await removeHeldCart(id);
            onRefreshData();
          }}
        />
      )}

      {showCustomerModal && (
        <CustomerSelectModal
          customers={customers}
          selectedCustomer={selectedCustomer}
          onSelect={(c) => setSelectedCustomer(c)}
          onAddCustomer={addCustomer}
          onClose={() => setShowCustomerModal(false)}
        />
      )}

      {showShortcutsModal && (
        <ShortcutsModal onClose={() => setShowShortcutsModal(false)} />
      )}

      {showScanner && (
        <BarcodeScannerModal
          onClose={() => setShowScanner(false)}
          onDetect={(code) => {
            if (!acceptScan(code)) return;
            const exact = findExactCatalogMatch(products, code);
            if (exact) {
              addProductToCart(exact);
              feedbackScan(true);
              setMessage(`تم مسح: ${exact.name}`);
            } else {
              feedbackScan(false);
              setQuery(code);
              setMessage(`باركود غير معروف: ${code}`);
            }
          }}
        />
      )}

      {completedOrder && (
        <ReceiptModal
          order={completedOrder}
          settings={settings}
          changeDue={lastChangeDue}
          onClose={() => setCompletedOrder(null)}
          autoPrint={
            settings.auto_print_thermal !== false && printer.connected
          }
        />
      )}
    </div>
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
        active
          ? "bg-success/15 text-success ring-1 ring-success/30"
          : "bg-paper text-ink-mute hover:text-ink"
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
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex flex-col items-center justify-center gap-1 rounded-2xl py-2.5 text-[11px] font-bold transition duration-200 ease-spring active:scale-[0.98]",
        active
          ? "bg-highlight text-white shadow-soft"
          : "bg-paper text-ink hover:bg-highlight/10"
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

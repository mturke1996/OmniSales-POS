import { useMemo, useState, useEffect, useRef } from "react";
import {
  Receipt,
  ArrowLeft,
  Keyboard,
  Printer,
  MagnifyingGlass,
  Lock,
} from "@phosphor-icons/react";
import { checkout, addHeldCart, removeHeldCart, addCustomer } from "../../lib/api";
import { applyBestPromotion, calcTotals } from "../../lib/offline-store";
import { formatMoney } from "../../lib/format";
import { cn } from "../../lib/cn";
import { useCart } from "../../stores/cart";
import { industryCaps, promptSerialMeta } from "../../lib/industry";
import { filterCatalog, findExactCatalogMatch } from "../../lib/catalog";
import { availableForProduct, findStockIssues, heldDemandByProduct } from "../../lib/stock";
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
  ReturnRecord,
  Shift,
} from "../../lib/types";
import { ProductGrid } from "./ProductGrid";
import { HoldCartsModal } from "./HoldCartsModal";
import { ReceiptModal } from "./ReceiptModal";
import { CustomerSelectModal } from "./CustomerSelectModal";
import { ShortcutsModal } from "./ShortcutsModal";
import { BarcodeScannerModal } from "./BarcodeScannerModal";
import { PosCartPanel } from "./PosCartPanel";
import { MobilePosHeader } from "./MobilePosHeader";
import { MobilePosTabBar, type MobilePosTab } from "./MobilePosTabBar";
import { MobilePosQuickPay } from "./MobilePosQuickPay";
import { PosQuickActions } from "./PosQuickActions";
import { PosProductStrip } from "./PosProductStrip";
import { PosLiveStats } from "./PosLiveStats";
import { PosSyncBar } from "./PosSyncBar";
import { PosPrinterSheet } from "./PosPrinterSheet";
import { PosSearchBar } from "./PosSearchBar";
import { usePhoneLayout, usePosSplitLayout } from "../../hooks/use-media-query";
import { usePrinter } from "../../hooks/use-printer";
import { useOnline } from "../../hooks/use-online";
import {
  getDisplayPinnedProductIds,
  getPinnedProductIds,
  getAutoPinnedProductIds,
  getRecentProductIds,
  togglePinnedProductId,
  recordRecentProductId,
  resolveProductsByIds,
} from "../../lib/pos-product-memory";
import { topSellerProductIds } from "../../lib/pos-top-sellers";
import { syncAutoPinnedTopSellers } from "../../lib/pos-auto-pin";
import { printThermalReceipt, printThermalReceiptBrowser } from "../../lib/invoice";
import { pullCloudOnly } from "../../lib/sync-outbox";

export function PosScreen({
  settings,
  products,
  categories = [],
  promotions = [],
  openShiftState,
  customers,
  heldCarts,
  orders = [],
  returns = [],
  cashierId = "cashier-1",
  initialSearch,
  onShiftChange: _onShiftChange,
  onRefreshData,
  onExit,
  onOpenCompletedSales,
  onOpenShifts,
  pendingSync = 0,
  onSync,
  onLock,
  onOpenCommand,
  initialOpenHeld = false,
  onHeldOpened,
}: {
  settings: BranchSettings;
  products: Product[];
  categories?: ProductCategory[];
  promotions?: Promotion[];
  openShiftState: Shift | null;
  customers: Customer[];
  heldCarts: HeldCart[];
  orders?: Order[];
  returns?: ReturnRecord[];
  cashierId?: string;
  initialSearch?: string;
  onShiftChange?: (shift: Shift | null) => void;
  onRefreshData: () => void;
  onExit?: () => void;
  onOpenCompletedSales?: () => void;
  onOpenShifts?: () => void;
  pendingSync?: number;
  onSync?: () => void | Promise<void>;
  onLock?: () => void;
  onOpenCommand?: () => void;
  initialOpenHeld?: boolean;
  onHeldOpened?: () => void;
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
  const isPhone = usePhoneLayout();
  const isSplitLayout = usePosSplitLayout();
  const isMobileTabs = isPhone && !isSplitLayout;
  const online = useOnline();
  const [syncing, setSyncing] = useState(false);
  const [showPrinterSheet, setShowPrinterSheet] = useState(false);

  function notifyAdded(name: string) {
    if (!isPhone) return;
    setAddToast(name);
    window.setTimeout(() => setAddToast(null), 1600);
    feedbackScan(true);
  }

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
      const avail = availableForProduct(p, lines, undefined, heldDemandByProduct(heldCarts));
      if (avail < 1) {
        setMessage(`لا يتوفر مخزون لـ «${p.name}» (محجوز في سلال معلّقة أو نفد)`);
        return;
      }
    }
    // Only prompt for IMEI/Serial if the specific product requires serial/IMEI tracking
    const requiresSerialMeta = Boolean(p.imei || p.serial);
    if (requiresSerialMeta && (caps.track_imei || caps.track_serial)) {
      const meta = promptSerialMeta(settings, p.name);
      if (!meta) return;
      add(p, { qty: 1, ...meta, priceMode });
      recordRecentProductId(p.id);
      setRecentIds(getRecentProductIds());
      notifyAdded(p.name);
      return;
    }
    add(p, { qty: 1, priceMode });
    recordRecentProductId(p.id);
    setRecentIds(getRecentProductIds());
    notifyAdded(p.name);
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
      setQuery("");
      return;
    }
    const soft = filterCatalog(products, code);
    if (soft.length === 1) {
      addProductToCart(soft[0]);
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
  const [mobileTab, setMobileTab] = useState<MobilePosTab>("products");
  const [addToast, setAddToast] = useState<string | null>(null);
  const [pinnedIds, setPinnedIds] = useState<string[]>(() => getDisplayPinnedProductIds());
  const [recentIds, setRecentIds] = useState<string[]>(() => getRecentProductIds());
  const [showHoldModal, setShowHoldModal] = useState(false);
  const [printerPrinting, setPrinterPrinting] = useState(false);
  const lastOrderRef = useRef<Order | null>(null);
  const lastChangeRef = useRef<number>(0);
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

  useEffect(() => {
    if (!initialOpenHeld) return;
    setShowHoldModal(true);
    onHeldOpened?.();
  }, [initialOpenHeld, onHeldOpened]);

  const searchInputRef = useRef<HTMLInputElement>(null);
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

  useEffect(() => {
    if (settings.auto_pin_top_sellers === false) return;
    setPinnedIds(syncAutoPinnedTopSellers(orders, returns, products));
  }, [orders, returns, products, settings.auto_pin_top_sellers]);

  const filtered = useMemo(
    () => filterCatalog(products, query),
    [products, query]
  );

  const reservedStock = useMemo(() => heldDemandByProduct(heldCarts), [heldCarts]);

  const stockIssues = useMemo(
    () => findStockIssues(lines, products, reservedStock),
    [lines, products, reservedStock]
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

  const pinnedProducts = useMemo(
    () => resolveProductsByIds(products, pinnedIds),
    [products, pinnedIds]
  );
  const recentProducts = useMemo(
    () =>
      resolveProductsByIds(
        products,
        recentIds.filter((id) => !pinnedIds.includes(id))
      ).slice(0, 8),
    [products, recentIds, pinnedIds]
  );
  const topSellerProducts = useMemo(() => {
    const ids = topSellerProductIds(orders, returns, products);
    const exclude = new Set([...pinnedIds, ...recentIds]);
    return resolveProductsByIds(
      products,
      ids.filter((id) => !exclude.has(id))
    );
  }, [orders, returns, products, pinnedIds, recentIds]);
  const pinnedIdSet = useMemo(() => new Set(pinnedIds), [pinnedIds]);
  const manualPinnedSet = useMemo(() => new Set(getPinnedProductIds()), [pinnedIds]);
  const autoPinnedIdSet = useMemo(() => new Set(getAutoPinnedProductIds()), [pinnedIds]);

  async function handleSyncNow() {
    if (!onSync || syncing) return;
    setSyncing(true);
    try {
      await onSync();
    } finally {
      setSyncing(false);
    }
  }

  function handleTogglePin(p: Product) {
    const next = togglePinnedProductId(p.id);
    setPinnedIds(next);
    if (isPhone) {
      const nowPinned = next.includes(p.id);
      setAddToast(nowPinned ? `★ «${p.name}» في المفضلة` : `أُزيل «${p.name}» من المفضلة`);
      window.setTimeout(() => setAddToast(null), 1400);
    }
  }

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
      } else if (e.key === "F10") {
        e.preventDefault();
        if (completedOrder) return;
        const last = lastOrderRef.current;
        if (!last) {
          setMessage("لا توجد فاتورة أخيرة للطباعة");
          return;
        }
        void printThermalReceipt(last, settings, lastChangeRef.current);
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
  }, [lines, needsShift, busy, onExit, completedOrder, settings]);

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
      setMobileTab("products");
      onRefreshData();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "فشل تعليق الفاتورة");
    } finally {
      setBusy(false);
    }
  }

  async function handleRecallCart(cart: HeldCart) {
    const issues = findStockIssues(
      cart.items,
      products,
      heldDemandByProduct(heldCarts, cart.id),
    );
    if (issues.length) {
      setMessage(
        `تعذر الاسترجاع — المخزون لم يعد يكفي: ${issues
          .map((i) => i.name)
          .join("، ")}`,
      );
      return;
    }
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
      let cloudFresh = false;
      if (settings.cloud_sync_enabled) {
        try {
          const pulled = await pullCloudOnly(settings);
          cloudFresh = !pulled.error;
        } catch {
          // offline — checkout still uses local stock gate
        }
      }
      if (stockIssues.length && !cloudFresh) {
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
      lastOrderRef.current = result.order as Order;
      lastChangeRef.current = result.change_due ?? 0;
      setLastChangeDue(result.change_due);

      clear();
      setCash("");
      setNote("");
      setSelectedCustomer(null);
      setDeliveryAddress("");
      setDeliveryPhone("");
      setPromoChoice("auto");
      setMobileTab("products");
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
      if (settings.cloud_sync_enabled) onRefreshData();
    } finally {
      setBusy(false);
    }
  }

  const cartPanel = (
    <PosCartPanel
      settings={settings}
      lines={lines}
      totalItemsCount={totalItemsCount}
      selectedCustomer={selectedCustomer}
      saleMode={saleMode}
      priceMode={priceMode}
      deliveryPhone={deliveryPhone}
      deliveryAddress={deliveryAddress}
      deliveryDate={deliveryDate}
      deliveryFee={deliveryFee}
      activePromos={activePromos}
      promoChoice={promoChoice}
      promoPreview={promoPreview}
      discount={discount}
      note={note}
      method={method}
      cash={cash}
      stockIssues={stockIssues}
      cartSubtotal={cartSubtotal}
      totals={totals}
      feeNum={feeNum}
      grandTotal={grandTotal}
      message={message}
      busy={busy}
      needsShift={needsShift}
      isMobile={isPhone}
      compact={isSplitLayout}
      onHold={() => void handleHoldCart()}
      onClear={clear}
      onRemoveLine={(productId, key) => remove(productId, key)}
      onSetQty={(productId, qty) => setQty(productId, qty)}
      onSaleModeChange={setSaleMode}
      onPriceModeChange={setPriceMode}
      onDeliveryPhoneChange={setDeliveryPhone}
      onDeliveryAddressChange={setDeliveryAddress}
      onDeliveryDateChange={setDeliveryDate}
      onDeliveryFeeChange={setDeliveryFee}
      onPromoChoiceChange={setPromoChoice}
      onDiscountChange={setDiscount}
      onNoteChange={setNote}
      onMethodChange={setMethod}
      onCashChange={setCash}
      onCustomerClick={() => setShowCustomerModal(true)}
      onCheckout={() => void handleCheckout()}
    />
  );

  const productsPane = (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden px-3 pb-2 pt-2">
      <div className="mb-2 shrink-0">
        <PosSearchBar
          value={query}
          onChange={setQuery}
          onEnter={handleScanOrSearchEnter}
          onScan={() => setShowScanner(true)}
          inputRef={searchInputRef}
          compact
        />
        <p className="mt-1.5 text-center text-[10px] text-ink-mute">
          Enter للإضافة · امسح الباركود أو اضغط كاميرا
        </p>
      </div>

      <div className="mb-2 shrink-0">
        <PosQuickActions
          customerName={selectedCustomer?.name}
          saleMode={saleMode}
          priceMode={priceMode}
          onCustomer={() => setShowCustomerModal(true)}
          onHold={() => void handleHoldCart()}
          holdDisabled={!lines.length}
          heldCount={heldCarts.length}
          onToggleSaleMode={() => {
            if (saleMode === "delivery") {
              setSaleMode("walk_in");
              return;
            }
            setSaleMode("delivery");
            if (selectedCustomer?.phone && !deliveryPhone) {
              setDeliveryPhone(selectedCustomer.phone);
            }
            if (selectedCustomer?.address && !deliveryAddress) {
              setDeliveryAddress(selectedCustomer.address);
            }
          }}
          onTogglePriceMode={() => {
            if (priceMode === "wholesale") {
              setPriceMode("retail");
              return;
            }
            setPriceMode("wholesale");
            if (!selectedCustomer) setShowCustomerModal(true);
          }}
        />
      </div>

      {needsShift && (
        <div className="mb-2 shrink-0 rounded-2xl border border-warning/25 bg-warning/10 px-3 py-2.5">
          <p className="text-xs font-bold text-warning">افتح وردية قبل البيع</p>
          <button
            type="button"
            onClick={() => (onOpenShifts ?? onExit)?.()}
            className="touch-chip mt-2 bg-warning text-white"
          >
            فتح الوردية
          </button>
        </div>
      )}

      {stockIssues.length > 0 && lines.length > 0 && (
        <div className="mb-2 shrink-0 rounded-2xl border border-danger/25 bg-danger/10 px-3 py-2.5">
          <p className="text-xs font-bold text-danger">تعارض مخزون — راجع السلة قبل الدفع</p>
          <p className="mt-1 text-[11px] text-ink-mute">
            {stockIssues
              .map((i) => `«${i.name}»: المطلوب ${i.requested} · المتاح ${i.available}`)
              .join(" · ")}
          </p>
        </div>
      )}

      {!query.trim() && (
        <>
          <PosProductStrip
            title="مفضّلة سريعة"
            icon="pinned"
            products={pinnedProducts}
            pinnedIds={manualPinnedSet}
            autoPinnedIds={autoPinnedIdSet}
            currencySymbol={settings.currency_symbol}
            onAdd={addProductToCart}
            onTogglePin={handleTogglePin}
            disabled={needsShift}
            compact={isSplitLayout}
          />
          <PosProductStrip
            title="أُضيف مؤخراً"
            icon="recent"
            products={recentProducts}
            currencySymbol={settings.currency_symbol}
            onAdd={addProductToCart}
            disabled={needsShift}
            compact={isSplitLayout}
          />
          <PosProductStrip
            title="الأكثر مبيعاً"
            icon="bestseller"
            products={topSellerProducts}
            currencySymbol={settings.currency_symbol}
            onAdd={addProductToCart}
            onTogglePin={handleTogglePin}
            disabled={needsShift}
            compact={isSplitLayout}
          />
        </>
      )}

      <ProductGrid
        products={filtered}
        categories={categories}
        layout={settings.pos_layout}
        currencySymbol={settings.currency_symbol}
        onAdd={addProductToCart}
        disabled={needsShift}
        phoneLayout
        pinnedIds={pinnedIdSet}
        onTogglePin={isPhone ? handleTogglePin : undefined}
      />
    </section>
  );

  return (
    <div className="pos-console relative flex h-app min-h-0 flex-col overflow-hidden">
      {isPhone ? (
        isSplitLayout ? (
          <>
            <MobilePosHeader
              branchName={settings.name}
              shiftOpen={Boolean(openShiftState)}
              heldCount={heldCarts.length}
              cartCount={totalItemsCount}
              cartTotal={formatMoney(grandTotal, settings.currency_symbol)}
              currencySymbol={settings.currency_symbol}
              printerConnected={printer.connected}
              onExit={onExit}
              onOpenSales={onOpenCompletedSales}
              onOpenHeld={() => setShowHoldModal(true)}
              onScan={() => setShowScanner(true)}
              onPrinterClick={() => setShowPrinterSheet(true)}
              onOpenCommand={onOpenCommand}
              onLock={onLock}
              onOpenShortcuts={() => setShowShortcutsModal(true)}
            />
            <PosSyncBar
              online={online}
              pendingSync={pendingSync}
              cloudEnabled={settings.cloud_sync_enabled}
              syncing={syncing}
              onSync={onSync ? handleSyncNow : undefined}
              compact
              alwaysShowLive
            />
            <PosLiveStats
              orders={orders}
              returns={returns}
              openShift={openShiftState}
              currencySymbol={settings.currency_symbol}
              compact
            />
            <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1.15fr)_minmax(16rem,22rem)]">
              {productsPane}
              <aside className="flex min-h-0 flex-col border-s border-paper-line/60 bg-paper-raised">
                {cartPanel}
              </aside>
            </div>
            {addToast && (
              <div className="pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top)+3.75rem)] z-50 flex justify-center px-4">
                <div className="rounded-full bg-ink/95 px-4 py-2 text-xs font-bold text-white shadow-lift">
                  + {addToast}
                </div>
              </div>
            )}
          </>
        ) : (
        <>
          <MobilePosHeader
            branchName={settings.name}
            shiftOpen={Boolean(openShiftState)}
            heldCount={heldCarts.length}
            cartCount={totalItemsCount}
            cartTotal={formatMoney(grandTotal, settings.currency_symbol)}
            currencySymbol={settings.currency_symbol}
            printerConnected={printer.connected}
            onExit={onExit}
            onOpenSales={onOpenCompletedSales}
            onOpenHeld={() => setShowHoldModal(true)}
            onScan={() => setShowScanner(true)}
            onOpenCart={mobileTab === "products" ? () => setMobileTab("cart") : undefined}
            onPrinterClick={() => setShowPrinterSheet(true)}
            onOpenCommand={onOpenCommand}
            onLock={onLock}
            onOpenShortcuts={() => setShowShortcutsModal(true)}
          />
          <PosSyncBar
            online={online}
            pendingSync={pendingSync}
            cloudEnabled={settings.cloud_sync_enabled}
            syncing={syncing}
            onSync={onSync ? handleSyncNow : undefined}
            alwaysShowLive
          />
          {mobileTab === "products" && (
            <PosLiveStats
              orders={orders}
              returns={returns}
              openShift={openShiftState}
              currencySymbol={settings.currency_symbol}
            />
          )}

          {mobileTab === "products" ? (
            productsPane
          ) : (
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              {cartPanel}
            </div>
          )}

          <MobilePosTabBar
            activeTab={mobileTab}
            onTabChange={setMobileTab}
            itemCount={totalItemsCount}
            grandTotal={grandTotal}
            currencySymbol={settings.currency_symbol}
            onScan={() => setShowScanner(true)}
          />

          {mobileTab === "products" && isMobileTabs && (
            <MobilePosQuickPay
              itemCount={totalItemsCount}
              grandTotal={grandTotal}
              currencySymbol={settings.currency_symbol}
              onPay={() => setMobileTab("cart")}
            />
          )}

          {addToast && (
            <div className="pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top)+6.5rem)] z-50 flex justify-center px-4">
              <div className="rounded-full bg-ink/95 px-4 py-2 text-xs font-bold text-white shadow-lift">
                + {addToast}
              </div>
            </div>
          )}
        </>
        )
      ) : (
        <>
      <PosSyncBar
        online={online}
        pendingSync={pendingSync}
        cloudEnabled={settings.cloud_sync_enabled}
        syncing={syncing}
        onSync={onSync ? handleSyncNow : undefined}
        compact
        alwaysShowLive
      />
      <header className="pos-toolbar-strip">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          {onExit && (
            <button
              type="button"
              onClick={onExit}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-paper-line/60 bg-paper px-3 text-sm font-semibold text-ink transition hover:border-highlight/30"
              title="العودة (Esc)"
            >
              <ArrowLeft size={16} />
              <span className="hidden sm:inline">لوحة التحكم</span>
            </button>
          )}
          <div className="pos-kpi-chip">
            <span className="text-[10px] text-ink-mute">الوردية</span>
            <span className={cn("money-pos text-sm", openShiftState ? "text-success" : "text-warning")}>
              {openShiftState ? "مفتوحة" : "مغلقة"}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowPrinterSheet(true)}
            className="pos-kpi-chip hidden md:flex"
            title="إعداد الطابعة"
          >
            <span className="text-[10px] text-ink-mute">الطابعة</span>
            <span
              className={cn(
                "inline-flex items-center gap-1 money-pos text-sm",
                printer.connected ? "text-success" : "text-ink-mute"
              )}
            >
              <Printer size={14} weight="duotone" />
              {printer.connected ? "متصلة" : "—"}
            </span>
          </button>
          <div className="pos-kpi-chip hidden sm:flex">
            <span className="text-[10px] text-ink-mute">السلة</span>
            <span className="money-pos-lg text-highlight">{totalItemsCount}</span>
          </div>
          <div className="pos-kpi-chip hidden sm:flex">
            <span className="text-[10px] text-ink-mute">الإجمالي</span>
            <span className="money-pos-lg">{formatMoney(grandTotal, settings.currency_symbol)}</span>
          </div>
          <div className={cn("pos-kpi-chip", heldCarts.length === 0 && "hidden sm:flex")}>
            <span className="text-[10px] text-ink-mute">معلقة</span>
            <span className="money-pos">{heldCarts.length}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onOpenCommand && (
            <button
              type="button"
              onClick={onOpenCommand}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-paper-line/60 bg-paper px-3 text-sm font-semibold text-ink transition hover:border-highlight/30"
              title="بحث سريع"
            >
              <MagnifyingGlass size={16} />
              <span className="hidden sm:inline">بحث</span>
            </button>
          )}
          {onLock && (
            <button
              type="button"
              onClick={onLock}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-paper-line/60 bg-paper px-3 text-sm font-semibold text-ink transition hover:border-highlight/30"
              title="قفل الجلسة"
            >
              <Lock size={16} />
              <span className="hidden sm:inline">قفل</span>
            </button>
          )}
          {onOpenCompletedSales && (
            <button
              type="button"
              onClick={onOpenCompletedSales}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-ink px-3.5 text-sm font-bold text-paper shadow-soft transition hover:opacity-90 active:scale-[0.98]"
              title="المبيعات المنفذة"
            >
              <Receipt size={16} weight="duotone" />
              <span className="hidden sm:inline">المبيعات المنفذة</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowShortcutsModal(true)}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-paper-line/60 bg-paper px-3 text-sm font-semibold text-ink-mute transition hover:text-ink"
            aria-label="اختصارات لوحة المفاتيح"
          >
            <Keyboard size={16} />
            <span className="hidden sm:inline">اختصارات</span>
            <span className="pos-key-badge">?</span>
          </button>
        </div>
      </header>

      <PosLiveStats
        orders={orders}
        returns={returns}
        openShift={openShiftState}
        currencySymbol={settings.currency_symbol}
        compact
      />

      <div className="grid min-h-0 w-full flex-1 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(22rem,28rem)] xl:grid-cols-[minmax(0,1fr)_30rem]">
        <section className="flex min-h-0 flex-col px-3 py-3 sm:px-5 sm:py-4 lg:px-6">
          <div className="mb-3 shrink-0 space-y-2">
            <PosSearchBar
              value={query}
              onChange={setQuery}
              onEnter={handleScanOrSearchEnter}
              onScan={() => setShowScanner(true)}
              inputRef={searchInputRef}
              showShortcut
            />
            <PosQuickActions
              customerName={selectedCustomer?.name}
              saleMode={saleMode}
              priceMode={priceMode}
              onCustomer={() => setShowCustomerModal(true)}
              onHold={() => void handleHoldCart()}
              holdDisabled={!lines.length}
              heldCount={heldCarts.length}
              onToggleSaleMode={() => {
                if (saleMode === "delivery") {
                  setSaleMode("walk_in");
                  return;
                }
                setSaleMode("delivery");
                if (selectedCustomer?.phone && !deliveryPhone) {
                  setDeliveryPhone(selectedCustomer.phone);
                }
                if (selectedCustomer?.address && !deliveryAddress) {
                  setDeliveryAddress(selectedCustomer.address);
                }
              }}
              onTogglePriceMode={() => {
                if (priceMode === "wholesale") {
                  setPriceMode("retail");
                  return;
                }
                setPriceMode("wholesale");
                if (!selectedCustomer) setShowCustomerModal(true);
              }}
            />
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

          {!query.trim() && (
            <>
              <PosProductStrip
                title="مفضّلة سريعة"
                icon="pinned"
                products={pinnedProducts}
                pinnedIds={manualPinnedSet}
                autoPinnedIds={autoPinnedIdSet}
                currencySymbol={settings.currency_symbol}
                onAdd={addProductToCart}
                onTogglePin={handleTogglePin}
                disabled={needsShift}
              />
              <PosProductStrip
                title="أُضيف مؤخراً"
                icon="recent"
                products={recentProducts}
                currencySymbol={settings.currency_symbol}
                onAdd={addProductToCart}
                disabled={needsShift}
              />
              <PosProductStrip
                title="الأكثر مبيعاً"
                icon="bestseller"
                products={topSellerProducts}
                currencySymbol={settings.currency_symbol}
                onAdd={addProductToCart}
                onTogglePin={handleTogglePin}
                disabled={needsShift}
              />
            </>
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
          {cartPanel}
        </aside>
      </div>
        </>
      )}

      {showHoldModal && (
        <HoldCartsModal
          carts={heldCarts}
          products={products}
          currencySymbol={settings.currency_symbol}
          onClose={() => setShowHoldModal(false)}
          onRecall={handleRecallCart}
          onDelete={async (id) => {
            await removeHeldCart(id);
            onRefreshData();
          }}
          mobile={isPhone}
        />
      )}

      {showCustomerModal && (
        <CustomerSelectModal
          customers={customers}
          selectedCustomer={selectedCustomer}
          onSelect={(c) => setSelectedCustomer(c)}
          onAddCustomer={addCustomer}
          onClose={() => setShowCustomerModal(false)}
          mobile={isPhone}
        />
      )}

      {showShortcutsModal && (
        <ShortcutsModal onClose={() => setShowShortcutsModal(false)} />
      )}

      {showScanner && (
        <BarcodeScannerModal
          continuous={isPhone}
          onClose={() => setShowScanner(false)}
          onDetect={(code) => {
            if (!acceptScan(code)) return;
            const exact = findExactCatalogMatch(products, code);
            if (exact) {
              addProductToCart(exact);
              if (!isPhone) setMessage(`تم مسح: ${exact.name}`);
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
          changeDue={completedOrder.change_due ?? lastChangeDue}
          onClose={() => setCompletedOrder(null)}
          autoPrint={settings.auto_print_thermal !== false}
          mobile={isPhone}
        />
      )}

      <PosPrinterSheet
        open={showPrinterSheet}
        onClose={() => setShowPrinterSheet(false)}
        connected={printer.connected}
        printerLabel={printer.label ?? undefined}
        supportMessage={printer.supportMessage}
        transport={printer.transport}
        thermalWidthMm={settings.thermal_width_mm === 58 ? 58 : 80}
        printing={printerPrinting}
        onPrintBrowser={
          lastOrderRef.current
            ? () => {
                setPrinterPrinting(true);
                try {
                  printThermalReceiptBrowser(
                    lastOrderRef.current!,
                    settings,
                    lastChangeRef.current
                  );
                } finally {
                  window.setTimeout(() => setPrinterPrinting(false), 800);
                }
              }
            : undefined
        }
      />
    </div>
  );
}

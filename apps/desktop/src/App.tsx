import { useEffect, useState, useCallback, lazy, Suspense } from "react";
import { bootstrap, saveSettings, syncCloud, getPendingSyncCount } from "./lib/api";
import { applyTheme, isThemeKey } from "./lib/theme";
import type { Bootstrap, BranchSettings, Shift } from "./lib/types";
import type { CashierSession } from "./lib/session";
import { lockSession } from "./lib/session";
import { StatusBar } from "./components/StatusBar";
import { Sidebar, SidebarTab } from "./components/Sidebar";
import { MobileNavDrawer } from "./components/MobileNavDrawer";
import { MobileBottomNav } from "./components/MobileBottomNav";
import { CashierGate } from "./components/auth/CashierGate";
import { PwaInstallBanner } from "./components/pwa/PwaInstallBanner";
import { PwaUpdateToast } from "./components/pwa/PwaUpdateToast";
import { PdfPreviewHost } from "./components/pdf/PdfPreviewHost";
import { AppShell } from "./components/layout/AppShell";
import { CommandPalette } from "./components/layout/CommandPalette";
import { ScreenLoader } from "./components/ui/ScreenLoader";
import { can } from "./lib/permissions";
import { initialFocusFromUrl, parseAppUrl, writeAppUrl } from "./lib/app-url";
import { useLiveSync } from "./hooks/use-live-sync";
import { LiveToastHost } from "./components/sync/LiveToast";

const SetupWizard = lazy(() =>
  import("./components/setup/SetupWizard").then((m) => ({ default: m.SetupWizard }))
);
const DashboardScreen = lazy(() =>
  import("./components/dashboard/DashboardScreen").then((m) => ({ default: m.DashboardScreen }))
);
const PosScreen = lazy(() =>
  import("./components/pos/PosScreen").then((m) => ({ default: m.PosScreen }))
);
const ShiftsScreen = lazy(() =>
  import("./components/shifts/ShiftsScreen").then((m) => ({ default: m.ShiftsScreen }))
);
const OrdersScreen = lazy(() =>
  import("./components/orders/OrdersScreen").then((m) => ({ default: m.OrdersScreen }))
);
const InvoicesScreen = lazy(() =>
  import("./components/invoices/InvoicesScreen").then((m) => ({ default: m.InvoicesScreen }))
);
const ReturnsScreen = lazy(() =>
  import("./components/returns/ReturnsScreen").then((m) => ({ default: m.ReturnsScreen }))
);
const InventoryScreen = lazy(() =>
  import("./components/inventory/InventoryScreen").then((m) => ({ default: m.InventoryScreen }))
);
const CustomersScreen = lazy(() =>
  import("./components/customers/CustomersScreen").then((m) => ({ default: m.CustomersScreen }))
);
const CustomerProfileScreen = lazy(() =>
  import("./components/customers/CustomerProfileScreen").then((m) => ({
    default: m.CustomerProfileScreen,
  }))
);
const ExpensesScreen = lazy(() =>
  import("./components/expenses/ExpensesScreen").then((m) => ({ default: m.ExpensesScreen }))
);
const PurchasesScreen = lazy(() =>
  import("./components/purchases/PurchasesScreen").then((m) => ({ default: m.PurchasesScreen }))
);
const OpsScreen = lazy(() =>
  import("./components/ops/OpsScreen").then((m) => ({ default: m.OpsScreen }))
);
const ReportsScreen = lazy(() =>
  import("./components/reports/ReportsScreen").then((m) => ({ default: m.ReportsScreen }))
);
const SettingsPanel = lazy(() =>
  import("./components/settings/SettingsPanel").then((m) => ({ default: m.SettingsPanel }))
);
const ShortcutsModal = lazy(() =>
  import("./components/pos/ShortcutsModal").then((m) => ({ default: m.ShortcutsModal }))
);

function initialTab(): SidebarTab {
  return parseAppUrl().tab;
}

const urlFocus = initialFocusFromUrl();

export default function App() {
  const [session, setSession] = useState<CashierSession | null>(null);
  const [data, setData] = useState<Bootstrap | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<SidebarTab>(initialTab);
  const [draft, setDraft] = useState<BranchSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [shift, setShift] = useState<Shift | null>(null);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [pendingSync, setPendingSync] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [returnOrderId, setReturnOrderId] = useState<string | null>(
    urlFocus.returnOrderId
  );
  const [profileCustomerId, setProfileCustomerId] = useState<string | null>(
    urlFocus.customerId
  );
  const [focusInvoiceId, setFocusInvoiceId] = useState<string | null>(
    urlFocus.invoiceId
  );
  const [focusOrderId, setFocusOrderId] = useState<string | null>(urlFocus.orderId);
  const [focusPurchaseId, setFocusPurchaseId] = useState<string | null>(
    urlFocus.purchaseId
  );
  const [focusSupplierId, setFocusSupplierId] = useState<string | null>(
    urlFocus.supplierId
  );
  const [posSearchQuery, setPosSearchQuery] = useState<string | null>(null);
  const [inventorySearchQuery, setInventorySearchQuery] = useState<string | null>(
    urlFocus.inventoryQuery
  );
  const [commandOpen, setCommandOpen] = useState(false);

  const navigate = useCallback((next: SidebarTab) => {
    setTab(next);
    setMobileMenuOpen(false);
    if (next !== "returns") setReturnOrderId(null);
    if (next !== "customers") setProfileCustomerId(null);
    if (next !== "invoices") setFocusInvoiceId(null);
    if (next !== "orders") setFocusOrderId(null);
    if (next !== "pos") setPosSearchQuery(null);
    if (next !== "inventory") setInventorySearchQuery(null);
    if (next !== "purchases") {
      setFocusPurchaseId(null);
      setFocusSupplierId(null);
    }
  }, []);

  useEffect(() => {
    if (!session || !data) return;
    writeAppUrl({
      tab,
      invoiceId: focusInvoiceId,
      orderId: focusOrderId,
      customerId: profileCustomerId,
      returnOrderId,
      purchaseId: focusPurchaseId,
      supplierId: focusSupplierId,
      inventoryQuery: inventorySearchQuery,
    });
  }, [
    tab,
    focusInvoiceId,
    focusOrderId,
    profileCustomerId,
    returnOrderId,
    focusPurchaseId,
    focusSupplierId,
    inventorySearchQuery,
    session,
    data,
  ]);

  const refreshPending = useCallback(() => {
    void getPendingSyncCount().then(setPendingSync);
  }, []);

  const loadData = useCallback(() => {
    return bootstrap()
      .then((b) => {
        const theme_key = isThemeKey(b.settings.theme_key)
          ? b.settings.theme_key
          : ("scout" as const);
        const settings = { ...b.settings, theme_key };
        setData({ ...b, settings });
        setDraft(settings);
        setShift(b.open_shift);
        applyTheme(theme_key);
        refreshPending();
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : "تعذر تحميل منظومة OmniSales");
      });
  }, [refreshPending]);

  const handleCloudSync = useCallback(() => {
    if (!draft) return Promise.resolve(undefined);
    return syncCloud(draft).then((r) => {
      refreshPending();
      void loadData();
      return r;
    });
  }, [draft, refreshPending, loadData]);

  useLiveSync(
    session && draft?.cloud_sync_enabled
      ? {
          settings: draft,
          session,
          tab,
          onRemoteChange: () => {
            refreshPending();
            return loadData();
          },
        }
      : null
  );

  useEffect(() => {
    if (session) void loadData();
  }, [session, loadData]);

  if (!session) {
    return (
      <>
        <CashierGate onSession={setSession} />
        <PwaInstallBanner />
        <PdfPreviewHost />
        <PwaUpdateToast />
        <LiveToastHost />
      </>
    );
  }

  if (error) {
    return (
      <div className="grid h-app place-items-center bg-paper px-4 safe-top safe-bottom">
        <div className="panel max-w-md p-6 text-center">
          <h1 className="text-lg font-bold text-ink">تعذر التشغيل</h1>
          <p className="mt-2 text-xs text-ink-mute">{error}</p>
          <button
            type="button"
            className="btn-primary mt-4 text-xs font-bold"
            onClick={() => window.location.reload()}
          >
            إعادة المحاولة
          </button>
        </div>
      </div>
    );
  }

  if (!data || !draft) {
    return (
      <div className="grid h-app place-items-center bg-paper px-4 safe-top safe-bottom" aria-busy="true">
        <div className="w-full max-w-sm space-y-3">
          <div className="h-10 animate-pulse rounded-2xl bg-paper-line" />
          <div className="h-40 animate-pulse rounded-2xl bg-paper-line" />
          <div className="h-24 animate-pulse rounded-2xl bg-paper-line" />
          <p className="text-center text-xs font-medium text-ink-mute">
            جاري تحميل OmniSales…
          </p>
        </div>
      </div>
    );
  }

  if (!draft.setup_complete) {
    return (
      <Suspense fallback={<ScreenLoader label="جاري تحميل معالج الإعداد…" />}>
        <SetupWizard
          settings={draft}
          onComplete={(next) => {
            setDraft(next);
            setData((prev) => (prev ? { ...prev, settings: next } : prev));
          }}
        />
      </Suspense>
    );
  }

  const isPos = tab === "pos";

  const sidebarProps = {
    currentTab: tab,
    onTabChange: navigate,
    openShift: shift,
    settings: draft,
    heldCartsCount: data.held_carts.length,
    session,
    pendingSync,
  };

  return (
    <AppShell
      immersive={isPos}
      topBar={
        !isPos ? (
          <StatusBar
            runtime={data.runtime}
            branchName={draft.name}
            cashierName={session.cashier_name}
            pendingSync={pendingSync}
            onMenuOpen={() => setMobileMenuOpen(true)}
            onOpenCommand={() => setCommandOpen(true)}
            onOpenShortcuts={() => setShowShortcutsModal(true)}
            onLock={() => {
              void lockSession().then(() => setSession(null));
            }}
          />
        ) : undefined
      }
      sidebar={
        !isPos ? <Sidebar {...sidebarProps} className="hidden lg:flex" /> : undefined
      }
      bottomNav={
        !isPos ? (
          <>
            <MobileBottomNav
              currentTab={tab}
              onNavigate={navigate}
              onOpenMenu={() => setMobileMenuOpen(true)}
            />
            <MobileNavDrawer
              open={mobileMenuOpen}
              onClose={() => setMobileMenuOpen(false)}
            >
              <Sidebar
                {...sidebarProps}
                onClose={() => setMobileMenuOpen(false)}
                className="w-full"
              />
            </MobileNavDrawer>
          </>
        ) : undefined
      }
      contentClassName={undefined}
    >
      <Suspense fallback={<ScreenLoader />}>
      {isPos ? (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <PosScreen
            settings={draft}
            products={data.products}
            categories={data.categories}
            promotions={data.promotions}
            openShiftState={shift}
            customers={data.customers}
            heldCarts={data.held_carts}
            orders={data.orders}
            returns={data.returns}
            cashierId={session.cashier_id}
            initialSearch={posSearchQuery ?? undefined}
            onShiftChange={setShift}
            onRefreshData={loadData}
            onExit={() => navigate("dashboard")}
            onOpenCompletedSales={() => navigate("invoices")}
            onOpenShifts={() => navigate("shifts")}
            pendingSync={pendingSync}
            onSync={() => void handleCloudSync()}
          />
        </div>
      ) : (
        <>
          {tab === "dashboard" && (
              <DashboardScreen
                orders={data.orders}
                returns={data.returns}
                products={data.products}
                customers={data.customers}
                expenses={data.expenses}
                purchases={data.purchases}
                suppliers={data.suppliers}
                settings={draft}
                openShift={shift}
                pendingSync={pendingSync}
                onNavigate={navigate}
                onOpenCustomer={(customerId) => {
                  setProfileCustomerId(customerId);
                  navigate("customers");
                }}
                onOpenInvoice={(orderId) => {
                  setFocusInvoiceId(orderId);
                  navigate("invoices");
                }}
                onOpenDelivery={(orderId) => {
                  setFocusOrderId(orderId);
                  navigate("orders");
                }}
                onStartReturn={(orderId) => {
                  setReturnOrderId(orderId);
                  navigate("returns");
                }}
                onOpenPurchase={(purchaseId) => {
                  setFocusPurchaseId(purchaseId);
                  navigate("purchases");
                }}
                onOpenSupplier={(supplierId) => {
                  setFocusSupplierId(supplierId);
                  navigate("purchases");
                }}
                onOpenInventory={(search) => {
                  setInventorySearchQuery(search);
                  navigate("inventory");
                }}
              />
            )}

            {tab === "shifts" && (
              <ShiftsScreen
                settings={draft}
                openShiftState={shift}
                cashierId={session.cashier_id}
                onShiftChange={setShift}
                orders={data.orders}
                returns={data.returns}
                cashMovements={data.cash_movements}
                shiftHistory={data.shift_history}
                onRefreshData={loadData}
                pendingSync={pendingSync}
                onSync={() => void handleCloudSync()}
              />
            )}

            {tab === "orders" && (
              <OrdersScreen
                orders={data.orders}
                settings={draft}
                initialOrderId={focusOrderId}
                onRefreshData={loadData}
                canCancel={can(session, "orders.cancel")}
                pendingSync={pendingSync}
                onSync={() => void handleCloudSync()}
              />
            )}

            {tab === "invoices" && (
              <InvoicesScreen
                orders={data.orders}
                customers={data.customers}
                settings={draft}
                initialOrderId={focusInvoiceId}
                pendingSync={pendingSync}
                onSync={() => void handleCloudSync()}
                onStartReturn={(orderId) => {
                  setReturnOrderId(orderId);
                  navigate("returns");
                }}
                onOpenCustomer={(customerId) => {
                  setProfileCustomerId(customerId);
                  navigate("customers");
                }}
              />
            )}

            {tab === "returns" && (
              <ReturnsScreen
                orders={data.orders}
                returns={data.returns}
                settings={draft}
                openShift={shift}
                cashierId={session.cashier_id}
                initialOrderId={returnOrderId}
                onDone={() => {
                  void loadData();
                }}
                pendingSync={pendingSync}
                onSync={() => void handleCloudSync()}
              />
            )}

            {tab === "inventory" && (
              <InventoryScreen
                products={data.products}
                categories={data.categories}
                stockMovements={data.stock_movements}
                settings={draft}
                initialSearch={inventorySearchQuery ?? undefined}
                onRefreshData={loadData}
                canManage={can(session, "products.edit")}
                actorId={session.cashier_id}
              />
            )}

            {tab === "purchases" &&
              (can(session, "purchases.manage") ? (
                <PurchasesScreen
                  suppliers={data.suppliers}
                  purchases={data.purchases}
                  supplierPayments={data.supplier_payments}
                  products={data.products}
                  settings={draft}
                  onRefreshData={loadData}
                  initialPurchaseId={focusPurchaseId}
                  initialSupplierId={focusSupplierId}
                />
              ) : (
                <div className="mx-auto max-w-lg px-4 py-16 text-center">
                  <div className="panel space-y-3 p-8">
                    <h2 className="text-lg font-bold text-ink">
                      المشتريات للمدير فقط
                    </h2>
                    <p className="text-xs text-ink-mute">
                      استلام البضاعة وتعديل التكلفة متاح لحساب المدير.
                    </p>
                  </div>
                </div>
              ))}

            {tab === "customers" &&
              (profileCustomerId &&
              data.customers.some((c) => c.id === profileCustomerId) ? (
                <CustomerProfileScreen
                  customer={
                    data.customers.find((c) => c.id === profileCustomerId)!
                  }
                  orders={data.orders}
                  returns={data.returns}
                  ledger={data.customer_ledger}
                  settings={draft}
                  onBack={() => setProfileCustomerId(null)}
                  onRefreshData={loadData}
                  onOpenInvoice={(orderId) => {
                    setFocusInvoiceId(orderId);
                    navigate("invoices");
                  }}
                  onStartReturn={(orderId) => {
                    setReturnOrderId(orderId);
                    navigate("returns");
                  }}
                />
              ) : (
                <CustomersScreen
                  customers={data.customers}
                  settings={draft}
                  onRefreshData={loadData}
                  onOpenProfile={setProfileCustomerId}
                />
              ))}

            {tab === "expenses" && (
              <ExpensesScreen
                expenses={data.expenses}
                settings={draft}
                onRefreshData={loadData}
                hasOpenShift={shift?.status === "open"}
                cashierId={session.cashier_id}
              />
            )}

            {tab === "ops" &&
              (can(session, "promotions.manage") ||
              can(session, "audit.view") ? (
                <OpsScreen
                  promotions={data.promotions}
                  auditLog={data.audit_log}
                  settings={draft}
                  orders={data.orders}
                  expenses={data.expenses}
                  customers={data.customers}
                  returns={data.returns}
                  products={data.products}
                  purchases={data.purchases}
                  suppliers={data.suppliers}
                  onRefreshData={loadData}
                  pendingSync={pendingSync}
                  onSync={() => void handleCloudSync()}
                />
              ) : (
                <div className="mx-auto max-w-lg px-4 py-16 text-center">
                  <div className="panel space-y-3 p-8">
                    <h2 className="text-lg font-bold text-ink">
                      العروض والتدقيق للمدير فقط
                    </h2>
                  </div>
                </div>
              ))}

            {tab === "reports" && (
              <ReportsScreen
                orders={data.orders}
                returns={data.returns}
                products={data.products}
                customers={data.customers}
                expenses={data.expenses}
                purchases={data.purchases}
                suppliers={data.suppliers}
                settings={draft}
                openShift={shift}
                onNavigate={navigate}
                onOpenInventory={(search) => {
                  setInventorySearchQuery(search);
                  navigate("inventory");
                }}
                onOpenReturn={(orderId) => {
                  setReturnOrderId(orderId);
                  navigate("returns");
                }}
              />
            )}

            {tab === "settings" &&
              (session.role === "manager" ? (
                <SettingsPanel
                  settings={draft}
                  onChange={setDraft}
                  saving={saving}
                  pendingSync={pendingSync}
                  currentUserId={session.cashier_id}
                  onSync={() => {
                    void syncCloud(draft).then((r) => {
                      refreshPending();
                      void loadData();
                      const base = `رفع ${r.flushed} · سحب ${r.pulled ?? 0} · المتبقي ${r.remaining}`;
                      alert(r.error ? `${base}\n${r.error}` : base);
                    });
                  }}
                  onSave={() => {
                    setSaving(true);
                    void saveSettings(draft)
                      .then((saved) => {
                        setDraft(saved);
                        setData((prev) =>
                          prev ? { ...prev, settings: saved } : prev
                        );
                        if (saved.theme_key && isThemeKey(saved.theme_key)) {
                          applyTheme(saved.theme_key);
                        }
                        alert("تم حفظ الإعدادات بنجاح");
                      })
                      .catch((e: unknown) => {
                        alert(
                          e instanceof Error ? e.message : "فشل حفظ الإعدادات"
                        );
                      })
                      .finally(() => setSaving(false));
                  }}
                />
              ) : (
                <div className="mx-auto max-w-lg px-4 py-16 text-center">
                  <div className="panel space-y-3 p-8">
                    <h2 className="text-lg font-bold text-ink">
                      الإعدادات للمدير فقط
                    </h2>
                    <p className="text-xs text-ink-mute">
                      سجّل الدخول بحساب المدير لتعديل إعدادات الفرع والمزامنة
                      السحابية.
                    </p>
                    <button
                      type="button"
                      className="btn-primary text-xs font-bold"
                      onClick={() => navigate("dashboard")}
                    >
                      العودة للوحة التحكم
                    </button>
                  </div>
                </div>
              ))}
        </>
      )}
      </Suspense>

      {showShortcutsModal && !isPos && (
        <Suspense fallback={null}>
          <ShortcutsModal onClose={() => setShowShortcutsModal(false)} />
        </Suspense>
      )}

      <PwaInstallBanner />
      <PdfPreviewHost />
      <PwaUpdateToast />
      <LiveToastHost />
      <CommandPalette
        open={commandOpen}
        onOpenChange={setCommandOpen}
        onNavigate={navigate}
        orders={data.orders}
        customers={data.customers}
        products={data.products}
        returns={data.returns}
        purchases={data.purchases}
        suppliers={data.suppliers}
        onOpenInvoice={(orderId) => {
          setFocusInvoiceId(orderId);
          navigate("invoices");
        }}
        onOpenDelivery={(orderId) => {
          setFocusOrderId(orderId);
          navigate("orders");
        }}
        onOpenReturn={(orderId) => {
          setReturnOrderId(orderId);
          navigate("returns");
        }}
        onOpenCustomer={(customerId) => {
          setProfileCustomerId(customerId);
          navigate("customers");
        }}
        onOpenProduct={(searchText) => {
          setPosSearchQuery(searchText);
          navigate("pos");
        }}
        onOpenInventoryProduct={(searchText) => {
          setInventorySearchQuery(searchText);
          navigate("inventory");
        }}
        onOpenPurchase={(purchaseId) => {
          setFocusPurchaseId(purchaseId);
          navigate("purchases");
        }}
        onOpenSupplier={(supplierId) => {
          setFocusSupplierId(supplierId);
          navigate("purchases");
        }}
      />
    </AppShell>
  );
}

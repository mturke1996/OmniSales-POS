import { useEffect, useState, useCallback } from "react";
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
import { DashboardScreen } from "./components/dashboard/DashboardScreen";
import { PosScreen } from "./components/pos/PosScreen";
import { ShiftsScreen } from "./components/shifts/ShiftsScreen";
import { OrdersScreen } from "./components/orders/OrdersScreen";
import { InvoicesScreen } from "./components/invoices/InvoicesScreen";
import { ReturnsScreen } from "./components/returns/ReturnsScreen";
import { InventoryScreen } from "./components/inventory/InventoryScreen";
import { CustomersScreen } from "./components/customers/CustomersScreen";
import { CustomerProfileScreen } from "./components/customers/CustomerProfileScreen";
import { ExpensesScreen } from "./components/expenses/ExpensesScreen";
import { PurchasesScreen } from "./components/purchases/PurchasesScreen";
import { OpsScreen } from "./components/ops/OpsScreen";
import { ReportsScreen } from "./components/reports/ReportsScreen";
import { SettingsPanel } from "./components/settings/SettingsPanel";
import { ShortcutsModal } from "./components/pos/ShortcutsModal";
import { PwaInstallBanner } from "./components/pwa/PwaInstallBanner";
import { PwaUpdateToast } from "./components/pwa/PwaUpdateToast";
import { can } from "./lib/permissions";

function initialTab(): SidebarTab {
  const q = new URLSearchParams(window.location.search).get("tab") as SidebarTab | null;
  const validTabs: SidebarTab[] = [
    "dashboard",
    "pos",
    "shifts",
    "orders",
    "invoices",
    "returns",
    "inventory",
    "purchases",
    "customers",
    "expenses",
    "ops",
    "reports",
    "settings",
  ];
  return q && validTabs.includes(q) ? q : "dashboard";
}

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
  const [returnOrderId, setReturnOrderId] = useState<string | null>(null);
  const [profileCustomerId, setProfileCustomerId] = useState<string | null>(null);
  const [focusInvoiceId, setFocusInvoiceId] = useState<string | null>(null);

  const navigate = useCallback((next: SidebarTab) => {
    setTab(next);
    setMobileMenuOpen(false);
    if (next !== "returns") setReturnOrderId(null);
    if (next !== "customers") setProfileCustomerId(null);
    if (next !== "invoices") setFocusInvoiceId(null);
  }, []);

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
        if (settings.cloud_sync_enabled) {
          void syncCloud(settings).then(refreshPending);
        }
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : "تعذر تحميل منظومة OmniSales");
      });
  }, [refreshPending]);

  useEffect(() => {
    if (session) void loadData();
  }, [session, loadData]);

  if (!session) {
    return (
      <>
        <CashierGate onSession={setSession} />
        <PwaInstallBanner />
        <PwaUpdateToast />
      </>
    );
  }

  if (error) {
    return (
      <div className="grid min-h-[100dvh] place-items-center bg-paper px-4">
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
      <div className="grid min-h-[100dvh] place-items-center bg-paper px-4" aria-busy="true">
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
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-paper text-ink transition-colors duration-300 ease-spring">
      {!isPos && (
        <StatusBar
          runtime={data.runtime}
          branchName={draft.name}
          cashierName={session.cashier_name}
          pendingSync={pendingSync}
          onMenuOpen={() => setMobileMenuOpen(true)}
          onOpenShortcuts={() => setShowShortcutsModal(true)}
          onLock={() => {
            void lockSession().then(() => setSession(null));
          }}
        />
      )}

      {isPos ? (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden pt-[env(safe-area-inset-top)]">
          <PosScreen
            settings={draft}
            products={data.products}
            openShiftState={shift}
            customers={data.customers}
            heldCarts={data.held_carts}
            cashierId={session.cashier_id}
            onShiftChange={setShift}
            onRefreshData={loadData}
            onExit={() => navigate("dashboard")}
            onOpenCompletedSales={() => navigate("invoices")}
            onOpenShifts={() => navigate("shifts")}
          />
        </div>
      ) : (
        <div className="flex min-h-0 flex-1">
          <Sidebar {...sidebarProps} className="hidden lg:flex" />

          <main className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain pb-[max(5rem,calc(4.25rem+env(safe-area-inset-bottom)))] lg:pb-[max(1.25rem,env(safe-area-inset-bottom))]">
            {tab === "dashboard" && (
              <DashboardScreen
                orders={data.orders}
                returns={data.returns}
                products={data.products}
                customers={data.customers}
                expenses={data.expenses}
                settings={draft}
                openShift={shift}
                onNavigate={navigate}
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
                onRefreshData={loadData}
              />
            )}

            {tab === "orders" && (
              <OrdersScreen
                orders={data.orders}
                settings={draft}
                onRefreshData={loadData}
                canCancel={can(session, "orders.cancel")}
              />
            )}

            {tab === "invoices" && (
              <InvoicesScreen
                orders={data.orders}
                customers={data.customers}
                settings={draft}
                initialOrderId={focusInvoiceId}
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
              />
            )}

            {tab === "inventory" && (
              <InventoryScreen
                products={data.products}
                categories={data.categories}
                stockMovements={data.stock_movements}
                settings={draft}
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
                  products={data.products}
                  settings={draft}
                  onRefreshData={loadData}
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
                  onRefreshData={loadData}
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
                settings={draft}
                openShift={shift}
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
          </main>
        </div>
      )}

      {!isPos && (
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
      )}

      {showShortcutsModal && !isPos && (
        <ShortcutsModal onClose={() => setShowShortcutsModal(false)} />
      )}

      <PwaInstallBanner />
      <PwaUpdateToast />
    </div>
  );
}

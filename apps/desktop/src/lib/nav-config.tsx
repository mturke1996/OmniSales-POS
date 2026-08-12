import type { ReactNode } from "react";
import {
  House,
  Storefront,
  ClockAfternoon,
  Package,
  Users,
  Receipt,
  ChartBar,
  GearSix,
  FileText,
  ArrowUUpLeft,
  Truck,
  Handshake,
  ShieldCheck,
} from "@phosphor-icons/react";
import type { SidebarTab } from "../components/Sidebar";

export type NavItem = {
  id: SidebarTab;
  label: string;
  keywords: string;
  group: string;
  icon: ReactNode;
};

export const NAV_ITEMS: NavItem[] = [
  { id: "dashboard", label: "لوحة التحكم", keywords: "رئيسية home dashboard", group: "الرئيسية", icon: <House size={18} weight="duotone" /> },
  { id: "pos", label: "نقطة البيع", keywords: "بيع pos checkout", group: "الرئيسية", icon: <Storefront size={18} weight="duotone" /> },
  { id: "shifts", label: "الورديات", keywords: "وردية shift z-report", group: "الرئيسية", icon: <ClockAfternoon size={18} weight="duotone" /> },
  { id: "orders", label: "التوصيل", keywords: "طلبات delivery", group: "المبيعات", icon: <Truck size={18} weight="duotone" /> },
  { id: "invoices", label: "المبيعات المنفذة", keywords: "فواتير invoices sales", group: "المبيعات", icon: <FileText size={18} weight="duotone" /> },
  { id: "returns", label: "المرتجعات", keywords: "مرتجع refund return", group: "المبيعات", icon: <ArrowUUpLeft size={18} weight="duotone" /> },
  { id: "customers", label: "العملاء", keywords: "عملاء customers ديون", group: "المبيعات", icon: <Users size={18} weight="duotone" /> },
  { id: "inventory", label: "المخزون", keywords: "مخزون stock inventory", group: "المخزون", icon: <Package size={18} weight="duotone" /> },
  { id: "purchases", label: "المشتريات", keywords: "شراء suppliers مورد", group: "المخزون", icon: <Handshake size={18} weight="duotone" /> },
  { id: "expenses", label: "المصروفات", keywords: "مصروف expense", group: "المالية", icon: <Receipt size={18} weight="duotone" /> },
  { id: "ops", label: "عروض وتدقيق", keywords: "promo audit عروض", group: "الإدارة", icon: <ShieldCheck size={18} weight="duotone" /> },
  { id: "reports", label: "التقارير", keywords: "تقارير analytics reports", group: "الإدارة", icon: <ChartBar size={18} weight="duotone" /> },
  { id: "settings", label: "الإعدادات", keywords: "settings إعدادات sync", group: "الإدارة", icon: <GearSix size={18} weight="duotone" /> },
];

export const NAV_GROUPS = [...new Set(NAV_ITEMS.map((i) => i.group))];

export function navTabLabel(id: string): string {
  return NAV_ITEMS.find((item) => item.id === id)?.label ?? "شاشة";
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingCart,
  Users,
  Package,
  Receipt,
  BarChart3,
  Shield,
  MessageSquare,
  ChevronDown,
  UserCircle,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";

type NavItem = { href: string; label: string };
type NavGroup = { title: string; icon: React.ReactNode; items: NavItem[] };

const groups: NavGroup[] = [
  {
    title: "Sales",
    icon: <ShoppingCart className="w-4 h-4" />,
    items: [
      { href: "/sales/pos",          label: "POS" },
      { href: "/sales/list",         label: "Sales List" },
      { href: "/sales/holds",        label: "Hold Orders" },
    ],
  },
  {
    title: "Customers",
    icon: <Users className="w-4 h-4" />,
    items: [
      { href: "/customers/new",    label: "New Customer" },
      { href: "/customers/list",   label: "Customer List" },
      { href: "/customers/import", label: "Import Customers" },
    ],
  },
  {
    title: "Items",
    icon: <Package className="w-4 h-4" />,
    items: [
      { href: "/items/new",             label: "New Item" },
      { href: "/items/list",            label: "Item List" },
      { href: "/items/categories/new",  label: "New Service" },
      { href: "/items/categories/list", label: "Services List" },
      { href: "/items/brands/new",      label: "New Laundry Type" },
      { href: "/items/brands/list",     label: "Laundry Types List" },
      // { href: "/items/labels",          label: "Print Labels" },
      { href: "/items/import",          label: "Import Items" },
    ],
  },
  {
    title: "Expenses",
    icon: <Receipt className="w-4 h-4" />,
    items: [
      { href: "/expenses/new",             label: "New Expense" },
      { href: "/expenses/list",            label: "Expense List" },
      { href: "/expenses/categories/new",  label: "New Category" },
      { href: "/expenses/categories/list", label: "Category List" },
    ],
  },
  {
    title: "Reports",
    icon: <BarChart3 className="w-4 h-4" />,
    items: [
      { href: "/reports/item-sales",     label: "Item Sales Report" },
      { href: "/reports/sales",          label: "Sales Report" },
      { href: "/reports/sales-payments", label: "Sales Payments Report" },
      { href: "/reports/expense",        label: "Expense Report" },
      { href: "/reports/other-charges",  label: "Other Charges Report" },
    ],
  },
  {
    title: "SMS",
    icon: <MessageSquare className="w-4 h-4" />,
    items: [
      { href: "/sms/log",       label: "Message Log"       },
      { href: "/sms/customers", label: "Customer Sync"    },
      { href: "/sms/events",    label: "Event Manager"    },
      { href: "/sms/templates", label: "Templates"         },
      { href: "/sms/birthdays", label: "Customer Birthday" },
    ],
  },
  {
    title: "Users",
    icon: <Shield className="w-4 h-4" />,
    items: [
      { href: "/users/new",   label: "New User" },
      { href: "/users/list",  label: "Users List" },
      { href: "/users/roles", label: "Roles List" },
    ],
  },
  {
    title: "Profile Settings",
    icon: <UserCircle className="w-4 h-4" />,
    items: [
      { href: "/profile", label: "Edit Profile" },
    ],
  },
];

function NavSection({ group, onNavigate }: { group: NavGroup; onNavigate?: () => void }) {
  const pathname = usePathname();
  const active = group.items.some(
    (i) => pathname === i.href || pathname?.startsWith(i.href + "/")
  );
  const [open, setOpen] = useState(active);

  return (
    <div className="mb-1">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        style={{
          color: active ? "#ffffff" : "var(--sidebar-text)",
          background: active ? "var(--sidebar-active-bg)" : "transparent",
        }}
        className="nav-section-button w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors hover:bg-white/10"
      >
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-white/8 ring-1 ring-white/8">{group.icon}</span>
        <span className="flex-1 text-left">{group.title}</span>
        <ChevronDown className={`w-3.5 h-3.5 opacity-60 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="mt-1 ml-5 pl-3 border-l border-teal-300/25 space-y-0.5 pb-1.5">
          {group.items.map((item) => {
            const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                style={{
                  color: isActive ? "#ffffff" : "var(--sidebar-subtext)",
                  background: isActive ? "var(--sidebar-sub-active-bg)" : "transparent",
                }}
                className="block py-1.5 px-2.5 rounded-lg text-xs font-medium transition-colors hover:bg-white/10 hover:text-white"
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function AppSidebar() {
  const pathname = usePathname();
  const dashActive = pathname === "/dashboard";
  const [mobileOpen, setMobileOpen] = useState(false);
  const closeMobile = () => setMobileOpen(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="fixed left-3 top-3 z-50 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/20 text-white shadow-lg lg:hidden"
        style={{ background: "var(--sidebar-bg-solid)" }}
        aria-label="Open navigation"
      >
        <Menu className="h-5 w-5" />
      </button>

      {mobileOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-slate-950/55 backdrop-blur-sm lg:hidden"
          onClick={closeMobile}
          aria-label="Close navigation overlay"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-dvh w-[18rem] shrink-0 flex-col border-r border-white/10 shadow-2xl transition-transform duration-300 lg:static lg:z-auto lg:w-72 lg:translate-x-0 lg:shadow-none ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ background: "var(--sidebar-bg)" }}
      >
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <Link href="/dashboard" onClick={closeMobile} className="flex min-w-0 items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white/12 text-lg font-black text-white ring-1 ring-white/15">
              LP
            </span>
            <div className="min-w-0">
              <div className="truncate text-lg font-extrabold tracking-tight text-white">LaundryPro</div>
              <div className="truncate text-[11px] font-semibold uppercase tracking-[0.18em] text-white/50">Management suite</div>
            </div>
          </Link>
          <button
            type="button"
            onClick={closeMobile}
            className="rounded-lg p-2 text-white/70 hover:bg-white/10 hover:text-white lg:hidden"
            aria-label="Close navigation"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 space-y-0.5 sidebar-scroll">
          <div className="px-3 pb-2 pt-1 text-[10px] font-bold uppercase tracking-[0.22em] text-white/38">
            Main menu
          </div>
          <Link
            href="/dashboard"
            onClick={closeMobile}
            style={{
              color: dashActive ? "#ffffff" : "var(--sidebar-text)",
              background: dashActive ? "var(--sidebar-active-bg)" : "rgba(255,255,255,0.06)",
            }}
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold mb-2 transition-colors hover:bg-white/10"
          >
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-white/8 ring-1 ring-white/8">
              <LayoutDashboard className="w-4 h-4 opacity-80" />
            </span>
            Dashboard
          </Link>
          {groups.map((g) => (
            <NavSection key={g.title} group={g} onNavigate={closeMobile} />
          ))}
        </nav>

        <div className="border-t border-white/10 p-3 text-[11px] text-white/45">
          Built for fast daily operations
        </div>
      </aside>
    </>
  );
}

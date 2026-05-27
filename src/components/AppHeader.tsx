"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, Moon, Sun, UserCircle } from "lucide-react";
import { setToken } from "@/lib/api";
import { useTheme } from "./ThemeProvider";

const GROUPS: { title: string; items: { href: string; label: string }[] }[] = [
  {
    title: "Sales",
    items: [
      { href: "/sales/pos", label: "POS" },
      { href: "/sales/list", label: "Sales List" },
      { href: "/sales/holds", label: "Hold Orders" },
    ],
  },
  {
    title: "Customers",
    items: [
      { href: "/customers/new", label: "New Customer" },
      { href: "/customers/list", label: "Customer List" },
      { href: "/customers/import", label: "Import Customers" },
    ],
  },
  {
    title: "Items",
    items: [
      { href: "/items/new", label: "New Item" },
      { href: "/items/list", label: "Item List" },
      { href: "/items/categories/new", label: "New Service" },
      { href: "/items/categories/list", label: "Service List" },
      { href: "/items/brands/new", label: "New Laundry Type" },
      { href: "/items/brands/list", label: "Laundry Type List" },
      { href: "/items/labels", label: "Print Labels" },
      { href: "/items/import", label: "Import Items" },
    ],
  },
  {
    title: "Expenses",
    items: [
      { href: "/expenses/new", label: "New Expense" },
      { href: "/expenses/list", label: "Expense List" },
      { href: "/expenses/categories/new", label: "New Category" },
      { href: "/expenses/categories/list", label: "Category List" },
    ],
  },
  {
    title: "Reports",
    items: [
      { href: "/reports/item-sales", label: "Item Sales Report" },
      { href: "/reports/item-purchase", label: "Item Purchase Report" },
      { href: "/reports/sales", label: "Sales Report" },
      { href: "/reports/sales-payments", label: "Sales Payments Report" },
      { href: "/reports/expense", label: "Expense Report" },
    ],
  },
  {
    title: "SMS",
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
    items: [
      { href: "/users/new", label: "New User" },
      { href: "/users/list", label: "Users List" },
      { href: "/users/roles", label: "Roles List" },
    ],
  },
  {
    title: "Profile Settings",
    items: [{ href: "/profile", label: "Edit Profile" }],
  },
];

export function AppHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const { theme, toggle } = useTheme();

  const activeGroup = GROUPS.find((g) =>
    g.items.some((i) => pathname === i.href || pathname?.startsWith(i.href + "/"))
  );

  function logout() {
    setToken(null);
    router.replace("/login");
  }

  return (
    <header
      className="sticky top-0 z-30 shrink-0 border-b shadow-sm"
      style={{ background: "var(--header-bg)", borderColor: "var(--header-border)" }}
    >
      <div className="flex min-h-14 items-center justify-between gap-4 px-4 py-3 pl-16 backdrop-blur-md sm:min-h-20 sm:py-4 sm:px-6 lg:min-h-24 lg:px-8 lg:pl-8">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-extrabold tracking-tight sm:text-2xl lg:text-[28px]" style={{ color: "var(--foreground)" }}>
            {title}
          </h1>
          {subtitle && <p className="mt-1 text-sm font-medium" style={{ color: "var(--muted)" }}>{subtitle}</p>}
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={toggle}
            title={theme === "dark" ? "Switch to Light mode" : "Switch to Dark mode"}
            className="grid h-11 w-11 place-items-center rounded-2xl border transition-colors hover:scale-[1.02] active:scale-95"
            style={{ color: "var(--foreground2)", background: "var(--surface2)", borderColor: "var(--border)" }}
          >
            {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
          <Link
            href="/profile"
            className="grid h-11 w-11 place-items-center rounded-2xl border transition-colors hover:scale-[1.02] active:scale-95"
            title="Profile Settings"
            style={{ color: "var(--foreground2)", background: "var(--surface2)", borderColor: "var(--border)" }}
          >
            <UserCircle className="h-6 w-6" />
          </Link>
          <button
            type="button"
            onClick={logout}
            className="inline-flex h-11 items-center gap-2 rounded-2xl border px-3 text-sm font-bold transition-colors hover:bg-rose-50 active:scale-95 dark:hover:bg-rose-950/30 sm:px-4"
            style={{ color: "var(--foreground2)", background: "var(--surface2)", borderColor: "var(--border)" }}
          >
            <LogOut className="h-5 w-5" />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </div>

      {activeGroup && (
        <div
          className="header-tabs flex items-center gap-2 overflow-x-auto px-4 pb-3 pl-16 sm:px-6 lg:px-8 lg:pl-8"
          style={{ borderTop: "1px solid var(--border)" }}
        >
          {activeGroup.items.map((item, idx) => {
            const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
            return (
              <span key={item.href} className="flex shrink-0 items-center gap-1">
                {idx > 0 && <span className="hidden text-xs opacity-30 sm:inline" style={{ color: "var(--muted)" }}>/</span>}
                <Link
                  href={item.href}
                  className="whitespace-nowrap rounded-full border px-4 py-2 text-xs font-bold transition-colors"
                  style={isActive
                    ? { background: "var(--accent)", borderColor: "var(--accent)", color: "#fff", fontWeight: 700 }
                    : { color: "var(--foreground2)", background: "var(--surface)", borderColor: "var(--border)" }
                  }
                >
                  {item.label}
                </Link>
              </span>
            );
          })}
        </div>
      )}
    </header>
  );
}

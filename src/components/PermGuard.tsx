"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { usePermissions } from "./PermissionsContext";

/**
 * Maps route prefixes to the permission key required to access them.
 * Checked in order — first match wins.
 * Routes NOT listed here are freely accessible (e.g. /profile).
 */
const ROUTE_PERMS: { prefix: string; perm: string | string[] }[] = [
  { prefix: "/dashboard",                    perm: "dashboard:view" },
  // Sales — specific before general
  { prefix: "/sales/pos",                    perm: ["sales:add", "sales:edit"] },
  { prefix: "/sales/holds",                  perm: "sales:holds" },
  { prefix: "/sales/returns",                perm: "sales:returns" },
  { prefix: "/sales/new",                    perm: "sales:add" },
  { prefix: "/sales/list",                   perm: "sales:view" },
  { prefix: "/sales/",                       perm: "sales:view" },
  // Customers
  { prefix: "/customers/new",                perm: "customers:add" },
  { prefix: "/customers/import",             perm: "customers:import" },
  { prefix: "/customers/",                   perm: "customers:view" },
  // Items
  { prefix: "/items/new",                    perm: "items:add" },
  { prefix: "/items/import",                 perm: "items:import" },
  { prefix: "/items/categories/new",         perm: "item-categories:add" },
  { prefix: "/items/categories/",            perm: "item-categories:view" },
  { prefix: "/items/brands/new",             perm: "item-brands:add" },
  { prefix: "/items/brands/",                perm: "item-brands:view" },
  { prefix: "/items/",                       perm: "items:view" },
  // Expenses
  { prefix: "/expenses/new",                 perm: "expenses:add" },
  { prefix: "/expenses/categories/new",      perm: "expense-categories:add" },
  { prefix: "/expenses/categories/",         perm: "expense-categories:view" },
  { prefix: "/expenses/",                    perm: "expenses:view" },
  // Reports — specific before general
  { prefix: "/reports/item-sales",           perm: "reports:item-sales" },
  { prefix: "/reports/sales-payments",       perm: "reports:sales-payments" },
  { prefix: "/reports/sales",                perm: "reports:sales" },
  { prefix: "/reports/expense",              perm: "reports:expense" },
  { prefix: "/reports/other-charges",        perm: "reports:other-charges" },
  // SMS
  { prefix: "/sms/",                         perm: "sms:view" },
  // Users
  { prefix: "/users/new",                    perm: "users:add" },
  { prefix: "/users/roles",                  perm: "roles:view" },
  { prefix: "/users/",                       perm: "users:view" },
];

function getRequiredPerm(pathname: string): string | string[] | null {
  for (const { prefix, perm } of ROUTE_PERMS) {
    if (pathname === prefix || pathname.startsWith(prefix)) return perm;
  }
  return null; // no restriction
}

export function PermGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const { hasPermission } = usePermissions();

  const requiredPerm = getRequiredPerm(pathname);
  const allowed =
    !requiredPerm ||
    (Array.isArray(requiredPerm)
      ? requiredPerm.some((p) => hasPermission(p))
      : hasPermission(requiredPerm));

  useEffect(() => {
    if (!allowed) router.replace("/dashboard");
  }, [allowed, router]);

  if (!allowed) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 text-center px-4">
        <div className="w-16 h-16 rounded-full bg-red-50 border border-red-100 flex items-center justify-center">
          <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 9v4m0 4h.01M5.07 19h13.86c1.54 0 2.5-1.67 1.73-3L13.73 4c-.77-1.33-2.69-1.33-3.46 0L3.34 16c-.77 1.33.19 3 1.73 3z" />
          </svg>
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-700">Access Denied</h2>
          <p className="mt-1 text-sm text-slate-500 max-w-xs">
            You don&apos;t have permission to access this page. Contact your administrator.
          </p>
        </div>
        <button
          type="button"
          onClick={() => router.push("/dashboard")}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  return <>{children}</>;
}

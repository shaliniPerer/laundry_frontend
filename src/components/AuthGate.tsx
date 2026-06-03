"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getToken, api } from "@/lib/api";
import { PermissionsContext } from "./PermissionsContext";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [permissions, setPermissions] = useState<string[] | null>(null);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    api<{ permissions?: string[] | null }>("/api/auth/me").then((res) => {
      if (!res.ok) {
        router.replace("/login");
        return;
      }
      // null = superadmin (no role assigned → full access)
      // array = restricted to the listed permission keys
      const perms = res.data?.permissions;
      setPermissions(perms === undefined ? null : perms);
      setReady(true);
    });
  }, [router]);

  const hasPermission = (key: string): boolean => {
    if (permissions === null) return true;
    return permissions.includes(key);
  };

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] text-[var(--muted)]">
        Loading…
      </div>
    );
  }

  return (
    <PermissionsContext.Provider value={{ permissions, hasPermission }}>
      {children}
    </PermissionsContext.Provider>
  );
}

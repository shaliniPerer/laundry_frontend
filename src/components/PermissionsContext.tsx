"use client";

import { createContext, useContext } from "react";

export interface PermissionsContextValue {
  /** null = superadmin (no role assigned → full access). Array = restricted to listed keys. */
  permissions: string[] | null;
  hasPermission: (key: string) => boolean;
}

export const PermissionsContext = createContext<PermissionsContextValue>({
  permissions: null,
  hasPermission: () => true,
});

export function usePermissions() {
  return useContext(PermissionsContext);
}

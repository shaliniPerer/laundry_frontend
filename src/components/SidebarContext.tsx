"use client";

import { createContext, useContext, useEffect, useState } from "react";

type SidebarCtxType = { open: boolean; toggle: () => void };
const SidebarCtx = createContext<SidebarCtxType>({ open: true, toggle: () => {} });

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("sidebar_open");
    if (stored !== null) setOpen(stored === "true");
  }, []);

  function toggle() {
    setOpen((prev) => {
      const next = !prev;
      localStorage.setItem("sidebar_open", String(next));
      return next;
    });
  }

  return <SidebarCtx.Provider value={{ open, toggle }}>{children}</SidebarCtx.Provider>;
}

export function useSidebar() {
  return useContext(SidebarCtx);
}

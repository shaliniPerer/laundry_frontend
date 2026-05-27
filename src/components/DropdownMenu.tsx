"use client";

import { useEffect, useRef, useState, ReactNode } from "react";
import { createPortal } from "react-dom";
import { ChevronDown } from "lucide-react";

/**
 * A portal-based dropdown that always renders outside any overflow container,
 * so it is never clipped by table wrappers. Opens above or below the button
 * based on available viewport space.
 */
export function DropdownMenu({
  label = "Action",
  buttonClassName,
  children,
}: {
  label?: string;
  buttonClassName?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});

  function handleToggle(e: React.MouseEvent) {
    e.stopPropagation();
    if (open) { setOpen(false); return; }
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      const MENU_MAX_H = 320;
      const spaceBelow = window.innerHeight - rect.bottom;
      if (spaceBelow >= MENU_MAX_H || spaceBelow >= rect.top) {
        // open downward
        setMenuStyle({ top: rect.bottom + 2, right: window.innerWidth - rect.right });
      } else {
        // open upward
        setMenuStyle({ bottom: window.innerHeight - rect.top + 2, right: window.innerWidth - rect.right });
      }
    }
    setOpen(true);
  }

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (
        !menuRef.current?.contains(e.target as Node) &&
        !btnRef.current?.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Close on any scroll (table or window)
  useEffect(() => {
    if (!open) return;
    const handler = () => setOpen(false);
    window.addEventListener("scroll", handler, true);
    return () => window.removeEventListener("scroll", handler, true);
  }, [open]);

  const defaultBtnCls =
    "bg-teal-500 hover:bg-teal-600 text-white text-xs font-semibold px-3 py-1.5 rounded inline-flex items-center gap-1 transition-colors";

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={handleToggle}
        className={buttonClassName ?? defaultBtnCls}
      >
        {label} <ChevronDown className="w-3 h-3" />
      </button>

      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={menuRef}
            style={{ position: "fixed", zIndex: 9999, minWidth: 176, ...menuStyle }}
            className="dropdown-portal rounded-md shadow-xl py-1"
            onClick={() => setOpen(false)}
          >
            {children}
          </div>,
          document.body
        )}
    </>
  );
}

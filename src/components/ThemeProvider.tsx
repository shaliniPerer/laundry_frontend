"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";

const ThemeCtx = createContext<{ theme: Theme; toggle: () => void }>({
  theme: "light",
  toggle: () => {},
});

// Inline script injected before hydration so the <html> class is set
// before React renders, avoiding hydration mismatch entirely.
const themeScript = `
(function(){
  try {
    var t = localStorage.getItem('theme');
    if (t === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  } catch(e){}
})();
`;

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");

  // Sync state with what the script already applied to the DOM
  useEffect(() => {
    const saved = (localStorage.getItem("theme") ?? "light") as Theme;
    setTheme(saved);
  }, []);

  function toggle() {
    setTheme((prev) => {
      const next: Theme = prev === "light" ? "dark" : "light";
      localStorage.setItem("theme", next);
      document.documentElement.classList.toggle("dark", next === "dark");
      return next;
    });
  }

  return (
    <>
      {/* Blocking script runs before React hydrates — no flash, no mismatch */}
      <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      <ThemeCtx.Provider value={{ theme, toggle }}>{children}</ThemeCtx.Provider>
    </>
  );
}

export function useTheme() {
  return useContext(ThemeCtx);
}


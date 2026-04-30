import { AuthGate } from "@/components/AuthGate";
import { AppSidebar } from "@/components/AppSidebar";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGate>
      <div className="app-shell flex h-dvh overflow-hidden" style={{ background: "var(--bg)" }}>
        <AppSidebar />
        <main
          className="app-content flex-1 flex flex-col min-w-0 h-dvh overflow-y-auto overflow-x-hidden overscroll-contain"
          style={{ background: "var(--bg)", color: "var(--foreground)" }}
        >
          {children}
        </main>
      </div>
    </AuthGate>
  );
}

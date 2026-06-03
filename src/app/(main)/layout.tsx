import { AuthGate } from "@/components/AuthGate";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider } from "@/components/SidebarContext";
import { PermGuard } from "@/components/PermGuard";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGate>
      <SidebarProvider>
        <div className="app-shell flex h-dvh overflow-hidden" style={{ background: "var(--bg)" }}>
          <AppSidebar />
          <main
            className="app-content flex-1 flex flex-col min-w-0 h-dvh overflow-y-auto overflow-x-hidden overscroll-contain"
            style={{ background: "var(--bg)", color: "var(--foreground)" }}
          >
            <PermGuard>
              {children}
            </PermGuard>
          </main>
        </div>
      </SidebarProvider>
    </AuthGate>
  );
}

import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router";
import { ThemeProvider } from "next-themes";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { Toaster } from "@/components/ui/sonner";
import { AuthGate } from "@/components/auth/AuthGate";
import Dashboard from "@/pages/Dashboard";
import { PartDetailModal } from "@/components/PartDetailModal";
import { AddPartModal } from "@/components/AddPartModal";
import { useUiStore } from "@/store/uiStore";

const Step3DViewerModal = lazy(() => import("@/components/Step3DViewerModal"));

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL || "https://fake-url-for-build.convex.cloud");

function LazyViewer() {
  const isOpen = useUiStore((s) => s.is3DViewerOpen);
  if (!isOpen) return null;
  return (
    <Suspense fallback={null}>
      <Step3DViewerModal />
    </Suspense>
  );
}

export default function App() {
  return (
    <ConvexProvider client={convex}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
        <AuthGate>
          <BrowserRouter>
            <main className="min-h-screen bg-background text-foreground font-sans antialiased">
              <Routes>
                <Route path="/" element={<Dashboard />} />
              </Routes>

              <PartDetailModal />
              <AddPartModal />
              <LazyViewer />
            </main>
            <Toaster position="top-center" richColors />
          </BrowserRouter>
        </AuthGate>
      </ThemeProvider>
    </ConvexProvider>
  );
}

import { BrowserRouter, Routes, Route } from "react-router";
import { ThemeProvider } from "next-themes";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { Toaster } from "@/components/ui/sonner";
import { AuthGate } from "@/components/auth/AuthGate";
import Dashboard from "@/pages/Dashboard";
import { PartDetailModal } from "@/components/PartDetailModal";
import { AddPartModal } from "@/components/AddPartModal";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL || "https://fake-url-for-build.convex.cloud");

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
            </main>
            <Toaster position="top-center" richColors />
          </BrowserRouter>
        </AuthGate>
      </ThemeProvider>
    </ConvexProvider>
  );
}

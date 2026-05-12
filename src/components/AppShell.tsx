import { NavLink, Outlet } from "react-router";
import { cn } from "@/lib/utils";

function navLinkClass({ isActive }: { isActive: boolean }) {
  return cn(
    "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
    isActive
      ? "bg-primary text-primary-foreground shadow-sm"
      : "text-muted-foreground hover:bg-muted hover:text-foreground"
  );
}

export function AppShell() {
  return (
    <>
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4 md:px-8">
          <span className="text-sm font-semibold tracking-tight text-foreground">
            1923parts
          </span>
          <nav className="flex flex-wrap gap-1">
            <NavLink to="/" end className={navLinkClass}>
              Inventory
            </NavLink>
            <NavLink to="/binning" className={navLinkClass}>
              Binning
            </NavLink>
          </nav>
        </div>
      </header>
      <Outlet />
    </>
  );
}

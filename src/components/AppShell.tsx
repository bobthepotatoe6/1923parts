import { NavLink, Outlet, useLocation } from "react-router";
import { cn } from "@/lib/utils";

export function AppShell() {
  const { pathname } = useLocation();
  const isBinning = pathname.startsWith("/binning");

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4 md:px-8">
          <span className="text-sm font-semibold tracking-tight text-foreground">
            1923parts
          </span>
          <nav
            className="relative inline-flex rounded-xl bg-muted/60 p-1 ring-1 ring-border/50"
            aria-label="Primary"
          >
            <span
              aria-hidden
              className={cn(
                "pointer-events-none absolute top-1 bottom-1 left-1 w-[calc(50%-0.375rem)] rounded-lg bg-primary shadow-sm",
                "transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none will-change-transform"
              )}
              style={{
                transform: isBinning
                  ? "translateX(calc(100% + 0.25rem))"
                  : "translateX(0)",
              }}
            />
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                cn(
                  "relative z-10 min-w-[5.75rem] flex-1 rounded-md px-3 py-2 text-center text-sm font-medium transition-colors duration-200",
                  isActive
                    ? "text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )
              }
            >
              Inventory
            </NavLink>
            <NavLink
              to="/binning"
              className={({ isActive }) =>
                cn(
                  "relative z-10 min-w-[5.75rem] flex-1 rounded-md px-3 py-2 text-center text-sm font-medium transition-colors duration-200",
                  isActive
                    ? "text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )
              }
            >
              Binning
            </NavLink>
          </nav>
        </div>
      </header>
      <Outlet />
    </>
  );
}

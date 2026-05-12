
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Clock } from "lucide-react";
import { Link } from "react-router";

export default function Ledger() {
  const history = useQuery(api.parts.getGlobalHistory, { limit: 100 });

  return (
    <div className="mx-auto max-w-4xl p-4 md:p-8 space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <Link to="/">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">History Ledger</h1>
          <p className="text-muted-foreground">Recent inventory transactions and updates.</p>
        </div>
      </div>

      <div className="rounded-xl border bg-card shadow-sm p-4 md:p-6">
        {history === undefined ? (
          <div className="space-y-4 animate-pulse">
            {[1, 2, 3, 4, 5].map((n) => (
              <div key={n} className="h-16 rounded-lg bg-muted/50 border"></div>
            ))}
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No history events found.
          </div>
        ) : (
          <div className="space-y-4 relative before:absolute before:inset-0 before:ml-2 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
            {history.map((record) => (
              <div key={record._id} className="relative flex items-center justify-between gap-4 md:justify-normal md:odd:flex-row-reverse group is-active">
                <div className="flex items-center justify-center w-6 h-6 rounded-full border border-background bg-primary shrink-0 md:order-1 shadow">
                  <span className="sr-only">Event</span>
                </div>
                <div className="w-full rounded-lg border bg-card p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="font-semibold text-foreground flex items-center gap-2">
                      <span className="bg-muted px-2 py-0.5 rounded text-xs font-mono">{record.partVendor}</span>
                      {record.partName}
                    </h4>
                    <p className="text-sm font-medium mt-1">
                      {record.change > 0 ? (
                        <span className="text-green-600 dark:text-green-500">Added {record.change}</span>
                      ) : record.change < 0 ? (
                        <span className="text-red-600 dark:text-red-500">Removed {Math.abs(record.change)}</span>
                      ) : (
                        <span className="text-blue-600 dark:text-blue-500">Updated</span>
                      )}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">{record.reason}</p>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0 sm:self-start">
                    <Clock className="h-3.5 w-3.5" />
                    {new Date(record.timestamp).toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

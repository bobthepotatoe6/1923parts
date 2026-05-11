import React, { useState } from "react";
import { useUiStore } from "@/store/uiStore";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Shield } from "lucide-react";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useUiStore((state) => state.isAuthenticated);
  const setAuthenticated = useUiStore((state) => state.setAuthenticated);
  const verifyPassword = useMutation(api.auth.verifyPassword);
  
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;
    
    setLoading(true);
    try {
      const result = await verifyPassword({ password });
      if (result.success) {
        setAuthenticated(true);
        toast.success("Access Granted");
      } else {
        toast.error(result.error || "Incorrect password");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to authenticate");
    } finally {
      setLoading(false);
    }
  };

  if (isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm rounded-xl border bg-card p-8 shadow-lg">
        <div className="mb-8 flex flex-col items-center space-y-2 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/20">
            <Shield className="h-6 w-6 text-accent" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            1923parts
          </h1>
          <p className="text-sm text-muted-foreground">
            Enter the shared team password to access the inventory.
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <Input
              type="password"
              placeholder="Team Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              className="h-12 w-full text-lg"
              autoFocus
            />
          </div>
          <Button 
            type="submit" 
            className="h-12 w-full text-base" 
            disabled={loading}
          >
            {loading ? "Verifying..." : "Unlock"}
          </Button>
        </form>
      </div>
    </div>
  );
}

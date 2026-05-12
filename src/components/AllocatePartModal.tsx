import React, { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useUiStore } from "@/store/uiStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";

export function AllocatePartModal() {
  const isAllocateModalOpen = useUiStore((state) => state.isAllocateModalOpen);
  const setAllocateModalOpen = useUiStore((state) => state.setAllocateModalOpen);
  const selectedPartId = useUiStore((state) => state.selectedPartId);

  const allocatePart = useMutation(api.allocations.allocatePart);
  const part = useQuery(
    api.parts.getPart,
    selectedPartId ? { id: selectedPartId as any } : "skip"
  );

  const [quantity, setQuantity] = useState<number | "">("");
  const [purpose, setPurpose] = useState("");
  const [allocatedBy, setAllocatedBy] = useState("");
  const [loading, setLoading] = useState(false);

  if (!selectedPartId || !part) return null;

  const availableQuantity = part.quantity - (part.allocatedQuantity ?? 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quantity || quantity <= 0) return toast.error("Quantity must be greater than 0");
    if (quantity > availableQuantity) return toast.error(`Only ${availableQuantity} parts available`);
    if (!purpose.trim()) return toast.error("Purpose is required");
    if (!allocatedBy.trim()) return toast.error("Your Name is required");

    setLoading(true);
    try {
      await allocatePart({
        partId: selectedPartId as any,
        quantity: Number(quantity),
        purpose: purpose.trim(),
        allocatedBy: allocatedBy.trim(),
      });
      
      toast.success(`Allocated ${quantity} parts for ${purpose}`);
      setAllocateModalOpen(false);
      setQuantity("");
      setPurpose("");
      setAllocatedBy("");
    } catch (error: any) {
      toast.error(error.message || "Failed to allocate part");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isAllocateModalOpen} onOpenChange={setAllocateModalOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Allocate Part</DialogTitle>
          <DialogDescription>
            Reserve parts for a specific subsystem or project.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4 space-y-4">
          <div className="flex justify-between items-center bg-muted/30 p-3 rounded-lg border">
            <span className="text-sm font-medium">{part.name}</span>
            <span className="text-sm font-bold text-green-600 dark:text-green-500">
              {availableQuantity} Available
            </span>
          </div>

          <form id="allocate-form" onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Quantity to Allocate</label>
              <Input
                type="number"
                min="1"
                max={availableQuantity}
                placeholder="e.g. 4"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value === "" ? "" : Number(e.target.value))}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Purpose</label>
              <Input
                placeholder="e.g. Shooter Prototype, Intake v2"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Your Name</label>
              <Input
                placeholder="e.g. John Doe"
                value={allocatedBy}
                onChange={(e) => setAllocatedBy(e.target.value)}
                required
              />
            </div>
          </form>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setAllocateModalOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" form="allocate-form" disabled={loading || availableQuantity <= 0}>
            {loading ? "Allocating..." : "Allocate"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

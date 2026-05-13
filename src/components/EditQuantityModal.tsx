import React, { useState, useEffect } from "react";
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

export function EditQuantityModal() {
  const isEditQuantityModalOpen = useUiStore((state) => state.isEditQuantityModalOpen);
  const setEditQuantityModalOpen = useUiStore((state) => state.setEditQuantityModalOpen);
  const selectedPartId = useUiStore((state) => state.selectedPartId);

  const updateQuantity = useMutation(api.parts.updateQuantity);
  const part = useQuery(
    api.parts.getPart,
    selectedPartId ? { id: selectedPartId as any } : "skip"
  );

  const [quantity, setQuantity] = useState<number | "">("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isEditQuantityModalOpen && part) {
      setQuantity(part.quantity);
      setReason("");
    }
  }, [isEditQuantityModalOpen, part]);

  if (!selectedPartId || !part) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (quantity === "" || quantity < 0) return toast.error("Quantity must be a positive number or 0");

    const change = Number(quantity) - part.quantity;
    if (change === 0) {
      setEditQuantityModalOpen(false);
      return;
    }

    setLoading(true);
    try {
      await updateQuantity({
        id: selectedPartId as any,
        change,
        reason: reason.trim() || "Manual quantity edit",
      });
      
      toast.success(`Quantity updated successfully`);
      setEditQuantityModalOpen(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to update quantity");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isEditQuantityModalOpen} onOpenChange={setEditQuantityModalOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Shelf Quantity</DialogTitle>
          <DialogDescription>
            Update the unbinned quantity directly for large changes.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4 space-y-4">
          <div className="flex justify-between items-center bg-muted/30 p-3 rounded-lg border">
            <span className="text-sm font-medium">{part.name}</span>
            <span className="text-sm font-bold text-blue-600 dark:text-blue-500">
              Current: {part.quantity}
            </span>
          </div>

          <form id="edit-quantity-form" onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">New Quantity</label>
              <Input
                type="number"
                min="0"
                placeholder="e.g. 100"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value === "" ? "" : Number(e.target.value))}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Reason (Optional)</label>
              <Input
                placeholder="e.g. Inventory count adjustment"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
          </form>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setEditQuantityModalOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" form="edit-quantity-form" disabled={loading}>
            {loading ? "Saving..." : "Save"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

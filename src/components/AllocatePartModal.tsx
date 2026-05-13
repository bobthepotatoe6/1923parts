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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

type AllocationType = "description" | "bin";

export function AllocatePartModal() {
  const isAllocateModalOpen = useUiStore((state) => state.isAllocateModalOpen);
  const setAllocateModalOpen = useUiStore((state) => state.setAllocateModalOpen);
  const selectedPartId = useUiStore((state) => state.selectedPartId);

  const allocatePart = useMutation(api.allocations.allocatePart);
  const addToBin = useMutation(api.bins.addToBin);
  const part = useQuery(
    api.parts.getPart,
    selectedPartId ? { id: selectedPartId as any } : "skip"
  );
  const bins = useQuery(api.bins.listBins);

  const [allocationType, setAllocationType] = useState<AllocationType>("description");
  const [quantity, setQuantity] = useState<number | "">("");
  const [purpose, setPurpose] = useState("");
  const [allocatedBy, setAllocatedBy] = useState("");
  const [selectedBinId, setSelectedBinId] = useState("");
  const [loading, setLoading] = useState(false);

  if (!selectedPartId || !part) return null;

  const availableQuantity = part.quantity - (part.allocatedQuantity ?? 0);

  const resetForm = () => {
    setQuantity("");
    setPurpose("");
    setAllocatedBy("");
    setSelectedBinId("");
    setAllocationType("description");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quantity || quantity <= 0) return toast.error("Quantity must be greater than 0");
    if (quantity > availableQuantity) return toast.error(`Only ${availableQuantity} parts available`);

    if (allocationType === "bin") {
      if (!selectedBinId) return toast.error("Please select a bin");

      setLoading(true);
      try {
        await addToBin({
          binId: selectedBinId as any,
          partId: selectedPartId as any,
          quantity: Number(quantity),
        });
        const binName = bins?.find((b: any) => b._id === selectedBinId)?.name ?? "bin";
        toast.success(`Moved ${quantity} to ${binName}`);
        setAllocateModalOpen(false);
        resetForm();
      } catch (error: any) {
        toast.error(error.message || "Failed to add to bin");
      } finally {
        setLoading(false);
      }
    } else {
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
        resetForm();
      } catch (error: any) {
        toast.error(error.message || "Failed to allocate part");
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <Dialog open={isAllocateModalOpen} onOpenChange={(open) => { setAllocateModalOpen(open); if (!open) resetForm(); }}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Allocate Part</DialogTitle>
          <DialogDescription>
            Reserve parts for a bin or a specific purpose.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4 space-y-4">
          <div className="flex justify-between items-center bg-muted/30 p-3 rounded-lg border">
            <span className="text-sm font-medium">{part.name}</span>
            <span className="text-sm font-bold text-green-600 dark:text-green-500">
              {availableQuantity} Available
            </span>
          </div>

          {/* Allocation Type Selector */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant={allocationType === "description" ? "default" : "outline"}
              size="sm"
              className="flex-1"
              onClick={() => setAllocationType("description")}
            >
              To Description
            </Button>
            <Button
              type="button"
              variant={allocationType === "bin" ? "default" : "outline"}
              size="sm"
              className="flex-1"
              onClick={() => setAllocationType("bin")}
            >
              To Bin
            </Button>
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

            {allocationType === "bin" ? (
              <div className="space-y-2">
                <label className="text-sm font-medium">Destination Bin</label>
                <Select value={selectedBinId} onValueChange={(v) => setSelectedBinId(v ?? "")}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a bin..." />
                  </SelectTrigger>
                  <SelectContent>
                    {bins && bins.length > 0 ? (
                      bins.map((bin: any) => (
                        <SelectItem key={bin._id} value={bin._id}>
                          <span className="flex items-center gap-2">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: bin.color }}
                            />
                            {bin.name}
                          </span>
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="__none" disabled>
                        No bins available
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <>
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
              </>
            )}
          </form>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => { setAllocateModalOpen(false); resetForm(); }} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" form="allocate-form" disabled={loading || availableQuantity <= 0}>
            {loading ? "Allocating..." : allocationType === "bin" ? "Move to Bin" : "Allocate"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

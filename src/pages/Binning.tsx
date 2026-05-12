import React, { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PartPreview } from "@/components/PartPreview";
import {
  LayoutGrid,
  Minus,
  PackageOpen,
  Plus,
  Search,
  Trash2,
  Boxes,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const DEFAULT_BIN_COLOR = "#ff5ca3";

export default function Binning() {
  const bins = useQuery(api.bins.listBins);
  const [selectedBinId, setSelectedBinId] = useState<Id<"bins"> | null>(null);

  const detail = useQuery(
    api.bins.getBinWithItems,
    selectedBinId ? { binId: selectedBinId } : "skip"
  );

  const [newBinName, setNewBinName] = useState("");
  const [newBinColor, setNewBinColor] = useState(DEFAULT_BIN_COLOR);

  const createBin = useMutation(api.bins.createBin);
  const addToBin = useMutation(api.bins.addToBin);
  const updateBinItemQuantity = useMutation(api.bins.updateBinItemQuantity);
  const removeBinItem = useMutation(api.bins.removeBinItem);
  const deleteBin = useMutation(api.bins.deleteBin);

  const [addPartsOpen, setAddPartsOpen] = useState(false);
  const [partSearch, setPartSearch] = useState("");
  const [debouncedPartSearch, setDebouncedPartSearch] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedPartSearch(partSearch.trim()), 220);
    return () => clearTimeout(t);
  }, [partSearch]);

  const searchResults = useQuery(
    api.parts.getParts,
    addPartsOpen && debouncedPartSearch.length > 0
      ? { search: debouncedPartSearch }
      : "skip"
  );

  const [qtyToAddByPart, setQtyToAddByPart] = useState<Record<string, number>>(
    {}
  );

  useEffect(() => {
    if (!addPartsOpen) {
      setPartSearch("");
      setDebouncedPartSearch("");
      setQtyToAddByPart({});
    }
  }, [addPartsOpen]);

  const qtyInSelectedBin = useMemo(() => {
    const m = new Map<string, number>();
    if (!detail?.items) return m;
    for (const row of detail.items) {
      m.set(row.part._id, row.quantity);
    }
    return m;
  }, [detail?.items]);

  const handleCreateBin = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newBinName.trim();
    if (!name) {
      toast.error("Enter a bin name");
      return;
    }
    try {
      const id = await createBin({ name, color: newBinColor });
      setNewBinName("");
      setNewBinColor(DEFAULT_BIN_COLOR);
      setSelectedBinId(id);
      toast.success("Bin created");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to create bin");
    }
  };

  const handleAddToBinRow = async (partId: Id<"parts">, partQty: number) => {
    if (!selectedBinId) return;
    const raw = qtyToAddByPart[partId] ?? 1;
    const inBin = qtyInSelectedBin.get(partId) ?? 0;
    const maxAdd = Math.max(0, partQty - inBin);
    const q = Math.min(Math.max(1, raw), Math.max(1, maxAdd));
    if (maxAdd <= 0) {
      toast.error("This part is already fully allocated to this bin.");
      return;
    }
    try {
      await addToBin({ binId: selectedBinId, partId, quantity: q });
      toast.success(`Added ${q} to bin`);
      setQtyToAddByPart((prev) => ({ ...prev, [partId]: 1 }));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Could not add to bin");
    }
  };

  const bumpQtyToAdd = (partId: string, delta: number, max: number) => {
    if (max <= 0) return;
    setQtyToAddByPart((prev) => {
      const cur = prev[partId] ?? 1;
      const next = Math.min(Math.max(1, cur + delta), max);
      return { ...prev, [partId]: next };
    });
  };

  const adjustQuantityInBin = async (
    binItemId: Id<"bin_items">,
    nextQty: number,
    inventoryQty: number
  ) => {
    if (nextQty < 1) {
      if (!window.confirm("Remove this part from the bin?")) return;
      try {
        await removeBinItem({ binItemId });
        toast.success("Removed from bin");
      } catch {
        toast.error("Could not remove");
      }
      return;
    }
    if (nextQty > inventoryQty) {
      toast.error(`Cannot exceed inventory (${inventoryQty}).`);
      return;
    }
    try {
      await updateBinItemQuantity({ binItemId, quantity: nextQty });
      toast.success("Quantity updated");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    }
  };

  const handleDeleteBin = async () => {
    if (!selectedBinId || !detail?.bin) return;
    if (
      !window.confirm(
        `Delete bin "${detail.bin.name}" and clear its contents?`
      )
    ) {
      return;
    }
    try {
      await deleteBin({ binId: selectedBinId });
      setSelectedBinId(null);
      toast.success("Bin deleted");
    } catch {
      toast.error("Could not delete bin");
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="mb-1 text-3xl font-bold tracking-tight">Binning</h1>
          <p className="text-muted-foreground">
            Organize inventory parts into labeled bins for storage and picking.
          </p>
        </div>
      </div>

      <section className="rounded-xl border border-border bg-card p-4 shadow-sm md:p-6">
        <div className="mb-4 flex items-center gap-2">
          <Boxes className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Create a bin</h2>
        </div>
        <form
          onSubmit={handleCreateBin}
          className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end"
        >
          <div className="min-w-[200px] flex-1 space-y-2">
            <Label htmlFor="bin-name">Name</Label>
            <Input
              id="bin-name"
              placeholder="e.g. Shelf A — Small fasteners"
              value={newBinName}
              onChange={(e) => setNewBinName(e.target.value)}
              className="h-11 shadow-sm"
            />
          </div>
          <div className="w-full space-y-2 sm:w-40">
            <Label htmlFor="bin-color">Color</Label>
            <input
              id="bin-color"
              type="color"
              value={newBinColor}
              onChange={(e) => setNewBinColor(e.target.value)}
              className="h-11 w-full cursor-pointer rounded-lg border border-input bg-background p-1 shadow-sm"
              title="Bin color"
            />
          </div>
          <Button type="submit" className="h-11 px-6 shadow-sm">
            <Plus className="mr-2 h-5 w-5" />
            Create bin
          </Button>
        </form>
      </section>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,280px)_1fr]">
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <LayoutGrid className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Bins</h2>
          </div>
          {bins === undefined ? (
            <div className="space-y-2">
              {[1, 2, 3].map((n) => (
                <div
                  key={n}
                  className="h-16 animate-pulse rounded-xl border bg-muted/40"
                />
              ))}
            </div>
          ) : bins.length === 0 ? (
            <div className="rounded-xl border border-dashed bg-muted/20 p-6 text-center text-sm text-muted-foreground">
              No bins yet. Create one above.
            </div>
          ) : (
            <ul className="flex flex-col gap-2">
              {bins.map((bin) => {
                const active = selectedBinId === bin._id;
                return (
                  <li key={bin._id}>
                    <button
                      type="button"
                      onClick={() => setSelectedBinId(bin._id)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-xl border bg-card p-3 text-left shadow-sm transition-colors",
                        active
                          ? "border-primary ring-2 ring-primary/25"
                          : "border-border hover:bg-muted/40"
                      )}
                    >
                      <span
                        className="h-10 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: bin.color }}
                        aria-hidden
                      />
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium">{bin.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {bin.partCount} part{bin.partCount === 1 ? "" : "s"} ·{" "}
                          {bin.unitCount} unit{bin.unitCount === 1 ? "" : "s"}
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="min-w-0 space-y-4">
          {!selectedBinId || detail === undefined ? (
            <div className="flex min-h-[240px] flex-col items-center justify-center rounded-xl border border-dashed bg-muted/15 px-6 py-16 text-center">
              <PackageOpen className="mb-3 h-11 w-11 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                {bins === undefined
                  ? "Loading…"
                  : "Select a bin to view contents and add parts."}
              </p>
            </div>
          ) : detail === null ? (
            <div className="rounded-xl border border-dashed bg-muted/15 p-8 text-center text-sm text-muted-foreground">
              This bin no longer exists.
            </div>
          ) : (
            <>
              <div
                className="rounded-xl border bg-card p-4 shadow-sm md:p-6"
                style={{
                  borderLeftWidth: 4,
                  borderLeftColor: detail.bin.color,
                }}
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h2 className="text-2xl font-bold tracking-tight">
                      {detail.bin.name}
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {detail.items.length} line
                      {detail.items.length === 1 ? "" : "s"} in this bin
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      className="h-11 px-5 shadow-sm"
                      onClick={() => setAddPartsOpen(true)}
                    >
                      <Plus className="mr-2 h-5 w-5" />
                      Add new parts
                    </Button>
                    <Button
                      variant="outline"
                      className="h-11 border-destructive/30 text-destructive hover:bg-destructive/10"
                      onClick={handleDeleteBin}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete bin
                    </Button>
                  </div>
                </div>
              </div>

              {detail.items.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-muted/15 py-16">
                  <p className="mb-4 max-w-sm text-center text-sm text-muted-foreground">
                    This bin is empty. Use{" "}
                    <span className="font-medium text-foreground">
                      Add new parts
                    </span>{" "}
                    to pull parts from inventory.
                  </p>
                  <Button
                    className="h-11 px-6 shadow-sm"
                    onClick={() => setAddPartsOpen(true)}
                  >
                    <Plus className="mr-2 h-5 w-5" />
                    Add new parts
                  </Button>
                </div>
              ) : (
                <div className="overflow-hidden rounded-md border border-border bg-card shadow-sm">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[88px]">Image</TableHead>
                        <TableHead>Part</TableHead>
                        <TableHead className="w-[200px] text-center">
                          In bin
                        </TableHead>
                        <TableHead className="w-[72px]" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detail.items.map((row) => (
                        <TableRow key={row._id}>
                          <TableCell className="py-2">
                            <PartPreview
                              partId={row.part._id}
                              stepFileUrl={row.part.stepFileUrl ?? null}
                            />
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{row.part.name}</div>
                            <div className="text-xs text-muted-foreground">
                              Inventory: {row.part.quantity}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div
                              className="flex items-center justify-center gap-2"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8 rounded-full"
                                onClick={() =>
                                  adjustQuantityInBin(
                                    row._id,
                                    row.quantity - 1,
                                    row.part.quantity
                                  )
                                }
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <span className="w-8 text-center font-semibold">
                                {row.quantity}
                              </span>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8 rounded-full"
                                disabled={row.quantity >= row.part.quantity}
                                onClick={() =>
                                  adjustQuantityInBin(
                                    row._id,
                                    row.quantity + 1,
                                    row.part.quantity
                                  )
                                }
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                              title="Remove from bin"
                              onClick={() =>
                                adjustQuantityInBin(
                                  row._id,
                                  0,
                                  row.part.quantity
                                )
                              }
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </>
          )}
        </section>
      </div>

      <Dialog open={addPartsOpen} onOpenChange={setAddPartsOpen}>
        <DialogContent
          className="max-h-[min(90vh,720px)] gap-0 overflow-hidden p-0 sm:max-w-2xl"
          showCloseButton
        >
          <DialogHeader className="border-b border-border p-4 pb-4">
            <DialogTitle>Add parts to “{detail?.bin.name ?? "bin"}”</DialogTitle>
            <DialogDescription>
              Search inventory by name, choose how many to allocate, then add to
              this bin.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search parts by name…"
                value={partSearch}
                onChange={(e) => setPartSearch(e.target.value)}
                className="h-12 pl-10 text-base shadow-sm"
                autoFocus
              />
            </div>

            <div className="rounded-lg border border-border bg-muted/20">
              {debouncedPartSearch.length === 0 ? (
                <div className="px-4 py-10 text-center text-sm text-muted-foreground">
                  Type in the search box to see matching parts.
                </div>
              ) : searchResults === undefined ? (
                <div className="space-y-2 px-4 py-6">
                  {[1, 2, 3, 4].map((n) => (
                    <div
                      key={n}
                      className="h-14 animate-pulse rounded-md bg-muted/60"
                    />
                  ))}
                </div>
              ) : searchResults.length === 0 ? (
                <div className="px-4 py-10 text-center text-sm text-muted-foreground">
                  No parts match “{debouncedPartSearch}”.
                </div>
              ) : (
                <ScrollArea className="h-[min(52vh,380px)]">
                  <ul className="divide-y divide-border p-2">
                    {searchResults.map((part) => {
                      const inBin = qtyInSelectedBin.get(part._id) ?? 0;
                      const maxAdd = Math.max(0, part.quantity - inBin);
                      const qty =
                        qtyToAddByPart[part._id] ??
                        (maxAdd > 0 ? Math.min(1, maxAdd) : 1);

                      return (
                        <li key={part._id}>
                          <div className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:gap-4">
                            <div className="flex min-w-0 flex-1 items-center gap-3">
                              <PartPreview
                                partId={part._id}
                                stepFileUrl={part.stepFileUrl ?? null}
                              />
                              <div className="min-w-0">
                                <div className="truncate font-medium leading-snug">
                                  {part.name}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  Inventory {part.quantity}
                                  {inBin > 0
                                    ? ` · ${inBin} already in this bin`
                                    : ""}
                                </div>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center justify-end gap-2 sm:justify-center">
                              <div className="flex items-center gap-2 rounded-full border border-border bg-background px-2 py-1">
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  className="h-7 w-7 rounded-full"
                                  disabled={maxAdd <= 0 || qty <= 1}
                                  onClick={() =>
                                    bumpQtyToAdd(part._id, -1, maxAdd)
                                  }
                                >
                                  <Minus className="h-3 w-3" />
                                </Button>
                                <span className="w-7 text-center text-sm font-semibold tabular-nums">
                                  {maxAdd <= 0 ? 0 : qty}
                                </span>
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  className="h-7 w-7 rounded-full"
                                  disabled={maxAdd <= 0 || qty >= maxAdd}
                                  onClick={() =>
                                    bumpQtyToAdd(part._id, 1, maxAdd)
                                  }
                                >
                                  <Plus className="h-3 w-3" />
                                </Button>
                              </div>

                              <Button
                                className="h-10 shrink-0 px-4 shadow-sm"
                                disabled={maxAdd <= 0 || !selectedBinId}
                                onClick={() =>
                                  handleAddToBinRow(part._id, part.quantity)
                                }
                              >
                                Add to Bin
                              </Button>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </ScrollArea>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

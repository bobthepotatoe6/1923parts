import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useUiStore } from "@/store/uiStore";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Search, Plus, PackageOpen, Minus, Settings2, Tag, 
  DownloadCloud, Trash2, Box, RefreshCw, History, ArrowUpDown 
} from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PartPreview } from "@/components/PartPreview";
import { Link } from "react-router";
import { 
  useReactTable, 
  getCoreRowModel, 
  getSortedRowModel, 
  flexRender, 
  createColumnHelper
} from "@tanstack/react-table";
import type { SortingState } from "@tanstack/react-table";

export default function Dashboard() {
  const [search, setSearch] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState({});
  const [bulkTagsInput, setBulkTagsInput] = useState("");
  
  const categoryFilter = useUiStore((state) => state.categoryFilter);
  const setCategoryFilter = useUiStore((state) => state.setCategoryFilter);
  const tagFilters = useUiStore((state) => state.tagFilters);
  const setTagFilters = useUiStore((state) => state.setTagFilters);
  
  const parts = useQuery(api.parts.getParts, { 
    search: search || undefined, 
    category: categoryFilter,
    tags: tagFilters.length > 0 ? tagFilters : undefined
  });
  
  const updateQuantity = useMutation(api.parts.updateQuantity);
  const deletePart = useMutation(api.parts.deletePart);
  const bulkDelete = useMutation(api.parts.bulkDelete);
  const bulkUpdateTags = useMutation(api.parts.bulkUpdateTags);
  const syncSheets = useAction(api.googleSheets.syncFromSheet);

  const setSelectedPartId = useUiStore((state) => state.setSelectedPartId);
  const setDetailModalOpen = useUiStore((state) => state.setDetailModalOpen);
  const setAddPartModalOpen = useUiStore((state) => state.setAddPartModalOpen);
  const setAllocateModalOpen = useUiStore((state) => state.setAllocateModalOpen);
  const set3DViewerOpen = useUiStore((state) => state.set3DViewerOpen);
  const setSelectedStepPartId = useUiStore((state) => state.setSelectedStepPartId);

  const handleSync = () => {
    toast.promise(syncSheets(), {
      loading: "Syncing with Google Sheets...",
      success: (r: any) =>
        `Synced ${r.synced} order${r.synced === 1 ? "" : "s"} • ${r.skippedDuplicate} already synced • ${r.notFound} unmatched`,
      error: (err: any) =>
        `Sync failed: ${err?.message ?? "unknown error"}`,
    });
  };

  const open3DViewer = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedStepPartId(id);
    set3DViewerOpen(true);
  };

  const handleAdjustQuantity = async (id: any, change: number, currentQuantity: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (change < 0 && currentQuantity <= 0) return;
    try {
      await updateQuantity({ id, change });
      toast.success(change > 0 ? "Quantity increased" : "Quantity decreased");
    } catch (err: any) {
      toast.error("Failed to update quantity");
    }
  };

  const handleDeletePart = async (id: any, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`Delete "${name}"? This removes the part and its history.`)) return;
    try {
      await deletePart({ id });
      toast.success("Part deleted");
    } catch (err: any) {
      toast.error("Failed to delete part");
    }
  };

  const openPartDetail = (id: string) => {
    setSelectedPartId(id);
    setDetailModalOpen(true);
  };

  const openAllocateModal = (id: string) => {
    setSelectedPartId(id);
    setAllocateModalOpen(true);
  };

  const toggleTagFilter = (tag: string) => {
    if (tagFilters.includes(tag)) {
      setTagFilters(tagFilters.filter(t => t !== tag));
    } else {
      setTagFilters([...tagFilters, tag]);
    }
  };

  const availableTags = useMemo(() => {
    if (!parts) return [];
    const allTags = parts.flatMap(p => p.tags || []);
    return Array.from(new Set(allTags)).sort();
  }, [parts]);

  // TanStack Table Setup
  const columnHelper = createColumnHelper<any>();

  const columns = useMemo(() => [
    columnHelper.display({
      id: "select",
      header: ({ table }) => (
        <input
          type="checkbox"
          className="rounded border-gray-300 w-4 h-4 cursor-pointer"
          checked={table.getIsAllPageRowsSelected()}
          onChange={table.getToggleAllPageRowsSelectedHandler()}
        />
      ),
      cell: ({ row }) => (
        <div onClick={(e) => e.stopPropagation()} className="flex items-center">
          <input
            type="checkbox"
            className="rounded border-gray-300 w-4 h-4 cursor-pointer"
            checked={row.getIsSelected()}
            onChange={row.getToggleSelectedHandler()}
          />
        </div>
      ),
      size: 40,
    }),
    columnHelper.display({
      id: "image",
      header: "Image",
      cell: ({ row }) => {
        const p = row.original;
        return (
          <PartPreview
            partId={p._id}
            stepFileUrl={p.stepFileUrl ?? null}
            onClick={p.stepFileId ? () => open3DViewer(p._id) : undefined}
          />
        );
      },
      size: 80,
    }),
    columnHelper.accessor("name", {
      header: ({ column }) => (
        <Button variant="ghost" className="px-0 font-semibold" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Part Name <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const p = row.original;
        return (
          <div>
            <div className="font-medium">{p.name}</div>
            {p.description && <div className="text-xs text-muted-foreground mt-1 line-clamp-1">{p.description}</div>}
          </div>
        );
      }
    }),
    columnHelper.accessor("vendor", {
      header: ({ column }) => (
        <Button variant="ghost" className="px-0 font-semibold" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Vendor / SKU <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const p = row.original;
        return (
          <div className="flex flex-col">
            <span className="font-medium text-sm">{p.vendor || "Unknown"}</span>
            {p.productCode && <span className="text-xs text-muted-foreground">{p.productCode}</span>}
          </div>
        );
      }
    }),
    columnHelper.accessor("tags", {
      header: "Tags",
      cell: ({ row }) => {
        const tags = row.original.tags || [];
        return (
          <div className="flex flex-wrap gap-1 max-w-[200px]">
            {tags.length > 0 ? tags.map((t: string) => (
              <Badge key={t} variant="secondary" className="text-[10px] px-1.5 py-0">{t}</Badge>
            )) : <span className="text-xs text-muted-foreground italic">None</span>}
          </div>
        );
      }
    }),
    columnHelper.accessor("quantity", {
      header: ({ column }) => (
        <div className="text-center w-full">
          <Button variant="ghost" className="px-0 font-semibold" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
            Available <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        </div>
      ),
      cell: ({ row }) => {
        const p = row.original;
        const allocated = p.allocatedQuantity || 0;
        
        const shelfQuantity = p.quantityUnbinned ?? p.quantity;
        const binQuantity = p.quantityInBins ?? 0;
        const totalQuantity = p.quantityTotal ?? (p.quantity + binQuantity);
        
        const available = totalQuantity - allocated;
        const isLowStock = p.minimumStockThreshold !== undefined && available <= p.minimumStockThreshold;
        return (
          <div className="flex flex-col items-center justify-center gap-1">
            <div className="flex items-center justify-center gap-3" onClick={(e) => e.stopPropagation()}>
              <Button
                variant="outline" size="icon"
                className="h-8 w-8 rounded-full hover:bg-destructive hover:text-destructive-foreground hover:border-destructive transition-colors disabled:opacity-40"
                disabled={shelfQuantity <= 0}
                onClick={(e) => handleAdjustQuantity(p._id, -1, shelfQuantity, e)}
              >
                <Minus className="h-3 w-3" />
              </Button>
              <div className="flex flex-col items-center gap-0.5">
                <span className="w-10 text-center font-bold tabular-nums">
                  {totalQuantity}
                </span>
                {binQuantity > 0 && (
                  <span className="text-[10px] leading-none text-muted-foreground tabular-nums">
                    {shelfQuantity} shelf · {binQuantity} bin{binQuantity === 1 ? "" : "s"}
                  </span>
                )}
              </div>
              <Button
                variant="outline" size="icon"
                className="h-8 w-8 rounded-full hover:bg-green-600 hover:text-white hover:border-green-600 transition-colors"
                onClick={(e) => handleAdjustQuantity(p._id, 1, shelfQuantity, e)}
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
            {allocated > 0 && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">{allocated} Allocated</Badge>
            )}
            {isLowStock && (
              <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-4">Low Stock</Badge>
            )}
          </div>
        );
      }
    }),
    columnHelper.display({
      id: "actions",
      header: () => <div className="text-right">Actions</div>,
      cell: ({ row }) => {
        const p = row.original;
        return (
          <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={(e) => { e.stopPropagation(); openAllocateModal(p._id); }} title="Allocate Part">
              <PackageOpen className="h-4 w-4" />
            </Button>
            {p.stepFileId && (
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={(e) => open3DViewer(p._id, e)} title="View in 3D">
                <Box className="h-4 w-4" />
              </Button>
            )}
            {(p.stepFileId || p.fileId) && (
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={(e) => { e.stopPropagation(); openPartDetail(p._id); }} title="View File">
                <DownloadCloud className="h-4 w-4" />
              </Button>
            )}
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" onClick={(e) => handleDeletePart(p._id, p.name, e)} title="Delete Part">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        );
      }
    }),
  ], [columnHelper]);

  const table = useReactTable({
    data: parts || [],
    columns,
    state: {
      sorting,
      rowSelection,
    },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const selectedRows = table.getFilteredSelectedRowModel().rows;
  
  const handleBulkDelete = async () => {
    if (!window.confirm(`Delete ${selectedRows.length} parts?`)) return;
    try {
      await bulkDelete({ ids: selectedRows.map(r => r.original._id) });
      toast.success(`Deleted ${selectedRows.length} parts`);
      setRowSelection({});
    } catch (e) {
      toast.error("Failed to delete parts");
    }
  };

  const handleBulkAddTags = async () => {
    if (!bulkTagsInput.trim()) return;
    try {
      const tags = bulkTagsInput.split(',').map(t => t.trim()).filter(Boolean);
      await bulkUpdateTags({ ids: selectedRows.map(r => r.original._id), tags });
      toast.success(`Added tags to ${selectedRows.length} parts`);
      setBulkTagsInput("");
      setRowSelection({});
    } catch (e) {
      toast.error("Failed to add tags");
    }
  };

  return (
    <div className="mx-auto max-w-6xl p-4 md:p-8 space-y-6 relative pb-24">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-1">Inventory Dashboard</h1>
          <p className="text-muted-foreground">Manage and track 1923parts inventory.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Link to="/ledger">
            <Button variant="outline" className="h-12 px-6 shadow-sm w-full">
              <History className="mr-2 h-5 w-5" />
              Ledger
            </Button>
          </Link>
          <Button variant="outline" onClick={handleSync} className="h-12 px-6 shadow-sm">
            <RefreshCw className="mr-2 h-5 w-5" />
            Sync with Sheets
          </Button>
          <Button onClick={() => setAddPartModalOpen(true)} className="h-12 px-6 shadow-sm group">
            <Plus className="mr-2 h-5 w-5 group-hover:scale-110 transition-transform" />
            Add New Part
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input 
            placeholder="Search parts..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-12 text-base w-full shadow-sm"
          />
        </div>
        
        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-12 px-4 shadow-sm">
                <Tag className="mr-2 h-5 w-5 text-muted-foreground" />
                {tagFilters.length > 0 ? `${tagFilters.length} Tags` : "Filter by Tag"}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[200px]">
              <DropdownMenuGroup>
                <DropdownMenuLabel>Filter by Tag</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {tagFilters.length > 0 && (
                  <>
                    <DropdownMenuItem onClick={() => setTagFilters([])}>Clear all tags</DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                {availableTags.length === 0 ? (
                  <div className="p-2 text-sm text-muted-foreground">No tags found</div>
                ) : (
                  availableTags.map(tag => (
                    <DropdownMenuCheckboxItem key={tag} checked={tagFilters.includes(tag)} onCheckedChange={() => toggleTagFilter(tag)}>
                      {tag}
                    </DropdownMenuCheckboxItem>
                  ))
                )}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-12 px-4 shadow-sm">
                <Settings2 className="mr-2 h-5 w-5 text-muted-foreground" />
                {categoryFilter || "All Categories"}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[200px]">
              <DropdownMenuGroup>
                <DropdownMenuLabel>Filter by Category</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setCategoryFilter(undefined)}>All Categories</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setCategoryFilter("Mechanical")}>Mechanical</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setCategoryFilter("Electrical")}>Electrical</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setCategoryFilter("Hardware")}>Hardware</DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {parts === undefined ? (
        <div className="space-y-4 animate-pulse mt-8">
          {[1,2,3,4,5].map((n) => <div key={n} className="h-16 rounded-xl bg-muted/50 border"></div>)}
        </div>
      ) : parts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 px-4 text-center border rounded-xl border-dashed bg-muted/20">
          <PackageOpen className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-1">No parts found</h3>
          <p className="text-sm text-muted-foreground max-w-sm mb-6">We couldn't find any parts matching your current filters.</p>
          <Button variant="secondary" onClick={() => setAddPartModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Add Part
          </Button>
        </div>
      ) : (
        <div className="rounded-md border bg-card shadow-sm overflow-hidden mt-4">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map(headerGroup => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map(header => (
                    <TableHead key={header.id} style={{ width: header.getSize() !== 150 ? header.getSize() : undefined }}>
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.map(row => (
                <TableRow 
                  key={row.id} 
                  data-state={row.getIsSelected() && "selected"}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => openPartDetail(row.original._id)}
                >
                  {row.getVisibleCells().map(cell => (
                    <TableCell key={cell.id} className="py-2">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Floating Bulk Actions Bar */}
      {selectedRows.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-popover text-popover-foreground shadow-xl border rounded-full px-6 py-3 flex items-center gap-4 animate-in slide-in-from-bottom-10 fade-in duration-300">
          <span className="text-sm font-medium bg-muted px-2 py-1 rounded-full">{selectedRows.length} selected</span>
          <div className="h-6 w-px bg-border mx-2"></div>
          <div className="flex items-center gap-2">
            <Input 
              placeholder="Tags to add (comma sep)" 
              className="h-9 w-[200px] rounded-full text-sm"
              value={bulkTagsInput}
              onChange={e => setBulkTagsInput(e.target.value)}
            />
            <Button size="sm" className="rounded-full" onClick={handleBulkAddTags}>
              Add Tags
            </Button>
          </div>
          <div className="h-6 w-px bg-border mx-2"></div>
          <Button variant="destructive" size="sm" className="rounded-full" onClick={handleBulkDelete}>
            <Trash2 className="h-4 w-4 mr-2" /> Delete
          </Button>
        </div>
      )}
    </div>
  );
}

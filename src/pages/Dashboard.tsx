import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useUiStore } from "@/store/uiStore";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Plus, PackageOpen, Minus, Settings2, Tag, DownloadCloud, Trash2, Box, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
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

export default function Dashboard() {
  const [search, setSearch] = useState("");
  
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
  const syncSheets = useAction(api.googleSheets.syncFromSheet);

  const handleSync = () => {
    toast.promise(syncSheets(), {
      loading: "Syncing with Google Sheets...",
      success: (r: {
        synced: number;
        skippedDuplicate: number;
        notFound: number;
        skippedIncomplete: number;
      }) =>
        `Synced ${r.synced} order${r.synced === 1 ? "" : "s"} • ${r.skippedDuplicate} already synced • ${r.notFound} unmatched`,
      error: (err: { message?: string }) =>
        `Sync failed: ${err?.message ?? "unknown error"}`,
    });
  };

  const setSelectedPartId = useUiStore((state) => state.setSelectedPartId);
  const setDetailModalOpen = useUiStore((state) => state.setDetailModalOpen);
  const setAddPartModalOpen = useUiStore((state) => state.setAddPartModalOpen);
  const set3DViewerOpen = useUiStore((state) => state.set3DViewerOpen);
  const setSelectedStepPartId = useUiStore((state) => state.setSelectedStepPartId);

  const open3DViewer = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedStepPartId(id);
    set3DViewerOpen(true);
  };

  const handleAdjustQuantity = async (
    id: any,
    change: number,
    currentQuantity: number,
    e: React.MouseEvent
  ) => {
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
    if (!window.confirm(`Delete "${name}"? This removes the part and its history.`)) {
      return;
    }
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

  const toggleTagFilter = (tag: string) => {
    if (tagFilters.includes(tag)) {
      setTagFilters(tagFilters.filter(t => t !== tag));
    } else {
      setTagFilters([...tagFilters, tag]);
    }
  };

  // Get all unique tags from currently fetched parts (or could do globally if we fetched all)
  // To avoid filtering out tags when we apply a tag filter, we should ideally fetch all tags, 
  // but for simplicity we extract from the visible parts or all if we can.
  // Actually, since getParts only returns filtered parts, this unique tags list will shrink.
  // That's acceptable for this scope.
  const availableTags = useMemo(() => {
    if (!parts) return [];
    const allTags = parts.flatMap(p => p.tags || []);
    return Array.from(new Set(allTags)).sort();
  }, [parts]);

  return (
    <div className="mx-auto max-w-6xl p-4 md:p-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-1">Inventory Dashboard</h1>
          <p className="text-muted-foreground">Manage and track 1923parts inventory.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={handleSync}
            className="h-12 px-6 shadow-sm"
          >
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
          {/* Tag Filter Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-12 px-4 shadow-sm">
                <Tag className="mr-2 h-5 w-5 text-muted-foreground" />
                {tagFilters.length > 0 ? `${tagFilters.length} Tags` : "Filter by Tag"}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[200px]">
              <DropdownMenuLabel>Filter by Tag</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {tagFilters.length > 0 && (
                <>
                  <DropdownMenuItem onClick={() => setTagFilters([])}>
                    Clear all tags
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              {availableTags.length === 0 ? (
                <div className="p-2 text-sm text-muted-foreground">No tags found</div>
              ) : (
                availableTags.map(tag => (
                  <DropdownMenuCheckboxItem 
                    key={tag}
                    checked={tagFilters.includes(tag)}
                    onCheckedChange={() => toggleTagFilter(tag)}
                  >
                    {tag}
                  </DropdownMenuCheckboxItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Category Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-12 px-4 shadow-sm">
                <Settings2 className="mr-2 h-5 w-5 text-muted-foreground" />
                {categoryFilter || "All Categories"}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[200px]">
              <DropdownMenuLabel>Filter by Category</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setCategoryFilter(undefined)}>
                All Categories
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setCategoryFilter("Mechanical")}>
                Mechanical
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setCategoryFilter("Electrical")}>
                Electrical
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setCategoryFilter("Hardware")}>
                Hardware
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {parts === undefined ? (
        <div className="space-y-4 animate-pulse mt-8">
          {[1,2,3,4,5].map((n) => (
            <div key={n} className="h-16 rounded-xl bg-muted/50 border"></div>
          ))}
        </div>
      ) : parts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 px-4 text-center border rounded-xl border-dashed bg-muted/20">
          <PackageOpen className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-1">No parts found</h3>
          <p className="text-sm text-muted-foreground max-w-sm mb-6">
            We couldn't find any parts matching your current filters. Try adjusting your search or add a new part.
          </p>
          <Button variant="secondary" onClick={() => setAddPartModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Add Part
          </Button>
        </div>
      ) : (
        <div className="rounded-md border bg-card shadow-sm overflow-hidden mt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px]">Image</TableHead>
                <TableHead>Part Name & Desc</TableHead>
                <TableHead>Vendor & SKU</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead className="text-center w-[150px]">Quantity</TableHead>
                <TableHead className="text-right w-[120px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {parts.map((part: any) => (
                <TableRow
                  key={part._id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => openPartDetail(part._id)}
                >
                  <TableCell className="py-2">
                    <PartPreview
                      partId={part._id}
                      stepFileUrl={part.stepFileUrl ?? null}
                      onClick={part.stepFileId ? () => {
                        setSelectedStepPartId(part._id);
                        set3DViewerOpen(true);
                      } : undefined}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{part.name}</div>
                    {part.description && (
                      <div className="text-xs text-muted-foreground mt-1 line-clamp-1">
                        {part.description}
                      </div>
                    )}
                  </TableCell>
                  
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium text-sm">{part.vendor || "Unknown"}</span>
                      {part.productCode && (
                        <span className="text-xs text-muted-foreground">{part.productCode}</span>
                      )}
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <div className="flex flex-wrap gap-1 max-w-[200px]">
                      {part.tags && part.tags.length > 0 ? (
                        part.tags.map((tag: string) => (
                          <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0">
                            {tag}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground italic">None</span>
                      )}
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <div className="flex items-center justify-center gap-3" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 rounded-full hover:bg-destructive hover:text-destructive-foreground hover:border-destructive transition-colors disabled:opacity-40"
                        disabled={part.quantity <= 0}
                        onClick={(e) => handleAdjustQuantity(part._id, -1, part.quantity, e)}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-8 text-center font-bold">{part.quantity}</span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 rounded-full hover:bg-green-600 hover:text-white hover:border-green-600 transition-colors"
                        onClick={(e) => handleAdjustQuantity(part._id, 1, part.quantity, e)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                  
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                      {part.stepFileId && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-primary"
                          onClick={(e) => open3DViewer(part._id, e)}
                          title="View in 3D"
                        >
                          <Box className="h-4 w-4" />
                        </Button>
                      )}
                      {(part.stepFileId || part.fileId) && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-primary"
                          onClick={(e) => {
                            e.stopPropagation();
                            openPartDetail(part._id);
                          }}
                          title="View File"
                        >
                          <DownloadCloud className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        onClick={(e) => handleDeletePart(part._id, part.name, e)}
                        title="Delete Part"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

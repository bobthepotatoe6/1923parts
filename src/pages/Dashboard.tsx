import React, { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useUiStore } from "@/store/uiStore";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Plus, PackageOpen, Minus, Settings2 } from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function Dashboard() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string | undefined>(undefined);
  
  const parts = useQuery(api.parts.getParts, { 
    search: search || undefined, 
    category 
  });
  const updateQuantity = useMutation(api.parts.updateQuantity);
  
  const setSelectedPartId = useUiStore((state) => state.setSelectedPartId);
  const setDetailModalOpen = useUiStore((state) => state.setDetailModalOpen);
  const setAddPartModalOpen = useUiStore((state) => state.setAddPartModalOpen);

  const handleAdjustQuantity = async (id: any, change: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await updateQuantity({ id, change });
      toast.success(change > 0 ? "Quantity increased" : "Quantity decreased");
    } catch (err: any) {
      toast.error("Failed to update quantity");
    }
  };

  const openPartDetail = (id: string) => {
    setSelectedPartId(id);
    setDetailModalOpen(true);
  };

  return (
    <div className="mx-auto max-w-6xl p-4 md:p-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-1">Inventory Dashboard</h1>
          <p className="text-muted-foreground">Manage and track 1923parts inventory.</p>
        </div>
        <Button onClick={() => setAddPartModalOpen(true)} className="h-12 px-6 shadow-sm group">
          <Plus className="mr-2 h-5 w-5 group-hover:scale-110 transition-transform" />
          Add New Part
        </Button>
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
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="h-12 px-4 shadow-sm">
              <Settings2 className="mr-2 h-5 w-5 text-muted-foreground" />
              {category || "All Categories"}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[200px]">
            <DropdownMenuLabel>Filter by Category</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setCategory(undefined)}>
              All Categories
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setCategory("Mechanical")}>
              Mechanical
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setCategory("Electrical")}>
              Electrical
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setCategory("Hardware")}>
              Hardware
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {parts === undefined ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
          {[1,2,3,4,5,6].map((n) => (
            <div key={n} className="h-[140px] rounded-xl bg-muted/50 border"></div>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {parts.map((part: any) => (
            <div 
              key={part._id} 
              onClick={() => openPartDetail(part._id)}
              className="group relative rounded-xl border bg-card p-5 shadow-sm transition-all hover:shadow-md hover:border-accent/50 cursor-pointer flex flex-col"
            >
              <div className="mb-4">
                <span className="inline-block px-2.5 py-1 rounded-full bg-secondary text-xs font-medium text-secondary-foreground mb-3">
                  {part.category}
                </span>
                <h3 className="font-semibold text-lg leading-tight line-clamp-2">{part.name}</h3>
                {part.description && (
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{part.description}</p>
                )}
              </div>
              
              <div className="mt-auto flex items-center justify-between pt-4 border-t border-border/50">
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">In Stock</span>
                  <span className="text-2xl font-bold text-foreground">{part.quantity}</span>
                </div>
                
                <div className="flex items-center gap-2" onClick={(e: any) => e.stopPropagation()}>
                  <Button 
                    variant="outline" 
                    size="icon" 
                    className="h-10 w-10 rounded-full hover:bg-destructive hover:text-destructive-foreground hover:border-destructive transition-colors"
                    onClick={(e: any) => handleAdjustQuantity(part._id, -1, e)}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="icon" 
                    className="h-10 w-10 rounded-full hover:bg-green-600 hover:text-white hover:border-green-600 transition-colors"
                    onClick={(e: any) => handleAdjustQuantity(part._id, 1, e)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

import React, { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useUiStore } from "@/store/uiStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Minus, Plus } from "lucide-react";

export function AddPartModal() {
  const isAddPartModalOpen = useUiStore((state) => state.isAddPartModalOpen);
  const setAddPartModalOpen = useUiStore((state) => state.setAddPartModalOpen);
  
  const addPart = useMutation(api.parts.addPart);
  
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Mechanical");
  const [quantity, setQuantity] = useState(1);
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return toast.error("Name is required");

    setLoading(true);
    try {
      await addPart({ name, category, quantity, description });
      toast.success("Part added successfully");
      setAddPartModalOpen(false);
      
      // Reset form
      setName("");
      setCategory("Mechanical");
      setQuantity(1);
      setDescription("");
    } catch (error) {
      toast.error("Failed to add part");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isAddPartModalOpen} onOpenChange={setAddPartModalOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Part</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-5 pt-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Part Name</label>
            <Input 
              placeholder="e.g. M3x10 Socket Head Cap Screw" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Category</label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Mechanical">Mechanical</SelectItem>
                  <SelectItem value="Electrical">Electrical</SelectItem>
                  <SelectItem value="Hardware">Hardware</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Initial Quantity</label>
              <div className="flex items-center h-10 border rounded-md overflow-hidden">
                <Button 
                  type="button"
                  variant="ghost" 
                  className="h-full px-3 rounded-none text-muted-foreground hover:bg-muted"
                  onClick={() => setQuantity(Math.max(0, quantity - 1))}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <div className="flex-1 text-center font-medium">
                  {quantity}
                </div>
                <Button 
                  type="button"
                  variant="ghost" 
                  className="h-full px-3 rounded-none text-muted-foreground hover:bg-muted"
                  onClick={() => setQuantity(quantity + 1)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Description (Optional)</label>
            <Textarea 
              placeholder="Any additional notes..." 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="resize-none"
              rows={3}
            />
          </div>
          
          <Button type="submit" className="w-full h-11" disabled={loading}>
            {loading ? "Adding..." : "Add Part"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

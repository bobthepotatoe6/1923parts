import React, { useState, useRef, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
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
import { Minus, Plus, UploadCloud, FileBox } from "lucide-react";
import { useConvex } from "convex/react";

export function AddPartModal() {
  const isAddPartModalOpen = useUiStore((state) => state.isAddPartModalOpen);
  const setAddPartModalOpen = useUiStore((state) => state.setAddPartModalOpen);
  const convex = useConvex();
  
  const addPart = useMutation(api.parts.addPart);
  const generateUploadUrl = useMutation(api.parts.generateUploadUrl);
  
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Mechanical");
  const [quantity, setQuantity] = useState(1);
  const [description, setDescription] = useState("");
  const [vendor, setVendor] = useState("");
  const [productCode, setProductCode] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  
  const [stepFile, setStepFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const trimmedProductCode = productCode.trim();
  const existingSkuMatch = useQuery(
    api.parts.findBySku,
    vendor && trimmedProductCode
      ? { vendor, productCode: trimmedProductCode }
      : "skip"
  );
  const isNameLocked = !!existingSkuMatch;

  useEffect(() => {
    if (existingSkuMatch) {
      setName(existingSkuMatch.name);
    }
  }, [existingSkuMatch]);

  const resetForm = () => {
    setName("");
    setCategory("Mechanical");
    setQuantity(1);
    setDescription("");
    setVendor("");
    setProductCode("");
    setTagsInput("");
    setStepFile(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return toast.error("Name is required");
    if (!vendor.trim()) return toast.error("Vendor is required");
    if (quantity < 1) return toast.error("Quantity must be at least 1");
    if (!convex) {
      toast.error("Convex client is not ready. Check your connection and VITE_CONVEX_URL.");
      return;
    }

    setLoading(true);
    try {
      const tags = tagsInput.split(",").map((t) => t.trim()).filter(Boolean);
      let stepFileId: string | undefined = undefined;

      const existingStepFileId = await convex.query(
        api.parts.checkExistingStepFile,
        {
          vendor: vendor.trim(),
          productCode: productCode.trim() || undefined,
        }
      );

      if (existingStepFileId) {
        stepFileId = existingStepFileId as string;
        if (stepFile) {
          toast.info(
            "Reusing existing .step file for this vendor/SKU to save storage."
          );
        }
      } else if (stepFile) {
        const postUrl = await generateUploadUrl();
        const result = await fetch(postUrl, {
          method: "POST",
          headers: {
            "Content-Type":
              stepFile.type || "application/octet-stream",
          },
          body: stepFile,
        });
        const raw = await result.text();
        if (!result.ok) {
          throw new Error(
            `Upload failed (${result.status}): ${raw.slice(0, 200)}`
          );
        }
        let body: { storageId?: string } = {};
        try {
          body = raw ? JSON.parse(raw) : {};
        } catch {
          throw new Error("Upload response was not valid JSON.");
        }
        const storageId = body.storageId;
        if (!storageId || typeof storageId !== "string") {
          throw new Error("Upload succeeded but response had no storageId.");
        }
        stepFileId = storageId;
      }

      await addPart({
        name: name.trim(),
        category,
        quantity,
        description: description.trim() || undefined,
        vendor: vendor.trim(),
        productCode: productCode.trim() || undefined,
        tags,
        stepFileId,
      });

      toast.success("Part added successfully");
      setAddPartModalOpen(false);
      resetForm();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to add part";
      toast.error(message);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.name.toLowerCase().endsWith('.step') || file.name.toLowerCase().endsWith('.stp')) {
        setStepFile(file);
      } else {
        toast.error("Please upload a .step or .stp file");
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setStepFile(e.target.files[0]);
    }
  };

  return (
    <Dialog open={isAddPartModalOpen} onOpenChange={setAddPartModalOpen}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Part</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2 col-span-2">
              <label className="text-sm font-medium">Part Name *</label>
              <Input
                placeholder="e.g. M3x10 Socket Head Cap Screw"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={isNameLocked}
                aria-disabled={isNameLocked}
                title={
                  isNameLocked
                    ? "Name is locked because this SKU already exists. Standardized to prevent typo duplicates."
                    : undefined
                }
              />
              {isNameLocked && (
                <p className="text-xs text-muted-foreground">
                  Existing SKU detected — using standardized name “{existingSkuMatch.name}”.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Vendor *</label>
              <Select
                value={vendor || undefined}
                onValueChange={(v) => setVendor(v ?? "")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Vendor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="WCP">WCP</SelectItem>
                  <SelectItem value="McMaster-Carr">McMaster-Carr</SelectItem>
                  <SelectItem value="REV">REV</SelectItem>
                  <SelectItem value="AndyMark">AndyMark</SelectItem>
                  <SelectItem value="Custom">Custom</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Product Code / SKU</label>
              <Input 
                placeholder="e.g. 91292A113" 
                value={productCode}
                onChange={(e) => setProductCode(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Category</label>
              <Select
                value={category || undefined}
                onValueChange={(v) => setCategory(v ?? "Mechanical")}
              >
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

            <div className="space-y-2 col-span-2">
              <label className="text-sm font-medium">Tags (comma separated)</label>
              <Input 
                placeholder="e.g. intake, shooter, drivetrain" 
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Description</label>
            <Textarea 
              placeholder="Any additional notes..." 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="resize-none"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">.STEP File (CAD)</label>
            <div 
              className={`border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer transition-colors ${dragActive ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'}`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept=".step,.stp"
                onChange={handleFileChange}
              />
              {stepFile ? (
                <>
                  <FileBox className="h-8 w-8 text-primary mb-2" />
                  <p className="text-sm font-medium text-center">{stepFile.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">Click or drag to replace</p>
                </>
              ) : (
                <>
                  <UploadCloud className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm font-medium text-center">Drag & Drop a .step file</p>
                  <p className="text-xs text-muted-foreground mt-1">or click to browse</p>
                </>
              )}
            </div>
          </div>
          
          <Button type="submit" className="w-full h-11" disabled={loading}>
            {loading ? "Adding..." : "Add Part"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

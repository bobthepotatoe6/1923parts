import React, { useRef, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useUiStore } from "@/store/uiStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { FileUp, FileText, Activity, Clock } from "lucide-react";

export function PartDetailModal() {
  const isDetailModalOpen = useUiStore((state) => state.isDetailModalOpen);
  const setDetailModalOpen = useUiStore((state) => state.setDetailModalOpen);
  const selectedPartId = useUiStore((state) => state.selectedPartId);
  
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const part = useQuery(
    api.parts.getPart, 
    selectedPartId ? { id: selectedPartId as any } : "skip"
  );
  
  const generateUploadUrl = useMutation(api.parts.generateUploadUrl);
  const attachFile = useMutation(api.parts.attachFile);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedPartId) return;

    setUploading(true);
    try {
      const postUrl = await generateUploadUrl();
      const result = await fetch(postUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      const { storageId } = await result.json();
      
      await attachFile({ id: selectedPartId as any, fileId: storageId });
      toast.success("File uploaded successfully");
    } catch (error) {
      toast.error("Failed to upload file");
    } finally {
      setUploading(false);
    }
  };

  if (!selectedPartId) return null;

  return (
    <Dialog open={isDetailModalOpen} onOpenChange={setDetailModalOpen}>
      <DialogContent className="sm:max-w-[500px]">
        {part === undefined ? (
          <div className="p-8 text-center text-muted-foreground">Loading details...</div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                {part.name}
              </DialogTitle>
              <DialogDescription>
                {part.category} • {part.quantity} in stock
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* File Upload Section */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  G-Code File
                </h4>
                
                {part.fileUrl ? (
                  <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                    <div className="flex items-center gap-3 truncate">
                      <div className="p-2 bg-accent/10 rounded-md">
                        <FileText className="h-5 w-5 text-accent" />
                      </div>
                      <div className="truncate">
                        <p className="text-sm font-medium">Attached File</p>
                        <a href={part.fileUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-500 hover:underline truncate block">
                          Download File
                        </a>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                      Replace
                    </Button>
                  </div>
                ) : (
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className={`flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${uploading ? 'bg-muted opacity-70' : 'hover:border-accent hover:bg-accent/5'}`}
                  >
                    <FileUp className="h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-sm font-medium">{uploading ? "Uploading..." : "Upload G-Code File"}</p>
                    <p className="text-xs text-muted-foreground mt-1">Click to select a file</p>
                  </div>
                )}
                
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  onChange={handleFileUpload}
                  accept=".gcode,.txt,.nc"
                />
              </div>

              {/* History Section */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <Activity className="h-4 w-4 text-muted-foreground" />
                  Inventory History
                </h4>
                <ScrollArea className="h-[200px] w-full rounded-md border p-4">
                  {part.history.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No history available</p>
                  ) : (
                    <div className="space-y-4 relative before:absolute before:inset-0 before:ml-2 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
                      {part.history.map((record: any) => (
                        <div key={record._id} className="relative flex items-center justify-between gap-4 md:justify-normal md:odd:flex-row-reverse group is-active">
                          <div className="flex items-center justify-center w-5 h-5 rounded-full border border-background bg-accent shrink-0 md:order-1 shadow">
                            <span className="sr-only">Event</span>
                          </div>
                          <div className="w-full rounded-lg border bg-card p-3 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div>
                              <p className="text-sm font-medium">
                                {record.change > 0 ? "Added" : "Removed"} {Math.abs(record.change)}
                              </p>
                              <p className="text-xs text-muted-foreground">{record.reason}</p>
                            </div>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                              <Clock className="h-3 w-3" />
                              {new Date(record.timestamp).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

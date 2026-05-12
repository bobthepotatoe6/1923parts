import { Box, Eye } from "lucide-react";

type Props = {
  partId: string;
  stepFileUrl: string | null;
  onClick?: () => void;
};

export function PartPreview({ stepFileUrl, onClick }: Props) {
  const isClickable = !!stepFileUrl && !!onClick;

  return (
    <div
      onClick={(e) => {
        if (!isClickable) return;
        e.stopPropagation();
        onClick!();
      }}
      className={[
        "w-12 h-12 rounded-md flex items-center justify-center relative",
        "bg-gradient-to-br from-neutral-200 to-neutral-300 dark:from-neutral-700 dark:to-neutral-800",
        "ring-1 ring-border/60",
        isClickable 
          ? "cursor-zoom-in hover:ring-primary/60 hover:text-primary text-foreground transition-all duration-200" 
          : "text-muted-foreground/40",
      ].join(" ")}
      title={isClickable ? "View 3D Model" : "No 3D model available"}
    >
      {isClickable ? (
        <Eye className="w-5 h-5" />
      ) : (
        <Box className="w-5 h-5 opacity-50" />
      )}
    </div>
  );
}

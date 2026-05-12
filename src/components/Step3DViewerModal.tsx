import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "convex/react";
import { Canvas } from "@react-three/fiber";
import { Bounds, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { api } from "../../convex/_generated/api";
import { useUiStore } from "@/store/uiStore";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { fetchAndParse, getCached } from "@/lib/step/meshCache";
import type { ParsedMesh } from "@/lib/step/parseStepFile";
import { Box, Loader2, RefreshCw } from "lucide-react";

type Stage = "idle" | "loading" | "ready" | "error";

function buildGeometry(mesh: ParsedMesh): THREE.BufferGeometry {
  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.BufferAttribute(mesh.positions, 3));
  if (mesh.normals) {
    geom.setAttribute("normal", new THREE.BufferAttribute(mesh.normals, 3));
  }
  if (mesh.indices) {
    geom.setIndex(new THREE.BufferAttribute(mesh.indices, 1));
  }
  if (!mesh.normals) {
    geom.computeVertexNormals();
  }
  return geom;
}

export default function Step3DViewerModal() {
  const isOpen = useUiStore((s) => s.is3DViewerOpen);
  const setOpen = useUiStore((s) => s.set3DViewerOpen);
  const partId = useUiStore((s) => s.selectedStepPartId);
  const setPartId = useUiStore((s) => s.setSelectedStepPartId);

  const queryResult = useQuery(
    api.parts.getStepFileUrl,
    isOpen && partId ? { id: partId as any } : "skip"
  );

  const [stage, setStage] = useState<Stage>(() => {
    if (partId && getCached(partId)) return "ready";
    return "idle";
  });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [meshes, setMeshes] = useState<ParsedMesh[]>(() =>
    partId ? getCached(partId) ?? [] : []
  );
  const [attempt, setAttempt] = useState(0);
  const geometriesRef = useRef<THREE.BufferGeometry[]>([]);

  useEffect(() => {
    if (!isOpen || !partId) return;
    const cached = getCached(partId);
    if (cached) {
      setMeshes(cached);
      setStage("ready");
      setErrorMsg(null);
      return;
    }
    if (!queryResult) return;
    let cancelled = false;
    setStage("loading");
    setErrorMsg(null);
    fetchAndParse(partId, queryResult.url)
      .then((parsed) => {
        if (cancelled) return;
        setMeshes(parsed);
        setStage("ready");
      })
      .catch((err) => {
        if (cancelled) return;
        setErrorMsg(err instanceof Error ? err.message : String(err));
        setStage("error");
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, partId, queryResult, attempt]);

  const geometries = useMemo(() => {
    geometriesRef.current.forEach((g) => g.dispose());
    const next = meshes.map(buildGeometry);
    geometriesRef.current = next;
    return next;
  }, [meshes]);

  useEffect(() => {
    return () => {
      geometriesRef.current.forEach((g) => g.dispose());
      geometriesRef.current = [];
    };
  }, []);

  const handleOpenChange = (open: boolean) => {
    setOpen(open);
    if (!open) {
      setPartId(null);
      setMeshes([]);
      setStage("idle");
      setErrorMsg(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="w-[90vw] sm:max-w-[1100px] h-[80vh] p-0 overflow-hidden flex flex-col">
        <DialogHeader className="px-5 pt-4 pb-3 border-b">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Box className="h-5 w-5 text-primary" />
            {queryResult?.name ?? "3D Viewer"}
          </DialogTitle>
          {queryResult && (
            <DialogDescription>
              {queryResult.vendor}
              {queryResult.productCode ? ` • ${queryResult.productCode}` : ""}
            </DialogDescription>
          )}
        </DialogHeader>

        <div
          className="relative flex-1 min-h-0"
          style={{
            background:
              "radial-gradient(ellipse at center, hsl(220 10% 78%) 0%, hsl(220 10% 60%) 100%)",
          }}
        >
          <div className="dark:hidden absolute inset-0" />
          <div
            className="hidden dark:block absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse at center, hsl(220 8% 38%) 0%, hsl(220 10% 22%) 100%)",
            }}
          />

          {queryResult === undefined && isOpen && (
            <LoadingPanel text="Loading part…" />
          )}
          {queryResult === null && (
            <EmptyPanel text="This part has no .step file attached." />
          )}
          {queryResult && stage === "loading" && (
            <LoadingPanel text="Loading 3D model…" />
          )}
          {queryResult && stage === "error" && (
            <ErrorPanel
              message={errorMsg ?? "Unknown error"}
              onRetry={() => setAttempt((n) => n + 1)}
            />
          )}
          {queryResult && stage === "ready" && (
            <Canvas
              dpr={[1, 2]}
              gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
              camera={{ position: [50, 50, 50], near: 0.01, far: 100000, fov: 45 }}
              className="!w-full !h-full relative z-10"
            >
              <ambientLight intensity={0.6} />
              <directionalLight position={[5, 10, 7]} intensity={0.9} />
              <directionalLight position={[-5, -5, -5]} intensity={0.3} />
              <Bounds fit clip observe margin={1.4}>
                <group>
                  {geometries.map((geom, i) => {
                    const color = meshes[i]?.color;
                    const c = color
                      ? new THREE.Color(color[0], color[1], color[2])
                      : new THREE.Color(0.82, 0.82, 0.86);
                    return (
                      <mesh key={i} geometry={geom}>
                        <meshStandardMaterial
                          color={c}
                          metalness={0.2}
                          roughness={0.55}
                          side={THREE.DoubleSide}
                        />
                      </mesh>
                    );
                  })}
                </group>
              </Bounds>
              <OrbitControls makeDefault enableDamping dampingFactor={0.08} />
            </Canvas>
          )}
        </div>

        <div className="px-5 py-2 border-t text-xs text-muted-foreground flex items-center justify-between bg-card">
          <span>Drag to rotate • Scroll to zoom • Right-drag to pan</span>
          <span>{meshes.length > 0 ? `${meshes.length} mesh${meshes.length === 1 ? "" : "es"}` : ""}</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function LoadingPanel({ text }: { text: string }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-foreground/70 z-10">
      <Loader2 className="h-8 w-8 animate-spin" />
      <p className="text-sm">{text}</p>
    </div>
  );
}

function EmptyPanel({ text }: { text: string }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center text-sm text-foreground/70 z-10">
      {text}
    </div>
  );
}

function ErrorPanel({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center z-10">
      <p className="text-sm font-medium text-foreground">Failed to load 3D model</p>
      <p className="text-xs text-foreground/70 max-w-md break-words">{message}</p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        <RefreshCw className="mr-2 h-3.5 w-3.5" />
        Retry
      </Button>
    </div>
  );
}

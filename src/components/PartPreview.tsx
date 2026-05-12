import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Bounds } from "@react-three/drei";
import * as THREE from "three";
import { Box, Loader2 } from "lucide-react";
import { fetchAndParse, getCached } from "@/lib/step/meshCache";
import type { ParsedMesh } from "@/lib/step/parseStepFile";

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

function PreviewScene({ meshes }: { meshes: ParsedMesh[] }) {
  const geometries = useMemo(() => meshes.map(buildGeometry), [meshes]);
  useEffect(() => {
    return () => {
      geometries.forEach((g) => g.dispose());
    };
  }, [geometries]);
  return (
    <Bounds fit clip observe margin={1.4}>
      <group>
        {geometries.map((g, i) => {
          const c = meshes[i].color;
          const color = c
            ? new THREE.Color(c[0], c[1], c[2])
            : new THREE.Color(0.82, 0.82, 0.86);
          return (
            <mesh key={i} geometry={g}>
              <meshStandardMaterial
                color={color}
                metalness={0.2}
                roughness={0.55}
                side={THREE.DoubleSide}
              />
            </mesh>
          );
        })}
      </group>
    </Bounds>
  );
}

type Props = {
  partId: string;
  stepFileUrl: string | null;
  onClick?: () => void;
};

export function PartPreview({ partId, stepFileUrl, onClick }: Props) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  const [meshes, setMeshes] = useState<ParsedMesh[] | null>(
    () => getCached(partId) ?? null
  );
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    if (!wrapperRef.current) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setInView(true);
      },
      { rootMargin: "200px" }
    );
    obs.observe(wrapperRef.current);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!inView || !stepFileUrl || meshes) return;
    let cancelled = false;
    fetchAndParse(partId, stepFileUrl)
      .then((m) => {
        if (!cancelled) setMeshes(m);
      })
      .catch(() => {
        if (!cancelled) setErrored(true);
      });
    return () => {
      cancelled = true;
    };
  }, [inView, stepFileUrl, partId, meshes]);

  const isClickable = !!stepFileUrl && !!onClick;

  return (
    <div
      ref={wrapperRef}
      onClick={(e) => {
        if (!isClickable) return;
        e.stopPropagation();
        onClick!();
      }}
      className={[
        "w-14 h-14 rounded-md overflow-hidden relative",
        "bg-gradient-to-br from-neutral-200 to-neutral-300 dark:from-neutral-600 dark:to-neutral-800",
        "ring-1 ring-border/60",
        isClickable ? "cursor-zoom-in hover:ring-primary/60 transition" : "",
      ].join(" ")}
      title={isClickable ? "Open 3D viewer" : undefined}
    >
      {!stepFileUrl ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <Box className="w-5 h-5 text-muted-foreground/40" />
        </div>
      ) : errored ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <Box className="w-5 h-5 text-destructive/60" />
        </div>
      ) : !meshes ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <Canvas
          frameloop="demand"
          dpr={[1, 1.5]}
          gl={{ alpha: true, antialias: true, powerPreference: "low-power" }}
          camera={{ position: [1, 1, 1], fov: 35, near: 0.001, far: 100000 }}
          className="!w-full !h-full"
        >
          <ambientLight intensity={0.6} />
          <directionalLight position={[5, 10, 7]} intensity={0.85} />
          <directionalLight position={[-5, -5, -5]} intensity={0.25} />
          <PreviewScene meshes={meshes} />
        </Canvas>
      )}
    </div>
  );
}

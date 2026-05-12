type OcctMesh = {
  name?: string;
  color?: [number, number, number];
  attributes: {
    position: { array: ArrayLike<number> };
    normal?: { array: ArrayLike<number> };
  };
  index?: { array: ArrayLike<number> };
};

export type OcctModule = {
  ReadStepFile: (
    content: Uint8Array,
    params: Record<string, unknown> | null
  ) => {
    success: boolean;
    meshes: OcctMesh[];
    root?: unknown;
  };
};

let _occtPromise: Promise<OcctModule> | null = null;

export function getOcct(): Promise<OcctModule> {
  if (!_occtPromise) {
    _occtPromise = (async () => {
      const [occtimportjsModule, wasmUrlModule] = await Promise.all([
        // @ts-expect-error - occt-import-js ships without TypeScript types
        import("occt-import-js") as Promise<{ default: any }>,
        import("occt-import-js/dist/occt-import-js.wasm?url"),
      ]);
      const occtimportjs =
        (occtimportjsModule as any).default ?? occtimportjsModule;
      const wasmUrl = wasmUrlModule.default;
      return occtimportjs({
        locateFile: (path: string) =>
          path.endsWith(".wasm") ? wasmUrl : path,
      }) as Promise<OcctModule>;
    })();
  }
  return _occtPromise;
}

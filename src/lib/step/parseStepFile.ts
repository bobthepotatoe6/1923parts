import { getOcct } from "./occtModule";

export type ParsedMesh = {
  name: string;
  positions: Float32Array;
  normals: Float32Array | null;
  indices: Uint32Array | null;
  color: [number, number, number] | null;
};

function toFloat32(src: ArrayLike<number>): Float32Array {
  return src instanceof Float32Array ? src : new Float32Array(src as ArrayLike<number>);
}

function toUint32(src: ArrayLike<number>): Uint32Array {
  return src instanceof Uint32Array ? src : new Uint32Array(src as ArrayLike<number>);
}

export async function parseStepFile(buffer: ArrayBuffer): Promise<ParsedMesh[]> {
  const occt = await getOcct();
  const bytes = new Uint8Array(buffer);
  const result = occt.ReadStepFile(bytes, null);
  if (!result.success) {
    throw new Error("occt-import-js failed to parse the STEP file");
  }
  return result.meshes.map((mesh, i) => ({
    name: mesh.name ?? `mesh_${i}`,
    positions: toFloat32(mesh.attributes.position.array),
    normals: mesh.attributes.normal ? toFloat32(mesh.attributes.normal.array) : null,
    indices: mesh.index ? toUint32(mesh.index.array) : null,
    color: mesh.color ?? null,
  }));
}

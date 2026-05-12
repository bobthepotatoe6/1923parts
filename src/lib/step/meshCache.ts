import { parseStepFile, type ParsedMesh } from "./parseStepFile";

const cache = new Map<string, ParsedMesh[]>();
const inflight = new Map<string, Promise<ParsedMesh[]>>();

const DOWNLOAD_TIMEOUT_MS = 60_000;

export function getCached(partId: string): ParsedMesh[] | undefined {
  return cache.get(partId);
}

export function evictPart(partId: string): void {
  cache.delete(partId);
}

export async function fetchAndParse(
  partId: string,
  url: string
): Promise<ParsedMesh[]> {
  const cached = cache.get(partId);
  if (cached) return cached;
  const existing = inflight.get(partId);
  if (existing) return existing;

  const promise = (async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), DOWNLOAD_TIMEOUT_MS);
      let buf: ArrayBuffer;
      try {
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) throw new Error(`Download failed: HTTP ${res.status}`);
        buf = await res.arrayBuffer();
      } finally {
        clearTimeout(timeoutId);
      }
      const meshes = await parseStepFile(buf);
      cache.set(partId, meshes);
      return meshes;
    } finally {
      inflight.delete(partId);
    }
  })();
  inflight.set(partId, promise);
  return promise;
}

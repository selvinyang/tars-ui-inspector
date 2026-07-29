import type { DesignAsset } from "./types";

const DB_NAME = "tars-ui-inspector-v2";
const STORE = "images";
const VERSION = 1;
export type ImageKind = "actual" | "design";
type StoredImage = Omit<DesignAsset, "dataUrl" | "objectUrl"> & { key: string; pageId: string; kind: ImageKind; blob: Blob };

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, VERSION);
    request.onupgradeneeded = () => { if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE, { keyPath: "key" }); };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveImage(pageId: string, kind: ImageKind, file: File, width: number, height: number) {
  const db = await openDb();
  const record: StoredImage = { key: `${kind}:${pageId}`, pageId, kind, name: file.name, size: file.size, width, height, blob: file };
  await new Promise<void>((resolve, reject) => { const tx = db.transaction(STORE, "readwrite"); tx.objectStore(STORE).put(record); tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); });
  db.close();
}

export async function deleteImage(pageId: string, kind: ImageKind) {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => { const tx = db.transaction(STORE, "readwrite"); tx.objectStore(STORE).delete(`${kind}:${pageId}`); tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); });
  db.close();
}

export async function loadImages(): Promise<Array<{ pageId: string; kind: ImageKind; asset: DesignAsset }>> {
  const db = await openDb();
  const records = await new Promise<StoredImage[]>((resolve, reject) => { const request = db.transaction(STORE).objectStore(STORE).getAll(); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
  db.close();
  return records.map(({ pageId, kind, blob, name, size, width, height }) => ({ pageId, kind, asset: { name, size, width, height, objectUrl: URL.createObjectURL(blob) } }));
}

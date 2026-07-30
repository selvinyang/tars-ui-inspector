export type CollectedElement = { text: string; tag: string; fontFamily: string; fontWeight: number | null; fontSize: number | null; lineHeight: number | null; letterSpacing: number | null; color: string; x: number; y: number; width: number; height: number };
export type PageSnapshot = { id: string; url: string; title: string; capturedAt: string; viewportWidth: number; viewportHeight: number; pageWidth: number; pageHeight: number; elements: CollectedElement[] };

const snapshots = new Map<string, PageSnapshot>();

export function saveSnapshot(snapshot: PageSnapshot) {
  snapshots.set(snapshot.id, snapshot);
  while (snapshots.size > 20) snapshots.delete(snapshots.keys().next().value!);
}

export function getSnapshot(id: string) { return snapshots.get(id); }

export function validCollectorId(id: string) { return /^[a-zA-Z0-9-]{8,80}$/.test(id); }

export const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET,POST,OPTIONS", "Access-Control-Allow-Headers": "Content-Type", "Cache-Control": "no-store" };

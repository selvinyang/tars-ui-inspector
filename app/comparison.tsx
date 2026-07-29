"use client";

import { useEffect, useRef, useState } from "react";
import type { DesignAsset } from "./types";

export type Alignment = { x: number; y: number; scale: number };
export type DifferenceRegion = { id: number; x: number; y: number; width: number; height: number; changedPercent: number; leftPercent: number; topPercent: number; widthPercent: number; heightPercent: number };
const src = (asset?: DesignAsset) => asset?.objectUrl ?? asset?.dataUrl;

export function ImageSurface({ asset, label, className = "" }: { asset: DesignAsset; label: string; className?: string }) {
  // Blob/data URLs are local-only and deliberately bypass hosted image optimization.
  // eslint-disable-next-line @next/next/no-img-element
  return <div className={`real-image-surface ${className}`}><img src={src(asset)} alt={label} /></div>;
}

export function DiffCanvas({ actual, design, alignment, zoom, onScore, onRegions }: { actual: DesignAsset; design: DesignAsset; alignment: Alignment; zoom: number; onScore: (score: number) => void; onRegions: (regions: DifferenceRegion[]) => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [regions, setRegions] = useState<DifferenceRegion[]>([]);
  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    const a = new Image(); const d = new Image(); let cancelled = false;
    const render = () => {
      if (cancelled) return;
      const width = Math.min(1200, a.naturalWidth); const ratio = width / a.naturalWidth; const height = Math.max(1, Math.round(a.naturalHeight * ratio));
      canvas.width = width; canvas.height = height; const ctx = canvas.getContext("2d", { willReadFrequently: true }); if (!ctx) return;
      const off = document.createElement("canvas"); off.width = width; off.height = height; const offCtx = off.getContext("2d", { willReadFrequently: true }); if (!offCtx) return;
      ctx.drawImage(a, 0, 0, width, height); const actualData = ctx.getImageData(0, 0, width, height);
      offCtx.clearRect(0, 0, width, height); const designWidth = width * alignment.scale; const designHeight = d.naturalHeight * (designWidth / d.naturalWidth);
      offCtx.drawImage(d, alignment.x * ratio, alignment.y * ratio, designWidth, designHeight); const designData = offCtx.getImageData(0, 0, width, height);
      const cell = 24; const columns = Math.ceil(width / cell); const rows = Math.ceil(height / cell); const cellChanges = new Uint32Array(columns * rows);
      const output = ctx.createImageData(width, height); let changed = 0; const total = width * height;
      for (let i = 0; i < actualData.data.length; i += 4) {
        const delta = Math.abs(actualData.data[i] - designData.data[i]) + Math.abs(actualData.data[i + 1] - designData.data[i + 1]) + Math.abs(actualData.data[i + 2] - designData.data[i + 2]);
        if (delta > 54) { const pixel = i / 4; const previous = pixel % width ? i - 4 : i; const actualEdge = Math.abs(actualData.data[i] - actualData.data[previous]) + Math.abs(actualData.data[i + 1] - actualData.data[previous + 1]) + Math.abs(actualData.data[i + 2] - actualData.data[previous + 2]); const designEdge = Math.abs(designData.data[i] - designData.data[previous]) + Math.abs(designData.data[i + 1] - designData.data[previous + 1]) + Math.abs(designData.data[i + 2] - designData.data[previous + 2]); const actualOwned = actualEdge > designEdge + 24; const designOwned = designEdge > actualEdge + 24; changed++; cellChanges[Math.floor(pixel / width / cell) * columns + Math.floor(pixel % width / cell)]++; const color = actualOwned ? [76, 141, 255] : designOwned ? [242, 140, 107] : [119, 123, 131]; output.data[i] = color[0]; output.data[i + 1] = color[1]; output.data[i + 2] = color[2]; output.data[i + 3] = actualOwned || designOwned ? Math.min(178, 68 + delta / 4) : 58; }
        else { output.data[i] = actualData.data[i] * .22; output.data[i + 1] = actualData.data[i + 1] * .22; output.data[i + 2] = actualData.data[i + 2] * .22; output.data[i + 3] = 138; }
      }
      const active = new Uint8Array(columns * rows); for (let row = 0; row < rows; row++) for (let column = 0; column < columns; column++) { const area = Math.min(cell, width - column * cell) * Math.min(cell, height - row * cell); if (cellChanges[row * columns + column] / area > .14) active[row * columns + column] = 1; }
      const found: DifferenceRegion[] = []; const queue: number[] = [];
      for (let start = 0; start < active.length; start++) { if (!active[start]) continue; active[start] = 0; queue.push(start); let minX = columns, minY = rows, maxX = 0, maxY = 0, cells = 0, changedPixels = 0;
        while (queue.length) { const index = queue.pop()!; const x = index % columns; const y = Math.floor(index / columns); minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y); cells++; changedPixels += cellChanges[index]; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { if (!dx && !dy) continue; const nx = x + dx; const ny = y + dy; if (nx < 0 || ny < 0 || nx >= columns || ny >= rows) continue; const next = ny * columns + nx; if (active[next]) { active[next] = 0; queue.push(next); } } }
        const boxWidth = Math.min(width, (maxX + 1) * cell) - minX * cell; const boxHeight = Math.min(height, (maxY + 1) * cell) - minY * cell; if (cells < 2 || boxWidth * boxHeight < 900) continue;
        found.push({ id: 0, x: Math.round(minX * cell / ratio), y: Math.round(minY * cell / ratio), width: Math.round(boxWidth / ratio), height: Math.round(boxHeight / ratio), changedPercent: Math.round(changedPixels / (boxWidth * boxHeight) * 100), leftPercent: minX * cell / width * 100, topPercent: minY * cell / height * 100, widthPercent: boxWidth / width * 100, heightPercent: boxHeight / height * 100 });
      }
      const nextRegions = found.sort((first, second) => second.width * second.height - first.width * first.height).slice(0, 8).map((region, index) => ({ ...region, id: index + 1 }));
      ctx.putImageData(output, 0, 0); setRegions(nextRegions); onRegions(nextRegions); onScore(Math.round(changed / total * 1000) / 10);
    };
    let loaded = 0; const ready = () => { loaded++; if (loaded === 2) render(); }; a.onload = ready; d.onload = ready; a.src = src(actual) ?? ""; d.src = src(design) ?? "";
    return () => { cancelled = true; };
  }, [actual, design, alignment, onScore, onRegions]);
  return <div className="real-image-surface diff-surface"><canvas ref={ref} /><div className="diff-region-layer" style={{ aspectRatio: `${actual.width} / ${actual.height}` }}>{regions.map(region => <div key={region.id} className="diff-region-box" style={{ left: `${region.leftPercent}%`, top: `${region.topPercent}%`, width: `${region.widthPercent}%`, height: `${region.heightPercent}%` }}><b style={{ transform: `scale(${100 / zoom})` }}>#{region.id} · {region.width}×{region.height}px</b></div>)}</div><div className="diff-legend"><span><i className="actual"></i>开发稿</span><span><i className="design"></i>设计稿</span></div></div>;
}

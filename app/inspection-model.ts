export type LayerKind = "text" | "component";
export type InspectableProperty = "fontFamily" | "fontWeight" | "fontSize" | "lineHeight" | "letterSpacing" | "color" | "backgroundColor" | "borderRadius" | "borderWidth" | "borderColor" | "paddingTop" | "paddingRight" | "paddingBottom" | "paddingLeft" | "marginTop" | "marginRight" | "marginBottom" | "marginLeft" | "gap" | "x" | "y" | "width" | "height";
export type PropertyValue = number | string;
export type DevelopmentProperties = Partial<Record<InspectableProperty, PropertyValue>>;

export type FigmaLayer = {
  id: string; kind: LayerKind; nodeType: string; name: string; text?: string;
  fontFamily?: string | null; fontWeight?: number | null; fontSize?: number | null; lineHeight?: number | null;
  lineHeightPercent?: number | null; letterSpacing?: number | null; textAlign?: string | null; color?: string | null;
  backgroundColor?: string | null; borderColor?: string | null; borderWidth?: number | null; borderRadius?: number | null;
  paddingTop?: number | null; paddingRight?: number | null; paddingBottom?: number | null; paddingLeft?: number | null;
  marginTop?: number | null; marginRight?: number | null; marginBottom?: number | null; marginLeft?: number | null; gap?: number | null;
  x?: number | null; y?: number | null; width?: number | null; height?: number | null; mixed?: boolean; styleVariants?: number;
};

export type FigmaInspection = {
  textCount: number; returnedTextCount: number; componentCount?: number; returnedComponentCount?: number;
  fontFamilies: { name: string; count: number }[]; textLayers: FigmaLayer[]; componentLayers?: FigmaLayer[]; layers?: FigmaLayer[]; warnings: string[];
};

export type SnapshotElement = {
  text: string; tag: string; selector?: string; role?: string; elementType?: "text" | "control" | "image" | "link" | "container";
  fontFamily: string; fontWeight: number | null; fontSize: number | null; lineHeight: number | null; letterSpacing: number | null;
  color: string; backgroundColor?: string; borderColor?: string; borderWidth?: number | null; borderRadius?: number | null;
  paddingTop?: number | null; paddingRight?: number | null; paddingBottom?: number | null; paddingLeft?: number | null;
  marginTop?: number | null; marginRight?: number | null; marginBottom?: number | null; marginLeft?: number | null; gap?: number | null;
  x: number; y: number; width: number; height: number;
};

export type PageSnapshot = { id: string; url: string; title: string; capturedAt: string; viewportWidth: number; viewportHeight: number; pageWidth: number; pageHeight: number; screenshot?: string; elements: SnapshotElement[] };
export type MatchRecord = { elementIndex: number; confidence: number; method: "text" | "component" | "manual" };
export type PropertyDifference = { key: InspectableProperty; design: PropertyValue; actual: PropertyValue; delta?: number };

export const propertyLabels: Record<InspectableProperty, string> = {
  fontFamily: "字体", fontWeight: "字重", fontSize: "字号", lineHeight: "行高", letterSpacing: "字距", color: "文字色",
  backgroundColor: "背景色", borderRadius: "圆角", borderWidth: "边框宽度", borderColor: "边框颜色",
  paddingTop: "上内边距", paddingRight: "右内边距", paddingBottom: "下内边距", paddingLeft: "左内边距",
  marginTop: "上外边距", marginRight: "右外边距", marginBottom: "下外边距", marginLeft: "左外边距", gap: "元素间距",
  x: "距左", y: "距顶", width: "宽度", height: "高度",
};

export const textPropertyKeys: InspectableProperty[] = ["fontFamily", "fontWeight", "fontSize", "lineHeight", "letterSpacing", "color", "width", "height"];
export const componentPropertyKeys: InspectableProperty[] = ["backgroundColor", "borderRadius", "borderWidth", "borderColor", "paddingTop", "paddingRight", "paddingBottom", "paddingLeft", "marginTop", "marginRight", "marginBottom", "marginLeft", "gap", "width", "height"];

export function inspectionLayers(inspection?: FigmaInspection) {
  if (!inspection) return [];
  if (inspection.layers) return inspection.layers.map(layer => ({ ...layer, kind: layer.kind ?? (layer.text !== undefined ? "text" : "component"), nodeType: layer.nodeType ?? (layer.text !== undefined ? "TEXT" : "NODE") }));
  return [...inspection.textLayers.map(layer => ({ ...layer, kind: "text" as const, nodeType: layer.nodeType ?? "TEXT" })), ...(inspection.componentLayers ?? []).map(layer => ({ ...layer, kind: "component" as const, nodeType: layer.nodeType ?? "NODE" }))];
}

function round(value: number) { return Math.round(value * 100) / 100; }
function normalizeText(value = "") { return value.replace(/\s+/g, "").toLowerCase(); }
function normalizeFont(value = "") { return value.split(",")[0].replace(/["']/g, "").trim().toLowerCase(); }
export function normalizeColor(value = "") {
  const normalized = value.trim().toUpperCase();
  const rgb = normalized.match(/^RGBA?\(\s*(\d+)\D+(\d+)\D+(\d+)(?:\D+([\d.]+))?\s*\)$/i);
  if (!rgb) return normalized.replace(/\s*·\s*100%$/, "");
  const hex = [rgb[1], rgb[2], rgb[3]].map(channel => Math.max(0, Math.min(255, Number(channel))).toString(16).padStart(2, "0")).join("").toUpperCase();
  const alpha = rgb[4] === undefined ? 1 : Number(rgb[4]);
  return alpha < .999 ? `#${hex} · ${Math.round(alpha * 100)}%` : `#${hex}`;
}

export function elementProperties(element: SnapshotElement): DevelopmentProperties {
  return {
    fontFamily: element.fontFamily ? element.fontFamily.split(",")[0].replace(/["']/g, "").trim() : undefined,
    fontWeight: element.fontWeight ?? undefined, fontSize: element.fontSize ?? undefined, lineHeight: element.lineHeight ?? undefined,
    letterSpacing: element.letterSpacing ?? undefined, color: element.color ? normalizeColor(element.color) : undefined,
    backgroundColor: element.backgroundColor ? normalizeColor(element.backgroundColor) : undefined,
    borderColor: element.borderColor ? normalizeColor(element.borderColor) : undefined, borderWidth: element.borderWidth ?? undefined,
    borderRadius: element.borderRadius ?? undefined, paddingTop: element.paddingTop ?? undefined, paddingRight: element.paddingRight ?? undefined,
    paddingBottom: element.paddingBottom ?? undefined, paddingLeft: element.paddingLeft ?? undefined, marginTop: element.marginTop ?? undefined,
    marginRight: element.marginRight ?? undefined, marginBottom: element.marginBottom ?? undefined, marginLeft: element.marginLeft ?? undefined,
    gap: element.gap ?? undefined, x: element.x, y: element.y, width: element.width, height: element.height,
  };
}

function distanceScore(layer: FigmaLayer, element: SnapshotElement) {
  const position = Math.hypot(element.x - (layer.x ?? element.x), element.y - (layer.y ?? element.y));
  const size = Math.abs(element.width - (layer.width ?? element.width)) + Math.abs(element.height - (layer.height ?? element.height));
  return Math.max(0, 100 - Math.min(60, position / 8) - Math.min(40, size / 12));
}

function textScore(layer: FigmaLayer, element: SnapshotElement) {
  const target = normalizeText(layer.text); const candidate = normalizeText(element.text);
  if (!target || !candidate) return 0;
  const text = target === candidate ? 100 : target.length > 3 && (target.includes(candidate) || candidate.includes(target)) ? 72 : 0;
  if (!text) return 0;
  const font = normalizeFont(layer.fontFamily ?? "") === normalizeFont(element.fontFamily) ? 100 : 30;
  return round(text * .68 + distanceScore(layer, element) * .22 + font * .1);
}

function expectedElementType(layer: FigmaLayer) {
  const name = layer.name.toLowerCase();
  if (/button|按钮|cta|input|输入|select|选择/.test(name)) return "control";
  if (/image|图片|icon|图标|avatar|logo/.test(name) || ["ELLIPSE", "VECTOR"].includes(layer.nodeType)) return "image";
  return "container";
}

function componentScore(layer: FigmaLayer, element: SnapshotElement) {
  if ((element.elementType ?? "text") === "text") return 0;
  const expected = expectedElementType(layer); const type = element.elementType === expected ? 100 : expected === "container" && element.elementType === "link" ? 55 : 25;
  const geometry = distanceScore(layer, element);
  const designColor = normalizeColor(layer.backgroundColor ?? ""); const actualColor = normalizeColor(element.backgroundColor ?? "");
  const color = designColor && actualColor ? (designColor === actualColor ? 100 : 20) : 50;
  return round(type * .38 + geometry * .47 + color * .15);
}

export function autoMatch(inspection: FigmaInspection, elements: SnapshotElement[]) {
  const values: Record<string, DevelopmentProperties> = {}; const matches: Record<string, MatchRecord> = {}; const used = { text: new Set<number>(), component: new Set<number>() };
  inspectionLayers(inspection).forEach((layer, layerIndex) => {
    const key = layer.id || String(layerIndex); let bestIndex = -1; let bestScore = 0;
    elements.forEach((element, elementIndex) => {
      if (used[layer.kind].has(elementIndex)) return;
      const score = layer.kind === "text" ? textScore(layer, element) : componentScore(layer, element);
      if (score > bestScore) { bestScore = score; bestIndex = elementIndex; }
    });
    const threshold = layer.kind === "text" ? 58 : 48;
    if (bestIndex < 0 || bestScore < threshold) return;
    used[layer.kind].add(bestIndex); values[key] = elementProperties(elements[bestIndex]); matches[key] = { elementIndex: bestIndex, confidence: Math.round(bestScore), method: layer.kind };
  });
  return { values, matches };
}

export function propertyDifferences(layer: FigmaLayer, actual: DevelopmentProperties) {
  const keys = layer.kind === "text" ? textPropertyKeys : componentPropertyKeys;
  return keys.reduce<PropertyDifference[]>((differences, key) => {
    const design = layer[key as keyof FigmaLayer]; const current = actual[key];
    if ((typeof design !== "number" && typeof design !== "string") || (typeof current !== "number" && typeof current !== "string")) return differences;
    if (typeof design === "number" && typeof current === "number") {
      const delta = round(current - design); if (Math.abs(delta) >= .1) differences.push({ key, design, actual: current, delta }); return differences;
    }
    const designText = key.toLowerCase().includes("color") ? normalizeColor(String(design)) : key === "fontFamily" ? normalizeFont(String(design)) : String(design).trim().toLowerCase();
    const actualText = key.toLowerCase().includes("color") ? normalizeColor(String(current)) : key === "fontFamily" ? normalizeFont(String(current)) : String(current).trim().toLowerCase();
    if (designText !== actualText) differences.push({ key, design: String(design), actual: String(current) }); return differences;
  }, []);
}

export function candidateLabel(element: SnapshotElement) {
  const name = element.text?.slice(0, 22) || element.selector || element.tag;
  return `${name} · ${element.elementType ?? element.tag} · ${Math.round(element.width)}×${Math.round(element.height)}`;
}

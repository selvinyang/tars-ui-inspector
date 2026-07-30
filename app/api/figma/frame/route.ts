import { figmaFetch, parseFrameUrl, requireAccessToken } from "../_shared";

type Bounds = { x?: number; y?: number; width?: number; height?: number };
type Color = { r?: number; g?: number; b?: number; a?: number };
type Paint = { type?: string; visible?: boolean; opacity?: number; color?: Color };
type TextStyle = {
  fontFamily?: string;
  fontPostScriptName?: string;
  fontWeight?: number;
  fontSize?: number;
  lineHeightPx?: number;
  lineHeightPercentFontSize?: number;
  letterSpacing?: number;
  textAlignHorizontal?: string;
};
type FigmaNode = {
  id?: string;
  name?: string;
  type?: string;
  characters?: string;
  style?: TextStyle;
  fills?: Paint[] | "MIXED";
  absoluteBoundingBox?: Bounds;
  children?: FigmaNode[];
  characterStyleOverrides?: number[];
  styleOverrideTable?: Record<string, unknown>;
};

const MAX_TEXT_LAYERS = 200;

function round(value: number | undefined, precision = 1) {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

function channel(value = 0) {
  return Math.max(0, Math.min(255, Math.round(value * 255))).toString(16).padStart(2, "0");
}

function paintColor(fills: FigmaNode["fills"]) {
  if (!Array.isArray(fills)) return null;
  const paint = fills.find(item => item.type === "SOLID" && item.visible !== false && item.color);
  if (!paint?.color) return null;
  const alpha = (paint.color.a ?? 1) * (paint.opacity ?? 1);
  const hex = `#${channel(paint.color.r)}${channel(paint.color.g)}${channel(paint.color.b)}`.toUpperCase();
  return alpha < 0.999 ? `${hex} · ${Math.round(alpha * 100)}%` : hex;
}

function inspectText(root: FigmaNode) {
  const rootBox = root.absoluteBoundingBox ?? {};
  const textLayers: Array<Record<string, unknown>> = [];
  let totalTextCount = 0;

  function visit(node: FigmaNode) {
    if (node.type === "TEXT") {
      totalTextCount += 1;
      if (textLayers.length < MAX_TEXT_LAYERS) {
        const box = node.absoluteBoundingBox ?? {};
        const overrideCount = new Set(node.characterStyleOverrides ?? []).size;
        const mixed = overrideCount > 1 || Object.keys(node.styleOverrideTable ?? {}).length > 1;
        textLayers.push({
          id: node.id ?? "",
          name: node.name ?? "未命名文字层",
          text: (node.characters ?? "").replace(/\s+/g, " ").trim(),
          fontFamily: node.style?.fontFamily ?? node.style?.fontPostScriptName ?? "未识别",
          fontWeight: round(node.style?.fontWeight, 0),
          fontSize: round(node.style?.fontSize),
          lineHeight: round(node.style?.lineHeightPx),
          lineHeightPercent: round(node.style?.lineHeightPercentFontSize),
          letterSpacing: round(node.style?.letterSpacing, 2),
          textAlign: node.style?.textAlignHorizontal ?? null,
          color: paintColor(node.fills),
          x: round((box.x ?? 0) - (rootBox.x ?? 0)),
          y: round((box.y ?? 0) - (rootBox.y ?? 0)),
          width: round(box.width),
          height: round(box.height),
          mixed,
          styleVariants: Math.max(overrideCount, Object.keys(node.styleOverrideTable ?? {}).length),
        });
      }
    }
    node.children?.forEach(visit);
  }

  visit(root);
  const fontCounts = new Map<string, number>();
  textLayers.forEach(layer => {
    const family = String(layer.fontFamily);
    fontCounts.set(family, (fontCounts.get(family) ?? 0) + 1);
  });

  return {
    textCount: totalTextCount,
    returnedTextCount: textLayers.length,
    fontFamilies: [...fontCounts.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
    textLayers,
    warnings: totalTextCount > MAX_TEXT_LAYERS ? [`文字图层较多，当前仅展示前 ${MAX_TEXT_LAYERS} 个。`] : [],
  };
}

export async function GET(request: Request) {
  try {
    const { fileKey, nodeId } = parseFrameUrl(new URL(request.url).searchParams.get("url") ?? "");
    const accessToken = requireAccessToken(request);
    const response = await figmaFetch(`/files/${fileKey}/nodes?ids=${encodeURIComponent(nodeId)}`, accessToken);
    const data = await response.json() as { name?: string; nodes?: Record<string, { document?: FigmaNode }> };
    const document = data.nodes?.[nodeId]?.document;
    if (!document) throw new Error("链接指向的 Frame 不存在");
    const bounds = document.absoluteBoundingBox;
    return Response.json({
      fileKey,
      nodeId,
      fileName: data.name ?? "Figma 文件",
      name: document.name ?? "未命名 Frame",
      type: document.type ?? "NODE",
      width: Math.round(bounds?.width ?? 0),
      height: Math.round(bounds?.height ?? 0),
      imagePath: `/api/figma/frame/image?fileKey=${encodeURIComponent(fileKey)}&nodeId=${encodeURIComponent(nodeId)}`,
      inspection: inspectText(document),
    });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "无法读取 Figma Frame" }, { status: 400 });
  }
}

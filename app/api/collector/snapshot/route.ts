import { corsHeaders, getSnapshot, saveSnapshot, type CollectedElement, validCollectorId } from "../_store";

export function OPTIONS() { return new Response(null, { status: 204, headers: corsHeaders }); }

export async function POST(request: Request) {
  try {
    const id = new URL(request.url).searchParams.get("id") ?? "";
    if (!validCollectorId(id)) throw new Error("采集会话无效");
    const length = Number(request.headers.get("content-length") ?? 0);
    if (length > 1_500_000) throw new Error("页面属性数据过大");
    const body = await request.json() as Record<string, unknown>;
    const elements = Array.isArray(body.elements) ? body.elements.slice(0, 500).filter((item): item is CollectedElement => !!item && typeof item === "object" && typeof (item as CollectedElement).text === "string") : [];
    saveSnapshot({ id, url: String(body.url ?? ""), title: String(body.title ?? ""), capturedAt: new Date().toISOString(), viewportWidth: Number(body.viewportWidth) || 0, viewportHeight: Number(body.viewportHeight) || 0, pageWidth: Number(body.pageWidth) || 0, pageHeight: Number(body.pageHeight) || 0, elements });
    return Response.json({ ok: true, elements: elements.length }, { headers: corsHeaders });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "无法保存页面属性" }, { status: 400, headers: corsHeaders }); }
}

export function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("id") ?? "";
  if (!validCollectorId(id)) return Response.json({ error: "采集会话无效" }, { status: 400, headers: corsHeaders });
  const snapshot = getSnapshot(id);
  return snapshot ? Response.json(snapshot, { headers: corsHeaders }) : Response.json({ connected: false }, { status: 404, headers: corsHeaders });
}

import { figmaFetch, parseFrameUrl, requireAccessToken } from "../_shared";

export async function GET(request: Request) {
  try {
    const { fileKey, nodeId } = parseFrameUrl(new URL(request.url).searchParams.get("url") ?? "");
    const accessToken = requireAccessToken(request);
    const response = await figmaFetch(`/files/${fileKey}/nodes?ids=${encodeURIComponent(nodeId)}`, accessToken);
    const data = await response.json() as { name?: string; nodes?: Record<string, { document?: { id?: string; name?: string; type?: string; absoluteBoundingBox?: { width: number; height: number } } }> };
    const document = data.nodes?.[nodeId]?.document;
    if (!document) throw new Error("链接指向的 Frame 不存在");
    const bounds = document.absoluteBoundingBox;
    return Response.json({ fileKey, nodeId, fileName: data.name ?? "Figma 文件", name: document.name ?? "未命名 Frame", type: document.type ?? "NODE", width: Math.round(bounds?.width ?? 0), height: Math.round(bounds?.height ?? 0), imagePath: `/api/figma/frame/image?fileKey=${encodeURIComponent(fileKey)}&nodeId=${encodeURIComponent(nodeId)}` });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "无法读取 Figma Frame" }, { status: 400 });
  }
}

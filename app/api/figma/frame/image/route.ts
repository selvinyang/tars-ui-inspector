import { figmaFetch, requireAccessToken } from "../../_shared";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const fileKey = url.searchParams.get("fileKey") ?? "";
    const nodeId = url.searchParams.get("nodeId") ?? "";
    if (!/^[A-Za-z0-9_-]+$/.test(fileKey) || !/^[A-Za-z0-9:;_-]+$/.test(nodeId)) throw new Error("Frame 参数无效");
    const accessToken = requireAccessToken(request);
    const renderResponse = await figmaFetch(`/images/${fileKey}?ids=${encodeURIComponent(nodeId)}&format=png&scale=1`, accessToken);
    const render = await renderResponse.json() as { images?: Record<string, string | null> };
    const imageUrl = render.images?.[nodeId];
    if (!imageUrl) throw new Error("Figma 无法渲染该 Frame");
    const image = await fetch(imageUrl);
    if (!image.ok) throw new Error("无法下载 Figma Frame 图片");
    return new Response(image.body, { headers: { "Content-Type": image.headers.get("content-type") ?? "image/png", "Cache-Control": "private, max-age=60" } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "无法导出 Figma Frame" }, { status: 400 });
  }
}

const ACCESS_COOKIE = "tars_figma_access";
const REFRESH_COOKIE = "tars_figma_refresh";
const STATE_COOKIE = "tars_figma_state";
const VERIFIER_COOKIE = "tars_figma_verifier";

export const figmaCookies = { access: ACCESS_COOKIE, refresh: REFRESH_COOKIE, state: STATE_COOKIE, verifier: VERIFIER_COOKIE };

export function getCookie(request: Request, name: string) {
  const cookies = request.headers.get("cookie") ?? "";
  const value = cookies.split(";").map(item => item.trim()).find(item => item.startsWith(`${name}=`))?.slice(name.length + 1);
  return value ? decodeURIComponent(value) : null;
}

export function cookie(name: string, value: string, maxAge: number) {
  return `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`;
}

export function clearCookie(name: string) { return `${name}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`; }

export function figmaConfig(request: Request) {
  const clientId = process.env.FIGMA_CLIENT_ID;
  const clientSecret = process.env.FIGMA_CLIENT_SECRET;
  const redirectUri = process.env.FIGMA_REDIRECT_URI || `${new URL(request.url).origin}/api/figma/callback`;
  if (!clientId || !clientSecret) throw new Error("Figma OAuth 尚未配置，请先填写 .env.local");
  return { clientId, clientSecret, redirectUri };
}

export function parseFrameUrl(value: string) {
  let url: URL;
  try { url = new URL(value); } catch { throw new Error("请输入完整的 Figma Frame 链接"); }
  if (url.hostname !== "www.figma.com" && url.hostname !== "figma.com") throw new Error("仅支持 figma.com 链接");
  const match = url.pathname.match(/^\/(?:design|file|proto|board)\/([^/]+)/);
  const nodeParam = url.searchParams.get("node-id");
  if (!match?.[1] || !nodeParam) throw new Error("链接中缺少文件 Key 或 node-id，请复制具体 Frame 的链接");
  const nodeId = decodeURIComponent(nodeParam).replace(/-/g, ":");
  if (!/^[A-Za-z0-9_-]+$/.test(match[1]) || !/^[A-Za-z0-9:;_-]+$/.test(nodeId)) throw new Error("Figma 链接格式不正确");
  return { fileKey: match[1], nodeId };
}

export async function figmaFetch(path: string, accessToken: string) {
  const response = await fetch(`https://api.figma.com/v1${path}`, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (response.status === 401 || response.status === 403) throw new Error("Figma 授权已失效或无权访问该文件");
  if (response.status === 404) throw new Error("找不到该 Figma 文件或 Frame");
  if (response.status === 429) throw new Error("Figma API 请求过于频繁，请稍后重试");
  if (!response.ok) throw new Error(`Figma API 请求失败（${response.status}）`);
  return response;
}

export function requireAccessToken(request: Request) {
  const token = getCookie(request, ACCESS_COOKIE);
  if (!token) throw new Error("请先连接 Figma");
  return token;
}

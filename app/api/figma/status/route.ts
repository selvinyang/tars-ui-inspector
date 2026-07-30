import { clearCookie, figmaCookies, figmaFetch, requireAccessToken } from "../_shared";

export async function GET(request: Request) {
  try {
    const response = await figmaFetch("/me", requireAccessToken(request));
    const user = await response.json() as { handle?: string; email?: string };
    return Response.json({ connected: true, user: { name: user.handle ?? "Figma 用户", email: user.email ?? "" } });
  } catch (error) {
    return Response.json({ connected: false, error: error instanceof Error ? error.message : "Figma 未连接" });
  }
}

export async function DELETE() {
  const headers = new Headers();
  headers.append("Set-Cookie", clearCookie(figmaCookies.access));
  headers.append("Set-Cookie", clearCookie(figmaCookies.refresh));
  return new Response(null, { status: 204, headers });
}

import { clearCookie, cookie, figmaConfig, figmaCookies, getCookie } from "../_shared";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  try {
    const code = requestUrl.searchParams.get("code");
    const returnedState = requestUrl.searchParams.get("state");
    const expectedState = getCookie(request, figmaCookies.state);
    const verifier = getCookie(request, figmaCookies.verifier);
    if (!code || !returnedState || returnedState !== expectedState || !verifier) throw new Error("Figma 授权状态校验失败，请重新连接");
    const { clientId, clientSecret, redirectUri } = figmaConfig(request);
    const body = new URLSearchParams({ redirect_uri: redirectUri, code, grant_type: "authorization_code", code_verifier: verifier });
    const tokenResponse = await fetch("https://api.figma.com/v1/oauth/token", { method: "POST", headers: { Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`, "Content-Type": "application/x-www-form-urlencoded" }, body });
    if (!tokenResponse.ok) throw new Error("Figma 授权码交换失败，请检查 OAuth 配置");
    const tokens = await tokenResponse.json() as { access_token: string; refresh_token?: string; expires_in?: number };
    const headers = new Headers({ Location: "/?figma=connected" });
    headers.append("Set-Cookie", cookie(figmaCookies.access, tokens.access_token, tokens.expires_in ?? 7776000));
    if (tokens.refresh_token) headers.append("Set-Cookie", cookie(figmaCookies.refresh, tokens.refresh_token, 31536000));
    headers.append("Set-Cookie", clearCookie(figmaCookies.state));
    headers.append("Set-Cookie", clearCookie(figmaCookies.verifier));
    return new Response(null, { status: 302, headers });
  } catch (error) {
    const message = encodeURIComponent(error instanceof Error ? error.message : "Figma 授权失败");
    return Response.redirect(`${requestUrl.origin}/?figma_error=${message}`, 302);
  }
}

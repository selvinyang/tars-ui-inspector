import { cookie, figmaConfig, figmaCookies } from "../_shared";

function randomValue() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Buffer.from(bytes).toString("base64url");
}

export async function GET(request: Request) {
  try {
    const { clientId, redirectUri } = figmaConfig(request);
    const state = randomValue();
    const verifier = randomValue();
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
    const challenge = Buffer.from(digest).toString("base64url");
    const url = new URL("https://www.figma.com/oauth");
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("scope", "file_content:read current_user:read");
    url.searchParams.set("state", state);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("code_challenge", challenge);
    url.searchParams.set("code_challenge_method", "S256");
    const headers = new Headers({ Location: url.toString() });
    headers.append("Set-Cookie", cookie(figmaCookies.state, state, 600));
    headers.append("Set-Cookie", cookie(figmaCookies.verifier, verifier, 600));
    return new Response(null, { status: 302, headers });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "无法开始 Figma 授权" }, { status: 500 });
  }
}

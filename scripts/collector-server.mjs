import http from "node:http";

const port = 3001;
const snapshots = new Map();
const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Private-Network": "true",
  "Cache-Control": "no-store",
};
const validId = id => /^[a-zA-Z0-9-]{8,80}$/.test(id);
const json = (response, status, body) => { response.writeHead(status, { ...headers, "Content-Type": "application/json; charset=utf-8" }); response.end(JSON.stringify(body)); };

const server = http.createServer((request, response) => {
  const url = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);
  if (request.method === "OPTIONS") { response.writeHead(204, headers); return response.end(); }
  if (url.pathname === "/health") return json(response, 200, { ok: true });
  if (url.pathname !== "/snapshot") return json(response, 404, { error: "Not found" });
  const id = url.searchParams.get("id") || "";
  if (!validId(id)) return json(response, 400, { error: "采集会话无效" });
  if (request.method === "GET") {
    const snapshot = snapshots.get(id);
    return snapshot ? json(response, 200, snapshot) : json(response, 404, { connected: false });
  }
  if (request.method !== "POST") return json(response, 405, { error: "Method not allowed" });
  let body = "";
  request.on("data", chunk => { body += chunk; if (body.length > 15_000_000) request.destroy(); });
  request.on("end", () => {
    try {
      const data = JSON.parse(body); const elements = Array.isArray(data.elements) ? data.elements.slice(0, 500) : [];
      const screenshot = typeof data.screenshot === "string" && /^data:image\/(jpeg|png|webp);base64,/.test(data.screenshot) ? data.screenshot : "";
      const snapshot = { id, url: String(data.url || ""), title: String(data.title || ""), capturedAt: new Date().toISOString(), viewportWidth: Number(data.viewportWidth) || 0, viewportHeight: Number(data.viewportHeight) || 0, pageWidth: Number(data.pageWidth) || 0, pageHeight: Number(data.pageHeight) || 0, screenshot, elements };
      snapshots.set(id, snapshot); while (snapshots.size > 20) snapshots.delete(snapshots.keys().next().value);
      json(response, 200, { ok: true, elements: elements.length });
    } catch { json(response, 400, { error: "页面属性数据格式不正确" }); }
  });
});

server.listen(port, "127.0.0.1", () => console.log(`TARS collector ready: http://localhost:${port}`));

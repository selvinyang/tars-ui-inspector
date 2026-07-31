import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(new Request("http://localhost/", { headers: { accept: "text/html" } }), { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } }, { waitUntil() {}, passThroughOnException() {} });
}

test("server-renders the TARS UI Inspector workspace", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /<title>TARS UI Inspector<\/title>/i);
  assert.match(html, /配置走查环境/);
  assert.match(html, /属性检查/);
  assert.match(html, /上传页面截图/);
  assert.match(html, /导出问题清单/);
});

test("includes component inspection and downloadable collector assets", async () => {
  const [workspace, model, figmaRoute, extension] = await Promise.all([
    readFile(new URL("../app/workspace.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/inspection-model.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/figma/frame/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../chrome-extension/popup.js", import.meta.url), "utf8"),
  ]);
  assert.match(workspace, /onRematch/);
  assert.match(workspace, /置信度/);
  assert.match(model, /function autoMatch/);
  assert.match(model, /borderRadius/);
  assert.match(figmaRoute, /componentLayers/);
  assert.match(extension, /backgroundColor/);
  assert.match(extension, /paddingTop/);
  await access(new URL("../public/tars-ui-inspector-chrome-extension.zip", import.meta.url));
});

const sessionInput = document.querySelector("#session");
const serverInput = document.querySelector("#server");
const captureButton = document.querySelector("#capture");
const status = document.querySelector("#status");

chrome.storage.local.get(["sessionId", "serverUrl"], saved => {
  sessionInput.value = saved.sessionId || "";
  serverInput.value = saved.serverUrl || "http://localhost:3000";
});

function setStatus(message, kind = "") { status.textContent = message; status.className = kind; }

function captureVisibleText() {
  const number = value => { const parsed = Number.parseFloat(value); return Number.isFinite(parsed) ? Math.round(parsed * 100) / 100 : null; };
  const directText = element => Array.from(element.childNodes).filter(node => node.nodeType === Node.TEXT_NODE).map(node => node.textContent || "").join(" ").replace(/\s+/g, " ").trim();
  const elements = [];
  for (const element of document.body.querySelectorAll("*")) {
    if (elements.length >= 500) break;
    const text = directText(element); if (!text) continue;
    const rect = element.getBoundingClientRect(); const style = getComputedStyle(element);
    if (rect.width <= 0 || rect.height <= 0 || style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0) continue;
    elements.push({ text, tag: element.tagName.toLowerCase(), fontFamily: style.fontFamily, fontWeight: number(style.fontWeight), fontSize: number(style.fontSize), lineHeight: style.lineHeight === "normal" ? null : number(style.lineHeight), letterSpacing: style.letterSpacing === "normal" ? 0 : number(style.letterSpacing), color: style.color, x: Math.round((rect.left + scrollX) * 100) / 100, y: Math.round((rect.top + scrollY) * 100) / 100, width: Math.round(rect.width * 100) / 100, height: Math.round(rect.height * 100) / 100 });
  }
  return { url: location.href, title: document.title, viewportWidth: innerWidth, viewportHeight: innerHeight, pageWidth: document.documentElement.scrollWidth, pageHeight: document.documentElement.scrollHeight, elements };
}

captureButton.addEventListener("click", async () => {
  const sessionId = sessionInput.value.trim(); const serverUrl = serverInput.value.trim().replace(/\/$/, "");
  if (!/^[a-zA-Z0-9-]{8,80}$/.test(sessionId)) return setStatus("请先从 Inspector 复制有效的会话 ID。", "error");
  if (!/^http:\/\/(localhost|127\.0\.0\.1):3000$/.test(serverUrl)) return setStatus("本地地址应为 http://localhost:3000。", "error");
  captureButton.disabled = true; setStatus("正在读取当前页面…");
  try {
    await chrome.storage.local.set({ sessionId, serverUrl });
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id || !/^https?:/.test(tab.url || "")) throw new Error("请在普通 http/https 网页中使用扩展");
    const [{ result }] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: captureVisibleText });
    const response = await fetch(`${serverUrl}/api/collector/snapshot?id=${encodeURIComponent(sessionId)}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(result) });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || `本地服务返回 ${response.status}`);
    setStatus(`采集成功：${payload.elements} 个文字元素。现在返回 Inspector 点击“检查连接并匹配”。`, "success");
  } catch (error) {
    const message = String(error?.message || error);
    setStatus(message.includes("Cannot access") ? "Chrome 不允许读取这个页面，请切换到普通网站页面后重试。" : message.includes("Failed to fetch") ? "无法连接本地 Inspector，请确认本地服务正在运行。" : message, "error");
  } finally { captureButton.disabled = false; }
});

const sessionInput = document.querySelector("#session");
const serverInput = document.querySelector("#server");
const captureButton = document.querySelector("#capture");
const status = document.querySelector("#status");

chrome.storage.local.get(["sessionId", "serverUrl"], saved => {
  sessionInput.value = saved.sessionId || "";
  serverInput.value = !saved.serverUrl || /:3000$/.test(saved.serverUrl) ? "http://localhost:3001" : saved.serverUrl;
});

function setStatus(message, kind = "") { status.textContent = message; status.className = kind; }

function captureVisibleText() {
  const number = value => { const parsed = Number.parseFloat(value); return Number.isFinite(parsed) ? Math.round(parsed * 100) / 100 : null; };
  const directText = element => Array.from(element.childNodes).filter(node => node.nodeType === Node.TEXT_NODE).map(node => node.textContent || "").join(" ").replace(/\s+/g, " ").trim();
  const selector = element => { const id = element.id ? `#${CSS.escape(element.id)}` : ""; const classes = [...element.classList].slice(0, 2).map(value => `.${CSS.escape(value)}`).join(""); return `${element.tagName.toLowerCase()}${id}${classes}`; };
  const elementType = element => { const tag = element.tagName.toLowerCase(); const role = element.getAttribute("role") || ""; if (["button", "input", "select", "textarea"].includes(tag) || role === "button") return "control"; if (tag === "img" || tag === "svg") return "image"; if (tag === "a") return "link"; return directText(element) ? "text" : "container"; };
  const elements = [];
  for (const element of document.body.querySelectorAll("*")) {
    if (elements.length >= 800) break;
    const text = directText(element); const tag = element.tagName.toLowerCase();
    const rect = element.getBoundingClientRect(); const style = getComputedStyle(element);
    if (rect.width <= 0 || rect.height <= 0 || style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0) continue;
    const borderWidth = Math.max(number(style.borderTopWidth) || 0, number(style.borderRightWidth) || 0, number(style.borderBottomWidth) || 0, number(style.borderLeftWidth) || 0);
    const borderRadius = Math.max(number(style.borderTopLeftRadius) || 0, number(style.borderTopRightRadius) || 0, number(style.borderBottomRightRadius) || 0, number(style.borderBottomLeftRadius) || 0);
    const visual = style.backgroundColor !== "rgba(0, 0, 0, 0)" || borderWidth > 0 || borderRadius > 0 || ["button", "input", "select", "textarea", "img", "svg", "a"].includes(tag) || !!element.getAttribute("role");
    if (!text && !visual) continue;
    elements.push({ text, tag, selector: selector(element), parentSelector: element.parentElement ? selector(element.parentElement) : "", role: element.getAttribute("role") || "", elementType: elementType(element), fontFamily: style.fontFamily, fontWeight: number(style.fontWeight), fontSize: text ? number(style.fontSize) : null, lineHeight: text && style.lineHeight !== "normal" ? number(style.lineHeight) : null, letterSpacing: text ? (style.letterSpacing === "normal" ? 0 : number(style.letterSpacing)) : null, color: style.color, backgroundColor: style.backgroundColor, borderColor: style.borderTopColor, borderWidth, borderRadius, paddingTop: number(style.paddingTop), paddingRight: number(style.paddingRight), paddingBottom: number(style.paddingBottom), paddingLeft: number(style.paddingLeft), marginTop: number(style.marginTop), marginRight: number(style.marginRight), marginBottom: number(style.marginBottom), marginLeft: number(style.marginLeft), gap: number(style.gap), x: Math.round((rect.left + scrollX) * 100) / 100, y: Math.round((rect.top + scrollY) * 100) / 100, width: Math.round(rect.width * 100) / 100, height: Math.round(rect.height * 100) / 100 });
  }
  return { url: location.href, title: document.title, viewportWidth: innerWidth, viewportHeight: innerHeight, pageWidth: document.documentElement.scrollWidth, pageHeight: document.documentElement.scrollHeight, elements };
}

captureButton.addEventListener("click", async () => {
  const sessionId = sessionInput.value.trim(); const serverUrl = serverInput.value.trim().replace(/\/$/, "");
  if (!/^[a-zA-Z0-9-]{8,80}$/.test(sessionId)) return setStatus("请先从 Inspector 复制有效的会话 ID。", "error");
  if (!/^http:\/\/(localhost|127\.0\.0\.1):3001$/.test(serverUrl)) return setStatus("本地地址应为 http://localhost:3001。", "error");
  captureButton.disabled = true; setStatus("正在读取当前页面…");
  try {
    const serverOrigin = `${new URL(serverUrl).origin}/*`;
    const hasServerPermission = await chrome.permissions.contains({ origins: [serverOrigin] });
    if (!hasServerPermission) {
      setStatus("请在 Chrome 弹窗中允许访问本地采集服务…");
      const granted = await chrome.permissions.request({ origins: [serverOrigin] });
      if (!granted) throw new Error("未获得本地服务访问权限，请允许后重试。");
    }
    await chrome.storage.local.set({ sessionId, serverUrl });
    const healthResponse = await fetch(`${serverUrl}/health`, { targetAddressSpace: "loopback" });
    if (!healthResponse.ok) throw new Error(`本地采集服务健康检查失败（${healthResponse.status}）`);
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id || !/^https?:/.test(tab.url || "")) throw new Error("请在普通 http/https 网页中使用扩展");
    const [{ result }] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: captureVisibleText });
    const screenshot = await chrome.tabs.captureVisibleTab(tab.windowId, { format: "jpeg", quality: 88 });
    result.screenshot = screenshot;
    const response = await fetch(`${serverUrl}/snapshot?id=${encodeURIComponent(sessionId)}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(result), targetAddressSpace: "loopback" });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || `本地采集服务返回 ${response.status}`);
    setStatus(`采集成功：页面截图和 ${payload.elements} 个可检查元素。现在返回 Inspector 点击“检查连接并匹配”。`, "success");
  } catch (error) {
    const message = String(error?.message || error);
    setStatus(message.includes("Cannot access") ? "Chrome 不允许读取这个页面，请切换到普通网站页面后重试。" : message.includes("Failed to fetch") ? `Chrome 无法访问 ${serverUrl}。请确认扩展已获得本地网站权限。` : message, "error");
  } finally { captureButton.disabled = false; }
});

"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent, type PointerEvent as ReactPointerEvent } from "react";
import { devices, initialIssues, issueTypes, pages as initialPages } from "./data";
import type { CompareMode, DesignAsset, DeviceGroup, Issue, IssueType, PageItem, Priority } from "./types";
import { Button, Field, IconButton, Input, Segmented, Select } from "./ui";
import { deleteImage, loadImages, saveImage, type ImageKind } from "./image-store";
import { DiffCanvas, ImageSurface, type Alignment, type DifferenceRegion } from "./comparison";

const modeOptions = [
  { value: "actual", label: "实际网页", short: "实际" }, { value: "design", label: "设计稿", short: "设计" },
  { value: "split", label: "左右对比", short: "并排" }, { value: "overlay", label: "透明叠加", short: "叠加" },
  { value: "diff", label: "差异高亮", short: "差异" },
] as { value: CompareMode; label: string; short: string }[];

type FigmaFrame = { fileKey: string; nodeId: string; fileName: string; name: string; type: string; width: number; height: number; imagePath: string };
type FigmaStatus = { connected: boolean; user?: { name: string; email: string }; error?: string };

function BrandLogo() {
  // This bundled SVG is a tiny local UI asset and does not need image optimization.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="./logo.svg" alt="" width="26" height="22" />;
}

function CanvasEmpty({ kind = "both" }: { kind?: "actual" | "design" | "both" }) {
  const copy = kind === "actual" ? "尚未上传页面截图" : kind === "design" ? "尚未上传设计稿" : "页面内容尚未准备";
  return <div className="canvas-empty"><span aria-hidden="true"></span><b>{copy}</b><p>{kind === "both" ? "请使用顶部按钮上传页面截图或设计稿" : `请使用顶部“上传${kind === "actual" ? "页面截图" : "设计稿"}”按钮`}</p></div>;
}

function DesignView({ asset }: { asset?: DesignAsset }) {
  return asset ? <ImageSurface asset={asset} label={`参考设计稿 ${asset.name}`} className="uploaded-design" /> : <CanvasEmpty kind="design" />;
}

function ActualView({ asset }: { asset?: DesignAsset }) { return asset ? <ImageSurface asset={asset} label={`实际页面 ${asset.name}`} /> : <CanvasEmpty kind="actual" />; }

function CanvasContent({ mode, opacity, design, actual, alignment, zoom, onScore, onRegions }: { mode: CompareMode; opacity: number; design?: DesignAsset; actual?: DesignAsset; alignment: Alignment; zoom: number; onScore: (score: number) => void; onRegions: (regions: DifferenceRegion[]) => void }) {
  if (!actual && !design) return <CanvasEmpty />;
  if (mode === "actual") return <ActualView asset={actual} />;
  if (mode === "design") return <DesignView asset={design} />;
  if (mode === "split") return <div className="split-view"><div><label>设计稿</label><DesignView asset={design} /></div><div><label>实际页面</label><ActualView asset={actual} /></div></div>;
  if (mode === "diff" && actual && design) return <DiffCanvas actual={actual} design={design} alignment={alignment} zoom={zoom} onScore={onScore} onRegions={onRegions} />;
  return <div className={`layer-view ${mode === "diff" ? "layer-view--diff" : ""}`}><ActualView asset={actual} />{design && <div className="design-layer" style={{ opacity: mode === "diff" ? .72 : opacity / 100, transform: `translate(${alignment.x}px, ${alignment.y}px) scale(${alignment.scale})`, transformOrigin: "top left" }}><DesignView asset={design} /></div>}{mode === "diff" && <div className="diff-note">上传两张图片后启用真实差异</div>}</div>;
}

function IssueThumbnail({ src, label }: { src: string; label: string }) {
  // Local canvas output cannot use the hosted image optimizer.
  // eslint-disable-next-line @next/next/no-img-element
  return <img className="issue-thumbnail" src={src} alt={label} />;
}

const priorityNames: Record<Priority, string> = { P0: "阻塞", P1: "严重", P2: "一般", P3: "建议" };
function issueText(issue: Issue, pages: PageItem[]) {
  const page = pages.find(p => p.id === issue.pageId); const device = devices.find(d => d.id === issue.deviceId);
  const width = issue.canvasWidth ?? device?.width ?? 0; const height = issue.canvasHeight ?? device?.height ?? 0; const left = Math.round(width * issue.x / 100); const top = Math.round(height * issue.y / 100);
  return `问题：${issue.title}\n优先级：${issue.priority} ${priorityNames[issue.priority]}\n类型：${issue.type}\n页面：${page?.name ?? "未知页面"}\n地址：${page?.url ?? ""}\n设备：${device?.group ?? ""} ${device?.width ?? 0} × ${device?.height ?? 0}\n位置：距左 ${left}px / 距顶 ${top}px（横向 ${Math.round(issue.x)}% / 纵向 ${Math.round(issue.y)}%）\n描述：${issue.description || "暂无描述"}`;
}

function PageForm({ onSave, onCancel }: { onSave: (page: PageItem) => void; onCancel: () => void }) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("https://");
  const [error, setError] = useState("");
  function submit() {
    try {
      const normalizedUrl = new URL(url.trim()).toString();
      onSave({ id: `page-${Date.now()}`, name: name.trim(), url: normalizedUrl });
    } catch { setError("请输入完整的 http:// 或 https:// 页面地址"); }
  }
  return <div className="dialog-backdrop" role="presentation" onMouseDown={onCancel}><div className="dialog page-dialog" role="dialog" aria-modal="true" aria-labelledby="page-dialog-title" onMouseDown={e => e.stopPropagation()}>
    <h2 id="page-dialog-title">添加检查页面</h2><p>页面会保存在当前浏览器中，稍后可分别上传页面截图和设计稿。</p>
    <Field label="页面名称"><Input autoFocus value={name} placeholder="例如：活动详情页" onChange={e => setName(e.target.value)} /></Field>
    <Field label="页面地址"><Input value={url} aria-invalid={!!error} placeholder="https://example.com/page" onChange={e => { setUrl(e.target.value); setError(""); }} />{error && <small className="field-error">{error}</small>}</Field>
    <div className="dialog-actions"><Button variant="ghost" onClick={onCancel}>取消</Button><Button variant="primary" disabled={!name.trim() || !url.trim()} onClick={submit}>添加页面</Button></div>
  </div></div>;
}

function IssueForm({ issue, onSave, onCancel }: { issue: Issue; onSave: (i: Issue) => void; onCancel: () => void }) {
  const [draft, setDraft] = useState(issue);
  const formDevice = devices.find(device => device.id === issue.deviceId); const left = Math.round((issue.canvasWidth ?? formDevice?.width ?? 0) * issue.x / 100); const top = Math.round((issue.canvasHeight ?? formDevice?.height ?? 0) * issue.y / 100);
  return <div className="issue-form">
    <div className="panel-heading"><div><small>标注 #{issue.id}</small><h2>{issue.title === "未命名问题" ? "记录 UI 问题" : "编辑问题"}</h2></div><IconButton label="关闭" onClick={onCancel}>×</IconButton></div>
    <div className="form-meta"><span>距左 {left}px / 距顶 {top}px</span><span>{Math.round(issue.x)}% / {Math.round(issue.y)}%</span></div>
    <Field label="问题标题"><Input autoFocus value={draft.title === "未命名问题" ? "" : draft.title} placeholder="一句话描述问题" onChange={e => setDraft({ ...draft, title: e.target.value })} /></Field>
    <Field label="问题描述"><textarea className="textarea" rows={5} value={draft.description} placeholder="说明当前表现、设计预期与修改建议…" onChange={e => setDraft({ ...draft, description: e.target.value })} /></Field>
    <div className="form-grid"><Field label="问题类型"><Select value={draft.type} onChange={e => setDraft({ ...draft, type: e.target.value as IssueType })}>{issueTypes.map(t => <option key={t}>{t}</option>)}</Select></Field><Field label="优先级"><Select value={draft.priority} onChange={e => setDraft({ ...draft, priority: e.target.value as Priority })}>{["P0", "P1", "P2", "P3"].map(p => <option key={p} value={p}>{p} {p === "P0" ? "阻塞" : p === "P1" ? "严重" : p === "P2" ? "一般" : "建议"}</option>)}</Select></Field></div>
    <div className="form-actions"><Button variant="ghost" onClick={onCancel}>取消</Button><Button variant="primary" disabled={!draft.title.trim()} onClick={() => onSave({ ...draft, title: draft.title.trim() })}>保存问题</Button></div>
  </div>;
}

export function InspectorWorkspace() {
  const [projectPages, setProjectPages] = useState<PageItem[]>(initialPages);
  const [pageId, setPageId] = useState("blank-page");
  const [deviceId, setDeviceId] = useState("desktop-1440");
  const [mode, setMode] = useState<CompareMode>("actual");
  const [zoom, setZoom] = useState(58);
  const [opacity, setOpacity] = useState(50);
  const [issues, setIssues] = useState<Issue[]>(initialIssues);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [editing, setEditing] = useState<Issue | null>(null);
  const [query, setQuery] = useState("");
  const [priority, setPriority] = useState("all");
  const [type, setType] = useState("all");
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [panning, setPanning] = useState(false);
  const [designs, setDesigns] = useState<Record<string, DesignAsset>>({});
  const [actuals, setActuals] = useState<Record<string, DesignAsset>>({});
  const [alignments, setAlignments] = useState<Record<string, Alignment>>({});
  const [diffScore, setDiffScore] = useState<number | null>(null);
  const [diffRegions, setDiffRegions] = useState<DifferenceRegion[]>([]);
  const [draggingFile, setDraggingFile] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [pageDialogOpen, setPageDialogOpen] = useState(false);
  const [figmaOpen, setFigmaOpen] = useState(false);
  const [figmaUrl, setFigmaUrl] = useState("");
  const [figmaStatus, setFigmaStatus] = useState<FigmaStatus | null>(null);
  const [figmaFrame, setFigmaFrame] = useState<FigmaFrame | null>(null);
  const [figmaLoading, setFigmaLoading] = useState(false);
  const [figmaError, setFigmaError] = useState("");
  const [staticHosting] = useState(() => typeof window !== "undefined" && window.location.hostname.endsWith("github.io"));
  const [pageToDelete, setPageToDelete] = useState<PageItem | null>(null);
  const designInput = useRef<HTMLInputElement>(null);
  const actualInput = useRef<HTMLInputElement>(null);
  const canvasStage = useRef<HTMLDivElement>(null);
  const storageReady = useRef(false);
  const drag = useRef({ x: 0, y: 0, px: 0, py: 0 });
  const device = devices.find(d => d.id === deviceId) ?? devices[0];
  const currentPage = projectPages.find(p => p.id === pageId) ?? projectPages[0];
  const alignment = alignments[pageId] ?? { x: 0, y: 0, scale: 1 };
  const assetHeight = (asset?: DesignAsset) => asset ? device.width * asset.height / asset.width : device.height;
  const canvasHeight = Math.max(device.height, mode === "actual" ? assetHeight(actuals[pageId]) : mode === "design" ? assetHeight(designs[pageId]) : assetHeight(actuals[pageId]), mode === "actual" ? device.height : assetHeight(designs[pageId]));

  useEffect(() => { const raw = localStorage.getItem("tars-inspector-v2"); queueMicrotask(() => { if (raw) { try { const v = JSON.parse(raw); const savedPages = Array.isArray(v.pages) && v.pages.length ? v.pages as PageItem[] : initialPages; setProjectPages(savedPages); if (Array.isArray(v.issues)) setIssues(v.issues); if (v.pageId) setPageId(savedPages.some(page => page.id === v.pageId) ? v.pageId : savedPages[0].id); if (v.deviceId) setDeviceId(devices.some(d => d.id === v.deviceId) ? v.deviceId : "desktop-1440"); if (v.alignments && typeof v.alignments === "object") setAlignments(v.alignments); } catch {} } storageReady.current = true; }); loadImages().then(items => { const nextDesigns: Record<string, DesignAsset> = {}; const nextActuals: Record<string, DesignAsset> = {}; items.forEach(item => { (item.kind === "design" ? nextDesigns : nextActuals)[item.pageId] = item.asset; }); setDesigns(nextDesigns); setActuals(nextActuals); }).catch(() => showToast("本地图片库读取失败")); }, []);
  useEffect(() => { const clearDragState = () => setDraggingFile(false); window.addEventListener("dragend", clearDragState); window.addEventListener("drop", clearDragState); window.addEventListener("blur", clearDragState); return () => { window.removeEventListener("dragend", clearDragState); window.removeEventListener("drop", clearDragState); window.removeEventListener("blur", clearDragState); }; }, []);
  useEffect(() => { if (!storageReady.current) return; localStorage.setItem("tars-inspector-v2", JSON.stringify({ pages: projectPages, issues, pageId, deviceId, alignments })); }, [projectPages, issues, pageId, deviceId, alignments]);
  const visibleIssues = useMemo(() => issues.filter(i => i.pageId === pageId && (query === "" || i.title.toLowerCase().includes(query.toLowerCase())) && (priority === "all" || i.priority === priority) && (type === "all" || i.type === type)), [issues, pageId, query, priority, type]);
  const pageIssues = issues.filter(i => i.pageId === pageId && i.deviceId === deviceId);

  function addMarker(e: ReactPointerEvent<HTMLDivElement>) {
    if (panning || (e.target as HTMLElement).closest("button,.annotation-marker")) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const next: Issue = { id: Math.max(0, ...issues.map(i => i.id)) + 1, title: "未命名问题", description: "", type: "与设计稿不一致", priority: "P2", pageId, deviceId, x: ((e.clientX - rect.left) / rect.width) * 100, y: ((e.clientY - rect.top) / rect.height) * 100, canvasWidth: device.width, canvasHeight, createdAt: "刚刚" };
    setEditing(next); setSelectedId(next.id);
  }
  async function saveIssue(issue: Issue) { const [actualThumbnail, designThumbnail] = await Promise.all([issue.actualThumbnail ?? issue.thumbnail ?? makeThumbnail(actuals[issue.pageId], issue.x, issue.y), issue.designThumbnail ?? makeThumbnail(designs[issue.pageId], issue.x, issue.y)]); const saved = { ...issue, thumbnail: actualThumbnail, actualThumbnail, designThumbnail }; setIssues(old => [...old.filter(i => i.id !== saved.id), saved].sort((a, b) => a.id - b.id)); setEditing(null); setSelectedId(saved.id); }
  function createRegionIssue(region: DifferenceRegion) { const next: Issue = { id: Math.max(0, ...issues.map(issue => issue.id)) + 1, title: `自动识别差异区域 #${region.id}`, description: `当前表现：该区域与设计稿存在明显视觉差异。\n设计预期：请对照设计稿确认具体组件样式。\n检测信息：差异范围约 ${region.width} × ${region.height}px，区域内 ${region.changedPercent}% 像素发生变化。`, type: "与设计稿不一致", priority: "P2", pageId, deviceId, x: region.leftPercent + region.widthPercent / 2, y: region.topPercent + region.heightPercent / 2, canvasWidth: device.width, canvasHeight, createdAt: "刚刚" }; setEditing(next); setSelectedId(next.id); }
  function selectIssue(issue: Issue) { setSelectedId(issue.id); setPageId(issue.pageId); setDeviceId(issue.deviceId); }
  function startPan(e: ReactPointerEvent) { if (e.button !== 0 || !(e.target as HTMLElement).closest(".canvas-stage-bg")) return; setPanning(true); drag.current = { x: e.clientX, y: e.clientY, px: position.x, py: position.y }; e.currentTarget.setPointerCapture(e.pointerId); }
  function movePan(e: ReactPointerEvent) { if (panning) setPosition({ x: drag.current.px + e.clientX - drag.current.x, y: drag.current.py + e.clientY - drag.current.y }); }
  function fitCanvas(height = canvasHeight) { const rect = canvasStage.current?.getBoundingClientRect(); if (!rect) return; const next = Math.min(100, (rect.width - 52) / device.width * 100, (rect.height - 96) / height * 100); setZoom(Math.max(5, Math.floor(next))); setPosition({ x: 0, y: 0 }); }
  function showToast(message: string) { setToast(message); window.setTimeout(() => setToast(null), 2200); }
  function makeThumbnail(asset: DesignAsset | undefined, x: number, y: number): Promise<string | undefined> { return new Promise(resolve => { const source = asset?.objectUrl ?? asset?.dataUrl; if (!source) return resolve(undefined); const image = new Image(); image.onload = () => { const canvas = document.createElement("canvas"); canvas.width = 240; canvas.height = 150; const ctx = canvas.getContext("2d"); if (!ctx) return resolve(undefined); const cropW = Math.min(image.naturalWidth, 480); const cropH = Math.min(image.naturalHeight, 300); const sx = Math.max(0, Math.min(image.naturalWidth - cropW, image.naturalWidth * x / 100 - cropW / 2)); const sy = Math.max(0, Math.min(image.naturalHeight - cropH, image.naturalHeight * y / 100 - cropH / 2)); ctx.drawImage(image, sx, sy, cropW, cropH, 0, 0, 240, 150); resolve(canvas.toDataURL("image/jpeg", .72)); }; image.onerror = () => resolve(undefined); image.src = source; }); }
  function loadAsset(file: File | undefined, kind: ImageKind) {
    if (!file) return;
    if (!/^image\/(png|jpeg|webp)$/.test(file.type)) return showToast("仅支持 PNG、JPG 或 WebP 图片");
    if (file.size > 20 * 1024 * 1024) return showToast("图片不能超过 20MB，请压缩后重试");
    const url = URL.createObjectURL(file); const image = new Image();
    image.onload = async () => { const asset = { name: file.name, objectUrl: url, width: image.naturalWidth, height: image.naturalHeight, size: file.size }; try { await saveImage(pageId, kind, file, image.naturalWidth, image.naturalHeight); if (kind === "design") setDesigns(old => ({ ...old, [pageId]: asset })); else setActuals(old => ({ ...old, [pageId]: asset })); setMode(kind === "design" ? "design" : "actual"); setDiffScore(null); window.requestAnimationFrame(() => fitCanvas(Math.max(device.height, device.width * image.naturalHeight / image.naturalWidth))); showToast(`${kind === "design" ? "设计稿" : "页面截图"}已保存到本地图片库`); } catch { URL.revokeObjectURL(url); showToast("图片保存失败，请检查浏览器存储空间"); } }; image.onerror = () => { URL.revokeObjectURL(url); showToast("无法读取图片内容"); }; image.src = url;
  }
  function handleFile(e: ChangeEvent<HTMLInputElement>, kind: ImageKind) { loadAsset(e.target.files?.[0], kind); e.target.value = ""; }
  function handleDrop(e: DragEvent) { e.preventDefault(); setDraggingFile(false); loadAsset(e.dataTransfer.files?.[0], actuals[pageId] ? "design" : "actual"); }
  async function removeAsset(kind: ImageKind) { await deleteImage(pageId, kind); const setter = kind === "design" ? setDesigns : setActuals; setter(old => { const next = { ...old }; const source = next[pageId]?.objectUrl; if (source) URL.revokeObjectURL(source); delete next[pageId]; return next; }); setDiffScore(null); showToast(`${kind === "design" ? "设计稿" : "页面截图"}已删除`); }
  async function openFigmaImport() {
    setFigmaOpen(true); setFigmaError(""); setFigmaFrame(null);
    if (staticHosting) return setFigmaStatus({ connected: false, error: "Figma OAuth 仅在本地服务版可用" });
    try { const response = await fetch("/api/figma/status"); setFigmaStatus(await response.json() as FigmaStatus); }
    catch { setFigmaStatus({ connected: false, error: "无法连接本地 Figma 服务" }); }
  }
  async function inspectFigmaFrame() {
    setFigmaLoading(true); setFigmaError(""); setFigmaFrame(null);
    try {
      const response = await fetch(`/api/figma/frame?url=${encodeURIComponent(figmaUrl.trim())}`);
      const result = await response.json() as FigmaFrame & { error?: string };
      if (!response.ok) throw new Error(result.error || "无法读取 Frame");
      setFigmaFrame(result);
    } catch (error) { setFigmaError(error instanceof Error ? error.message : "无法读取 Frame"); }
    finally { setFigmaLoading(false); }
  }
  async function importFigmaFrame() {
    if (!figmaFrame) return;
    setFigmaLoading(true); setFigmaError("");
    try {
      const response = await fetch(figmaFrame.imagePath);
      if (!response.ok) { const result = await response.json().catch(() => ({})) as { error?: string }; throw new Error(result.error || "无法导出 Frame 图片"); }
      const blob = await response.blob();
      loadAsset(new File([blob], `${figmaFrame.name}.png`, { type: blob.type || "image/png" }), "design");
      setFigmaOpen(false); showToast(`已从 Figma 导入“${figmaFrame.name}”`);
    } catch (error) { setFigmaError(error instanceof Error ? error.message : "无法导入 Frame"); }
    finally { setFigmaLoading(false); }
  }
  function addPage(page: PageItem) { setProjectPages(old => [...old, page]); setPageId(page.id); setPageDialogOpen(false); setSelectedId(null); showToast(`已添加“${page.name}”`); }
  async function deletePage(page: PageItem) {
    if (projectPages.length === 1) return showToast("至少需要保留一个检查页面");
    try { await Promise.all([deleteImage(page.id, "actual"), deleteImage(page.id, "design")]); } catch {}
    const nextPages = projectPages.filter(item => item.id !== page.id);
    setProjectPages(nextPages); setIssues(old => old.filter(issue => issue.pageId !== page.id));
    setAlignments(old => { const next = { ...old }; delete next[page.id]; return next; });
    setDesigns(old => { const next = { ...old }; if (next[page.id]?.objectUrl) URL.revokeObjectURL(next[page.id].objectUrl); delete next[page.id]; return next; });
    setActuals(old => { const next = { ...old }; if (next[page.id]?.objectUrl) URL.revokeObjectURL(next[page.id].objectUrl); delete next[page.id]; return next; });
    if (pageId === page.id) setPageId(nextPages[0].id);
    if (editing?.pageId === page.id) setEditing(null);
    setSelectedId(null); setPageToDelete(null); showToast(`已删除“${page.name}”及其本地数据`);
  }
  function setAlignment(patch: Partial<Alignment>) { setAlignments(old => ({ ...old, [pageId]: { ...alignment, ...patch } })); setDiffScore(null); }
  async function copyText(text: string, message: string) { try { await navigator.clipboard.writeText(text); showToast(message); } catch { showToast("复制失败，请检查浏览器权限"); } }
  function exportRows(list: Issue[]) { return list.map(i => { const p = projectPages.find(x => x.id === i.pageId); const d = devices.find(x => x.id === i.deviceId); const width = i.canvasWidth ?? d?.width ?? 0; const height = i.canvasHeight ?? d?.height ?? 0; return { project: "未命名项目", page: p?.name, url: p?.url, device: `${d?.group} ${d?.width} × ${d?.height}`, id: i.id, title: i.title, description: i.description, type: i.type, priority: i.priority, left: Math.round(width * i.x / 100), top: Math.round(height * i.y / 100), xPercent: Math.round(i.x), yPercent: Math.round(i.y), createdAt: i.createdAt }; }); }
  function download(name: string, content: string, typeName: string) { const link = document.createElement("a"); link.href = URL.createObjectURL(new Blob([content], { type: typeName })); link.download = name; link.click(); URL.revokeObjectURL(link.href); showToast(`${name} 已导出`); setExportOpen(false); }
  function exportJson() { download("tars-ui-issues.json", JSON.stringify({ project: "未命名项目", exportedAt: new Date().toISOString(), issues: exportRows(visibleIssues) }, null, 2), "application/json;charset=utf-8"); }
  function exportCsv() { const rows = exportRows(visibleIssues); const headers = ["project","page","url","device","id","title","description","type","priority","left","top","xPercent","yPercent","createdAt"] as const; const esc = (v: unknown) => `"${String(v ?? "").replaceAll('"','""')}"`; download("tars-ui-issues.csv", "\uFEFF" + [headers.join(","), ...rows.map(r => headers.map(h => esc(r[h])).join(","))].join("\n"), "text/csv;charset=utf-8"); }
  function exportMarkdown() { const body = visibleIssues.map(i => `## #${i.id} ${i.title}\n\n- 优先级：${i.priority} ${priorityNames[i.priority]}\n- 类型：${i.type}\n- 页面：${projectPages.find(p => p.id === i.pageId)?.name}\n- 设备：${devices.find(d => d.id === i.deviceId)?.width} × ${devices.find(d => d.id === i.deviceId)?.height}\n- ${issueText(i, projectPages).split("\n").find(line => line.startsWith("位置："))}\n\n${i.description || "暂无描述"}`).join("\n\n---\n\n"); download("tars-ui-issues.md", `# 未命名项目 UI走查\n\n${body}`, "text/markdown;charset=utf-8"); }
  function exportInspectionHtml() { const escape = (value: string) => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;"); const documentName = `${currentPage.name} UI走查`; const fileName = `${documentName.replace(/[\\/:*?"<>|]/g, "-")}.html`; const rows = visibleIssues.map(issue => { const page = projectPages.find(item => item.id === issue.pageId); const device = devices.find(item => item.id === issue.deviceId); const width = issue.canvasWidth ?? device?.width ?? 0; const height = issue.canvasHeight ?? device?.height ?? 0; const location = `距左 ${Math.round(width * issue.x / 100)}px / 距顶 ${Math.round(height * issue.y / 100)}px`; const actualShot = issue.actualThumbnail ?? issue.thumbnail; return `<tr><td>${actualShot ? `<img src="${actualShot}" alt="开发稿局部截图">` : `<span class="missing">暂无局部截图</span>`}</td><td>${issue.designThumbnail ? `<img src="${issue.designThumbnail}" alt="UI设计稿局部截图">` : `<span class="missing">暂无局部截图</span>`}</td><td><strong>#${issue.id} ${escape(issue.title)}</strong><p>${escape(issue.description || "暂无描述")}</p><small>${escape(page?.name ?? "未知页面")} · ${device?.width ?? 0} × ${device?.height ?? 0} · ${location}</small></td><td><b class="${issue.priority}">${issue.priority} ${priorityNames[issue.priority]}</b></td></tr>`; }).join(""); const html = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>${escape(documentName)}</title><style>body{margin:0;padding:28px;font:14px Arial,sans-serif;color:#202124;background:#fff}h1{font-size:22px;font-weight:500;margin:0 0 20px}table{width:100%;border-collapse:collapse;table-layout:fixed}th,td{border:1px solid #d9dce1;padding:12px;vertical-align:top}th{background:#f5f6f8;font-weight:500;text-align:left}th:nth-child(1),th:nth-child(2){width:25%}th:nth-child(4){width:90px}img{display:block;width:100%;max-height:220px;object-fit:cover;background:#f1f2f4}strong{font-weight:500}p{white-space:pre-wrap;line-height:1.6;margin:8px 0}small,.missing{color:#777}.missing{height:120px;display:grid;place-items:center;background:#f5f6f8}.P0,.P1,.P2,.P3{display:inline-block;padding:4px 7px;border-radius:5px;font-size:12px}.P0{background:#fee2e2;color:#b42318}.P1{background:#ffedd5;color:#b54708}.P2{background:#dbeafe;color:#175cd3}.P3{background:#eceef1;color:#555}</style></head><body><h1>${escape(documentName)}</h1><table><thead><tr><th>开发稿</th><th>UI 设计稿</th><th>问题描述</th><th>优先级</th></tr></thead><tbody>${rows}</tbody></table></body></html>`; download(fileName, html, "text/html;charset=utf-8"); }

  return <main className="app-shell">
    <header className="topbar">
      <div className="brand"><span className="brand-logo"><BrandLogo /></span><div><b>TARS</b><span>UI Inspector</span></div></div>
      <div className="url-control"><Input value={currentPage.url} readOnly aria-label="网页地址"/><Button variant="primary">载入页面</Button></div>
      <input ref={actualInput} className="visually-hidden" type="file" accept="image/png,image/jpeg,image/webp" onChange={e => handleFile(e, "actual")} />
      <input ref={designInput} className="visually-hidden" type="file" accept="image/png,image/jpeg,image/webp" onChange={e => handleFile(e, "design")} />
      <Button onClick={() => actualInput.current?.click()}>{actuals[pageId] ? "更换页面截图" : "上传页面截图"}</Button>
      <Button onClick={() => designInput.current?.click()}>{designs[pageId] ? "更换设计稿" : "上传设计稿"}</Button>
      <Button onClick={openFigmaImport}>从 Figma 导入</Button>
      <div className="export-wrap"><Button onClick={() => setExportOpen(v => !v)}>导出问题清单</Button>{exportOpen && <div className="export-menu"><button onClick={() => copyText(visibleIssues.map(issue => issueText(issue, projectPages)).join("\n\n────────\n\n"), "全部问题已复制")}>复制全部问题 <span>{visibleIssues.length}</span></button><button onClick={exportInspectionHtml}>导出走查表 HTML</button><button onClick={exportMarkdown}>导出 Markdown</button><button onClick={exportJson}>导出 JSON</button><button onClick={exportCsv}>导出 CSV</button></div>}</div>
    </header>
    <aside className="left-panel">
      <div className="panel-heading"><div><small>PROJECT PAGES</small><h2>检查页面</h2></div><IconButton label="添加页面" onClick={() => setPageDialogOpen(true)}>＋</IconButton></div>
      <nav className="page-list">{projectPages.map((p, index) => <div key={p.id} className={`page-row ${p.id === pageId ? "is-active" : ""}`}><button className="page-select" onClick={() => setPageId(p.id)}><span className="page-icon">{index + 1}</span><span>{p.name}</span><em>{issues.filter(i => i.pageId === p.id).length}</em></button><button className="page-delete" aria-label={`删除${p.name}`} title="删除页面" disabled={projectPages.length === 1} onClick={() => setPageToDelete(p)}>×</button></div>)}</nav>
      <div className="device-tree"><div className="section-label"><span>响应式断点</span><button>＋ 自定义</button></div>{(["正常电脑", "小尺寸电脑", "平板", "手机端"] as DeviceGroup[]).map(group => { const groupDevices = devices.filter(d => d.group === group); const spec = groupDevices[0]; const groupLabel = group === "平板" ? "平板电脑端" : group === "手机端" ? group : `${group}端`; return <section key={group}><h3><span>{groupLabel}</span><em>{spec.range}px</em></h3>{groupDevices.map(d => <button key={d.id} className={d.id === deviceId ? "is-active" : ""} onClick={() => setDeviceId(d.id)}><span>{d.width} × {d.height}</span>{d.id === deviceId && <i>当前</i>}</button>)}</section>; })}</div>
      <div className="sidebar-footer"><span className="status-dot"></span><div><b>本地数据已保存</b><small>最近同步：刚刚</small></div></div>
    </aside>
    <section className="workspace">
      <div className="canvas-toolbar"><Segmented value={mode} options={modeOptions} onChange={setMode} label="对比模式" /><div className="asset-chips">{actuals[pageId] && <span title={actuals[pageId].name}>页面 {actuals[pageId].width}×{actuals[pageId].height}<button onClick={() => removeAsset("actual")}>×</button></span>}{designs[pageId] && <span title={designs[pageId].name}>设计 {designs[pageId].width}×{designs[pageId].height}<button onClick={() => removeAsset("design")}>×</button></span>}</div>{(mode === "overlay" || mode === "diff") && designs[pageId] && <div className="alignment-controls"><label>X <input aria-label="设计稿水平偏移" type="number" value={alignment.x} onChange={e => setAlignment({ x: +e.target.value })} /></label><label>Y <input aria-label="设计稿垂直偏移" type="number" value={alignment.y} onChange={e => setAlignment({ y: +e.target.value })} /></label><label>缩放 <input aria-label="设计稿对齐缩放" type="number" min="0.5" max="2" step="0.01" value={alignment.scale} onChange={e => setAlignment({ scale: +e.target.value })} /></label><button onClick={() => setAlignment({ x: 0, y: 0, scale: 1 })}>重置</button></div>}{mode === "overlay" && <label className="opacity-control"><span>设计稿 {opacity}%</span><input aria-label="设计稿透明度" type="range" min="0" max="100" value={opacity} onChange={e => setOpacity(+e.target.value)} /></label>}{mode === "diff" && diffScore !== null && <span className="diff-score">差异 {diffScore}%</span>}<div className="zoom-control"><IconButton label="缩小" onClick={() => setZoom(Math.max(5, zoom - 10))}>−</IconButton><button onClick={() => setZoom(100)}>{zoom}%</button><IconButton label="放大" onClick={() => setZoom(Math.min(150, zoom + 10))}>＋</IconButton><Button variant="ghost" onClick={() => fitCanvas()}>适应</Button><IconButton label="重置位置" onClick={() => setPosition({ x: 0, y: 0 })}>↺</IconButton></div></div>
      <div className={`canvas-viewport ${panning ? "is-panning" : ""} ${draggingFile ? "is-file-dragging" : ""}`} onPointerDown={startPan} onPointerMove={movePan} onPointerUp={() => setPanning(false)} onDragEnter={e => { e.preventDefault(); setDraggingFile(true); }} onDragOver={e => e.preventDefault()} onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDraggingFile(false); }} onDrop={handleDrop}>
        <div className="canvas-stage-bg" ref={canvasStage}>
          <div className="viewport-label"><span>{currentPage.name}</span><b>{device.width} × {device.height}</b></div>
          <div className="frame-slot" style={{ width: device.width * zoom / 100, height: canvasHeight * zoom / 100 }}><div className="device-frame" style={{ width: device.width, height: canvasHeight, transform: `translate(${position.x}px, ${position.y}px) scale(${zoom / 100})` }} onPointerDown={addMarker} data-testid="inspection-canvas">
              <CanvasContent mode={mode} opacity={opacity} design={designs[pageId]} actual={actuals[pageId]} alignment={alignment} zoom={zoom} onScore={setDiffScore} onRegions={setDiffRegions} />
              {pageIssues.map(issue => <button key={issue.id} className={`annotation-marker priority-${issue.priority} ${selectedId === issue.id ? "is-selected" : ""}`} style={{ left: `${issue.x}%`, top: `${issue.y}%`, transform: `translate(-50%,-50%) scale(${100 / zoom})` }} title={issue.title} onClick={e => { e.stopPropagation(); setSelectedId(issue.id); }}><span>{issue.id}</span></button>)}
            </div></div>
          <div className="canvas-hint">拖动画布 · 点击页面创建问题</div>
          {draggingFile && <div className="upload-dropzone"><b>释放以上传{actuals[pageId] ? "设计稿" : "页面截图"}</b><span>PNG、JPG 或 WebP · 最大 20MB</span></div>}
        </div>
        {mode === "diff" && actuals[pageId] && designs[pageId] && <aside className="diff-region-summary"><header><div><b>自动差异区域</b><span>{diffRegions.length} 个建议</span></div><em>截图识别</em></header><div>{diffRegions.map(region => <button key={region.id} onClick={() => createRegionIssue(region)}><strong>#{region.id}</strong><span>{region.width} × {region.height}px</span><small>差异 {region.changedPercent}%</small><i>转为问题</i></button>)}{diffRegions.length === 0 && <p>正在分析主要差异区域…</p>}</div><footer>结果基于截图像素聚类，请人工确认</footer></aside>}
      </div>
    </section>
    <aside className="right-panel">
      {editing ? <IssueForm issue={editing} onSave={saveIssue} onCancel={() => setEditing(null)} /> : <>
        <div className="panel-heading"><div><small>ISSUES</small><h2>问题清单 <span>{visibleIssues.length}</span></h2></div><Button variant="primary" onClick={() => { const i: Issue = { id: Math.max(0, ...issues.map(x => x.id)) + 1, title: "未命名问题", description: "", type: "与设计稿不一致" as IssueType, priority: "P2" as Priority, pageId, deviceId, x: 50, y: 50, canvasWidth: device.width, canvasHeight, createdAt: "刚刚" }; setEditing(i); }}>＋ 新建</Button></div>
        <div className="filters"><Input value={query} onChange={e => setQuery(e.target.value)} placeholder="搜索问题…" aria-label="搜索问题"/><div><Select value={type} onChange={e => setType(e.target.value)}><option value="all">全部类型</option>{issueTypes.map(t => <option key={t}>{t}</option>)}</Select><Select value={priority} onChange={e => setPriority(e.target.value)}><option value="all">全部优先级</option>{["P0", "P1", "P2", "P3"].map(p => <option key={p}>{p}</option>)}</Select></div>{(query || priority !== "all" || type !== "all") && <button className="clear-filter" onClick={() => { setQuery(""); setPriority("all"); setType("all"); }}>清除筛选</button>}</div>
        <div className="issue-list">{visibleIssues.map(issue => <article key={issue.id} className={selectedId === issue.id ? "is-active" : ""} onClick={() => selectIssue(issue)}><div className="issue-compare"><figure><figcaption>开发稿</figcaption>{(issue.actualThumbnail ?? issue.thumbnail) ? <IssueThumbnail src={(issue.actualThumbnail ?? issue.thumbnail)!} label="开发稿局部截图" /> : <div className="issue-shot-placeholder">暂无截图</div>}</figure><figure><figcaption>UI 设计稿</figcaption>{issue.designThumbnail ? <IssueThumbnail src={issue.designThumbnail} label="UI设计稿局部截图" /> : <div className="issue-shot-placeholder">暂无截图</div>}</figure></div><div className="issue-card-top"><span className={`priority-tag ${issue.priority}`}>{issue.priority}</span><b>#{issue.id}</b><time>{issue.createdAt}</time></div><h3>{issue.title}</h3><p className="issue-description">{issue.description || "暂无问题描述"}</p><p className="issue-meta">{issue.type} · {projectPages.find(p => p.id === issue.pageId)?.name}</p><div className="issue-card-bottom"><span>{devices.find(d => d.id === issue.deviceId)?.width} × {devices.find(d => d.id === issue.deviceId)?.height}</span><button onClick={e => { e.stopPropagation(); copyText(issueText(issue, projectPages), `问题 #${issue.id} 已复制`); }}>复制</button><button onClick={e => { e.stopPropagation(); setEditing(issue); }}>编辑</button><button onClick={e => { e.stopPropagation(); if (confirm(`删除问题 #${issue.id}？`)) setIssues(old => old.filter(i => i.id !== issue.id)); }}>删除</button></div></article>)}{visibleIssues.length === 0 && <div className="empty-state"><b>{issues.length ? "没有匹配的问题" : "尚未记录问题"}</b><span>{issues.length ? "调整筛选条件后再试" : "上传页面截图与设计稿后，在画布上点击创建标注"}</span></div>}</div>
      </>}
    </aside>
    {toast && <div className="toast" role="status"><span>✓</span>{toast}</div>}
    {pageDialogOpen && <PageForm onSave={addPage} onCancel={() => setPageDialogOpen(false)} />}
    {figmaOpen && <div className="dialog-backdrop" role="presentation" onMouseDown={() => setFigmaOpen(false)}><div className="dialog figma-dialog" role="dialog" aria-modal="true" aria-labelledby="figma-dialog-title" onMouseDown={e => e.stopPropagation()}><div className="figma-dialog-heading"><div><small>FIGMA IMPORT</small><h2 id="figma-dialog-title">从 Figma 导入 Frame</h2></div><IconButton label="关闭" onClick={() => setFigmaOpen(false)}>×</IconButton></div>{figmaStatus?.connected ? <div className="figma-account"><span></span><div><b>{figmaStatus.user?.name ?? "Figma 已连接"}</b><small>{figmaStatus.user?.email || "授权状态有效"}</small></div><button onClick={async () => { await fetch("/api/figma/status", { method: "DELETE" }); setFigmaStatus({ connected: false }); }}>断开</button></div> : <div className="figma-connect"><p>{figmaStatus?.error || "连接 Figma 后可读取你有权限访问的 Frame。"}</p>{!staticHosting && <Button variant="primary" onClick={() => { window.location.href = "/api/figma/auth"; }}>连接 Figma</Button>}</div>}<Field label="Figma Frame 链接"><Input value={figmaUrl} disabled={!figmaStatus?.connected} placeholder="https://www.figma.com/design/...?...node-id=1-2" onChange={e => { setFigmaUrl(e.target.value); setFigmaFrame(null); setFigmaError(""); }} /></Field><div className="figma-link-actions"><Button disabled={!figmaStatus?.connected || !figmaUrl.trim() || figmaLoading} onClick={inspectFigmaFrame}>{figmaLoading ? "正在读取…" : figmaFrame ? "重新同步" : "读取 Frame"}</Button></div>{figmaError && <p className="figma-error">{figmaError}</p>}{figmaFrame && <div className="figma-preview">{/* The preview is an authenticated same-origin image proxy. */}<img src={figmaFrame.imagePath} alt={`${figmaFrame.name} 预览`} /><div><small>{figmaFrame.fileName}</small><b>{figmaFrame.name}</b><span>{figmaFrame.type} · {figmaFrame.width} × {figmaFrame.height}</span></div></div>}<div className="dialog-actions"><Button variant="ghost" onClick={() => setFigmaOpen(false)}>取消</Button><Button variant="primary" disabled={!figmaFrame || figmaLoading} onClick={importFigmaFrame}>导入为设计稿</Button></div></div></div>}
    {pageToDelete && <div className="dialog-backdrop" role="presentation" onMouseDown={() => setPageToDelete(null)}><div className="dialog danger-dialog" role="alertdialog" aria-modal="true" aria-labelledby="delete-page-title" onMouseDown={e => e.stopPropagation()}><h2 id="delete-page-title">删除“{pageToDelete.name}”？</h2><p>该页面下的 {issues.filter(issue => issue.pageId === pageToDelete.id).length} 个问题、页面截图、设计稿和对齐设置都会从本地删除，此操作无法撤销。</p><div className="dialog-actions"><Button variant="ghost" onClick={() => setPageToDelete(null)}>取消</Button><Button className="button--danger" onClick={() => deletePage(pageToDelete)}>确认删除</Button></div></div></div>}
  </main>;
}

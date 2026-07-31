export type CompareMode = "actual" | "design" | "split" | "overlay" | "diff";
export type Priority = "P0" | "P1" | "P2" | "P3";
export type IssueType = "布局与间距" | "字体与颜色" | "图片与图标" | "组件状态" | "响应式适配" | "内容错误" | "可访问性" | "与设计稿不一致";

export type DeviceGroup = "手机端" | "平板" | "小尺寸电脑" | "正常电脑";
export type Device = { id: string; group: DeviceGroup; width: number; height: number; breakpoint: number; range: string; columns: string; gutter: number };
export type PageItem = { id: string; name: string; url: string };
export type DesignAsset = { name: string; dataUrl?: string; objectUrl?: string; width: number; height: number; size: number };
export type Issue = {
  id: number;
  title: string;
  description: string;
  type: IssueType;
  priority: Priority;
  pageId: string;
  deviceId: string;
  x: number;
  y: number;
  createdAt: string;
  thumbnail?: string;
  actualThumbnail?: string;
  designThumbnail?: string;
  canvasWidth?: number;
  canvasHeight?: number;
  regionWidth?: number;
  regionHeight?: number;
};

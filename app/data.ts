import type { Device, Issue, IssueType, PageItem } from "./types";

export const pages: PageItem[] = [
  { id: "blank-page", name: "未命名页面", url: "https://example.com/" },
];

export const devices: Device[] = [
  { id: "tablet-960", group: "平板", width: 960, height: 768, breakpoint: 960, range: "960–1199", columns: "3 / 3.5", gutter: 16 },
  { id: "tablet-1024", group: "平板", width: 1024, height: 768, breakpoint: 960, range: "960–1199", columns: "3 / 3.5", gutter: 16 },
  { id: "small-1200", group: "小尺寸电脑", width: 1200, height: 800, breakpoint: 1200, range: "1200–1439", columns: "3 / 3.5", gutter: 16 },
  { id: "desktop-1440", group: "正常电脑", width: 1440, height: 900, breakpoint: 1440, range: "1440–1920", columns: "3 / 3.5", gutter: 16 },
  { id: "desktop-1920", group: "正常电脑", width: 1920, height: 1080, breakpoint: 1440, range: "1440–1920", columns: "3 / 3.5", gutter: 16 },
  { id: "mobile-375", group: "手机端", width: 375, height: 812, breakpoint: 375, range: "375–430", columns: "1.5 / 2 / 2.5", gutter: 16 },
  { id: "mobile-390", group: "手机端", width: 390, height: 844, breakpoint: 375, range: "375–430", columns: "1.5 / 2 / 2.5", gutter: 16 },
  { id: "mobile-430", group: "手机端", width: 430, height: 932, breakpoint: 375, range: "375–430", columns: "1.5 / 2 / 2.5", gutter: 16 },
];

export const issueTypes: IssueType[] = ["布局与间距", "字体与颜色", "图片与图标", "组件状态", "响应式适配", "内容错误", "可访问性", "与设计稿不一致"];

export const initialIssues: Issue[] = [];

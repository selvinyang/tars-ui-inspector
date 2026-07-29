import type { Device, Issue, IssueType, PageItem } from "./types";

export const pages: PageItem[] = [
  { id: "home", name: "首页", url: "https://store.segway.com/" },
  { id: "products", name: "商品列表页", url: "https://store.segway.com/products" },
  { id: "detail", name: "商品详情页", url: "https://store.segway.com/products/ninebot-max-g2" },
  { id: "cart", name: "购物车", url: "https://store.segway.com/cart" },
  { id: "checkout", name: "结算页", url: "https://store.segway.com/checkout" },
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

export const initialIssues: Issue[] = [
  { id: 1, title: "移动端商品标题发生两行截断", description: "商品名称在 375px 宽度下被截断，和设计稿不一致。", type: "响应式适配", priority: "P1", pageId: "products", deviceId: "mobile-375", x: 64, y: 48, createdAt: "今天 10:24" },
  { id: 2, title: "商品卡片间距与设计稿不一致", description: "横向卡片间距应为 24px，当前实现为 16px。", type: "布局与间距", priority: "P2", pageId: "products", deviceId: "desktop-1440", x: 42, y: 67, createdAt: "今天 10:31" },
  { id: 3, title: "主按钮圆角错误", description: "设计稿圆角为 8px，当前接近全圆角。", type: "与设计稿不一致", priority: "P2", pageId: "detail", deviceId: "desktop-1440", x: 74, y: 59, createdAt: "今天 10:46" },
  { id: 4, title: "商品价格字号偏小", description: "价格应使用 24px，目前视觉层级不足。", type: "字体与颜色", priority: "P2", pageId: "detail", deviceId: "tablet-1024", x: 70, y: 44, createdAt: "今天 11:02" },
  { id: 5, title: "Banner 图片裁切位置错误", description: "产品主体应居中，当前在窄屏下偏右。", type: "图片与图标", priority: "P1", pageId: "home", deviceId: "mobile-390", x: 73, y: 25, createdAt: "今天 11:18" },
  { id: 6, title: "购物车空状态图片变形", description: "空状态插图未保持原始比例。", type: "图片与图标", priority: "P2", pageId: "cart", deviceId: "mobile-430", x: 50, y: 51, createdAt: "今天 11:35" },
  { id: 7, title: "结算按钮在 375px 下溢出", description: "按钮右侧超出安全区域 12px。", type: "响应式适配", priority: "P0", pageId: "checkout", deviceId: "mobile-375", x: 55, y: 78, createdAt: "今天 13:07" },
  { id: 8, title: "正文文字颜色对比度不足", description: "辅助说明文字与背景对比度过低。", type: "可访问性", priority: "P2", pageId: "checkout", deviceId: "small-1200", x: 67, y: 38, createdAt: "今天 13:22" },
  { id: 9, title: "导航图标与文字未垂直居中", description: "购物车图标较文字基线下沉约 3px。", type: "布局与间距", priority: "P3", pageId: "home", deviceId: "desktop-1440", x: 88, y: 8, createdAt: "今天 13:48" },
  { id: 10, title: "Tablet 断点商品栅格数量错误", description: "设计稿为三列，当前断点仍显示四列。", type: "响应式适配", priority: "P1", pageId: "products", deviceId: "tablet-1024", x: 52, y: 62, createdAt: "今天 14:10" },
];

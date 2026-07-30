import type { Metadata } from "next";
import "./globals.css";
import "./integration.css";

export const metadata: Metadata = { title: "TARS UI Inspector", description: "轻量级 Web UI 视觉走查工作台", icons: { icon: "/favicon.svg?v=2", shortcut: "/favicon.svg?v=2" } };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}

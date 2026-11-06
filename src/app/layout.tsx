import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "拾卡 · Anki 卡包浏览器",
  description: "在浏览器中打开 Anki 卡包，搜索和阅读卡片。文件仅在本地处理。",
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = { themeColor: "#292725" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}

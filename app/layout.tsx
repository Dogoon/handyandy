import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HandyAndy",
  description: "AI Prompt Manager for Video Production",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full">
      <head>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/dist/tabler-icons.min.css" />
      </head>
      <body className="h-full">{children}</body>
    </html>
  );
}

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Acre7 — See the house before the walls are finished",
  description: "Turn real floor plans into controlled material studies and room-level panoramic tours with Acre7.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="dark">
      <body className="antialiased">{children}</body>
    </html>
  );
}

import type { Metadata, Viewport } from "next";
import { ThemeProvider } from "@/components/acre7/ThemeProvider";
import "./globals.css";
import "./acre7-enhancements.css";

export const metadata: Metadata = {
  title: "Acre7 — See the house before the walls are finished",
  description: "Turn real floor plans into controlled material studies and room-level panoramic tours with Acre7.",
  applicationName: "Acre7",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Acre7", statusBarStyle: "black-translucent" },
  icons: {
    icon: "/brand/acre7-mark.jpg",
    shortcut: "/brand/acre7-mark.jpg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f6f5ef",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <body className="antialiased">
        <ThemeProvider>
          <a className="skip-link" href="#main-content">Skip to content</a>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}

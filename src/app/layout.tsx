import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://callngo.in"),
  title: "CallNGo - Private Car Calling",
  description: "Browser-to-browser private voice calling for car owners without revealing phone numbers",
  manifest: "/manifest.json",
  verification: {
    google: "EF8MRDT7Rp4pTd6Wgw9ew5TBGbmuNzcUif9dv7V92so",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "CallNGo"
  }
};

export const viewport: Viewport = {
  themeColor: "#2b1812",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body className={`${inter.className} bg-[#160f0b] text-[#f4efe6] antialiased`}>
        {children}
      </body>
    </html>
  );
}

import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Providers from "@/components/Providers";
import InstallBanner from "@/components/InstallBanner";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  metadataBase: new URL('https://icpchue.xyz'),
  title: "ICPC HUE - First ICPC Community in Hours University",
  description:
    "Competitive programming resources, training materials, and community collaboration tools. Join our training program and become part of the first ICPC community in Hours University.",
  keywords: [
    "ICPC",
    "competitive programming",
    "Hours University",
    "coding",
    "algorithms",
    "Codeforces",
    "LeetCode",
  ],
  authors: [{ name: "ICPC HUE Team" }],
  creator: "ICPC HUE",
  publisher: "ICPC HUE",
  openGraph: {
    title: "ICPC HUE - First ICPC Community in Hours University",
    description:
      "Join our competitive programming community at Hours University",
    url: "https://icpchue.xyz",
    siteName: "ICPC HUE",
    images: [
      {
        url: "/images/metadata.webp",
        width: 1200,
        height: 630,
        alt: "ICPC HUE",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ICPC HUE",
    description: "First ICPC Community in Hours University",
    images: ["/images/metadata.webp"],
  },
  robots: {
    index: true,
    follow: true,
    nocache: true,
  },
  icons: {
    icon: [
      { url: '/icpchue-logo.webp?v=3', type: 'image/webp' },
    ],
    apple: [
      { url: '/icpchue-logo.webp?v=3', type: 'image/webp' },
    ],
    shortcut: ['/icpchue-logo.webp?v=3'],
  },
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#E8C15A",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning data-scroll-behavior="smooth">
      <body className="antialiased bg-black text-white">
        <Providers>
          <InstallBanner />
          {children}
        </Providers>
      </body>
    </html>
  );
}

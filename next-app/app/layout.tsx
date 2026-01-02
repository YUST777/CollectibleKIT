import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { AuthProvider } from '@/contexts/AuthContext';
import ClientVersionManager from '@/components/ClientVersionManager';
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
    "Join the first ICPC community at Horus University. Access comprehensive training sessions, video episodes, and competitive programming resources to master algorithms.",
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
        url: "/images/ui/metadata.webp",
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
    images: ["/images/ui/metadata.webp"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: [
      { url: '/favicon.webp', sizes: '32x32', type: 'image/webp' },
      { url: '/icpchue-logo.webp', type: 'image/webp' },
    ],
    apple: [
      { url: '/icpchue-logo.webp', type: 'image/webp' },
    ],
    shortcut: ['/favicon.webp'],
  },
  manifest: "/manifest.json",
  alternates: {
    canonical: 'https://icpchue.xyz',
    languages: {
      'en-US': 'https://icpchue.xyz',
    },
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'ICPC HUE',
  url: 'https://icpchue.xyz',
  logo: 'https://icpchue.xyz/icpchue-logo.webp',
  sameAs: [
    'https://www.facebook.com/ICPC.HUE',
    'https://www.linkedin.com/company/icpc-hue'
  ],
  contactPoint: {
    '@type': 'ContactPoint',
    email: 'icpchue@hours.edu',
    contactType: 'customer support'
  }
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
      <body className="antialiased bg-black text-white" suppressHydrationWarning>
        <Providers>
          <InstallBanner />
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
          />
          <AuthProvider>
            <ClientVersionManager />
            {children}
          </AuthProvider>
        </Providers>
      </body>
    </html>
  );
}

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
      { url: '/favicon.ico', sizes: '32x32', type: 'image/x-icon' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    shortcut: ['/favicon.ico'],
  },
  manifest: "/manifest.json",
  alternates: {
    canonical: 'https://icpchue.xyz',
    languages: {
      'en-US': 'https://icpchue.xyz',
    },
  },
};

// Multiple JSON-LD schemas for rich snippets
const jsonLdOrganization = {
  '@context': 'https://schema.org',
  '@type': 'EducationalOrganization',
  '@id': 'https://icpchue.xyz/#organization',
  name: 'ICPC HUE',
  alternateName: 'ICPC Horus University Egypt',
  url: 'https://icpchue.xyz',
  logo: {
    '@type': 'ImageObject',
    url: 'https://icpchue.xyz/icpchue-logo.webp',
    width: 512,
    height: 512,
  },
  image: 'https://icpchue.xyz/images/ui/metadata.webp',
  description: 'First ICPC community at Horus University, Egypt. Training competitive programmers for ACM-ICPC contests.',
  sameAs: [
    'https://www.facebook.com/ICPC.HUE',
    'https://www.linkedin.com/company/icpc-hue'
  ],
  contactPoint: {
    '@type': 'ContactPoint',
    email: 'icpchue@hours.edu',
    contactType: 'customer support',
    availableLanguage: ['English', 'Arabic']
  },
  address: {
    '@type': 'PostalAddress',
    addressLocality: 'Damietta',
    addressCountry: 'EG'
  }
};

const jsonLdWebsite = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  '@id': 'https://icpchue.xyz/#website',
  name: 'ICPC HUE',
  url: 'https://icpchue.xyz',
  publisher: { '@id': 'https://icpchue.xyz/#organization' },
  inLanguage: ['en', 'ar'],
  potentialAction: {
    '@type': 'SearchAction',
    target: {
      '@type': 'EntryPoint',
      urlTemplate: 'https://icpchue.xyz/sessions?q={search_term_string}'
    },
    'query-input': 'required name=search_term_string'
  }
};

const jsonLdCourse = {
  '@context': 'https://schema.org',
  '@type': 'Course',
  name: 'Competitive Programming Training',
  description: 'Comprehensive training program for ACM-ICPC covering algorithms, data structures, and problem-solving techniques.',
  provider: { '@id': 'https://icpchue.xyz/#organization' },
  educationalLevel: 'Beginner to Advanced',
  teaches: ['C++', 'Algorithms', 'Data Structures', 'Problem Solving', 'Competitive Programming'],
  availableLanguage: ['en', 'ar'],
  isAccessibleForFree: true,
  hasCourseInstance: {
    '@type': 'CourseInstance',
    courseMode: 'online',
    instructor: {
      '@type': 'Person',
      name: 'ICPC HUE Team'
    }
  }
};

const jsonLdBreadcrumb = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    {
      '@type': 'ListItem',
      position: 1,
      name: 'Home',
      item: 'https://icpchue.xyz'
    },
    {
      '@type': 'ListItem',
      position: 2,
      name: 'Sessions',
      item: 'https://icpchue.xyz/sessions'
    }
  ]
};

const allJsonLd = [jsonLdOrganization, jsonLdWebsite, jsonLdCourse, jsonLdBreadcrumb];

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
          {allJsonLd.map((schema, index) => (
            <script
              key={index}
              type="application/ld+json"
              dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
            />
          ))}
          <AuthProvider>
            <ClientVersionManager />
            {children}
          </AuthProvider>
        </Providers>
      </body>
    </html>
  );
}

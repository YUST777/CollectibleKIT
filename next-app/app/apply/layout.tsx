import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Apply Now | ICPC HUE',
    description: 'Join ICPC HUE competitive programming community at Horus University, Egypt. Apply now for free training in algorithms, data structures, and competitive programming.',
    keywords: ['ICPC application', 'join ICPC', 'competitive programming Egypt', 'Horus University ICPC', 'coding training application'],
    openGraph: {
        title: 'Apply Now | ICPC HUE',
        description: 'Join the first ICPC community at Horus University. Free training in competitive programming.',
        url: 'https://icpchue.xyz/apply',
        type: 'website',
        images: [
            {
                url: '/images/ui/metadata.webp',
                width: 1200,
                height: 630,
                alt: 'Apply to ICPC HUE',
            },
        ],
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Apply Now | ICPC HUE',
        description: 'Join the first ICPC community at Horus University.',
        images: ['/images/ui/metadata.webp'],
    },
    alternates: {
        canonical: 'https://icpchue.xyz/apply',
    },
};

export default function ApplyLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}

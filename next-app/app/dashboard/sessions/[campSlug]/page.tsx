import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowRight, PlayCircle } from 'lucide-react';
import { camps } from '@/lib/sessionData';

export default async function CampSessionsPage(props: { params: Promise<{ campSlug: string }> }) {
    const params = await props.params;
    const camp = camps.find(c => c.slug === params.campSlug);

    if (!camp) {
        notFound();
    }

    return (
        <div className="font-sans text-white">
            {/* Header / Breadcrumbs */}
            <div className="flex items-center gap-2 text-sm text-[#A0A0A0] leading-none mb-8">
                <Link href="/dashboard" className="hover:text-[#F2F2F2] flex items-center justify-center h-5 opacity-60 hover:opacity-100 transition-opacity">Dashboard</Link>
                <span className="text-[#A0A0A0] opacity-60">/</span>
                <Link href="/dashboard/sessions" className="hover:text-[#F2F2F2] flex items-center justify-center h-5 opacity-60 hover:opacity-100 transition-opacity">Sessions</Link>
                <span className="text-[#A0A0A0] opacity-60">/</span>
                <span className="text-white">{camp.title}</span>
            </div>

            <div className="max-w-7xl mx-auto animate-fade-in pb-12">
                <Link href="/dashboard/sessions" className="flex items-center gap-2 text-white/50 hover:text-[#d59928] transition-colors mb-8 group w-fit">
                    <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                    <span>Back to All Sessions</span>
                </Link>

                <div className="mb-12 text-center max-w-3xl mx-auto">
                    <span className="inline-block px-3 py-1 bg-[#d59928]/10 text-[#d59928] border border-[#d59928]/20 rounded-full text-xs font-bold uppercase tracking-wider mb-4">Camp Folder</span>
                    <h1 className="text-4xl sm:text-6xl font-black mb-6 tracking-tight">{camp.title}</h1>
                    <p className="text-white/60 text-lg">{camp.description}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                    {camp.sessions.map((session) => (
                        <Link
                            key={session.id}
                            href={`/dashboard/sessions/${camp.slug}/${session.number}`}
                            className="group relative bg-[#0a0a0a] border border-white/10 rounded-2xl overflow-hidden hover:border-[#d59928]/50 transition-all duration-300 hover:-translate-y-1 text-left w-full block"
                        >
                            <div className="aspect-video relative overflow-hidden bg-[#1a1a1a]">
                                {session.thumbnail && (
                                    <Image
                                        src={session.thumbnail}
                                        alt={session.title}
                                        fill
                                        className="object-cover opacity-60 group-hover:opacity-80 transition-opacity duration-300 pointer-events-none"
                                    />
                                )}
                                <div className="absolute inset-0 bg-gradient-to-br from-[#1a1a1a]/50 to-[#050505]/50 flex items-center justify-center group-hover:scale-105 transition-transform duration-500">
                                    <PlayCircle className="w-12 h-12 text-white/20 group-hover:text-[#d59928] transition-colors" />
                                </div>
                                {session.tag && (
                                    <div className="absolute top-4 left-4">
                                        <span className="bg-black/80 backdrop-blur-sm border border-white/10 text-white/80 px-2 py-1 rounded text-xs font-mono">
                                            {session.tag}
                                        </span>
                                    </div>
                                )}
                            </div>

                            <div className="p-6">
                                <div className="flex items-center gap-3 mb-3">
                                    <span className="text-[#d59928] font-mono text-lg font-bold">#{session.number}</span>
                                    <h3 className="text-2xl font-bold text-white group-hover:text-[#d59928] transition-colors line-clamp-1">
                                        {session.title}
                                    </h3>
                                </div>

                                <p className="text-white/60 text-sm mb-6 line-clamp-2 min-h-[40px]">
                                    {session.description}
                                </p>

                                <div className="flex items-center justify-between pt-4 border-t border-white/5">
                                    <div className="flex gap-4 text-xs text-white/40 font-mono">
                                        <span className="flex items-center gap-1.5">
                                            Video & Notes
                                        </span>
                                    </div>
                                    <span className="flex items-center gap-2 text-sm text-[#d59928] font-medium group-hover:translate-x-1 transition-transform">
                                        Start Session <ArrowRight className="w-4 h-4" />
                                    </span>
                                </div>
                            </div>
                        </Link>
                    ))}
                    {camp.sessions.length === 0 && (
                        <div className="col-span-full bg-[#0a0a0a] border border-white/10 rounded-xl p-12 text-center">
                            <p className="text-white/40">No sessions available in this camp yet.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

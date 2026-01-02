'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, ArrowRight, Folder } from 'lucide-react';
import { camps } from '@/lib/sessionData';

export default function SessionsPage() {
    return (
        <div className="font-sans text-white">
            {/* Header / Breadcrumbs */}
            <div className="flex items-center gap-2 text-sm text-[#A0A0A0] leading-none mb-8">
                <Link href="/dashboard" className="hover:text-[#F2F2F2] flex items-center justify-center h-5"><ArrowLeft size={16} /></Link>
                <span className="hidden sm:inline">TRAINING</span><span className="hidden sm:inline">/</span>
                <span className="text-white">Session Library</span>
            </div>

            <div className="max-w-7xl mx-auto animate-fade-in">
                {/* Hero Section */}
                <div className="mb-12 md:mb-16 text-center max-w-3xl mx-auto">
                    <h1 className="text-4xl sm:text-6xl font-black mb-6 tracking-tight">
                        Session <span className="text-[#d59928]">Library</span>
                    </h1>
                </div>

                {/* Folder View */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                    {camps.filter(camp => camp.dashboardVisible !== false).map((group) => (
                        <Link
                            key={group.slug}
                            href={`/dashboard/sessions/${group.slug}`}
                            className="group relative bg-[#0a0a0a] border border-white/10 rounded-2xl overflow-hidden hover:border-[#d59928]/50 transition-all duration-300 hover:-translate-y-1 text-left w-full block"
                        >
                            <div className="aspect-video relative overflow-hidden bg-[#1a1a1a]">
                                {group.image && (
                                    <Image
                                        src={group.image}
                                        alt={group.title}
                                        fill
                                        className="object-cover opacity-60 group-hover:opacity-80 transition-opacity duration-300 pointer-events-none"
                                    />
                                )}
                                <div className="absolute inset-0 bg-gradient-to-br from-[#1a1a1a]/50 to-[#050505]/50 flex items-center justify-center group-hover:scale-105 transition-transform duration-500">
                                    <Folder className="w-12 h-12 text-white/20 group-hover:text-[#d59928] transition-colors" />
                                </div>
                            </div>

                            <div className="p-6">
                                <h3 className="text-2xl font-bold mb-3 text-white group-hover:text-[#d59928] transition-colors">
                                    {group.title}
                                </h3>
                                <p className="text-white/60 text-sm mb-6 line-clamp-2 min-h-[40px]">
                                    {group.description}
                                </p>

                                <div className="flex items-center justify-between pt-4 border-t border-white/5">
                                    <div className="flex gap-4 text-xs text-white/40 font-mono">
                                        <span className="flex items-center gap-1.5">
                                            {group.sessions.length} Session{group.sessions.length !== 1 ? 's' : ''}
                                        </span>
                                    </div>
                                    <span className="flex items-center gap-2 text-sm text-[#d59928] font-medium group-hover:translate-x-1 transition-transform">
                                        Open Folder <ArrowRight className="w-4 h-4" />
                                    </span>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>

            {/* Coming Soon Section */}
            <div className="max-w-7xl mx-auto mt-16 animate-fade-in opacity-50">
                <div className="relative bg-[#050505] border border-white/5 rounded-2xl overflow-hidden cursor-not-allowed max-w-sm mx-auto">
                    <div className="aspect-video relative bg-black/50 flex items-center justify-center">
                        <span className="text-white/20 font-bold uppercase tracking-widest">More Coming Soon</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

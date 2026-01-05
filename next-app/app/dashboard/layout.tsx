'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Providers from '@/components/Providers';
import {
    LayoutDashboard, Trophy, Code, LogOut,
    BookOpen, Bell, Loader2, Home, Menu, X, Play, Settings
} from 'lucide-react';

function NavItem({ icon, label, active = false, onClick }: { icon: React.ReactNode; label: string; active?: boolean; onClick: () => void }) {
    return (
        <div onClick={onClick} className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-200 relative ${active ? 'bg-gradient-to-r from-[#E8C15A]/20 to-transparent text-[#E8C15A]' : 'text-[#A0A0A0] hover:text-[#F2F2F2] hover:bg-white/5'}`}>
            {active && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-[#E8C15A] rounded-r-full shadow-[0_0_10px_#E8C15A]"></div>}
            <span className={active ? 'text-[#E8C15A]' : 'group-hover:text-[#F2F2F2] transition-colors'}>{icon}</span>
            <span className="text-sm font-medium">{label}</span>
        </div>
    );
}

function MobileNavItem({ icon, label, active = false, onClick }: { icon: React.ReactNode; label: string; active?: boolean; onClick: () => void }) {
    return (
        <button onClick={onClick} className={`flex flex-col items-center justify-center gap-1 py-2 px-1.5 transition-all duration-200 ${active ? 'text-[#E8C15A]' : 'text-[#666]'}`}>
            {icon}
            <span className="text-[10px] font-medium whitespace-nowrap">{label}</span>
        </button>
    );
}

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
    const { user, loading, isAuthenticated, logout } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const getActivePage = () => {
        if (pathname === '/dashboard' || pathname === '/dashboard/') return 'Dashboard';
        if (pathname === '/dashboard/profile') return 'My Profile';
        if (pathname === '/dashboard/sessions' || pathname.startsWith('/dashboard/sessions/')) return 'Sessions';
        if (pathname === '/dashboard/sheets' || pathname.startsWith('/dashboard/sheets/')) return 'Training Sheets';
        if (pathname === '/dashboard/leaderboard') return 'Leaderboard';
        if (pathname === '/dashboard/achievements') return 'Achievements';
        if (pathname === '/dashboard/news') return 'Team News';
        if (pathname === '/dashboard/settings') return 'Settings';
        return 'Dashboard';
    };

    const activePage = getActivePage();

    useEffect(() => {
        if (!loading && !isAuthenticated) {
            router.replace('/login');
        }
    }, [loading, isAuthenticated, router]);

    const handleLogout = () => { logout(); router.push('/'); };
    const handleNav = (path: string) => { router.push(path); setMobileMenuOpen(false); };

    if (loading) return <div className="min-h-screen bg-[#0B0B0C] flex items-center justify-center"><Loader2 className="animate-spin text-[#E8C15A]" size={48} /></div>;
    if (!isAuthenticated) return <div className="min-h-screen bg-[#0B0B0C] flex flex-col items-center justify-center text-[#A0A0A0]"><Loader2 className="animate-spin text-[#E8C15A] mb-4" size={48} /><p>Redirecting to login...</p></div>;

    return (
        <div className="flex min-h-screen bg-[#0B0B0C] text-[#DCDCDC] font-sans selection:bg-[#CFA144] selection:text-[#121212]">
            {/* Mobile Header */}
            <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-[#0B0B0C] border-b border-white/10 px-4 py-3 flex items-center justify-between">
                <Link href="/" className="flex items-center gap-3">
                    <div className="relative w-8 h-8 flex items-center justify-center">
                        <Image
                            src="/icons/icon-512.png"
                            alt="ICPC HUE Logo"
                            width={32}
                            height={32}
                            className="object-contain"
                        />
                    </div>
                    <div className="flex flex-col justify-center">
                        <span className="text-white font-black text-lg leading-none tracking-tight">ICPC HUE</span>
                        <span className="text-[9px] text-white/40 font-bold uppercase tracking-[0.2em] leading-none mt-1">Community</span>
                    </div>
                </Link>
                <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 text-white/80 hover:text-white">
                    {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </div>

            {/* Mobile Menu Overlay */}
            {mobileMenuOpen && (
                <div className="md:hidden fixed inset-0 z-40 bg-black/80 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)}>
                    <div className="absolute top-16 left-0 right-0 bg-[#0B0B0C] border-b border-white/10 p-4" onClick={e => e.stopPropagation()}>
                        <nav className="space-y-2">
                            <NavItem icon={<Home size={20} />} label="Home" onClick={() => { router.push('/'); setMobileMenuOpen(false); }} />
                            <NavItem icon={<Settings size={20} />} label="Settings" active={activePage === 'Settings'} onClick={() => handleNav('/dashboard/settings')} />
                            <div className="border-t border-white/10 pt-2 mt-2">
                                <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors w-full">
                                    <LogOut size={20} /><span className="text-sm font-medium">Logout</span>
                                </button>
                            </div>
                        </nav>
                    </div>
                </div>
            )}

            {/* Desktop Sidebar */}
            <aside className="w-64 bg-[#0B0B0C] border-r border-white/10 flex-col justify-between shrink-0 fixed h-full z-10 overflow-y-auto hidden md:flex scrollbar-hide">
                <div>
                    <div className="p-6 flex items-center justify-between">
                        <Link href="/" className="flex items-center gap-4 group">
                            <div className="relative w-10 h-10 flex items-center justify-center">
                                <Image
                                    src="/icons/icon-512.png"
                                    alt="ICPC HUE Logo"
                                    width={40}
                                    height={40}
                                    className="object-contain transition-transform group-hover:scale-105"
                                />
                            </div>
                            <div className="flex flex-col justify-center">
                                <span className="text-white font-black text-xl leading-none tracking-tight group-hover:text-[#E8C15A] transition-colors">ICPC HUE</span>
                                <span className="text-[10px] text-white/40 font-bold uppercase tracking-[0.3em] leading-none mt-1.5 group-hover:text-white/60 transition-colors">Community</span>
                            </div>
                        </Link>
                    </div>
                    <div className="px-4 py-2 text-xs font-semibold text-[#A0A0A0] uppercase tracking-wider">Training</div>
                    <nav className="mt-2 space-y-1 px-2">
                        <NavItem icon={<LayoutDashboard size={20} />} label="Dashboard" active={activePage === 'Dashboard'} onClick={() => handleNav('/dashboard')} />
                        <NavItem icon={<Code size={20} />} label="My Profile" active={activePage === 'My Profile'} onClick={() => handleNav('/dashboard/profile')} />
                        <NavItem icon={<Play size={20} />} label="Sessions" active={activePage === 'Sessions'} onClick={() => handleNav('/dashboard/sessions')} />
                        <NavItem icon={<BookOpen size={20} />} label="Training Sheets" active={activePage === 'Training Sheets'} onClick={() => handleNav('/dashboard/sheets')} />
                        <NavItem icon={<Trophy size={20} />} label="Leaderboard" active={activePage === 'Leaderboard'} onClick={() => handleNav('/dashboard/leaderboard')} />
                        <NavItem icon={<Bell size={20} />} label="Team News" active={activePage === 'Team News'} onClick={() => handleNav('/dashboard/news')} />
                    </nav>
                    <div className="mt-8 px-4 py-2 text-xs font-semibold text-[#A0A0A0] uppercase tracking-wider">System</div>
                    <nav className="mt-2 space-y-1 px-2">
                        <NavItem icon={<Home size={20} />} label="Home" onClick={() => router.push('/')} />
                        <NavItem icon={<Settings size={20} />} label="Settings" active={activePage === 'Settings'} onClick={() => handleNav('/dashboard/settings')} />
                    </nav>
                </div>
                <div className="p-4 border-t border-white/5">
                    <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors w-full">
                        <LogOut size={20} /><span className="text-sm font-medium">Logout</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 md:ml-64 pt-16 md:pt-0 pb-20 md:pb-0">
                <div className="p-4 md:p-8 max-w-6xl mx-auto">
                    {children}
                </div>
            </main>

            {/* Mobile Bottom Navigation */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0B0B0C] border-t border-white/10 px-1 py-1 flex items-center justify-around safe-area-inset-bottom">
                <MobileNavItem icon={<LayoutDashboard size={18} />} label="Dashboard" active={activePage === 'Dashboard'} onClick={() => handleNav('/dashboard')} />
                <MobileNavItem icon={<Code size={18} />} label="Profile" active={activePage === 'My Profile'} onClick={() => handleNav('/dashboard/profile')} />
                <MobileNavItem icon={<Play size={18} />} label="Sessions" active={activePage === 'Sessions'} onClick={() => handleNav('/dashboard/sessions')} />
                <MobileNavItem icon={<BookOpen size={18} />} label="Sheets" active={activePage === 'Training Sheets'} onClick={() => handleNav('/dashboard/sheets')} />
                <MobileNavItem icon={<Trophy size={18} />} label="Rank" active={activePage === 'Leaderboard'} onClick={() => handleNav('/dashboard/leaderboard')} />
                <MobileNavItem icon={<Bell size={18} />} label="News" active={activePage === 'Team News'} onClick={() => handleNav('/dashboard/news')} />
            </nav>
        </div>
    );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    return (
        <DashboardLayoutContent>
            {children}
        </DashboardLayoutContent>
    );
}

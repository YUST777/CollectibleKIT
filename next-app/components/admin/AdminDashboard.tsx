'use client';

import { useState } from 'react';
import { BarChart, Users, FileText, ClipboardList, LogOut } from 'lucide-react';
import AnalyticsTab from './AnalyticsTab';
import ApplicationsTab from './ApplicationsTab';
import SubmissionsTab from './SubmissionsTab';
import LoginStatsTab from './LoginStatsTab';

interface AdminDashboardProps {
    onLogout: () => void;
}

export default function AdminDashboard({ onLogout }: AdminDashboardProps) {
    const [activeTab, setActiveTab] = useState('analytics');

    const handleLogout = () => {
        localStorage.removeItem('adminAuth');
        onLogout();
    };

    return (
        <div className="min-h-screen bg-black text-white font-sans">
            {/* Header */}
            <header className="border-b border-white/10 bg-[#111] sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-yellow-500 rounded flex items-center justify-center font-bold text-black">
                            A
                        </div>
                        <h1 className="text-lg font-bold">ICPC Hue Admin</h1>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
                    >
                        <LogOut size={16} />
                        Logout
                    </button>
                </div>
            </header>

            {/* Main Layout */}
            <main className="max-w-7xl mx-auto px-4 py-8">
                {/* Tabs Navigation */}
                <div className="flex flex-wrap gap-2 mb-8 bg-[#111] p-1.5 rounded-lg border border-white/10 w-fit">
                    <button
                        onClick={() => setActiveTab('analytics')}
                        className={`px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-all ${activeTab === 'analytics' ? 'bg-yellow-500 text-black shadow-lg' : 'text-gray-400 hover:text-white hover:bg-white/5'
                            }`}
                    >
                        <BarChart size={16} /> Analytics
                    </button>
                    <button
                        onClick={() => setActiveTab('applications')}
                        className={`px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-all ${activeTab === 'applications' ? 'bg-yellow-500 text-black shadow-lg' : 'text-gray-400 hover:text-white hover:bg-white/5'
                            }`}
                    >
                        <ClipboardList size={16} /> Applications
                    </button>
                    <button
                        onClick={() => setActiveTab('submissions')}
                        className={`px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-all ${activeTab === 'submissions' ? 'bg-yellow-500 text-black shadow-lg' : 'text-gray-400 hover:text-white hover:bg-white/5'
                            }`}
                    >
                        <FileText size={16} /> Submissions
                    </button>
                    <button
                        onClick={() => setActiveTab('logins')}
                        className={`px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-all ${activeTab === 'logins' ? 'bg-yellow-500 text-black shadow-lg' : 'text-gray-400 hover:text-white hover:bg-white/5'
                            }`}
                    >
                        <Users size={16} /> Profiles & Logins
                    </button>
                </div>

                {/* Content Area */}
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                    {activeTab === 'analytics' && <AnalyticsTab />}
                    {activeTab === 'applications' && <ApplicationsTab />}
                    {activeTab === 'submissions' && <SubmissionsTab />}
                    {activeTab === 'logins' && <LoginStatsTab />}
                </div>
            </main>
        </div>
    );
}

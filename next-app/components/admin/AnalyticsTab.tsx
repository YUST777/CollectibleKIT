'use client';

import { useState, useEffect } from 'react';
import { BarChart2, TrendingUp, Users, FileCheck, Code, Globe, Loader2 } from 'lucide-react';
import { fetchAdmin } from '@/lib/admin-client';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, BarChart, Bar, Legend
} from 'recharts';

export default function AnalyticsTab() {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        loadStats();
    }, []);

    const loadStats = async () => {
        try {
            setLoading(true);

            // Parallel fetch for dashboard overview
            const [websiteRes, appsRes] = await Promise.all([
                fetchAdmin('/api/admin/statistics/website'),
                fetchAdmin('/api/admin/statistics/applications')
            ]);

            const websiteData = await websiteRes.json();
            const appsData = await appsRes.json();

            setStats({
                website: websiteData,
                applications: appsData
            });
        } catch (err) {
            setError('Failed to load analytics data');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center p-20">
                <Loader2 className="animate-spin text-yellow-500" size={32} />
            </div>
        );
    }

    if (error) {
        return <div className="text-red-500 bg-red-500/10 p-4 rounded-lg">{error}</div>;
    }

    const { website, applications } = stats;

    const COLORS = ['#eab308', '#3b82f6', '#10b981', '#ef4444'];

    return (
        <div className="space-y-8">
            {/* Key Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-[#111] border border-white/10 p-6 rounded-xl">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-gray-400 text-sm font-medium">Total Users</span>
                        <Users className="text-blue-500" size={20} />
                    </div>
                    <div className="text-3xl font-bold text-white mb-1">
                        {website?.users?.total || 0}
                    </div>
                    <div className="text-xs text-blue-500/80">Registered Accounts</div>
                </div>

                <div className="bg-[#111] border border-white/10 p-6 rounded-xl">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-gray-400 text-sm font-medium">Total Applications</span>
                        <ClipboardListIcon className="text-yellow-500" size={20} />
                    </div>
                    <div className="text-3xl font-bold text-white mb-1">
                        {applications?.total || 0}
                    </div>
                    <div className="text-xs text-yellow-500/80">Submitted Forms</div>
                </div>

                <div className="bg-[#111] border border-white/10 p-6 rounded-xl">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-gray-400 text-sm font-medium">CF Profiles</span>
                        <Code className="text-purple-500" size={20} />
                    </div>
                    <div className="text-3xl font-bold text-white mb-1">
                        {website?.users?.codeforces || 0}
                    </div>
                    <div className="text-xs text-purple-500/80">Linked CF Accounts</div>
                </div>

                <div className="bg-[#111] border border-white/10 p-6 rounded-xl">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-gray-400 text-sm font-medium">LeetCode Profiles</span>
                        <Globe className="text-orange-500" size={20} />
                    </div>
                    <div className="text-3xl font-bold text-white mb-1">
                        {website?.users?.leetcode || 0}
                    </div>
                    <div className="text-xs text-orange-500/80">Linked LC Accounts</div>
                </div>
            </div>

            {/* Charts Row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Application Trends */}
                <div className="bg-[#111] border border-white/10 p-6 rounded-xl">
                    <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                        <TrendingUp size={18} className="text-green-500" /> Application Trends (Last 7 Days)
                    </h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={applications?.dailyTrend || []}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                                <XAxis
                                    dataKey="date"
                                    stroke="#666"
                                    fontSize={12}
                                    tickFormatter={(val) => new Date(val).toLocaleDateString(undefined, { weekday: 'short' })}
                                />
                                <YAxis stroke="#666" fontSize={12} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#000', border: '1px solid #333' }}
                                    itemStyle={{ color: '#fff' }}
                                    labelStyle={{ color: '#888' }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="count"
                                    stroke="#eab308"
                                    strokeWidth={3}
                                    dot={{ fill: '#eab308', r: 4 }}
                                    activeDot={{ r: 6 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Applications by Faculty */}
                <div className="bg-[#111] border border-white/10 p-6 rounded-xl">
                    <h3 className="text-lg font-bold text-white mb-6">Applications by Faculty</h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={applications?.byFaculty?.slice(0, 5) || []} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" stroke="#333" horizontal={false} />
                                <XAxis type="number" stroke="#666" fontSize={12} />
                                <YAxis
                                    dataKey="faculty"
                                    type="category"
                                    stroke="#666"
                                    width={120}
                                    tick={{ fontSize: 11 }}
                                />
                                <Tooltip
                                    cursor={{ fill: 'white', opacity: 0.05 }}
                                    contentStyle={{ backgroundColor: '#000', border: '1px solid #333' }}
                                />
                                <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Charts Row 2 */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Applications by Type */}
                <div className="bg-[#111] border border-white/10 p-6 rounded-xl">
                    <h3 className="text-lg font-bold text-white mb-6">Application Types</h3>
                    <div className="h-[250px] w-full flex justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={applications?.byType || []}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="count"
                                    nameKey="application_type"
                                >
                                    {(applications?.byType || []).map((entry: any, index: number) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={{ backgroundColor: '#000', border: '1px solid #333' }} />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Laptop Availability */}
                <div className="bg-[#111] border border-white/10 p-6 rounded-xl lg:col-span-2">
                    <h3 className="text-lg font-bold text-white mb-6">Laptop Availability</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-green-500/10 border border-green-500/20 p-6 rounded-xl text-center">
                            <div className="text-3xl font-bold text-green-400 mb-1">
                                {applications?.laptop?.with || 0}
                            </div>
                            <div className="text-sm text-green-500/80">Has Laptop</div>
                        </div>
                        <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-xl text-center">
                            <div className="text-3xl font-bold text-red-400 mb-1">
                                {applications?.laptop?.without || 0}
                            </div>
                            <div className="text-sm text-red-500/80">No Laptop</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Icon wrapper to avoid direct import error if Lucide updates
const ClipboardListIcon = ({ size, className }: { size: number, className?: string }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
    >
        <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
        <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
        <path d="M12 11h4" />
        <path d="M12 16h4" />
        <path d="M8 11h.01" />
        <path d="M8 16h.01" />
    </svg>
);

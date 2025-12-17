'use client';

import { useState, useEffect } from 'react';
import { Users, History, Loader2, PlayCircle } from 'lucide-react';
import { fetchAdmin } from '@/lib/admin-client';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

export default function LoginStatsTab() {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        loadLoginStats();
    }, []);

    const loadLoginStats = async () => {
        try {
            setLoading(true);
            const res = await fetchAdmin('/api/admin/statistics/logins');
            const data = await res.json();

            if (res.ok) {
                setStats(data);
            } else {
                setError('Failed to load login statistics');
            }
        } catch (e) {
            setError('Failed to load login statistics');
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

    return (
        <div className="space-y-8">
            <h2 className="text-xl font-bold flex items-center gap-2 mb-6">
                <History className="text-blue-500" /> Site Activity & Logins
            </h2>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-[#111] border border-white/10 p-6 rounded-xl">
                    <div className="text-sm text-gray-400 mb-2">Total Logins Recorded</div>
                    <div className="text-3xl font-bold text-white">{stats?.total_logins || 0}</div>
                </div>
                <div className="bg-[#111] border border-white/10 p-6 rounded-xl">
                    <div className="text-sm text-gray-400 mb-2">Unique Users (All Time)</div>
                    <div className="text-3xl font-bold text-white">{stats?.unique_logins || 0}</div>
                </div>
                <div className="bg-[#111] border border-white/10 p-6 rounded-xl">
                    <div className="text-sm text-gray-400 mb-2">Active in Last 24h</div>
                    <div className="text-3xl font-bold text-green-400">{stats?.last_24h || 0}</div>
                </div>
            </div>

            {/* Login Timeline Chart */}
            <div className="bg-[#111] border border-white/10 p-6 rounded-xl">
                <h3 className="text-lg font-bold text-white mb-6">Login Activity (Last 30 Days)</h3>
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={stats?.timeline || []}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                            <XAxis
                                dataKey="date"
                                stroke="#666"
                                fontSize={12}
                                tickFormatter={(val) => new Date(val).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                            />
                            <YAxis stroke="#666" fontSize={12} />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#000', border: '1px solid #333' }}
                                cursor={{ fill: 'white', opacity: 0.05 }}
                            />
                            <Bar dataKey="count" fill="#eab308" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Top Users Table */}
            <div className="bg-[#111] border border-white/10 rounded-xl overflow-hidden">
                <div className="p-4 border-b border-white/10 bg-white/5 font-bold flex items-center gap-2">
                    <Users size={18} className="text-gray-400" />
                    Most Active Users
                </div>
                <table className="w-full text-left text-sm">
                    <thead>
                        <tr className="border-b border-white/10 text-gray-400">
                            <th className="p-4 font-medium">User Email</th>
                            <th className="p-4 font-medium text-right">Login Count</th>
                            <th className="p-4 font-medium text-right">Last Active</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {stats?.top_users?.slice(0, 10).map((user: any, i: number) => (
                            <tr key={i} className="hover:bg-white/5 transition-colors">
                                <td className="p-4 text-white font-medium">{user.email}</td>
                                <td className="p-4 text-right text-yellow-500 font-mono">{user.login_count}</td>
                                <td className="p-4 text-right text-gray-500">
                                    {new Date(user.last_login).toLocaleString()}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

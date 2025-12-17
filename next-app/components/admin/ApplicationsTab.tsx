'use client';

import { useState, useEffect } from 'react';
import { ClipboardList, Download, Check, X, Loader2 } from 'lucide-react';
import { fetchAdmin } from '@/lib/admin-client';

interface Application {
    id: string;
    name: string;
    email: string;
    faculty: string;
    student_id: string;
    student_level: string;
    application_type: string;
    has_laptop: boolean;
    submitted_at: string;
}

export default function ApplicationsTab() {
    const [applications, setApplications] = useState<Application[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    useEffect(() => {
        loadApplications();
    }, [currentPage]);

    const loadApplications = async () => {
        try {
            setLoading(true);
            const res = await fetchAdmin(`/api/admin/applications?page=${currentPage}&limit=50`);
            const data = await res.json();

            if (res.ok) {
                setApplications(data.applications || []);
                setTotalPages(data.totalPages || 1);
            } else {
                setError(data.error || 'Failed to load applications');
            }
        } catch (err) {
            setError('Failed to load applications');
        } finally {
            setLoading(false);
        }
    };

    const exportToCSV = () => {
        if (!applications.length) return;

        const headers = ['Name', 'Email', 'Faculty', 'Student ID', 'Level', 'Type', 'Laptop', 'Submitted At'];
        const rows = applications.map(app => [
            app.name,
            app.email,
            app.faculty,
            app.student_id,
            app.student_level,
            app.application_type,
            app.has_laptop ? 'Yes' : 'No',
            new Date(app.submitted_at).toLocaleString()
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(r => r.map(c => `"${c}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `applications-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    if (error) {
        return (
            <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-lg">
                Error: {error}
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold flex items-center gap-2">
                    <ClipboardList className="text-yellow-500" />
                    Applications Database
                    <span className="text-sm font-normal text-gray-500 ml-2">({applications.length} visible)</span>
                </h2>
                <button
                    onClick={exportToCSV}
                    className="bg-white/5 hover:bg-white/10 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors border border-white/10"
                >
                    <Download size={16} /> Export CSV
                </button>
            </div>

            <div className="bg-[#111] border border-white/10 rounded-xl overflow-hidden">
                {loading ? (
                    <div className="p-12 flex justify-center">
                        <Loader2 className="animate-spin text-yellow-500" size={32} />
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="border-b border-white/10 bg-white/5 text-gray-400">
                                    <th className="p-4 font-medium sticky left-0 bg-[#1a1a1a]">#</th>
                                    <th className="p-4 font-medium">Name</th>
                                    <th className="p-4 font-medium">Email</th>
                                    <th className="p-4 font-medium">Faculty</th>
                                    <th className="p-4 font-medium">Student ID</th>
                                    <th className="p-4 font-medium">Level</th>
                                    <th className="p-4 font-medium">Type</th>
                                    <th className="p-4 font-medium text-center">Laptop</th>
                                    <th className="p-4 font-medium text-right">Submitted</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {applications.map((app, i) => (
                                    <tr key={app.id} className="hover:bg-white/5 transition-colors">
                                        <td className="p-4 text-gray-500 sticky left-0 bg-[#111]">
                                            {(currentPage - 1) * 50 + i + 1}
                                        </td>
                                        <td className="p-4 font-medium text-white">{app.name}</td>
                                        <td className="p-4 text-gray-400">{app.email}</td>
                                        <td className="p-4 text-gray-400">{app.faculty}</td>
                                        <td className="p-4 font-mono text-gray-400">{app.student_id}</td>
                                        <td className="p-4 text-gray-400">{app.student_level}</td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase ${app.application_type === 'mentor'
                                                    ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                                                    : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                                }`}>
                                                {app.application_type || 'trainee'}
                                            </span>
                                        </td>
                                        <td className="p-4 text-center">
                                            {app.has_laptop ? <Check size={16} className="text-green-500 mx-auto" /> : <X size={16} className="text-red-500 mx-auto" />}
                                        </td>
                                        <td className="p-4 text-right text-gray-500">
                                            {new Date(app.submitted_at).toLocaleDateString()}
                                        </td>
                                    </tr>
                                ))}
                                {applications.length === 0 && (
                                    <tr>
                                        <td colSpan={9} className="p-8 text-center text-gray-500">
                                            No applications found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex justify-center gap-2 mt-4">
                    <button
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(p => p - 1)}
                        className="px-4 py-2 bg-[#111] border border-white/10 rounded-lg text-sm hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Previous
                    </button>
                    <span className="px-4 py-2 text-sm text-gray-500">
                        Page {currentPage} of {totalPages}
                    </span>
                    <button
                        disabled={currentPage === totalPages}
                        onClick={() => setCurrentPage(p => p + 1)}
                        className="px-4 py-2 bg-[#111] border border-white/10 rounded-lg text-sm hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Next
                    </button>
                </div>
            )}
        </div>
    );
}

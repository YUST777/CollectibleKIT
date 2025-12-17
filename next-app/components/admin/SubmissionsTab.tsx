'use client';

import { useState, useEffect } from 'react';
import { FileText, Loader2, Code, User } from 'lucide-react';
import { fetchAdmin } from '@/lib/admin-client';

interface Submission {
    id: string;
    sheet_name: string;
    problem_name: string;
    file_name: string;
    file_size: number;
    submitted_at: string;
    user_email: string;
}

export default function SubmissionsTab() {
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    useEffect(() => {
        loadSubmissions();
    }, [currentPage]);

    const loadSubmissions = async () => {
        try {
            setLoading(true);
            const res = await fetchAdmin(`/api/admin/submissions?page=${currentPage}&limit=50`);
            const data = await res.json();

            if (res.ok) {
                setSubmissions(data.submissions || []);
                setTotalPages(data.totalPages || 1);
            } else {
                setError(data.error || 'Failed to load submissions');
            }
        } catch (err) {
            setError('Failed to load submissions');
        } finally {
            setLoading(false);
        }
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
            <h2 className="text-xl font-bold flex items-center gap-2">
                <FileText className="text-green-500" />
                Sheet Submissions
            </h2>

            <div className="bg-[#111] border border-white/10 rounded-xl overflow-hidden">
                {loading ? (
                    <div className="p-12 flex justify-center">
                        <Loader2 className="animate-spin text-green-500" size={32} />
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="border-b border-white/10 bg-white/5 text-gray-400">
                                    <th className="p-4 font-medium">User</th>
                                    <th className="p-4 font-medium">Sheet Info</th>
                                    <th className="p-4 font-medium">File</th>
                                    <th className="p-4 font-medium text-right">Size</th>
                                    <th className="p-4 font-medium text-right">Submitted</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {submissions.map((sub) => (
                                    <tr key={sub.id} className="hover:bg-white/5 transition-colors">
                                        <td className="p-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                                                    <User size={14} className="text-gray-400" />
                                                </div>
                                                <span className="text-white font-medium">{sub.user_email}</span>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex flex-col">
                                                <span className="text-yellow-500 font-bold">{sub.problem_name}</span>
                                                <span className="text-gray-500 text-xs">{sub.sheet_name}</span>
                                            </div>
                                        </td>
                                        <td className="p-4 font-mono text-gray-400 flex items-center gap-2">
                                            <Code size={14} /> {sub.file_name}
                                        </td>
                                        <td className="p-4 text-right text-gray-500">
                                            {(sub.file_size / 1024).toFixed(2)} KB
                                        </td>
                                        <td className="p-4 text-right text-gray-500">
                                            {new Date(sub.submitted_at).toLocaleString()}
                                        </td>
                                    </tr>
                                ))}
                                {submissions.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="p-8 text-center text-gray-500">
                                            No submissions found.
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

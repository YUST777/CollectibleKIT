'use client';

import { useState } from 'react';
import { Lock, User, Key, ShieldCheck, AlertCircle, Loader2 } from 'lucide-react';

interface AdminLoginProps {
    onLogin: () => void;
}

export default function AdminLogin({ onLogin }: AdminLoginProps) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [totp, setTotp] = useState('');
    const [token, setToken] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            // Construct Basic Auth string: username:password,totp
            const credentials = btoa(`${username}:${password},${totp}`);

            // Test credentials against health check or a lightweight admin endpoint
            const res = await fetch('/api/admin/statistics/website', {
                headers: {
                    'x-admin-token': token,
                    'Authorization': `Basic ${credentials}`
                }
            });

            if (res.ok) {
                // Store auth details
                localStorage.setItem('adminAuth', JSON.stringify({
                    token,
                    credentials, // Storing base64 credentials in local storage is risky but standard for basic auth client-side apps without cookies
                    timestamp: new Date().getTime()
                }));
                onLogin();
            } else {
                const data = await res.json().catch(() => ({}));
                setError(data.error || 'Authentication failed. Check credentials and codes.');
            }
        } catch (err) {
            setError('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-black flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-[#111] border border-white/10 rounded-2xl p-8 shadow-2xl">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-yellow-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Lock className="text-yellow-500" size={32} />
                    </div>
                    <h1 className="text-2xl font-bold text-white">Admin Access</h1>
                    <p className="text-gray-400 text-sm mt-2">Restricted Area. Authorized Personnel Only.</p>
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl mb-6 flex items-start gap-3">
                        <AlertCircle size={20} className="shrink-0 mt-0.5" />
                        <span className="text-sm">{error}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">Secret Token</label>
                        <div className="relative">
                            <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                            <input
                                type="password"
                                value={token}
                                onChange={(e) => setToken(e.target.value)}
                                className="w-full bg-black border border-white/10 rounded-lg py-2.5 pl-10 pr-4 text-white focus:outline-none focus:border-yellow-500/50 transition-colors"
                                placeholder="Enter Admin Secret Token"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">Username</label>
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full bg-black border border-white/10 rounded-lg py-2.5 pl-10 pr-4 text-white focus:outline-none focus:border-yellow-500/50 transition-colors"
                                placeholder="Enter Username"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">Password</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-black border border-white/10 rounded-lg py-2.5 pl-10 pr-4 text-white focus:outline-none focus:border-yellow-500/50 transition-colors"
                                placeholder="Enter Password"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">Authenticator Code (TOTP)</label>
                        <div className="relative">
                            <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                            <input
                                type="text"
                                value={totp}
                                onChange={(e) => setTotp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                className="w-full bg-black border border-white/10 rounded-lg py-2.5 pl-10 pr-4 text-white focus:outline-none focus:border-yellow-500/50 transition-colors tracking-widest font-mono"
                                placeholder="000000"
                                required
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full mt-6 bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                        {loading && <Loader2 className="animate-spin" size={18} />}
                        {loading ? 'Verifying...' : 'Authenticate Access'}
                    </button>
                </form>
            </div>
        </div>
    );
}

'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Mail, ArrowRight, CheckCircle, AlertCircle, Loader2, CreditCard, Shield } from 'lucide-react';
import Providers from '@/components/Providers';
import { motion } from 'framer-motion';

function ForgotPasswordContent() {
    const router = useRouter();
    const [method, setMethod] = useState('email');
    const [email, setEmail] = useState('');
    const [nationalId, setNationalId] = useState('');
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (method === 'email' && !email) return;
        if (method === 'id' && (!email || !nationalId)) return;

        setStatus('loading');
        setMessage('');

        try {
            if (method === 'email') {
                const response = await fetch('/api/auth/forgot-password', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: email.toLowerCase() }),
                });
                const data = await response.json();
                if (response.ok && data.success) {
                    setStatus('success');
                    setMessage(data.message);
                } else {
                    setStatus('error');
                    setMessage(data.error || 'Failed to send reset link');
                }
            } else {
                const response = await fetch('/api/auth/verify-id-reset', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: email.toLowerCase(), nationalId }),
                });
                const data = await response.json();
                if (response.ok && data.success) {
                    setTimeout(() => {
                        router.push(`/reset-password?token=${data.token}&email=${encodeURIComponent(email.toLowerCase())}&verified=true`);
                    }, 1500);
                    setStatus('success');
                    setMessage('Identity verified! Redirecting to reset password...');
                } else {
                    setStatus('error');
                    setMessage(data.error || 'Email and National ID do not match');
                }
            }
        } catch (err) {
            setStatus('error');
            setMessage('Network error. Please try again later.');
        }
    };

    return (
        <div className="min-h-screen bg-black flex items-center justify-center px-4 relative overflow-hidden">
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#d59928]/10 rounded-full blur-3xl"></div>
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#d59928]/5 rounded-full blur-3xl"></div>
            </div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md relative z-10">
                <div className="text-center mb-8">
                    <Link href="/" className="inline-block">
                        <Image src="/images/navlogo.webp" alt="ICPC HUE" width={64} height={64} className="h-16 w-auto mx-auto" />
                    </Link>
                    <p className="text-white/60 mt-4 text-sm">Reset your password</p>
                </div>

                <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-8 shadow-2xl">
                    <div className="mb-6 text-center">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#d59928]/10 text-[#d59928] mb-4"><Shield className="w-8 h-8" /></div>
                        <h1 className="text-2xl font-bold text-white mb-2">Reset Your Password</h1>
                        <p className="text-white/60 text-sm">Choose your preferred recovery method</p>
                    </div>

                    <div className="flex gap-2 mb-6 bg-black/30 p-1 rounded-xl">
                        <button type="button" onClick={() => setMethod('email')} className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${method === 'email' ? 'bg-[#d59928] text-black shadow-lg' : 'text-white/60 hover:text-white hover:bg-white/5'}`}><Mail size={16} />Email Reset</button>
                        <button type="button" onClick={() => setMethod('id')} className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${method === 'id' ? 'bg-[#d59928] text-black shadow-lg' : 'text-white/60 hover:text-white hover:bg-white/5'}`}><CreditCard size={16} />ID Verification</button>
                    </div>

                    <div className="mb-6 p-3 bg-white/5 rounded-lg border border-white/10">
                        <p className="text-xs text-white/70 leading-relaxed">
                            {method === 'email' ? <><strong className="text-[#d59928]">Email Method:</strong> We&apos;ll send a secure reset link to your email. Check your inbox and spam folder.</> : <><strong className="text-[#d59928]">ID Verification:</strong> Can&apos;t access your email? Verify your identity with your National ID to reset immediately.</>}
                        </p>
                    </div>

                    {status === 'success' ? (
                        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-[#d59928]/10 border border-[#d59928]/30 rounded-xl p-8 text-center">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#d59928]/20 text-[#d59928] mb-4"><CheckCircle className="w-8 h-8" /></div>
                            <h3 className="text-xl font-bold text-white mb-3">Check your email</h3>
                            <p className="text-white/70 text-sm leading-relaxed">{message}</p>
                        </motion.div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {status === 'error' && (<div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-start text-red-400 text-sm"><AlertCircle className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />{message}</div>)}

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-white/80">Email Address</label>
                                <div className="relative">
                                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#d59928]/50 focus:border-[#d59928]/50 transition-all pl-10" placeholder="your@email.com" required dir="ltr" />
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                                </div>
                            </div>

                            {method === 'id' && (
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-white/80">National ID</label>
                                    <div className="relative">
                                        <input type="text" value={nationalId} onChange={(e) => setNationalId(e.target.value)} className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#d59928]/50 focus:border-[#d59928]/50 transition-all pl-10" placeholder="Enter your 14-digit National ID" required maxLength={14} pattern="[0-9]{14}" dir="ltr" />
                                        <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                                    </div>
                                    <p className="text-xs text-white/50">Enter the same National ID you used during registration</p>
                                </div>
                            )}

                            <button type="submit" disabled={status === 'loading'} className="w-full bg-[#d59928] hover:bg-[#c5963a] text-black font-bold rounded-xl px-4 py-3.5 transition-all flex items-center justify-center gap-2 group disabled:opacity-70 disabled:cursor-not-allowed shadow-lg shadow-[#d59928]/20">
                                {status === 'loading' ? <><Loader2 className="w-5 h-5 animate-spin" />{method === 'email' ? 'Sending...' : 'Verifying...'}</> : <><ArrowRight className="w-5 h-5" />{method === 'email' ? 'Send Reset Link' : 'Verify & Reset'}</>}
                            </button>
                        </form>
                    )}

                    <div className="mt-6 text-center"><Link href="/login" className="text-sm text-white/60 hover:text-[#d59928] transition-colors inline-flex items-center gap-2"><ArrowRight className="w-4 h-4 rotate-180" />Back to Login</Link></div>
                </div>

                <div className="mt-6 text-center"><Link href="/" className="text-sm text-white/40 hover:text-white/60 transition-colors">← Back to Home</Link></div>
            </motion.div>
        </div>
    );
}

export default function ForgotPassword() {
    return <Providers><ForgotPasswordContent /></Providers>;
}

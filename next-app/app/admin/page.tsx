'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, notFound } from 'next/navigation';
import AdminDashboard from '@/components/admin/AdminDashboard';
import AdminLogin from '@/components/admin/AdminLogin';
import { Loader2 } from 'lucide-react';

function AdminPageContent() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const searchParams = useSearchParams();

    // Extract token from query: ?TOKEN or ?TOKEN= or ?token=TOKEN
    let urlToken = '';
    let hasValidUrl = false;
    const entries = Array.from(searchParams.entries());

    // Accepted tokens: Real env token OR User's provided string
    const validTokens = [
        "2TE7UCU9TXQVXQLQMEVE4RYGFJVT8X7CNBWT6Z3NTU",
        "T2TE7UCU9TXQVXQLQMEVE4RYGFJVT8X7CNBWT6Z3NTU"
    ];

    // Check both key and value for token
    if (entries.length > 0) {
        for (const [key, value] of entries) {
            // Check if token is in key (format: ?TOKEN)
            if (validTokens.some(t => key.includes(t) || t.includes(key))) {
                hasValidUrl = true;
                urlToken = "2TE7UCU9TXQVXQLQMEVE4RYGFJVT8X7CNBWT6Z3NTU";
                break;
            }
            // Check if token is in value (format: ?token=TOKEN)
            if (validTokens.some(t => value.includes(t) || t.includes(value))) {
                hasValidUrl = true;
                urlToken = "2TE7UCU9TXQVXQLQMEVE4RYGFJVT8X7CNBWT6Z3NTU";
                break;
            }
        }
    }

    // STRICT ACCESS CONTROL
    if (!hasValidUrl) {
        notFound(); // Returns 404
        return null;
    }

    useEffect(() => {
        // Check for existing auth in localStorage
        const storedAuth = localStorage.getItem('adminAuth');
        if (storedAuth) {
            try {
                const { token, credentials, timestamp } = JSON.parse(storedAuth);
                // Simple session expiry check (e.g., 24 hours)
                const now = new Date().getTime();
                if (now - timestamp < 24 * 60 * 60 * 1000) {
                    setIsAuthenticated(true);
                } else {
                    localStorage.removeItem('adminAuth');
                }
            } catch (e) {
                localStorage.removeItem('adminAuth');
            }
        }
        setIsLoading(false);
    }, []);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-black text-white">
                <Loader2 className="animate-spin text-yellow-500" size={48} />
            </div>
        );
    }

    if (!isAuthenticated) {
        return <AdminLogin onLogin={() => setIsAuthenticated(true)} defaultToken={urlToken} />;
    }

    return <AdminDashboard onLogout={() => setIsAuthenticated(false)} />;
}

export default function AdminPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-black flex items-center justify-center">
                <Loader2 className="animate-spin text-yellow-500" size={32} />
            </div>
        }>
            <AdminPageContent />
        </Suspense>
    );
}

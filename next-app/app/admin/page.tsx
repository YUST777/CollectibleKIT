'use client';

import { useState, useEffect } from 'react';
import AdminLogin from '@/components/admin/AdminLogin';
import AdminDashboard from '@/components/admin/AdminDashboard';
import { Loader2 } from 'lucide-react';

export default function AdminPage() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Check for stored credentials
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
        return <AdminLogin onLogin={() => setIsAuthenticated(true)} />;
    }

    return <AdminDashboard onLogout={() => setIsAuthenticated(false)} />;
}

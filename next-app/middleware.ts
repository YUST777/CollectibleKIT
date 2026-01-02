import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Simple in-memory rate limiter (per instance)
// Using a Map for IP tracking: <IP, { count: number, resetTime: number }>
const rateLimitMap = new Map<string, { count: number, resetTime: number }>();
const WINDOW_SIZE = 60 * 1000; // 1 minute
const MAX_REQUESTS = 100; // 100 requests per minute per IP

// Clean up old entries periodically to prevent memory leaks
setInterval(() => {
    const now = Date.now();
    for (const [ip, data] of rateLimitMap.entries()) {
        if (now > data.resetTime) {
            rateLimitMap.delete(ip);
        }
    }
}, 30000); // Check every 30 seconds

export function middleware(request: NextRequest) {
    const response = NextResponse.next();
    const headers = response.headers;

    // --- 1. Security Headers ---
    headers.set('X-DNS-Prefetch-Control', 'on');
    headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
    headers.set('X-Frame-Options', 'SAMEORIGIN');
    headers.set('X-Content-Type-Options', 'nosniff');
    headers.set('Referrer-Policy', 'origin-when-cross-origin');

    // Content-Security-Policy (Permissive to avoid breaking existing features like 3D models/images)
    // Adjust 'img-src', 'connect-src' etc. as needed for your specific external resources.
    headers.set('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https: blob:; style-src 'self' 'unsafe-inline' https:; img-src 'self' data: blob: https:; font-src 'self' data: https:; connect-src 'self' https: blob:; media-src 'self' https:; frame-src 'self' https://drive.google.com https://www.youtube.com; object-src 'none'; frame-ancestors 'none'; upgrade-insecure-requests;");

    // --- 2. Bot Blocking ---
    const userAgent = request.headers.get('user-agent')?.toLowerCase() || '';
    // Common tools/bots to block (Extend this list as needed)
    const blockedAgents = ['python-requests', 'libwww-perl', 'scrapy', 'curl', 'wget'];

    // Allow basic curl/wget only if strictly needed for testing (Removed for strict security)
    if (blockedAgents.some(agent => userAgent.includes(agent))) {
        return new NextResponse('Access Denied: Suspicious User Agent', { status: 403 });
    }

    // --- 3. Basic Rate Limiting ---
    // Note: This is instance-local. For distributed deployments (like Vercel), 
    // this acts as a layer of defense but isn't a global rate limiter (use Redis for that).
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';

    if (ip !== 'unknown') {
        const now = Date.now();
        const limitData = rateLimitMap.get(ip);

        if (limitData) {
            if (now < limitData.resetTime) {
                if (limitData.count >= MAX_REQUESTS) {
                    return new NextResponse('Too Many Requests', { status: 429 });
                }
                limitData.count++;
            } else {
                // Window expired, reset
                rateLimitMap.set(ip, { count: 1, resetTime: now + WINDOW_SIZE });
            }
        } else {
            // New IP
            rateLimitMap.set(ip, { count: 1, resetTime: now + WINDOW_SIZE });
        }
    }

    return response;
}

export const config = {
    // Apply to all routes except static files, images, etc. to reduce overhead
    matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png|.*\\.jpg|.*\\.svg|.*\\.glb).*)'],
};
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
    // Get real IP from headers (handles proxies/load balancers)
    const forwardedFor = req.headers.get('x-forwarded-for');
    const realIp = req.headers.get('x-real-ip');

    const clientIP = forwardedFor?.split(',')[0]?.trim() ||
        realIp ||
        'unknown';

    // Remove IPv6 prefix if present
    const cleanIP = clientIP.replace(/^::ffff:/, '');

    return NextResponse.json({ ip: cleanIP });
}

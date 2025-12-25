import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { encrypt, hashEmail } from '@/lib/crypto';

function sanitizeInput(input: string): string {
    if (!input) return '';
    return input.replace(/[<>'"]/g, '').trim();
}

// Add type definition for global
declare global {
    var appSubmitRateLimits: Map<string, number> | undefined;
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const {
            applicationType, name, faculty, id, nationalId, studentLevel,
            telephone, hasLaptop, codeforcesProfile, leetcodeProfile, email
        } = body;

        // Basic validation
        if (!name || !faculty || !id || !nationalId || !email) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Get IP address (Robust)
        const forwarded = request.headers.get('x-forwarded-for');
        const ip = forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip') || 'unknown';
        const userAgent = request.headers.get('user-agent') || 'unknown';

        // Rate Limiting (In-Memory by IP) - 10 minutes cooldown
        // Prevents flooding the database with fake applications
        if (ip !== 'unknown' && ip !== '::1' && ip !== '127.0.0.1') {
            const RATE_LIMIT_DURATION = 10 * 60 * 1000; // 10 minutes
            const lastSubmitTime = global.appSubmitRateLimits?.get(ip) || 0;
            const now = Date.now();

            if (now - lastSubmitTime < RATE_LIMIT_DURATION) {
                const waitMinutes = Math.ceil((RATE_LIMIT_DURATION - (now - lastSubmitTime)) / 60000);
                return NextResponse.json(
                    { error: `Please wait ${waitMinutes}m before submitting another application` },
                    { status: 429 }
                );
            }

            // Initialize global map if needed
            if (!global.appSubmitRateLimits) {
                global.appSubmitRateLimits = new Map();
            }
            global.appSubmitRateLimits.set(ip, now);
        }

        // Sanitize inputs
        const sanitizedName = sanitizeInput(name);
        const sanitizedFaculty = sanitizeInput(faculty);
        const sanitizedId = sanitizeInput(id);
        const sanitizedLevel = sanitizeInput(studentLevel || '');


        // Insert into database
        const result = await query(
            `INSERT INTO applications (
        application_type, name, faculty, student_id, national_id, student_level, 
        telephone, address, has_laptop, codeforces_profile, leetcode_profile, 
        email, email_hash, ip_address, user_agent, scraping_status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING id`,
            [
                applicationType || 'trainee',
                sanitizedName,
                sanitizedFaculty,
                sanitizedId,
                encrypt(nationalId),
                sanitizedLevel,
                encrypt(telephone),
                null,
                hasLaptop ? 1 : 0,
                codeforcesProfile || null,
                leetcodeProfile || null,
                encrypt(email),
                hashEmail(email), // Store hash for O(1) lookup
                ip.substring(0, 45),
                userAgent.substring(0, 255),
                'pending'
            ]
        );

        const applicationId = result.rows[0].id;

        return NextResponse.json({
            success: true,
            message: 'Application submitted successfully',
            applicationId
        });

    } catch (error: any) {
        console.error('Submit application error:', error);

        // Handle duplicate key error (PostgreSQL code 23505)
        if (error?.code === '23505') {
            const detail = error.detail || '';
            let message = 'This record already exists.';

            if (detail.includes('student_id')) {
                message = 'This Student ID is already registered.';
            } else if (detail.includes('email')) {
                message = 'This Email is already registered.';
            } else if (detail.includes('national_id')) {
                message = 'This National ID is already registered.';
            }

            return NextResponse.json({ error: message }, { status: 409 });
        }

        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}

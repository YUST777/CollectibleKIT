import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { query } from '@/lib/db';
import fs from 'fs';
import path from 'path';

const PFPS_DIR = '/home/ubuntu/icpchue/pfps';

export async function DELETE(request: NextRequest) {
    try {
        // Verify authentication
        const authUser = await verifyAuth(request);
        if (!authUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = authUser.id;

        // Get current profile picture
        const result = await query(
            'SELECT profile_picture FROM users WHERE id = $1',
            [userId]
        );

        const currentPfp = result.rows[0]?.profile_picture;

        if (!currentPfp) {
            return NextResponse.json({ error: 'No profile picture to delete' }, { status: 404 });
        }

        // Delete file from disk
        const filePath = path.join(PFPS_DIR, currentPfp);
        try {
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                console.log(`🗑️ Deleted profile picture file: ${currentPfp}`);
            }
        } catch (err) {
            console.error('Error deleting profile picture file:', err);
        }

        // Update database
        await query(
            'UPDATE users SET profile_picture = NULL WHERE id = $1',
            [userId]
        );

        console.log(`🗑️ User ${userId} deleted profile picture: ${currentPfp}`);

        return NextResponse.json({ success: true, message: 'Profile picture deleted' });
    } catch (error) {
        console.error('Error deleting profile picture:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}

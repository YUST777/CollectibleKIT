import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { query } from '@/lib/db';

const JWT_SECRET = process.env.JWT_SECRET || process.env.API_SECRET_KEY;

interface JWTPayload {
    id: number | string;
    email: string;
    userId: number | string;
}

// GET /api/news/reactions?newsId=<id>
// Returns reaction counts and user's reactions for a news item
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const newsId = searchParams.get('newsId');

        if (!newsId) {
            return NextResponse.json({ error: 'newsId is required' }, { status: 400 });
        }

        // Get user from JWT token
        const authHeader = request.headers.get('authorization');
        const token = authHeader?.replace('Bearer ', '');

        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (!JWT_SECRET) {
            return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
        }

        // Verify token
        let decoded: JWTPayload;
        try {
            decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
        } catch (err) {
            return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
        }

        const userId = decoded.id || decoded.userId;

        // Get reaction counts
        const countsResult = await query(
            `SELECT reaction_type, COUNT(*) as count 
             FROM news_reactions 
             WHERE news_id = $1 
             GROUP BY reaction_type`,
            [newsId]
        );

        // Get user's reactions
        const userReactionsResult = await query(
            `SELECT reaction_type 
             FROM news_reactions 
             WHERE news_id = $1 AND user_id = $2`,
            [newsId, userId]
        );

        const counts = {
            like: 0,
            heart: 0,
            fire: 0
        };

        countsResult.rows.forEach(row => {
            counts[row.reaction_type as keyof typeof counts] = parseInt(row.count);
        });

        const userReactions = userReactionsResult.rows.map(row => row.reaction_type);

        return NextResponse.json({
            counts,
            userReactions
        });

    } catch (error) {
        console.error('Error fetching reactions:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// POST /api/news/reactions
// Add or toggle a reaction
export async function POST(request: NextRequest) {
    try {
        const { newsId, reactionType } = await request.json();

        if (!newsId || !reactionType) {
            return NextResponse.json({ error: 'newsId and reactionType are required' }, { status: 400 });
        }

        if (!['like', 'heart', 'fire'].includes(reactionType)) {
            return NextResponse.json({ error: 'Invalid reaction type' }, { status: 400 });
        }

        // Get user from JWT token
        const authHeader = request.headers.get('authorization');
        const token = authHeader?.replace('Bearer ', '');

        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (!JWT_SECRET) {
            return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
        }

        // Verify token
        let decoded: JWTPayload;
        try {
            decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
        } catch (err) {
            return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
        }

        const userId = decoded.id || decoded.userId;

        // Check if reaction already exists
        const existingReaction = await query(
            'SELECT id FROM news_reactions WHERE news_id = $1 AND user_id = $2 AND reaction_type = $3',
            [newsId, userId, reactionType]
        );

        if (existingReaction.rows.length > 0) {
            // Remove reaction (toggle off)
            await query(
                'DELETE FROM news_reactions WHERE news_id = $1 AND user_id = $2 AND reaction_type = $3',
                [newsId, userId, reactionType]
            );
            return NextResponse.json({ action: 'removed', reactionType });
        } else {
            // Add reaction
            await query(
                'INSERT INTO news_reactions (news_id, user_id, reaction_type) VALUES ($1, $2, $3)',
                [newsId, userId, reactionType]
            );
            return NextResponse.json({ action: 'added', reactionType });
        }

    } catch (error) {
        console.error('Error toggling reaction:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// DELETE /api/news/reactions
// Remove a reaction
export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const newsId = searchParams.get('newsId');
        const reactionType = searchParams.get('reactionType');

        if (!newsId || !reactionType) {
            return NextResponse.json({ error: 'newsId and reactionType are required' }, { status: 400 });
        }

        // Get user from JWT token
        const authHeader = request.headers.get('authorization');
        const token = authHeader?.replace('Bearer ', '');

        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (!JWT_SECRET) {
            return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
        }

        // Verify token
        let decoded: JWTPayload;
        try {
            decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
        } catch (err) {
            return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
        }

        const userId = decoded.id || decoded.userId;

        await query(
            'DELETE FROM news_reactions WHERE news_id = $1 AND user_id = $2 AND reaction_type = $3',
            [newsId, userId, reactionType]
        );

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('Error deleting reaction:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

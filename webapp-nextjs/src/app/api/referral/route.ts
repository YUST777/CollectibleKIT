import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';

// POST: Add a referral
export async function POST(request: NextRequest) {
  try {
    const { referrerId, invitedId, invitedName, invitedPhoto } = await request.json();
    
    if (!referrerId || !invitedId) {
      return NextResponse.json({ error: 'Missing referrerId or invitedId' }, { status: 400 });
    }

    if (referrerId === invitedId) {
      return NextResponse.json({ error: 'Cannot refer yourself' }, { status: 400 });
    }

    // Store Telegram photo URL directly in database
    const success = await db.addReferral(referrerId, invitedId, invitedName || '', invitedPhoto || '');
    
    if (success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ error: 'Failed to add referral' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error adding referral:', error);
    return NextResponse.json({ 
      error: 'Failed to add referral', 
      details: (error as Error).message 
    }, { status: 500 });
  }
}

// GET: Get invited users by referrer_id (as query param)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const referrerId = searchParams.get('referrer_id');
    
    console.log('Referral API GET called with referrer_id:', referrerId);
    
    if (!referrerId) {
      return NextResponse.json({ error: 'Missing referrer_id' }, { status: 400 });
    }

    const invited = await db.getInvitedUsers(Number(referrerId));
    console.log('Invited users returned:', invited);
    
    return NextResponse.json({ invited });
  } catch (error) {
    console.error('Error fetching invited users:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch invited users', 
      details: (error as Error).message 
    }, { status: 500 });
  }
}




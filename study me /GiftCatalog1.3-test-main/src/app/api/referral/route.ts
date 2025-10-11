import { NextRequest, NextResponse } from 'next/server';
import { addReferral, getInvitedUsers } from '@/lib/db';

// POST: Add a referral
export async function POST(request: NextRequest) {
  try {
    const { referrerId, invitedId, invitedName, invitedPhoto } = await request.json();
    if (!referrerId || !invitedId) {
      return NextResponse.json({ error: 'Missing referrerId or invitedId' }, { status: 400 });
    }
    await addReferral(referrerId, invitedId, invitedName || '', invitedPhoto || '');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error adding referral:', error);
    return NextResponse.json({ error: 'Failed to add referral', details: (error as Error).message }, { status: 500 });
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
    const invited = await getInvitedUsers(Number(referrerId));
    console.log('Invited users returned:', invited);
    return NextResponse.json({ invited });
  } catch (error) {
    console.error('Error fetching invited users:', error);
    return NextResponse.json({ error: 'Failed to fetch invited users', details: (error as Error).message }, { status: 500 });
  }
} 
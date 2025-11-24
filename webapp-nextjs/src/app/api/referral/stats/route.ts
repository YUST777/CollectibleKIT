import { NextRequest } from 'next/server';
import { db } from '@/lib/database';
import { successResponse, ApiErrors, handleApiError } from '@/lib/api-response';

// GET: Get referral stats for a user
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const referrerId = searchParams.get('referrer_id');
    
    console.log('Referral stats API called with referrer_id:', referrerId);
    
    if (!referrerId) {
      return ApiErrors.badRequest('Missing referrer_id');
    }

    const stats = await db.getReferralStats(Number(referrerId));
    console.log('Referral stats returned:', stats);
    
    return successResponse({ stats });
  } catch (error) {
    return handleApiError(error, 'Failed to fetch referral stats');
  }
}




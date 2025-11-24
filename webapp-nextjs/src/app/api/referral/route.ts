import { NextRequest } from 'next/server';
import { db } from '@/lib/database';
import { successResponse, ApiErrors, handleApiError } from '@/lib/api-response';

// POST: Add a referral
export async function POST(request: NextRequest) {
  try {
    const { referrerId, invitedId, invitedName, invitedPhoto } = await request.json();
    
    if (!referrerId || !invitedId) {
      return ApiErrors.badRequest('Missing referrerId or invitedId');
    }

    if (referrerId === invitedId) {
      return ApiErrors.validationError('Cannot refer yourself');
    }

    // Store Telegram photo URL directly in database
    const success = await db.addReferral(referrerId, invitedId, invitedName || '', invitedPhoto || '');
    
    if (success) {
      return successResponse(null, 'Referral added successfully');
    } else {
      return ApiErrors.internalServerError('Failed to add referral');
    }
  } catch (error) {
    return handleApiError(error, 'Failed to add referral');
  }
}

// GET: Get invited users by referrer_id (as query param)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const referrerId = searchParams.get('referrer_id');
    
    console.log('Referral API GET called with referrer_id:', referrerId);
    
    if (!referrerId) {
      return ApiErrors.badRequest('Missing referrer_id');
    }

    const invited = await db.getInvitedUsers(Number(referrerId));
    console.log('Invited users returned:', invited);
    
    return successResponse({ invited });
  } catch (error) {
    return handleApiError(error, 'Failed to fetch invited users');
  }
}




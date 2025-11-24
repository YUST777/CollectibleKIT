import { NextRequest } from 'next/server';
import { UserService } from '@/lib/userService';
import { db } from '@/lib/database';
import { successResponse, ApiErrors, handleApiError } from '@/lib/api-response';

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 User initialization request');

    const body = await request.json();
    const { 
      user_id, 
      username, 
      first_name, 
      last_name, 
      language_code, 
      is_premium, 
      photo_url,
      start_param 
    } = body;

    // Validate required fields
    if (!user_id) {
      return ApiErrors.badRequest('User ID is required');
    }

    console.log('Initializing user:', {
      user_id,
      username,
      first_name,
      is_premium,
      start_param
    });
    
    // Log start_param for debugging
    if (start_param) {
      console.log(`📋 start_param received: "${start_param}"`);
    } else {
      console.log('⚠️ No start_param provided');
    }

    // Create or update user in database (store Telegram photo URL directly)
    let success = false;
    try {
      success = await db.createUser(
        user_id,
        username,
        first_name,
        photo_url || null
      );
    } catch (error) {
      console.warn('Database error, continuing with fallback:', error);
      success = true; // Continue anyway
    }

    // Handle referral if start_param contains ref_ prefix
    if (start_param && start_param.startsWith('ref_')) {
      try {
        const referrerId = parseInt(start_param.replace('ref_', ''));
        console.log(`🔍 Parsed referrerId from start_param: ${referrerId} (from "${start_param}")`);
        
        if (referrerId && referrerId !== user_id) {
          console.log(`🔗 Processing referral: ${user_id} referred by ${referrerId}`);
          
          // Add referral to database (store Telegram photo URL directly)
          const referralSuccess = await db.addReferral(
            referrerId,
            user_id,
            `${first_name} ${last_name || ''}`.trim() || `User ${user_id}`,
            photo_url || ''
          );
          
          if (referralSuccess) {
            console.log(`✅ Referral added to database: ${user_id} referred by ${referrerId}`);
          } else {
            console.error(`❌ Failed to add referral to database: ${user_id} referred by ${referrerId}`);
          }
          
          // Complete "Promote CollectibleKIT" task for the referrer
          try {
            const taskCompletion = await db.getTaskCompletionStatus(referrerId, 'daily_promote_canvas');
            if (!taskCompletion.completed) {
              await db.completeTask(referrerId, 'daily_promote_canvas');
              console.log(`✅ Promote CollectibleKIT task completed for referrer ${referrerId}`);
            } else {
              console.log(`ℹ️ Promote CollectibleKIT task already completed for referrer ${referrerId}`);
            }
          } catch (error) {
            console.log('Task completion failed (non-critical):', error);
          }
          
          console.log(`✅ Referral processed successfully: ${user_id} referred by ${referrerId}`);
        } else {
          console.log(`⚠️ Invalid referral: referrerId=${referrerId}, user_id=${user_id} (same user or invalid ID)`);
        }
      } catch (error) {
        console.error('❌ Error processing referral:', error);
        console.error('Error details:', {
          start_param,
          user_id,
          error: (error as Error).message,
          stack: (error as Error).stack
        });
        // Don't fail the entire initialization if referral fails
      }
    } else {
      console.log(`ℹ️ No referral detected - start_param: "${start_param}" (doesn't start with "ref_")`);
    }

    if (!success) {
      console.error('❌ Failed to create/update user in database');
      return ApiErrors.internalServerError('Failed to initialize user');
    }

    // Get user permissions and info
    const permissions = await UserService.getUserPermissions(user_id);
    let user = null;
    
    try {
      user = await db.getUser(user_id);
    } catch (error) {
      console.warn('Failed to get user from database, using fallback:', error);
    }

    // Fallback user data if database fails
    if (!user) {
      console.warn('Using fallback user data');
      user = {
        user_id: user_id,
        username: username,
        first_name: first_name,
        free_uses: 3,
        credits: 0,
        created_at: Date.now(),
        last_activity: Date.now(),
        user_type: 'normal' as any,
        watermark: true
      };
    }

    // Use user.user_type from database (includes premium status)
    const actualUserType = user.user_type || 'normal';
    
    console.log('✅ User initialized successfully:', {
      user_id,
      user_type: actualUserType,
      db_user_type: user.user_type,
      permissions_user_type: permissions.user_type,
      credits: user.credits,
      ton_balance: user.ton_balance,
      watermark: permissions.watermark
    });

    return successResponse({
      user_id: user.user_id,
      user_type: actualUserType,
      watermark: permissions.watermark,
      credits: user.credits,
      ton_balance: user.ton_balance || 0,
      credits_remaining: permissions.credits_remaining === 'unlimited' ? 999999 : permissions.credits_remaining as number,
      created_at: user.created_at,
      last_activity: user.last_activity
    });

  } catch (error) {
    return handleApiError(error, 'Failed to initialize user');
  }
}

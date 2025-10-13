import { NextRequest, NextResponse } from 'next/server';
import { UserService } from '@/lib/userService';
import { db } from '@/lib/database';

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
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

    console.log('Initializing user:', {
      user_id,
      username,
      first_name,
      is_premium
    });

    // Create or update user in database
    let success = false;
    try {
      success = await db.createUser(
        user_id,
        username,
        first_name
      );
    } catch (error) {
      console.warn('Database error, continuing with fallback:', error);
      success = true; // Continue anyway
    }

    // Handle referral if start_param contains ref_ prefix
    if (start_param && start_param.startsWith('ref_')) {
      try {
        const referrerId = parseInt(start_param.replace('ref_', ''));
        if (referrerId && referrerId !== user_id) {
          console.log(`🔗 Processing referral: ${user_id} referred by ${referrerId}`);
          
          // Add referral to database
          await db.addReferral(
            referrerId,
            user_id,
            `${first_name} ${last_name || ''}`.trim() || `User ${user_id}`,
            photo_url || ''
          );
          
          // Complete "Promote Story Canvas" task for the referrer
          try {
            const taskCompletion = await db.getTaskCompletionStatus(referrerId, 'daily_promote_canvas');
            if (!taskCompletion.completed) {
              await db.completeTask(referrerId, 'daily_promote_canvas');
              console.log(`✅ Promote Story Canvas task completed for referrer ${referrerId}`);
            }
          } catch (error) {
            console.log('Task completion failed (non-critical):', error);
          }
          
          console.log(`✅ Referral processed successfully: ${user_id} referred by ${referrerId}`);
        }
      } catch (error) {
        console.error('Error processing referral:', error);
        // Don't fail the entire initialization if referral fails
      }
    }

    if (!success) {
      console.error('❌ Failed to create/update user in database');
      return NextResponse.json(
        { success: false, error: 'Failed to initialize user' },
        { status: 500 }
      );
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

    console.log('✅ User initialized successfully:', {
      user_id,
      user_type: permissions.user_type,
      credits: user.credits,
      free_uses: user.free_uses,
      watermark: permissions.watermark
    });

    return NextResponse.json({
      success: true,
      user_id: user.user_id,
      user_type: permissions.user_type,
      watermark: permissions.watermark,
      credits: user.credits,
      free_uses: user.free_uses,
      credits_remaining: permissions.credits_remaining === 'unlimited' ? 999999 : permissions.credits_remaining as number,
      free_remaining: permissions.free_remaining.toString(),
      created_at: user.created_at,
      last_activity: user.last_activity
    });

  } catch (error) {
    console.error('❌ User initialization error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}

import { db, User } from './database';

// VIP users with infinite uses (no watermark, no credit consumption)
const VIP_USERS = new Set([
  7416916695,
  6386563662,
  6841385539,
  7476391409,
  1251203296,
  178956025,
  1845807623,
  7152782013,
  800092886,
  879660478,
  1234567890, // Add test user
]);

// Test users (VIP privileges for testing)
const TEST_USERS = new Set([
  1234567890,
  9876543210,
]);

// AD TESTING USER - This ID will see ads (for Monetag testing)
const AD_TEST_USER_ID = 7660176383;

export interface UserPermissions {
  can_process: boolean;
  user_type: 'vip' | 'premium' | 'normal' | 'test';
  watermark: boolean;
  credits_remaining: number | 'unlimited';
  free_remaining: number;
  message?: string;
}

export class UserService {
  /**
   * Get user permissions for processing
   */
  static async getUserPermissions(userId: number): Promise<UserPermissions> {
    try {
      // Special handling for test user (ID 0) - allow unlimited processing
      if (userId === 0) {
        return {
          can_process: true,
          user_type: 'test',
          watermark: false,
          credits_remaining: 'unlimited',
          free_remaining: 999999
        };
      }
      
      // Get user from database
      let user = await db.getUser(userId);
      
      // If user doesn't exist, create them
      if (!user) {
        await db.createUser(userId);
        user = await db.getUser(userId);
      }

      if (!user) {
        return {
          can_process: false,
          user_type: 'normal',
          watermark: true,
          credits_remaining: 0,
          free_remaining: 0,
          message: 'User not found'
        };
      }

      // Check user type - NEW SYSTEM: Credits only, no free uses
      let userType: 'vip' | 'premium' | 'normal' | 'test' = 'normal';
      let canProcess = false;
      let watermark = true;
      let creditsRemaining: number | 'unlimited' = user.credits;

      // Special case: Ad testing user - check their premium status first
      if (userId === AD_TEST_USER_ID) {
        console.log(`🎬 AD TEST USER detected: ${userId} - Checking actual premium status in DB`);
        // Check if they are premium in DB despite being ad test user
        if (user.user_type === 'premium' || user.user_type === 'vip') {
          const isExpired = user.premium_expires_at && Date.now() > user.premium_expires_at;
          if (!isExpired) {
            userType = 'premium';
            canProcess = true;
            watermark = false;
            creditsRemaining = 'unlimited';
            console.log(`✅ AD TEST USER is premium: no watermark, unlimited access`);
          } else {
            userType = 'normal';
            canProcess = true;
            watermark = true;
            creditsRemaining = user.credits;
            console.log(`⚠️ AD TEST USER premium expired: using normal mode`);
          }
        } else {
          userType = 'normal';
          canProcess = true;
          watermark = true;
          creditsRemaining = user.credits;
          console.log(`🎬 AD TEST USER is normal: will see ads`);
        }
      } else if (VIP_USERS.has(userId) || user.user_type === 'vip') {
        userType = 'vip';
        canProcess = true;
        watermark = false;
        creditsRemaining = 'unlimited';
      } else if (TEST_USERS.has(userId) || user.user_type === 'test') {
        userType = 'test';
        canProcess = true;
        watermark = false;
        creditsRemaining = 'unlimited';
      } else if (user.user_type === 'premium' || user.user_type === 'vip') {
        // Check if premium has expired
        const isExpired = user.premium_expires_at && Date.now() > user.premium_expires_at;
        
        if (!isExpired) {
          userType = 'premium';
          canProcess = true;
          watermark = false;
          creditsRemaining = 'unlimited'; // Premium has unlimited tool usage
        } else {
          // Premium expired, treat as normal - must have credits
          userType = 'normal';
          canProcess = user.credits > 0;
          watermark = true;
          creditsRemaining = user.credits;
        }
      } else if (user.credits > 0) {
        // Free user with credits - pays credit per tool use
        userType = 'normal';
        canProcess = true;
        watermark = true;
        creditsRemaining = user.credits;
      } else {
        // No credits, no premium - cannot use tools
        userType = 'normal';
        canProcess = false;
        watermark = true;
        creditsRemaining = 0;
      }

      return {
        can_process: canProcess,
        user_type: userType,
        watermark: watermark,
        credits_remaining: creditsRemaining,
        free_remaining: userType === 'premium' || userType === 'vip' || userType === 'test' ? 999999 : user.credits,
        message: canProcess ? undefined : 'No credits remaining'
      };

    } catch (error) {
      console.error('Error getting user permissions:', error);
      return {
        can_process: false,
        user_type: 'normal',
        watermark: true,
        credits_remaining: 0,
        free_remaining: 0,
        message: 'Database error'
      };
    }
  }

  /**
   * Process a request and update user credits/uses
   */
  static async processRequest(
    userId: number,
    requestType: string,
    imageSize: string,
    piecesCount: number,
    watermarked: boolean,
    customWatermark?: string
  ): Promise<{
    success: boolean;
    requestId?: number;
    user_type?: string;
    watermark?: boolean;
    credits_remaining?: number;
    free_remaining?: number;
    error?: string;
  }> {
    try {
      // Get user permissions
      const permissions = await this.getUserPermissions(userId);
      
      if (!permissions.can_process) {
        return {
          success: false,
          user_type: permissions.user_type,
          credits_remaining: permissions.credits_remaining as number,
          free_remaining: permissions.free_remaining,
          error: permissions.message || 'Cannot process request'
        };
      }

      // Create request record (optional for VIP/test users)
      let requestId: number | null = null;
      try {
        requestId = await db.createRequest(
          userId,
          requestType,
          imageSize,
          piecesCount,
          watermarked,
          0 // No credits used for VIP/test users
        );
        console.log('Request record created:', requestId);
      } catch (error) {
        console.warn('Failed to create request record (continuing anyway):', error);
        // Continue processing even if request record fails
      }

      // Check if user has enough credits BEFORE processing
      let updatedUser: User | null = null;
      
      // Debug: Check what user_type permissions returned
      console.log(`🔍 Processing request for userId: ${userId}, user_type from permissions: ${permissions.user_type}`);
      
      if (permissions.user_type === 'vip' || permissions.user_type === 'test' || permissions.user_type === 'premium') {
        // VIP/Test/Premium users: NO credits consumed (unlimited tool usage)
        console.log(`✅ ${permissions.user_type} user: No credits required (unlimited access)`);
        updatedUser = await db.getUser(userId);
      } else {
        // Free users: check if they have at least 1 credit
        const user = await db.getUser(userId);
        console.log(`💰 Checking credits for user: ${user?.credits} credits, user_type in DB: ${user?.user_type}`);
        if (user && user.credits >= 1) {
          console.log(`💰 Free user: Deducting 1 credit from ${user.credits}`);
          const success = await db.updateUserCredits(userId, -1); // Deduct 1 credit
          if (success) {
            updatedUser = await db.getUser(userId);
            console.log(`✅ Credit deducted. New balance: ${updatedUser?.credits}`);
          } else {
            throw new Error('Failed to deduct credit');
          }
        } else {
          // No credits - return error
          console.log(`❌ Free user has no credits (${user?.credits || 0} credits available)`);
          return {
            success: false,
            user_type: permissions.user_type,
            credits_remaining: user?.credits || 0,
            error: 'Insufficient credits. Play games to earn credits!'
          };
        }
      }

      // Get updated permissions
      const updatedPermissions = await this.getUserPermissions(userId);

      return {
        success: true,
        requestId: requestId || undefined,
        user_type: updatedPermissions.user_type,
        watermark: updatedPermissions.watermark,
        credits_remaining: updatedPermissions.credits_remaining === 'unlimited' ? 999999 : updatedPermissions.credits_remaining as number,
        free_remaining: updatedPermissions.free_remaining
      };

    } catch (error) {
      console.error('Error processing request:', error);
      return {
        success: false,
        error: 'Internal server error'
      };
    }
  }

  /**
   * Update request processing time
   */
  static async updateProcessingTime(requestId: number, processingTime: number): Promise<boolean> {
    try {
      return await db.updateRequestProcessingTime(requestId, processingTime);
    } catch (error) {
      console.error('Error updating processing time:', error);
      return false;
    }
  }

  /**
   * Add credits to user (for purchases)
   */
  static async addCredits(userId: number, credits: number): Promise<boolean> {
    try {
      const user = await db.getUser(userId);
      if (!user) {
        return false;
      }

      const success = await db.updateUser(userId, {
        credits: user.credits + credits
      });

      return success;
    } catch (error) {
      console.error('Error adding credits:', error);
      return false;
    }
  }

  /**
   * Add free uses to user
   */
  static async addFreeUses(userId: number, uses: number): Promise<boolean> {
    try {
      const user = await db.getUser(userId);
      if (!user) {
        return false;
      }

      const success = await db.updateUser(userId, {
        free_uses: user.free_uses + uses
      });

      return success;
    } catch (error) {
      console.error('Error adding free uses:', error);
      return false;
    }
  }

  /**
   * Check if user is VIP
   */
  static isVipUser(userId: number): boolean {
    return VIP_USERS.has(userId);
  }

  /**
   * Check if user is test user
   */
  static isTestUser(userId: number): boolean {
    return TEST_USERS.has(userId);
  }

  /**
   * Get user info for API responses
   */
  static async getUserInfo(userId: number): Promise<{
    user_id: number;
    user_type: string;
    watermark: boolean;
    credits_remaining: number | 'unlimited';
    free_remaining: number;
  } | null> {
    try {
      const permissions = await this.getUserPermissions(userId);
      
      return {
        user_id: userId,
        user_type: permissions.user_type,
        watermark: permissions.watermark,
        credits_remaining: permissions.credits_remaining,
        free_remaining: permissions.free_remaining
      };
    } catch (error) {
      console.error('Error getting user info:', error);
      return null;
    }
  }
}

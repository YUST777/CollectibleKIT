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

      // Check user type
      let userType: 'vip' | 'premium' | 'normal' | 'test' = 'normal';
      let canProcess = false;
      let watermark = true;
      let creditsRemaining: number | 'unlimited' = user.credits;
      let freeRemaining = user.free_uses;

      if (VIP_USERS.has(userId)) {
        userType = 'vip';
        canProcess = true;
        watermark = false;
        creditsRemaining = 'unlimited';
        freeRemaining = 999999; // Effectively unlimited
      } else if (TEST_USERS.has(userId)) {
        userType = 'test';
        canProcess = true;
        watermark = false;
        creditsRemaining = 'unlimited';
        freeRemaining = 999999;
      } else if (user.credits > 0) {
        userType = 'premium';
        canProcess = true;
        watermark = false;
        creditsRemaining = user.credits;
      } else if (user.free_uses > 0) {
        userType = 'normal';
        canProcess = true;
        watermark = true;
        freeRemaining = user.free_uses;
      } else {
        userType = 'normal';
        canProcess = false;
        watermark = true;
        creditsRemaining = 0;
        freeRemaining = 0;
      }

      return {
        can_process: canProcess,
        user_type: userType,
        watermark: watermark,
        credits_remaining: creditsRemaining,
        free_remaining: freeRemaining,
        message: canProcess ? undefined : 'No credits or free uses remaining'
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

      // Update user credits/uses based on user type
      let updatedUser: User | null = null;
      
      if (permissions.user_type === 'vip' || permissions.user_type === 'test') {
        // VIP/Test users: no credits consumed
        updatedUser = await db.getUser(userId);
      } else if (permissions.user_type === 'premium') {
        // Premium users: consume 1 credit
        const success = await db.decrementCredits(userId, 1);
        if (success) {
          updatedUser = await db.getUser(userId);
        }
      } else {
        // Normal users: consume 1 free use
        const success = await db.decrementFreeUses(userId, 1);
        if (success) {
          updatedUser = await db.getUser(userId);
        }
      }

      // Get updated permissions
      const updatedPermissions = await this.getUserPermissions(userId);

      return {
        success: true,
        requestId: requestId,
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

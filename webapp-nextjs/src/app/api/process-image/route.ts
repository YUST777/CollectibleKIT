import { NextRequest, NextResponse } from 'next/server';
import { UserService } from '@/lib/userService';
import { ImageProcessingService } from '@/lib/imageProcessing';

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Received process-image request');

    // Parse form data
    const formData = await request.formData();
    const imageFile = formData.get('image') as File;
    const userIdStr = formData.get('user_id') as string;
    const customWatermark = formData.get('custom_watermark') as string;

    console.log('Request data:', {
      hasImage: !!imageFile,
      userId: userIdStr,
      customWatermark: customWatermark || 'none'
    });

    // Validate required fields
    if (!imageFile) {
      return NextResponse.json(
        { success: false, error: 'No image file provided' },
        { status: 400 }
      );
    }

    if (!userIdStr) {
      return NextResponse.json(
        { success: false, error: 'No user ID provided' },
        { status: 400 }
      );
    }

    // Validate user ID
    let userId: number;
    try {
      userId = parseInt(userIdStr);
      if (isNaN(userId) || userId < 0) {
        throw new Error('Invalid user ID');
      }
    } catch (error) {
      return NextResponse.json(
        { success: false, error: 'Invalid user ID' },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const imageBuffer = Buffer.from(await imageFile.arrayBuffer());
    
    // Validate image
    const validation = ImageProcessingService.validateImage(imageBuffer, imageFile.name);
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      );
    }

    // Check user permissions
    const permissions = await UserService.getUserPermissions(userId);
    if (!permissions.can_process) {
      return NextResponse.json({
        success: false,
        error: permissions.message || 'Cannot process image',
        user_type: permissions.user_type,
        credits_remaining: permissions.credits_remaining,
        free_remaining: permissions.free_remaining
      }, { status: 403 });
    }

    console.log('✅ User permissions verified:', {
      user_type: permissions.user_type,
      can_process: permissions.can_process,
      watermark: permissions.watermark
    });

    // Process the request in database
    const requestResult = await UserService.processRequest(
      userId,
      'story_cut',
      `${imageFile.name} (${imageBuffer.length} bytes)`,
      12, // 4x3 grid = 12 pieces
      permissions.watermark,
      customWatermark
    );

    if (!requestResult.success) {
      return NextResponse.json({
        success: false,
        error: requestResult.error,
        user_type: requestResult.user_type,
        credits_remaining: requestResult.credits_remaining,
        free_remaining: requestResult.free_remaining
      }, { status: 400 });
    }

    console.log('✅ Request recorded in database:', requestResult.requestId);

    // Determine final watermark text
    let finalWatermark: string | undefined;
    if (permissions.watermark) {
      // User has watermark enabled
      if (customWatermark && customWatermark.trim()) {
        // Premium user with custom watermark
        finalWatermark = customWatermark.trim();
      } else {
        // Free user with default watermark
        finalWatermark = '@collectiblekit_bot';
      }
    }
    // VIP/premium users without watermark get undefined (no watermark)

    // Process image
    const processingResult = await ImageProcessingService.processImage(
      imageBuffer,
      userId,
      finalWatermark
    );

    if (!processingResult.success) {
      return NextResponse.json({
        success: false,
        error: processingResult.error || 'Image processing failed',
        user_type: permissions.user_type,
        credits_remaining: permissions.credits_remaining,
        free_remaining: permissions.free_remaining
      }, { status: 500 });
    }

    console.log('✅ Image processed successfully, generated', processingResult.story_pieces?.length, 'pieces');

    // Get updated user info
    const userInfo = await UserService.getUserInfo(userId);

    // Return success response
    return NextResponse.json({
      success: true,
      story_pieces: processingResult.story_pieces,
      user_type: userInfo?.user_type || permissions.user_type,
      watermark: userInfo?.watermark ?? permissions.watermark,
      credits_remaining: userInfo?.credits_remaining || permissions.credits_remaining,
      free_remaining: userInfo?.free_remaining || permissions.free_remaining,
      request_id: requestResult.requestId
    });

  } catch (error) {
    console.error('❌ Process image error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}
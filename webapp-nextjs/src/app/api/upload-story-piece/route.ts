import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const writeFile = promisify(fs.writeFile);

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Received upload-story-piece request');

    // Parse form data
    const formData = await request.formData();
    const imageFile = formData.get('image') as File;
    const userIdStr = formData.get('userId') as string;

    console.log('Request data:', {
      hasImage: !!imageFile,
      userId: userIdStr
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
      if (isNaN(userId) || userId <= 0) {
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
    if (imageBuffer.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid image file' },
        { status: 400 }
      );
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = '/root/01studio/CollectibleKIT/webapp-nextjs/public/uploads';
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const filename = `story_piece_${userId}_${timestamp}.png`;
    const filePath = path.join(uploadsDir, filename);

    // Save image file
    await writeFile(filePath, imageBuffer);

    // Generate public URL - use the API route to serve the file
    const publicUrl = `https://collectablekit.01studio.xyz/api/uploads/${filename}`;

    console.log('✅ Story piece uploaded:', {
      filename,
      size: imageBuffer.length,
      url: publicUrl
    });

    // Return success response
    return NextResponse.json({
      success: true,
      url: publicUrl,
      filename: filename
    });

  } catch (error) {
    console.error('❌ Upload story piece error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}
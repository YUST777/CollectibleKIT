import JSZip from 'jszip';
import FormData from 'form-data';
import fetch from 'node-fetch';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { chat_id, story_pieces } = body;

    if (!chat_id || !story_pieces || !Array.isArray(story_pieces)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Create ZIP file
    const zip = new JSZip();

    // Add each story piece to the ZIP
    for (let i = 0; i < story_pieces.length; i++) {
      const piece = story_pieces[i];
      const pieceNumber = 12 - i; // Reverse order numbering
      
      // Convert data URL to buffer
      const base64Data = piece.imageDataUrl.split(',')[1];
      const buffer = Buffer.from(base64Data, 'base64');
      
      // Add to ZIP with numbered filename
      zip.file(`story-piece-${pieceNumber.toString().padStart(2, '0')}.png`, buffer);
    }

    // Generate ZIP buffer
    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });

    // Send ZIP file via Telegram Bot API
    const botToken = process.env.TELEGRAM_BOT_TOKEN || '8151264433:AAG92vbSyL6TKyP1kBxfG6WQfYoz0Jy9df0';
    const telegramApiUrl = `https://api.telegram.org/bot${botToken}/sendDocument`;

    // Create form data for file upload
    const formData = new FormData();
    formData.append('chat_id', chat_id);
    formData.append('document', zipBuffer, {
      filename: `story-pieces-${Date.now()}.zip`,
      contentType: 'application/zip'
    });
    formData.append('caption', '📥 Your original story pieces are ready! Download and share them in order (12, 11, 10, etc.)');

    // Send to Telegram
    const telegramResponse = await fetch(telegramApiUrl, {
      method: 'POST',
      body: formData,
    });

    if (!telegramResponse.ok) {
      const errorText = await telegramResponse.text();
      console.error('Telegram API error:', errorText);
      return NextResponse.json({ error: 'Failed to send ZIP file via Telegram' }, { status: 500 });
    }

    const telegramResult = await telegramResponse.json() as any;
    
    if (!telegramResult.ok) {
      console.error('Telegram API error:', telegramResult);
      return NextResponse.json({ error: 'Telegram API error: ' + telegramResult.description }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'ZIP file sent to your Telegram chat successfully!',
      telegram_message_id: telegramResult.result.message_id
    });

  } catch (error) {
    console.error('Error sending ZIP file:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Internal server error: ' + errorMessage }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';

const BOT_TOKEN = process.env.BOT_TOKEN;

export async function GET(request: NextRequest) {
  const fileId = request.nextUrl.searchParams.get('file_id');
  if (!fileId) {
    return NextResponse.json({ error: 'Missing file_id' }, { status: 400 });
  }

  // Step 1: Get file_path from Telegram API
  const fileResp = await fetch(
    `https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${fileId}`
  );
  const fileData = await fileResp.json();
  if (!fileData.ok) {
    return NextResponse.json({ error: 'Failed to get file from Telegram', details: fileData }, { status: 500 });
  }
  const filePath = fileData.result.file_path;

  // Step 2: Build the file URL
  const fileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}`;

  // Redirect to the Telegram file URL
  return NextResponse.redirect(fileUrl);
} 
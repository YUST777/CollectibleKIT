import { type NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const walletAddress = process.env.TON_WALLET_ADDRESS;

  if (!walletAddress) {
    console.error('TON_WALLET_ADDRESS not configured in environment variables');
    return NextResponse.json(
      { error: 'Wallet address not found' },
      { status: 404 }
    );
  }

  return NextResponse.json({ address: walletAddress });
}

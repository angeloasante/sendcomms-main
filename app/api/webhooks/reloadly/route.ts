import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // TODO: Verify webhook signature from Reloadly
    // TODO: Process airtime/data transaction status updates
    
    console.log('Reloadly webhook received:', body);
    
    return NextResponse.json({
      success: true,
      message: 'Webhook received'
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to process webhook' },
      { status: 500 }
    );
  }
}

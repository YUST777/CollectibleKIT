import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';

// POST: Create test feed events for testing live feed
export async function POST(request: NextRequest) {
  try {
    console.log('🧪 Creating test feed events');

    // Get test parameters from request body
    const body = await request.json();
    const eventType = body.eventType || 'game_win';
    const count = body.count || 5;
    const userId = body.userId || 800092886; // Default to test user

    console.log('Test parameters:', { eventType, count, userId });

    // Generate test events
    const eventData = {
      'game_win': { credits: 1 },
      'first_win_bonus': { ton: 0.1 },
      'task_complete': { taskTitle: 'Test Task', credits: 5 },
      'credit_to_ton': { credits: 100, ton: 0.1 },
      'ton_withdrawal': { amount: 0.2 },
      'streak_complete': { days: 15 }
    };

    const testEvents = [];
    for (let i = 0; i < count; i++) {
      const success = await db.recordFeedEvent(
        userId,
        eventType,
        eventData[eventType as keyof typeof eventData] || { test: true }
      );
      
      if (success) {
        testEvents.push({ 
          index: i + 1, 
          eventType, 
          userId 
        });
      }
      
      // Small delay between events to show live updates
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`✅ Created ${testEvents.length} test events`);

    return NextResponse.json({
      success: true,
      message: `Created ${testEvents.length} test ${eventType} events`,
      events: testEvents
    });

  } catch (error) {
    console.error('❌ Test feed error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to create test events' 
      },
      { status: 500 }
    );
  }
}

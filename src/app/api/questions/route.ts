import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { z } from 'zod';

const createQuestionSchema = z.object({
  sessionId: z.string().uuid(),
  participantId: z.string().uuid(),
  participantName: z.string().min(1).max(100),
  questionText: z.string().min(1).max(1000),
});

export async function GET(request: NextRequest) {
  try {
    const sessionId = request.nextUrl.searchParams.get('sessionId');
    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'sessionId is required' },
        { status: 400 }
      );
    }

    const serviceClient = await createServiceClient();
    const { data: questions, error } = await serviceClient
      .from('session_questions')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Fetch questions error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch questions' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: questions });
  } catch (error) {
    console.error('Questions GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = createQuestionSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const { sessionId, participantId, participantName, questionText } = validation.data;

    const serviceClient = await createServiceClient();

    // Verify participant belongs to the session
    const { data: participant } = await serviceClient
      .from('participants')
      .select('id')
      .eq('id', participantId)
      .eq('session_id', sessionId)
      .single();

    if (!participant) {
      return NextResponse.json(
        { success: false, error: 'Participant not found in session' },
        { status: 403 }
      );
    }

    const { data: question, error } = await serviceClient
      .from('session_questions')
      .insert({
        session_id: sessionId,
        participant_id: participantId,
        participant_name: participantName,
        question_text: questionText,
      })
      .select()
      .single();

    if (error) {
      console.error('Create question error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to submit question' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: question });
  } catch (error) {
    console.error('Questions POST error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

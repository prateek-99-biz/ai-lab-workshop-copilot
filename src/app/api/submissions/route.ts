import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { verifySessionToken } from '@/lib/utils/session-token';
import { z } from 'zod';

const submissionSchema = z.object({
  participantId: z.string().uuid(),
  sessionId: z.string().uuid(),
  stepId: z.string().uuid(),
  content: z.string().min(1).max(10000),
});

export async function POST(request: NextRequest) {
  try {
    // Verify session token
    const authHeader = request.headers.get('Authorization');
    let tokenPayload = null;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      tokenPayload = await verifySessionToken(token);
    }

    const body = await request.json();
    const validatedData = submissionSchema.parse(body);

    // If we have a valid token, verify it matches the request
    if (tokenPayload) {
      if (tokenPayload.participant_id !== validatedData.participantId ||
          tokenPayload.session_id !== validatedData.sessionId) {
        return NextResponse.json(
          { success: false, error: 'Token does not match request' },
          { status: 403 }
        );
      }
    }

    const supabase = await createServiceClient();

    // Upsert submission (update if exists)
    const { data: submission, error } = await supabase
      .from('submissions')
      .upsert(
        {
          participant_id: validatedData.participantId,
          session_id: validatedData.sessionId,
          step_id: validatedData.stepId,
          content: validatedData.content,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'participant_id,step_id',
        }
      )
      .select()
      .single();

    if (error) {
      console.error('Submission error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to save submission' },
        { status: 500 }
      );
    }

    // Update participant's current step
    await supabase
      .from('participants')
      .update({
        current_step_id: validatedData.stepId,
        last_seen_at: new Date().toISOString(),
      })
      .eq('id', validatedData.participantId);

    return NextResponse.json({
      success: true,
      submission: {
        id: submission.id,
        step_id: submission.step_id,
        content: submission.content,
      },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid request data' },
        { status: 400 }
      );
    }
    
    console.error('Submission error:', err);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient, createServiceClient } from '@/lib/supabase/server';
import { z } from 'zod';

const answerSchema = z.object({
  answerText: z.string().min(1).max(2000),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ questionId: string }> }
) {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { questionId } = await params;
    const body = await request.json();
    const validation = answerSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const serviceClient = await createServiceClient();
    const { data: question, error } = await serviceClient
      .from('session_questions')
      .update({
        answer_text: validation.data.answerText,
        is_answered: true,
        answered_at: new Date().toISOString(),
      })
      .eq('id', questionId)
      .select()
      .single();

    if (error) {
      console.error('Answer question error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to answer question' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: question });
  } catch (error) {
    console.error('Question PATCH error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ questionId: string }> }
) {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { questionId } = await params;
    const serviceClient = await createServiceClient();

    const { error } = await serviceClient
      .from('session_questions')
      .delete()
      .eq('id', questionId);

    if (error) {
      console.error('Delete question error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to delete question' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Question DELETE error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { createSessionToken, setSessionTokenCookie } from '@/lib/utils/session-token';
import { checkRateLimit, rateLimitResponse } from '@/lib/utils/rate-limit';
import { z } from 'zod';

const joinSchema = z.object({
  sessionId: z.string().uuid(),
  displayName: z.string().min(2).max(50),
  email: z.string().email().nullable().optional(),
  emailConsent: z.boolean().default(false),
  marketingConsent: z.boolean().default(false),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = joinSchema.parse(body);

    // Rate limit: 10 join attempts per minute per IP
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const rl = checkRateLimit(`join:${ip}`, 10, 60_000);
    if (!rl.allowed) return rateLimitResponse(rl.resetAt);

    const supabase = await createServiceClient();

    // Verify session is still joinable
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('id, status, organization_id')
      .eq('id', validatedData.sessionId)
      .in('status', ['published', 'live'])
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { success: false, error: 'Session not found or has ended' },
        { status: 404 }
      );
    }

    // Create participant
    const { data: participant, error: participantError } = await supabase
      .from('participants')
      .insert({
        session_id: validatedData.sessionId,
        display_name: validatedData.displayName,
        email: validatedData.email || null,
        email_consent: validatedData.emailConsent,
        marketing_consent: validatedData.marketingConsent,
      })
      .select()
      .single();

    if (participantError) {
      console.error('Participant creation error:', participantError);
      return NextResponse.json(
        { success: false, error: 'Failed to join session' },
        { status: 500 }
      );
    }

    // If email provided and marketing consent given, create lead record
    if (validatedData.email && validatedData.marketingConsent) {
      await supabase.from('leads').insert({
        email: validatedData.email,
        display_name: validatedData.displayName,
        session_id: validatedData.sessionId,
        organization_id: session.organization_id,
        marketing_consent: validatedData.marketingConsent,
      });
    }

    // Create session token
    const token = await createSessionToken(
      participant.id,
      validatedData.sessionId,
      validatedData.displayName
    );

    // Set cookie
    await setSessionTokenCookie(token);

    return NextResponse.json({
      success: true,
      participant: {
        id: participant.id,
        displayName: participant.display_name,
      },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid request data', details: err.errors },
        { status: 400 }
      );
    }
    
    console.error('Join error:', err);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient, createServiceClient } from '@/lib/supabase/server';
import { generateJoinCode } from '@/lib/utils';
import { z } from 'zod';

const createSessionSchema = z.object({
  template_id: z.string().uuid(),
  client_name: z.string().min(1, 'Client name is required').max(200),
  department: z.string().max(200).optional().default(''),
  location: z.string().min(1, 'Location is required').max(200),
  poc_name: z.string().min(1, 'Point of contact is required').max(200),
  event_type: z.enum(['keynote', 'halfday', 'fullday']),
  event_date: z.string().datetime({ message: 'Valid date/time is required' }),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get facilitator info
    const serviceClient = await createServiceClient();
    const { data: facilitator, error: facError } = await serviceClient
      .from('facilitator_users')
      .select('id, organization_id')
      .eq('user_id', user.id)
      .single();

    if (facError || !facilitator) {
      return NextResponse.json(
        { success: false, error: 'Facilitator profile not found' },
        { status: 403 }
      );
    }

    // Parse and validate body
    const body = await request.json();
    const validation = createSessionSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Verify template belongs to this org
    const { data: template, error: templateError } = await serviceClient
      .from('workshop_templates')
      .select('id, name')
      .eq('id', data.template_id)
      .eq('organization_id', facilitator.organization_id)
      .single();

    if (templateError || !template) {
      return NextResponse.json(
        { success: false, error: 'Template not found' },
        { status: 404 }
      );
    }

    // Generate unique join code
    const joinCode = generateJoinCode();

    // Create the session as 'published' so attendees can join immediately
    const { data: session, error: sessionError } = await serviceClient
      .from('sessions')
      .insert({
        organization_id: facilitator.organization_id,
        template_id: data.template_id,
        facilitator_id: facilitator.id,
        join_code: joinCode,
        status: 'published',
        client_name: data.client_name,
        department: data.department || null,
        location: data.location,
        poc_name: data.poc_name,
        event_type: data.event_type,
        event_date: data.event_date,
        scheduled_at: data.event_date,
      })
      .select('id')
      .single();

    if (sessionError) {
      console.error('Session creation error:', sessionError);
      return NextResponse.json(
        { success: false, error: 'Failed to create session' },
        { status: 500 }
      );
    }

    // Create snapshot copies of the template content
    // 1. Snapshot modules
    const { data: modules } = await serviceClient
      .from('modules')
      .select('id, title, objective, order_index')
      .eq('template_id', data.template_id)
      .order('order_index');

    if (modules && modules.length > 0) {
      for (const mod of modules) {
        const { data: snapModule } = await serviceClient
          .from('session_snapshot_modules')
          .insert({
            session_id: session.id,
            original_module_id: mod.id,
            title: mod.title,
            objective: mod.objective,
            order_index: mod.order_index,
          })
          .select('id')
          .single();

        if (!snapModule) continue;

        // 2. Snapshot steps
        const { data: steps } = await serviceClient
          .from('module_steps')
          .select('id, title, instruction_markdown, order_index, estimated_minutes, is_required')
          .eq('module_id', mod.id)
          .order('order_index');

        if (steps && steps.length > 0) {
          for (const step of steps) {
            const { data: snapStep } = await serviceClient
              .from('session_snapshot_steps')
              .insert({
                session_id: session.id,
                snapshot_module_id: snapModule.id,
                original_step_id: step.id,
                title: step.title,
                instruction_markdown: step.instruction_markdown,
                instruction_markdown_raw: step.instruction_markdown,
                order_index: step.order_index,
                estimated_minutes: step.estimated_minutes,
                is_required: step.is_required,
              })
              .select('id')
              .single();

            if (!snapStep) continue;

            // 3. Snapshot prompt blocks
            const { data: blocks } = await serviceClient
              .from('prompt_blocks')
              .select('id, title, content_markdown, order_index, is_copyable')
              .eq('step_id', step.id)
              .order('order_index');

            if (blocks && blocks.length > 0) {
              await serviceClient
                .from('session_snapshot_prompt_blocks')
                .insert(
                  blocks.map(block => ({
                    session_id: session.id,
                    snapshot_step_id: snapStep.id,
                    original_block_id: block.id,
                    title: block.title,
                    content_markdown: block.content_markdown,
                    content_markdown_raw: block.content_markdown,
                    order_index: block.order_index,
                    is_copyable: block.is_copyable,
                  }))
                );
            }
          }
        }
      }

      // Set the first step as current
      const { data: firstStep } = await serviceClient
        .from('session_snapshot_steps')
        .select('id')
        .eq('session_id', session.id)
        .order('order_index')
        .limit(1)
        .single();

      if (firstStep) {
        await serviceClient
          .from('sessions')
          .update({ current_step_id: firstStep.id })
          .eq('id', session.id);
      }
    }

    return NextResponse.json({
      success: true,
      session: {
        id: session.id,
        joinCode,
      },
    });
  } catch (error) {
    console.error('Create session error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

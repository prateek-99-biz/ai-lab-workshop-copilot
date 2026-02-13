import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient, createServiceClient } from '@/lib/supabase/server';
import { z } from 'zod';

const updateModuleSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  objective: z.string().max(2000).nullable().optional(),
  order_index: z.number().int().min(0).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ moduleId: string }> }
) {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { moduleId } = await params;
    const serviceClient = await createServiceClient();

    // Verify access via module → template → org → facilitator
    const { data: mod } = await serviceClient
      .from('modules')
      .select(`
        id,
        template:workshop_templates!inner(
          organization:organizations!inner(
            facilitator_users!inner(user_id)
          )
        )
      `)
      .eq('id', moduleId)
      .eq('template.organization.facilitator_users.user_id', user.id)
      .single();

    if (!mod) {
      return NextResponse.json({ success: false, error: 'Module not found or access denied' }, { status: 404 });
    }

    const body = await request.json();
    const validation = updateModuleSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ success: false, error: validation.error.errors[0].message }, { status: 400 });
    }

    const { error } = await serviceClient
      .from('modules')
      .update(validation.data)
      .eq('id', moduleId);

    if (error) {
      return NextResponse.json({ success: false, error: 'Failed to update module' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Module PATCH error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ moduleId: string }> }
) {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { moduleId } = await params;
    const serviceClient = await createServiceClient();

    const { data: mod } = await serviceClient
      .from('modules')
      .select(`
        id,
        template:workshop_templates!inner(
          organization:organizations!inner(
            facilitator_users!inner(user_id)
          )
        )
      `)
      .eq('id', moduleId)
      .eq('template.organization.facilitator_users.user_id', user.id)
      .single();

    if (!mod) {
      return NextResponse.json({ success: false, error: 'Module not found or access denied' }, { status: 404 });
    }

    // CASCADE will handle steps → prompt_blocks
    const { error } = await serviceClient
      .from('modules')
      .delete()
      .eq('id', moduleId);

    if (error) {
      return NextResponse.json({ success: false, error: 'Failed to delete module' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Module DELETE error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createClient as createServerClient, createServiceClient } from '@/lib/supabase/server';
import { z } from 'zod';

const updateBlockSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content_markdown: z.string().optional(),
  is_copyable: z.boolean().optional(),
  order_index: z.number().int().min(0).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ blockId: string }> }
) {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { blockId } = await params;
    const serviceClient = await createServiceClient();

    const { data: block } = await serviceClient
      .from('prompt_blocks')
      .select(`
        id,
        step:module_steps!inner(
          module:modules!inner(
            template:workshop_templates!inner(
              organization:organizations!inner(
                facilitator_users!inner(user_id)
              )
            )
          )
        )
      `)
      .eq('id', blockId)
      .eq('step.module.template.organization.facilitator_users.user_id', user.id)
      .single();

    if (!block) {
      return NextResponse.json({ success: false, error: 'Prompt block not found or access denied' }, { status: 404 });
    }

    const body = await request.json();
    const validation = updateBlockSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ success: false, error: validation.error.errors[0].message }, { status: 400 });
    }

    const { error } = await serviceClient
      .from('prompt_blocks')
      .update(validation.data)
      .eq('id', blockId);

    if (error) {
      return NextResponse.json({ success: false, error: 'Failed to update prompt block' }, { status: 500 });
    }

    revalidatePath('/admin/templates');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Block PATCH error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ blockId: string }> }
) {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { blockId } = await params;
    const serviceClient = await createServiceClient();

    const { data: block } = await serviceClient
      .from('prompt_blocks')
      .select(`
        id,
        step:module_steps!inner(
          module:modules!inner(
            template:workshop_templates!inner(
              organization:organizations!inner(
                facilitator_users!inner(user_id)
              )
            )
          )
        )
      `)
      .eq('id', blockId)
      .eq('step.module.template.organization.facilitator_users.user_id', user.id)
      .single();

    if (!block) {
      return NextResponse.json({ success: false, error: 'Prompt block not found or access denied' }, { status: 404 });
    }

    const { error } = await serviceClient
      .from('prompt_blocks')
      .delete()
      .eq('id', blockId);

    if (error) {
      return NextResponse.json({ success: false, error: 'Failed to delete prompt block' }, { status: 500 });
    }

    revalidatePath('/admin/templates');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Block DELETE error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

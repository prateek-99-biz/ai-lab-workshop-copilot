import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createClient as createServerClient, createServiceClient } from '@/lib/supabase/server';
import { z } from 'zod';

const createBlockSchema = z.object({
  step_id: z.string().uuid(),
  title: z.string().min(1, 'Title is required').max(200),
  content_markdown: z.string().default(''),
  is_copyable: z.boolean().default(true),
  order_index: z.number().int().min(0).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const serviceClient = await createServiceClient();
    const body = await request.json();
    const validation = createBlockSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ success: false, error: validation.error.errors[0].message }, { status: 400 });
    }

    // Verify access
    const { data: step } = await serviceClient
      .from('module_steps')
      .select(`
        id,
        module:modules!inner(
          template:workshop_templates!inner(
            organization:organizations!inner(
              facilitator_users!inner(user_id)
            )
          )
        )
      `)
      .eq('id', validation.data.step_id)
      .eq('module.template.organization.facilitator_users.user_id', user.id)
      .single();

    if (!step) {
      return NextResponse.json({ success: false, error: 'Step not found or access denied' }, { status: 404 });
    }

    let orderIndex = validation.data.order_index;
    if (orderIndex === undefined) {
      const { count } = await serviceClient
        .from('prompt_blocks')
        .select('id', { count: 'exact', head: true })
        .eq('step_id', validation.data.step_id);
      orderIndex = count || 0;
    }

    const { data: block, error } = await serviceClient
      .from('prompt_blocks')
      .insert({
        step_id: validation.data.step_id,
        title: validation.data.title,
        content_markdown: validation.data.content_markdown,
        is_copyable: validation.data.is_copyable,
        order_index: orderIndex,
      })
      .select('id, title, order_index, content_markdown, is_copyable')
      .single();

    if (error) {
      console.error('Block creation error:', error);
      return NextResponse.json({ success: false, error: 'Failed to create prompt block' }, { status: 500 });
    }

    revalidatePath('/admin/templates');
    return NextResponse.json({ success: true, data: block });
  } catch (error) {
    console.error('Blocks POST error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

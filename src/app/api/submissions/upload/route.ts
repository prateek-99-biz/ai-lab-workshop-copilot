import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { verifySessionToken } from '@/lib/utils/session-token';
import { checkRateLimit, rateLimitResponse } from '@/lib/utils/rate-limit';

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

// Magic byte signatures for each image type
const MAGIC_BYTES: Record<string, number[][]> = {
  'image/png': [[0x89, 0x50, 0x4E, 0x47]],
  'image/jpeg': [[0xFF, 0xD8, 0xFF]],
  'image/gif': [[0x47, 0x49, 0x46, 0x38]], // GIF8
  'image/webp': [[0x52, 0x49, 0x46, 0x46]], // RIFF
};

function verifyMagicBytes(buffer: ArrayBuffer, declaredType: string): boolean {
  const bytes = new Uint8Array(buffer);
  const signatures = MAGIC_BYTES[declaredType];
  if (!signatures) return false;

  return signatures.some(sig =>
    sig.every((byte, i) => bytes[i] === byte)
  );
}

export async function POST(request: NextRequest) {
  try {
    // Verify session token
    const authHeader = request.headers.get('Authorization');
    let tokenPayload = null;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      tokenPayload = await verifySessionToken(token);
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const participantId = formData.get('participantId') as string | null;
    const sessionId = formData.get('sessionId') as string | null;
    const stepId = formData.get('stepId') as string | null;

    if (!file || !participantId || !sessionId || !stepId) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: file, participantId, sessionId, stepId' },
        { status: 400 }
      );
    }

    // Validate token matches request
    if (tokenPayload) {
      if (tokenPayload.participant_id !== participantId ||
          tokenPayload.session_id !== sessionId) {
        return NextResponse.json(
          { success: false, error: 'Token does not match request' },
          { status: 403 }
        );
      }
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid file type. Allowed: PNG, JPEG, GIF, WebP' },
        { status: 400 }
      );
    }

    // Validate file size (server-side enforcement)
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { success: false, error: 'File too large. Maximum size is 5MB' },
        { status: 400 }
      );
    }

    // Rate limit: 10 uploads per minute per participant
    if (participantId) {
      const rl = checkRateLimit(`upload:${participantId}`, 10, 60_000);
      if (!rl.allowed) return rateLimitResponse(rl.resetAt);
    }

    // Determine file extension from MIME type
    const ext = file.type.split('/')[1] === 'jpeg' ? 'jpg' : file.type.split('/')[1];
    const storagePath = `${sessionId}/${participantId}/${stepId}.${ext}`;

    const supabase = await createServiceClient();

    // Convert File to ArrayBuffer then to Buffer for upload
    const arrayBuffer = await file.arrayBuffer();

    // Verify magic bytes match the declared MIME type
    if (!verifyMagicBytes(arrayBuffer, file.type)) {
      return NextResponse.json(
        { success: false, error: 'File content does not match declared type' },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(arrayBuffer);

    // Upload to Supabase Storage (upsert to allow re-upload)
    const { error: uploadError } = await supabase.storage
      .from('submission-images')
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return NextResponse.json(
        { success: false, error: 'Failed to upload image' },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('submission-images')
      .getPublicUrl(storagePath);

    return NextResponse.json({
      success: true,
      imageUrl: urlData.publicUrl,
    });
  } catch (error) {
    console.error('Image upload error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

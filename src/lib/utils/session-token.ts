// ============================================================================
// Session Token Utility
// Creates and verifies JWT tokens for attendee session authentication
// ============================================================================

import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import type { SessionToken } from '@/lib/types';

const SESSION_TOKEN_COOKIE = 'workshop_session_token';
const TOKEN_EXPIRY_HOURS = 24; // Tokens valid for 24 hours

function getSecret(): Uint8Array {
  const secret = process.env.SESSION_TOKEN_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('SESSION_TOKEN_SECRET must be at least 32 characters');
  }
  return new TextEncoder().encode(secret);
}

/**
 * Create a session token for an attendee
 */
export async function createSessionToken(
  participantId: string,
  sessionId: string,
  displayName: string
): Promise<string> {
  const token = await new SignJWT({
    participant_id: participantId,
    session_id: sessionId,
    display_name: displayName,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${TOKEN_EXPIRY_HOURS}h`)
    .sign(getSecret());

  return token;
}

/**
 * Verify and decode a session token
 */
export async function verifySessionToken(token: string): Promise<SessionToken | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    
    // Runtime validation of required fields
    if (
      typeof payload.participant_id !== 'string' ||
      typeof payload.session_id !== 'string' ||
      typeof payload.display_name !== 'string' ||
      typeof payload.exp !== 'number' ||
      typeof payload.iat !== 'number'
    ) {
      return null;
    }

    return {
      participant_id: payload.participant_id,
      session_id: payload.session_id,
      display_name: payload.display_name,
      exp: payload.exp,
      iat: payload.iat,
    };
  } catch {
    return null;
  }
}

/**
 * Set session token in cookies (server-side)
 */
export async function setSessionTokenCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_TOKEN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: TOKEN_EXPIRY_HOURS * 60 * 60,
    path: '/',
  });
}

/**
 * Get session token from cookies (server-side)
 */
export async function getSessionTokenFromCookie(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_TOKEN_COOKIE)?.value || null;
}

/**
 * Clear session token cookie (server-side)
 */
export async function clearSessionTokenCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_TOKEN_COOKIE);
}

/**
 * Get current participant from session token
 */
export async function getCurrentParticipant(): Promise<SessionToken | null> {
  const token = await getSessionTokenFromCookie();
  if (!token) return null;
  return verifySessionToken(token);
}

/**
 * Validate that participant belongs to session
 */
export async function validateParticipantSession(
  requiredSessionId: string
): Promise<SessionToken | null> {
  const participant = await getCurrentParticipant();
  if (!participant) return null;
  if (participant.session_id !== requiredSessionId) return null;
  return participant;
}

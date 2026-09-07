import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE } from '@/lib/admin-auth';
import { rotateSessionVersion } from '@/lib/admin-credentials';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  // Invalidate every issued session.
  rotateSessionVersion();
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: request.nextUrl.protocol === 'https:',
    path: '/',
    expires: new Date(0),
  });
  return response;
}
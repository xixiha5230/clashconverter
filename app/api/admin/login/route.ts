import { NextRequest, NextResponse } from 'next/server';
import {
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  createSessionToken,
  isPasswordConfigured,
  verifyAdminPassword,
} from '@/lib/admin-auth';
import { clientIp, consumeRateLimit, exceededResponse } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const LOGIN_LIMIT = 5;
const LOGIN_WINDOW_MS = 10 * 60 * 1000;

export async function POST(request: NextRequest) {
  if (!consumeRateLimit('admin-login', clientIp(request), LOGIN_LIMIT, LOGIN_WINDOW_MS)) {
    return exceededResponse();
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const password = (body as { password?: unknown })?.password;
  const configured = isPasswordConfigured();

  // First run: no password configured yet, let the operator in to set one.
  if (configured && (typeof password !== 'string' || !verifyAdminPassword(password))) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
  }

  const secure = request.nextUrl.protocol === 'https:';
  const response = NextResponse.json({ ok: true, passwordSet: configured });
  response.cookies.set(SESSION_COOKIE, createSessionToken(), {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  });
  return response;
}
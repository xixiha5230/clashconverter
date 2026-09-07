import { NextRequest, NextResponse } from 'next/server';
import {
  SESSION_COOKIE,
  isPasswordConfigured,
  setAdminPassword,
  verifyAdminPassword,
  verifySessionToken,
} from '@/lib/admin-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token || !verifySessionToken(token)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { currentPassword, newPassword } = body as {
    currentPassword?: unknown;
    newPassword?: unknown;
  };

  if (typeof newPassword !== 'string' || newPassword.length < 8) {
    return NextResponse.json(
      { error: 'New password must be at least 8 characters' },
      { status: 400 }
    );
  }

  const configured = isPasswordConfigured();
  if (
    configured &&
    (typeof currentPassword !== 'string' || !verifyAdminPassword(currentPassword))
  ) {
    return NextResponse.json({ error: 'Current password is incorrect' }, { status: 401 });
  }

  setAdminPassword(newPassword);
  return NextResponse.json({ ok: true, passwordSet: true });
}
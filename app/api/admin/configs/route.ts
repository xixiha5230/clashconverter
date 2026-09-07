import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE, verifySessionToken } from '@/lib/admin-auth';
import { listSubscriptions } from '@/lib/storage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function GET(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token || !verifySessionToken(token)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const proto =
    request.headers.get('x-forwarded-proto') ?? request.nextUrl.protocol;
  const host =
    request.headers.get('x-forwarded-host') ??
    request.headers.get('host') ??
    request.nextUrl.host;
  const origin = `${proto}://${host}`;

  const items = listSubscriptions().map((record) => ({
    id: record.id,
    templateKey: record.settings.templateKey,
    enableDns: record.settings.enableDns,
    nodeCount: record.nodeCount ?? 0,
    createdAt: record.createdAt,
    lastAccessedAt: record.lastAccessedAt ?? null,
    url: `${origin}/s/${record.id}?token=${encodeURIComponent(record.accessToken)}`,
  }));

  return NextResponse.json({ items });
}
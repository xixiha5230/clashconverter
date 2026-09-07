import { NextRequest, NextResponse } from 'next/server';
import { createSubscriptionRequestSchema } from '@/lib/acl4ssr/schema';
import { createSubscription } from '@/lib/storage';
import { resolveSubscriptionNodes } from '@/lib/acl4ssr/subscription-input';
import { clientIp, consumeRateLimit, exceededResponse } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CREATE_LIMIT = 10;
const CREATE_WINDOW_MS = 10 * 60 * 1000;

export async function POST(request: NextRequest) {
  if (!consumeRateLimit('configs', clientIp(request), CREATE_LIMIT, CREATE_WINDOW_MS)) {
    return exceededResponse();
  }

  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const parsed = createSubscriptionRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { input, settings } = parsed.data;

    let nodeCount = 0;
    // Validate that the input resolves to at least one node before storing.
    try {
      const proxies = await resolveSubscriptionNodes(input);
      if (proxies.length === 0) {
        return NextResponse.json(
          { error: 'No valid proxy nodes found in input' },
          { status: 400 }
        );
      }
      nodeCount = proxies.length;
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Failed to parse input' },
        { status: 400 }
      );
    }

    const record = createSubscription(input, settings, nodeCount);

    const proto =
      request.headers.get('x-forwarded-proto') ?? request.nextUrl.protocol;
    const host =
      request.headers.get('x-forwarded-host') ??
      request.headers.get('host') ??
      request.nextUrl.host;
    const url = `${proto}://${host}/s/${record.id}?token=${encodeURIComponent(record.accessToken)}`;

    return NextResponse.json(
      {
        id: record.id,
        accessToken: record.accessToken,
        url,
        createdAt: record.createdAt,
      },
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create config';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
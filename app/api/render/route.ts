import { NextRequest, NextResponse } from 'next/server';
import { renderRequestSchema } from '@/lib/acl4ssr/schema';
import { renderConfigFromInput } from '@/lib/acl4ssr/render-config';
import { clientIp, consumeRateLimit, exceededResponse } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const RENDER_LIMIT = 30;
const RENDER_WINDOW_MS = 10 * 60 * 1000;

export async function POST(request: NextRequest) {
  if (!consumeRateLimit('render', clientIp(request), RENDER_LIMIT, RENDER_WINDOW_MS)) {
    return exceededResponse();
  }

  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const parsed = renderRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { input, settings } = parsed.data;
    const { output } = await renderConfigFromInput(input, settings);

    return NextResponse.json({ output });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to render config';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
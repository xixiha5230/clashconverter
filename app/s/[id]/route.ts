import { NextRequest, NextResponse } from 'next/server';
import { getSubscription, verifyAccessToken } from '@/lib/storage';
import { renderConfigFromInput } from '@/lib/acl4ssr/render-config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    if (!/^[a-zA-Z0-9_-]{1,64}$/.test(id)) {
      return new NextResponse('Invalid config id', { status: 400 });
    }

    const token = request.nextUrl.searchParams.get('token') ?? '';
    const record = getSubscription(id);
    if (!record) {
      return new NextResponse('Not found', { status: 404 });
    }
    if (!verifyAccessToken(record, token)) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const output = await renderConfigFromInput(record.input, record.settings);

    return new NextResponse(output, {
      status: 200,
      headers: {
        'Content-Type': 'text/yaml; charset=utf-8',
        'Cache-Control': 'no-store, must-revalidate',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to render config';
    return new NextResponse(message, { status: 500 });
  }
}
import { NextRequest, NextResponse } from 'next/server';
import { deleteSubscription, getSubscription, verifyAccessToken } from '@/lib/storage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    if (!/^[a-zA-Z0-9_-]{1,64}$/.test(id)) {
      return NextResponse.json({ error: 'Invalid config id' }, { status: 400 });
    }

    const token = request.nextUrl.searchParams.get('token') ?? '';
    const record = getSubscription(id);
    if (!record) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    if (!verifyAccessToken(record, token)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    deleteSubscription(id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete config';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
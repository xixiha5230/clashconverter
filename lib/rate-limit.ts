/**
 * Minimal in-memory sliding-window rate limiter for API endpoints.
 * Single-process (one container) so an in-memory map is sufficient.
 */

import type { NextRequest } from 'next/server';

interface Bucket {
  windowStart: number;
  count: number;
}

const store = new Map<string, Bucket>();

export function clientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0].trim();
    if (first) {
      return first;
    }
  }
  return request.headers.get('cf-connecting-ip') ?? 'unknown';
}

export function consumeRateLimit(
  namespace: string,
  key: string,
  limit: number,
  windowMs: number
): boolean {
  const storeKey = `${namespace}:${key}`;
  const now = Date.now();
  const bucket = store.get(storeKey);

  if (!bucket || now - bucket.windowStart >= windowMs) {
    store.set(storeKey, { windowStart: now, count: 1 });
    return true;
  }

  bucket.count += 1;
  return bucket.count <= limit;
}

export function exceededResponse(): Response {
  return Response.json({ error: 'Too many requests, please slow down' }, { status: 429 });
}
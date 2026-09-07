/**
 * Minimal admin authentication.
 * A single ADMIN_PASSWORD env var gates access. Sessions are short-lived
 * HMAC-signed cookies (no dependency, no external secret store).
 */

import { createHmac, timingSafeEqual } from 'node:crypto';

export const SESSION_COOKIE = 'admin_session';
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function adminPassword(): string | null {
  const pw = process.env.ADMIN_PASSWORD;
  return pw && pw.length > 0 ? pw : null;
}

export function isAdminEnabled(): boolean {
  return adminPassword() !== null;
}

export function verifyAdminPassword(password: string): boolean {
  const expected = adminPassword();
  if (!expected || !password) {
    return false;
  }
  const a = Buffer.from(password, 'utf-8');
  const b = Buffer.from(expected, 'utf-8');
  if (a.length !== b.length) {
    return false;
  }
  return timingSafeEqual(a, b);
}

function sign(payload: string): string {
  return createHmac('sha256', adminPassword() ?? '')
    .update(payload)
    .digest('base64url');
}

export function createSessionToken(): string {
  const exp = Date.now() + SESSION_TTL_MS;
  const payload = Buffer.from(JSON.stringify({ sub: 'admin', exp }), 'utf-8').toString(
    'base64url'
  );
  return `${payload}.${sign(payload)}`;
}

export function verifySessionToken(token: string): boolean {
  if (!token) {
    return false;
  }
  const parts = token.split('.');
  if (parts.length !== 2) {
    return false;
  }
  const [payload, sig] = parts;
  const expected = sign(payload);
  const a = Buffer.from(sig, 'utf-8');
  const b = Buffer.from(expected, 'utf-8');
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return false;
  }
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8'));
    return (
      data.sub === 'admin' && typeof data.exp === 'number' && data.exp > Date.now()
    );
  } catch {
    return false;
  }
}

export const SESSION_TTL_SECONDS = Math.floor(SESSION_TTL_MS / 1000);
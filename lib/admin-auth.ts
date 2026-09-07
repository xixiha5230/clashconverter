/**
 * Minimal admin authentication.
 *
 * Sessions are short-lived HMAC-signed cookies keyed by a persisted random
 * secret (so changing the password keeps sessions and re-login flow sane).
 * Login is bypassed on first run when no password has been configured yet.
 */

import { createHmac, timingSafeEqual } from 'node:crypto';
import {
  getAdminPassword,
  getSessionSecret,
  getSessionVersion,
} from './admin-credentials';

export const SESSION_COOKIE = 'admin_session';
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function isPasswordConfigured(): boolean {
  return getAdminPassword() !== null;
}

export { verifyAdminPassword, setAdminPassword } from './admin-credentials';

function signingSecret(): string {
  return getSessionSecret();
}

export function createSessionToken(): string {
  const exp = Date.now() + SESSION_TTL_MS;
  const version = getSessionVersion();
  const payload = Buffer.from(
    JSON.stringify({ sub: 'admin', exp, ver: version }),
    'utf-8'
  ).toString('base64url');
  const sig = createHmac('sha256', signingSecret()).update(payload).digest('base64url');
  return `${payload}.${sig}`;
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
  const expected = createHmac('sha256', signingSecret())
    .update(payload)
    .digest('base64url');
  const a = Buffer.from(sig, 'utf-8');
  const b = Buffer.from(expected, 'utf-8');
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return false;
  }
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8'));
    return (
      data.sub === 'admin' &&
      typeof data.exp === 'number' &&
      data.exp > Date.now() &&
      data.ver === getSessionVersion()
    );
  } catch {
    return false;
  }
}

export const SESSION_TTL_SECONDS = Math.floor(SESSION_TTL_MS / 1000);
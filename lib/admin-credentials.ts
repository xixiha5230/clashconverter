/**
 * Admin credential storage.
 *
 * Passwords are stored as scrypt hashes under data/admin-password (file
 * takes precedence over the ADMIN_PASSWORD env var). Session signing uses a
 * separately persisted random key so a password change does not invalidate
 * live sessions.
 *
 * First-run behaviour: with no password set anywhere, login is allowed freely
 * so the operator can set an initial password from the UI.
 */

import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import path from 'node:path';

const DATA_DIR = path.join(process.cwd(), 'data');
const PASSWORD_FILE = path.join(DATA_DIR, 'admin-password');
const SESSION_KEY_FILE = path.join(DATA_DIR, 'session-key');

function ensureDir(): void {
  mkdirSync(DATA_DIR, { recursive: true });
}

function filePassword(): string | null {
  if (!existsSync(PASSWORD_FILE)) {
    return null;
  }
  try {
    return readFileSync(PASSWORD_FILE, 'utf-8').trim() || null;
  } catch {
    return null;
  }
}

function envPassword(): string | null {
  const pw = process.env.ADMIN_PASSWORD;
  return pw && pw.length > 0 ? pw : null;
}

export function getAdminPassword(): string | null {
  return filePassword() ?? envPassword();
}

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyHash(stored: string, password: string): boolean {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) {
    return false;
  }
  const candidate = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, 'hex');
  return (
    candidate.length === expected.length && timingSafeEqual(candidate, expected)
  );
}

export function verifyAdminPassword(password: string): boolean {
  const stored = getAdminPassword();
  if (!stored || !password) {
    return false;
  }
  if (stored.includes(':')) {
    return verifyHash(stored, password);
  }
  // Plain env password (legacy deploys without a file).
  const a = Buffer.from(password, 'utf-8');
  const b = Buffer.from(stored, 'utf-8');
  return a.length === b.length && timingSafeEqual(a, b);
}

export function setAdminPassword(password: string): void {
  ensureDir();
  writeFileSync(PASSWORD_FILE, hashPassword(password), 'utf-8');
}

export function getSessionSecret(): string {
  if (existsSync(SESSION_KEY_FILE)) {
    try {
      return readFileSync(SESSION_KEY_FILE, 'utf-8').trim();
    } catch {
      // fall through and regenerate
    }
  }
  ensureDir();
  const secret = randomBytes(32).toString('hex');
  writeFileSync(SESSION_KEY_FILE, secret, 'utf-8');
  return secret;
}
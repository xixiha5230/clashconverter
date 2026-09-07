/**
 * Subscription config storage.
 * Persists one JSON file per config under data/configs/.
 *
 * Layout:
 *   data/
 *     configs/
 *       <id>.json
 *
 * Files are only touched by this module. Writes are atomic (tmp + rename).
 */

import {
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
  existsSync,
  unlinkSync,
} from 'node:fs';
import path from 'node:path';
import { nanoid } from 'nanoid';
import type { SubscriptionSettings } from './acl4ssr/types';

export interface StoredSubscription {
  id: string;
  input: string;
  settings: SubscriptionSettings;
  accessToken: string;
  createdAt: string;
  updatedAt: string;
}

const DATA_DIR = path.join(process.cwd(), 'data', 'configs');

function ensureDir(): void {
  mkdirSync(DATA_DIR, { recursive: true });
}

function filePath(id: string): string {
  return path.join(DATA_DIR, `${id}.json`);
}

export function createSubscription(input: string, settings: SubscriptionSettings): StoredSubscription {
  ensureDir();
  const now = new Date().toISOString();
  const record: StoredSubscription = {
    id: nanoid(20),
    input,
    settings,
    accessToken: nanoid(32),
    createdAt: now,
    updatedAt: now,
  };

  const target = filePath(record.id);
  const tmp = `${target}.${process.pid}.${nanoid(6)}.tmp`;
  writeFileSync(tmp, JSON.stringify(record), 'utf-8');
  renameSync(tmp, target);

  return record;
}

export function getSubscription(id: string): StoredSubscription | null {
  const target = filePath(id);
  if (!existsSync(target)) {
    return null;
  }
  try {
    const data = readFileSync(target, 'utf-8');
    return JSON.parse(data) as StoredSubscription;
  } catch {
    return null;
  }
}

export function deleteSubscription(id: string): boolean {
  const target = filePath(id);
  if (!existsSync(target)) {
    return false;
  }
  unlinkSync(target);
  return true;
}

export function verifyAccessToken(record: StoredSubscription, token: string): boolean {
  if (!token) {
    return false;
  }
  return Buffer.from(record.accessToken, 'utf-8').equals(Buffer.from(token, 'utf-8'));
}
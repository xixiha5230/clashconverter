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
  readdirSync,
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
  nodeCount?: number;
  lastAccessedAt?: string;
}

const DATA_DIR = path.join(process.cwd(), 'data', 'configs');

function ensureDir(): void {
  mkdirSync(DATA_DIR, { recursive: true });
}

function filePath(id: string): string {
  return path.join(DATA_DIR, `${id}.json`);
}

export function createSubscription(
  input: string,
  settings: SubscriptionSettings,
  nodeCount: number
): StoredSubscription {
  ensureDir();
  const now = new Date().toISOString();
  const record: StoredSubscription = {
    id: nanoid(20),
    input,
    settings,
    accessToken: nanoid(32),
    createdAt: now,
    updatedAt: now,
    nodeCount,
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

function writeRecord(record: StoredSubscription): void {
  const target = filePath(record.id);
  const tmp = `${target}.${process.pid}.${nanoid(6)}.tmp`;
  writeFileSync(tmp, JSON.stringify(record), 'utf-8');
  renameSync(tmp, target);
}

export function updateAccessStats(id: string, nodeCount: number): void {
  const record = getSubscription(id);
  if (!record) {
    return;
  }
  record.nodeCount = nodeCount;
  record.lastAccessedAt = new Date().toISOString();
  record.updatedAt = record.lastAccessedAt;
  writeRecord(record);
}

export function listSubscriptions(): StoredSubscription[] {
  if (!existsSync(DATA_DIR)) {
    return [];
  }
  const results: StoredSubscription[] = [];
  for (const entry of readdirSync(DATA_DIR)) {
    if (!entry.endsWith('.json')) {
      continue;
    }
    try {
      const data = readFileSync(filePath(entry.slice(0, -5)), 'utf-8');
      const record = JSON.parse(data) as StoredSubscription;
      if (record.id) {
        results.push(record);
      }
    } catch {
      // ignore unreadable/invalid files
    }
  }
  results.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  return results;
}

export function verifyAccessToken(record: StoredSubscription, token: string): boolean {
  if (!token) {
    return false;
  }
  return Buffer.from(record.accessToken, 'utf-8').equals(Buffer.from(token, 'utf-8'));
}
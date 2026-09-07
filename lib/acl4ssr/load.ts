/**
 * Load ACL4SSR template files from the repository, with in-memory caching.
 * Template files live under templates/acl4ssr/ and are shipped inside the
 * Docker image (COPY . .).
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { getAclTemplateVariant } from './variants';

const cache = new Map<string, string>();

export function loadAclTemplate(key: string): string {
  const cached = cache.get(key);
  if (cached !== undefined) {
    return cached;
  }

  const variant = getAclTemplateVariant(key);
  if (!variant) {
    throw new Error(`Unknown ACL4SSR template: ${key}`);
  }

  const filePath = path.join(process.cwd(), 'templates', 'acl4ssr', variant.file);
  const content = readFileSync(filePath, 'utf-8');
  cache.set(key, content);
  return content;
}
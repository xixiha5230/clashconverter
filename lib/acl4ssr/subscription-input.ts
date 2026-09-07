/**
 * Resolve subscription input to proxy nodes on the server.
 * The input may be:
 *   - plain proxy link text (vless://, ss://, ...)
 *   - a Clash YAML config with a `proxies:` section
 *   - base64 encoded proxy links
 *   - an http(s) subscription URL (fetched server-side)
 */

import { parseMultipleProxies } from '../parsers';
import { parseYamlToProxies } from '../clash/parser/yaml';
import type { ProxyNode } from '../types';

const BASE64_PATTERN = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;

export function isHttpUrl(value: string): boolean {
  const trimmed = value.trim();
  try {
    const url = new URL(trimmed);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function decodeBase64(content: string): string {
  return Buffer.from(content.replace(/\s/g, ''), 'base64').toString('utf-8');
}

function looksLikeProxyText(content: string): boolean {
  return /(ss|ssr|vmess|vless|trojan|hysteria|hysteria2|http|socks):\/\//gi.test(content);
}

function looksLikeBase64(content: string): boolean {
  const clean = content.replace(/\s/g, '');
  return clean.length > 20 && BASE64_PATTERN.test(clean);
}

/**
 * Parse subscription/input text into proxy nodes without any network access.
 */
export function parseSubscriptionInput(content: string): ProxyNode[] {
  const trimmed = content.trim();
  if (!trimmed) {
    return [];
  }

  // Base64 encoded proxy links
  if (looksLikeBase64(trimmed)) {
    const decoded = decodeBase64(trimmed);
    if (looksLikeProxyText(decoded)) {
      const { proxies } = parseMultipleProxies(decoded);
      if (proxies.length > 0) {
        return proxies;
      }
    }
  }

  // Proxy link text
  if (looksLikeProxyText(trimmed)) {
    const { proxies } = parseMultipleProxies(trimmed);
    if (proxies.length > 0) {
      return proxies;
    }
  }

  // Clash YAML config
  if (/^\s*[\w-]+\s*:/m.test(trimmed) || /^\s*proxies:\s*$/m.test(trimmed)) {
    const yamlProxies = parseYamlToProxies(trimmed);
    if (yamlProxies.length > 0) {
      return yamlProxies;
    }
  }

  return [];
}

async function fetchSubscription(url: string): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'ClashConverter/1.0' },
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    const content = await response.text();
    if (!content.trim()) {
      throw new Error('Empty response from subscription server');
    }
    return content;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Resolve raw input to proxy nodes, fetching remote subscription URLs if needed.
 */
export async function resolveSubscriptionNodes(input: string): Promise<ProxyNode[]> {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new Error('Empty input');
  }

  if (isHttpUrl(trimmed)) {
    const content = await fetchSubscription(trimmed);
    const proxies = parseSubscriptionInput(content);
    if (proxies.length === 0) {
      throw new Error('No valid proxy nodes found in subscription');
    }
    return proxies;
  }

  const proxies = parseSubscriptionInput(trimmed);
  if (proxies.length === 0) {
    throw new Error('No valid proxy nodes found in input');
  }
  return proxies;
}
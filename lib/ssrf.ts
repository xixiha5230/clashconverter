/**
 * SSRF guard for server-side fetched URLs.
 * Resolves the hostname and rejects targets pointing to private, loopback,
 * link-local or reserved addresses (including IPv4-mapped / IPv6 forms).
 */

import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

interface BlockRange {
  min: number;
  max: number;
}

const IPV4_BLOCK_RANGES: BlockRange[] = [
  [0, 0x00ffffff], // 0.0.0.0/8
  [0x0a000000, 0x0affffff], // 10.0.0.0/8
  [0x64400000, 0x647fffff], // 100.64.0.0/10 (CGNAT)
  [0x7f000000, 0x7fffffff], // 127.0.0.0/8
  [0xa9fe0000, 0xa9feffff], // 169.254.0.0/16
  [0xac100000, 0xac1fffff], // 172.16.0.0/12
  [0xc0a80000, 0xc0a8ffff], // 192.168.0.0/16
  [0xc6120000, 0xc613ffff], // 198.18.0.0/15 (benchmarking)
].map(([min, max]) => ({ min, max }));

const IPV6_BLOCK_PREFIXES: string[] = [
  'fc', // fc00::/7 ULA
  'fd', // fc00::/7 ULA
  'fe8', // fe80::/10 link-local
  'fe9',
  'fea',
  'feb',
];

function ipv4ToInt(ip: string): number {
  return (
    ip.split('.').reduce((acc, octet) => (acc << 8) + Number(octet), 0) >>> 0
  );
}

export function isPrivateIp(ip: string): boolean {
  const family = isIP(ip);
  if (family === 4) {
    const int = ipv4ToInt(ip);
    return IPV4_BLOCK_RANGES.some(({ min, max }) => int >= min && int <= max);
  }
  if (family === 6) {
    const lower = ip.toLowerCase();
    if (lower === '::' || lower === '::1') {
      return true;
    }
    const mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) {
      return isPrivateIp(mapped[1]);
    }
    const compat = lower.match(/^::(\d+\.\d+\.\d+\.\d+)$/);
    if (compat) {
      return isPrivateIp(compat[1]);
    }
    if (IPV6_BLOCK_PREFIXES.some((prefix) => lower.startsWith(prefix))) {
      return true;
    }
  }
  return false;
}

/**
 * Validate that a URL points at an externally reachable address.
 * Throws when the scheme is unsupported, resolution fails, or any resolved
 * address is non-public. Returns the parsed URL.
 */
export async function assertPublicUrl(rawUrl: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(rawUrl.trim());
  } catch {
    throw new Error('Invalid subscription URL');
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('Subscription URL must be http(s)');
  }

  const hostname = url.hostname.replace(/^\[|\]$/g, '');
  if (!hostname) {
    throw new Error('Subscription URL has no host');
  }

  const literal = isIP(hostname);
  let addresses: string[];
  if (literal !== 0) {
    addresses = [hostname];
  } else {
    try {
      addresses = (await lookup(hostname, { all: true, verbatim: true })).map(
        (dnsResult) => dnsResult.address
      );
    } catch {
      throw new Error('Failed to resolve subscription host');
    }
  }

  for (const address of addresses) {
    if (isPrivateIp(address)) {
      throw new Error('Subscription URL must point to a public address');
    }
  }
  return url;
}
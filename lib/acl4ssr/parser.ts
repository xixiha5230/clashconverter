/**
 * Parser for ACL4SSR Clash config `.ini` templates.
 *
 * These files follow the Clash for Windows custom rule generator format:
 *   [custom]
 *   ruleset=<group name>,<rule list url | []directive>
 *   custom_proxy_group=<name>`<type>`<filter>...`[<url>`<interval>,,<tolerance>]
 *   enable_rule_generator=true
 */

import type { ParsedAclTemplate, TemplateProxyFilter, TemplateProxyGroup, TemplateRuleSet } from './types';

const GROUP_TYPES = new Set(['select', 'url-test', 'fallback', 'load-balance']);

/**
 * Parse a raw ACL4SSR ini template into structured data.
 * Lines starting with `;` (comments) and blank lines are skipped.
 */
export function parseAclIni(content: string): ParsedAclTemplate {
  const ruleSets: TemplateRuleSet[] = [];
  const proxyGroups: TemplateProxyGroup[] = [];

  for (const rawLine of content.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith(';')) {
      continue;
    }

    if (line.startsWith('ruleset=')) {
      parseRuleSet(line, ruleSets);
      continue;
    }

    if (line.startsWith('custom_proxy_group=')) {
      const group = parseProxyGroup(line);
      if (group) {
        proxyGroups.push(group);
      }
    }
  }

  return { ruleSets, proxyGroups };
}

function parseRuleSet(line: string, ruleSets: TemplateRuleSet[]): void {
  const body = line.slice('ruleset='.length);
  const separatorIndex = body.indexOf(',');
  if (separatorIndex === -1) {
    return;
  }
  const group = body.slice(0, separatorIndex);
  const payloads = body.slice(separatorIndex + 1);

  // A single ruleset= line may contain multiple comma separated payloads,
  // though current templates ship one payload per line.
  for (const payload of payloads.split(',,')) {
    const p = payload.trim();
    if (!p) {
      continue;
    }
    ruleSets.push({ group: group.trim(), payload: p });
  }
}

function parseProxyGroup(line: string): TemplateProxyGroup | undefined {
  const body = line.slice('custom_proxy_group='.length);
  const tokens = body.split('`').map((t) => t.trim());

  if (tokens.length < 2) {
    return undefined;
  }

  const [name, type] = tokens;
  if (!GROUP_TYPES.has(type)) {
    return undefined;
  }

  // Split remaining tokens into filters + optional health-check fields.
  // Health-check fields are: <url>`<interval>,,<tolerance>
  let urlIndex = -1;
  for (let i = 2; i < tokens.length; i++) {
    if (tokens[i].startsWith('http://') || tokens[i].startsWith('https://')) {
      urlIndex = i;
      break;
    }
  }

  const filterTokens = urlIndex === -1 ? tokens.slice(2) : tokens.slice(2, urlIndex);
  const url = urlIndex === -1 ? undefined : tokens[urlIndex];
  let interval: number | undefined;
  let tolerance: number | undefined;

  if (urlIndex !== -1 && tokens[urlIndex + 1]) {
    // Health-check fields format: <interval>,,<tolerance>
    const health = tokens[urlIndex + 1].split(',');
    if (health[0]) {
      interval = Number(health[0]);
    }
    if (health[2]) {
      tolerance = Number(health[2]);
    }
  }

  return {
    name,
    type: type as TemplateProxyGroup['type'],
    filters: filterTokens.map(parseFilter),
    url,
    interval: Number.isFinite(interval as number) ? interval : undefined,
    tolerance: Number.isFinite(tolerance as number) ? tolerance : undefined,
  };
}

function parseFilter(token: string): TemplateProxyFilter {
  if (token === '.*') {
    return { kind: 'all', value: token };
  }
  if (token.startsWith('[')) {
    return { kind: 'reference', value: token.slice(2) };
  }
  return { kind: 'regex', value: token };
}
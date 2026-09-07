/**
 * Render an ACL4SSR-based Clash configuration from parsed proxies.
 * Produces a config with:
 *   - inlined proxies (from user nodes)
 *   - proxy-groups built from the template's custom_proxy_group entries
 *   - remote rule sets referenced via rule-providers + RULE-SET rules
 *   - optional dns section
 */

import { stringify } from 'yaml';
import type { ProxyNode } from '../types';
import { ProtocolAdapterRegistry } from '../adapters/protocol-adapter';
import '../core/registry';
import { parseAclIni } from './parser';
import type { ParsedAclTemplate, TemplateProxyGroup } from './types';
import { DNS_CONFIG } from '../clash/config/base';

const HEADER_BANNER = [
  '#',
  '#-------------------------------------------------------------#',
  '#  author：https://clashconverter.com',
];

const FOOTER_BANNER = [
  '#-------------------------------------------------------------#',
  '#',
];

const BASIC_CONFIG = [
  'port: 7890',
  'socks-port: 7891',
  'allow-lan: true',
  'mode: Rule',
  'log-level: info',
  'external-controller: 127.0.0.1:9090',
  '',
];

const RULE_LIST_REFRESH_INTERVAL = 86400;

function buildHeader(nodeCount: number): string[] {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const createTime = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

  return [
    ...HEADER_BANNER,
    `#  create_time：${createTime}`,
    `#  node num：${nodeCount}`,
    ...FOOTER_BANNER,
  ];
}

function indent(text: string, spaces: number): string {
  const prefix = ' '.repeat(spaces);
  return text
    .split('\n')
    .map((line) => (line ? prefix + line : line))
    .join('\n');
}

function buildProxiesYaml(proxies: ProxyNode[]): string {
  const lines: string[] = ['proxies:'];
  for (const proxy of proxies) {
    const adapter = ProtocolAdapterRegistry.get(proxy.type);
    if (adapter) {
      lines.push('  - ' + JSON.stringify(adapter.toClashJson(proxy)));
    }
  }
  return lines.join('\n');
}

const BUILTIN_PROXY_NAMES = new Set(['DIRECT', 'REJECT', 'REJECT-DROP', 'PASS', 'GLOBAL']);

interface GroupPlan {
  group: TemplateProxyGroup;
  nodeMatches: string[];
  refs: string[];
  kept: boolean;
  members: string[];
}

function planProxyGroups(
  template: ParsedAclTemplate,
  nodeNames: string[]
): GroupPlan[] {
  const plans: GroupPlan[] = template.proxyGroups.map((group) => {
    const nodeMatches: string[] = [];
    const refs: string[] = [];

    for (const filter of group.filters) {
      if (filter.kind === 'reference') {
        refs.push(filter.value);
      } else if (filter.kind === 'all') {
        nodeMatches.push(...nodeNames);
      } else {
        try {
          const regex = new RegExp(filter.value);
          for (const name of nodeNames) {
            if (regex.test(name)) {
              nodeMatches.push(name);
            }
          }
        } catch {
          // Invalid regex from template - skip this filter
        }
      }
    }

    return { group, nodeMatches, refs, kept: false, members: [] };
  });

  const byName = new Map(plans.map((plan) => [plan.group.name, plan]));

  // A group stays if it matches at least one node or references at least one
  // kept group / built-in proxy. Compute to fixpoint so reference chains held
  // together by another matching group survive.
  let changed = true;
  while (changed) {
    changed = false;
    for (const plan of plans) {
      if (plan.kept) continue;
      const hasNode = plan.nodeMatches.length > 0;
      const hasValidRef = plan.refs.some(
        (ref) => BUILTIN_PROXY_NAMES.has(ref) || byName.get(ref)?.kept
      );
      if (hasNode || hasValidRef) {
        plan.kept = true;
        changed = true;
      }
    }
  }

  const resolveMember = (ref: string): string | null =>
    BUILTIN_PROXY_NAMES.has(ref)
      ? ref
      : byName.get(ref)?.kept
        ? ref
        : null;

  for (const plan of plans) {
    if (!plan.kept) continue;
    const seen = new Set<string>();
    const members: string[] = [];
    const push = (name: string) => {
      if (!seen.has(name)) {
        seen.add(name);
        members.push(name);
      }
    };
    for (const ref of plan.refs) {
      const member = resolveMember(ref);
      if (member) push(member);
    }
    for (const name of plan.nodeMatches) {
      push(name);
    }
    plan.members = members;
  }

  return plans;
}

function buildProxyGroupsYaml(
  template: ParsedAclTemplate,
  nodeNames: string[],
  ruleTargetGroups: Set<string>
): string {
  const plans = planProxyGroups(template, nodeNames);

  const groups: Record<string, unknown>[] = [];
  for (const plan of plans) {
    if (!plan.kept) continue;

    // Groups referenced by rules must exist; fall back to all nodes so the
    // resulting config remains loadable by Clash/Mihomo.
    if (plan.members.length === 0 && ruleTargetGroups.has(plan.group.name)) {
      plan.members.push(...nodeNames);
    }
    if (plan.members.length === 0) {
      continue;
    }

    const group = plan.group;
    const obj: Record<string, unknown> = {
      name: group.name,
      type: group.type,
    };
    if (group.url) obj.url = group.url;
    if (group.interval) obj.interval = group.interval;
    if (group.tolerance) obj.tolerance = group.tolerance;

    obj.proxies = plan.members;
    groups.push(obj);
  }

  if (groups.length === 0) {
    return '';
  }
  return 'proxy-groups:\n' + indent(stringify(groups), 2);
}

function buildRuleProvidersYaml(providers: Record<string, unknown>): string {
  if (Object.keys(providers).length === 0) {
    return '';
  }
  return 'rule-providers:\n' + indent(stringify(providers), 2);
}

function buildRulesYaml(template: ParsedAclTemplate): string {
  const rules: string[] = ['rules:'];
  let providerIndex = 0;

  for (const ruleSet of template.ruleSets) {
    const payload = ruleSet.payload.trim();

    if (payload.startsWith('[]')) {
      const directive = payload.slice(2);
      if (directive === 'FINAL' || directive === 'MATCH') {
        rules.push(`  - ${directive},${ruleSet.group}`);
      } else if (directive.startsWith('GEOIP,')) {
        rules.push(`  - ${directive},${ruleSet.group},no-resolve`);
      } else {
        rules.push(`  - ${directive},${ruleSet.group}`);
      }
      continue;
    }

    providerIndex += 1;
    rules.push(`  - RULE-SET,acl-${providerIndex},${ruleSet.group}`);
  }

  return rules.join('\n');
}

function buildRuleProviders(template: ParsedAclTemplate): Record<string, unknown> {
  const providers: Record<string, unknown> = {};
  let providerIndex = 0;

  for (const ruleSet of template.ruleSets) {
    const payload = ruleSet.payload.trim();
    if (payload.startsWith('[]')) {
      continue;
    }
    providerIndex += 1;
    providers[`acl-${providerIndex}`] = {
      type: 'http',
      behavior: 'classical',
      format: 'text',
      url: payload,
      interval: RULE_LIST_REFRESH_INTERVAL,
    };
  }

  return providers;
}

export interface RenderSubscriptionOptions {
  enableDns: boolean;
}

/**
 * Generate a complete Clash YAML subscription config from proxies and an
 * ACL4SSR ini template.
 */
export function renderSubscriptionYaml(
  proxies: ProxyNode[],
  iniContent: string,
  options: RenderSubscriptionOptions
): string {
  if (proxies.length === 0) {
    return '# No proxies found\n';
  }

  const template = parseAclIni(iniContent);
  const uniqueNames = Array.from(new Set(proxies.map((p) => p.name)));
  const ruleTargetGroups = new Set(template.ruleSets.map((ruleSet) => ruleSet.group));

  const parts: string[] = [];
  parts.push(buildHeader(proxies.length).join('\n'));
  parts.push(BASIC_CONFIG.join('\n'));
  parts.push(buildProxiesYaml(proxies));
  parts.push(buildProxyGroupsYaml(template, uniqueNames, ruleTargetGroups));

  const providerBlock = buildRuleProvidersYaml(buildRuleProviders(template));
  if (providerBlock) {
    parts.push(providerBlock);
  }
  parts.push(buildRulesYaml(template));

  if (options.enableDns) {
    parts.push(DNS_CONFIG.join('\n'));
  }

  return parts.join('\n').replace(/\n{3,}/g, '\n\n') + '\n';
}
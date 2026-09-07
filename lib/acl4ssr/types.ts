/**
 * ACL4SSR template subscription types
 */

export interface AclTemplateVariant {
  key: string;
  file: string;
  label: string;
}

/**
 * Settings for a generated subscription config
 */
export interface SubscriptionSettings {
  templateKey: string;
  enableDns: boolean;
}

/**
 * A parsed ruleset entry from the ACL4SSR ini template:
 *   ruleset=<proxy group>,<payload>
 *
 * payload is either a remote rule list URL, or a built-in directive like
 * `[]GEOIP,CN`, `[]GEOIP,LAN`, `[]FINAL`, `[]MATCH`.
 */
export interface TemplateRuleSet {
  group: string;
  payload: string;
}

/**
 * A single filter token used inside a custom_proxy_group line.
 *
 * Kinds:
 *  - reference:  a `[]prefix` token pointing to another proxy group / DIRECT / REJECT
 *  - regex:      a node-name filter (e.g. `(港|HK|hk)`)
 *  - all:        `.*` meaning "all proxies"
 */
export interface TemplateProxyFilter {
  kind: 'reference' | 'regex' | 'all';
  value: string;
}

/**
 * A parsed custom_proxy_group entry from the ACL4SSR ini template:
 *   custom_proxy_group=<name>`<type>`[<filters>...][`<url>`<interval>,<tolerance>]
 */
export interface TemplateProxyGroup {
  name: string;
  type: 'select' | 'url-test' | 'fallback' | 'load-balance';
  filters: TemplateProxyFilter[];
  url?: string;
  interval?: number;
  tolerance?: number;
}

export interface ParsedAclTemplate {
  ruleSets: TemplateRuleSet[];
  proxyGroups: TemplateProxyGroup[];
}
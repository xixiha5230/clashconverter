/**
 * High-level entry point: resolve input to proxy nodes, then render the
 * selected ACL4SSR template into a full Clash subscription config.
 */

import { renderSubscriptionYaml } from './renderer';
import { loadAclTemplate } from './load';
import { resolveSubscriptionNodes } from './subscription-input';
import type { SubscriptionSettings } from './types';

export async function renderConfigFromInput(
  input: string,
  settings: SubscriptionSettings
): Promise<string> {
  const proxies = await resolveSubscriptionNodes(input);
  const iniContent = loadAclTemplate(settings.templateKey);
  return renderSubscriptionYaml(proxies, iniContent, {
    enableDns: settings.enableDns,
  });
}
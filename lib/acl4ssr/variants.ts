/**
 * Built-in ACL4SSR template variants.
 * Template files live under templates/acl4ssr/ and are read server-side.
 */

export interface AclTemplateVariant {
  key: string;
  file: string;
  label: string;
  desc: string;
}

export const ACL_TEMPLATE_VARIANTS: readonly AclTemplateVariant[] = [
  {
    key: 'mini-multicountry',
    file: 'ACL4SSR_Online_Mini_MultiCountry.ini',
    label: 'ACL4SSR Online Mini MultiCountry',
    desc: '精简版多国家分组，含去广告',
  },
  {
    key: 'mini',
    file: 'ACL4SSR_Online_Mini.ini',
    label: 'ACL4SSR Online Mini',
    desc: '精简版',
  },
  {
    key: 'multicountry',
    file: 'ACL4SSR_Online_MultiCountry.ini',
    label: 'ACL4SSR Online MultiCountry',
    desc: '完整版多国家分组，含去广告',
  },
  {
    key: 'full',
    file: 'ACL4SSR_Online_Full.ini',
    label: 'ACL4SSR Online Full',
    desc: '完整版，含微软/苹果分流、各平台规则',
  },
  {
    key: 'full-netflix',
    file: 'ACL4SSR_Online_Full_Netflix.ini',
    label: 'ACL4SSR Online Full Netflix',
    desc: '完整版，含奈飞独立分组',
  },
  {
    key: 'mini-adblockplus',
    file: 'ACL4SSR_Online_Mini_AdblockPlus.ini',
    label: 'ACL4SSR Online Mini AdblockPlus',
    desc: '精简版，重点增强广告拦截',
  },
];

export type AclTemplateKey = (typeof ACL_TEMPLATE_VARIANTS)[number]['key'];

export function getAclTemplateVariant(key: string): AclTemplateVariant | undefined {
  return ACL_TEMPLATE_VARIANTS.find((v) => v.key === key);
}
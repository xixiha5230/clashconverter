// DNS configuration
export const DNS_CONFIG = [
  'dns:',
  '  enable: true',
  '  ipv6: true',
  '  default-nameserver:',
  '    - 223.5.5.5',
  '    - 119.29.29.29',
  '    - 1.1.1.1',
  '  enhanced-mode: fake-ip',
  '  fake-ip-range: 198.18.0.1/16',
  '  nameserver:',
  '    - https://dns.alidns.com/dns-query',
  '    - https://doh.pub/dns-query',
  '  fallback:',
  '    - https://1.1.1.1/dns-query',
  '    - https://dns.google/dns-query',
  '  fallback-filter:',
  '    geoip: true',
  '    ipcidr:',
  '      - 240.0.0.0/4',
  '      - 0.0.0.0/32',
  '',
];

// Basic configuration
export const BASIC_CONFIG = [
  'port: 7890',
  'socks-port: 7891',
  'allow-lan: true',
  'mode: Rule',
  'log-level: info',
  'external-controller: 0.0.0.0:9090',
  '',
];

// Header banner lines
export const HEADER_BANNER = [
  '#',
  '#-------------------------------------------------------------#',
  '#  author：https://clashconverter.com',
];

// Footer banner lines
export const FOOTER_BANNER = [
  '#-------------------------------------------------------------#',
  '#',
];

// Proxy group templates
export interface ProxyGroupConfig {
  name: string;
  type: string;
  url?: string;
  interval?: number;
  tolerance?: number;
  useAllProxies?: boolean;
  proxies: string[];
}

export const PROXY_GROUPS_CONFIG: ProxyGroupConfig[] = [
  {
    name: '🔰 选择节点',
    type: 'select',
    useAllProxies: true,
    proxies: ['DIRECT'],
  },
  {
    name: '🌏 爱奇艺&哔哩哔哩',
    type: 'select',
    proxies: ['DIRECT'],
  },
  {
    name: '📺 动画疯',
    type: 'select',
    proxies: ['🔰 选择节点', 'DIRECT'],
  },
  {
    name: '🎮 Steam 登录/下载',
    type: 'select',
    proxies: ['DIRECT', '🔰 选择节点'],
  },
  {
    name: '🎮 Steam 商店/社区',
    type: 'select',
    proxies: ['🔰 选择节点', 'DIRECT'],
  },
  {
    name: '🌩️ Cloudflare',
    type: 'select',
    proxies: ['🔰 选择节点', 'DIRECT'],
  },
  {
    name: '☁️ OneDrive',
    type: 'select',
    useAllProxies: true,
    proxies: ['🔰 选择节点', 'DIRECT'],
  },
  {
    name: '🎓学术网站',
    type: 'select',
    proxies: ['DIRECT', '🔰 选择节点'],
  },
  {
    name: '🇨🇳 国内网站',
    type: 'select',
    proxies: ['DIRECT', '🔰 选择节点'],
  },
  {
    name: '🛑 拦截广告',
    type: 'select',
    proxies: ['REJECT', 'DIRECT', '🔰 选择节点'],
  },
  {
    name: '🐟 漏网之鱼',
    type: 'select',
    proxies: ['🔰 选择节点', 'DIRECT'],
  },
];

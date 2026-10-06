import * as dns from 'dns';

const invalidResolverValues = new Set(['0.0.0.0', '::', '0.0.0.0/0', '::/0']);

function isValidResolver(value: string): boolean {
  const trimmed = value.trim();

  if (!trimmed || invalidResolverValues.has(trimmed) || trimmed.includes('/')) {
    return false;
  }

  return /^(?:\d{1,3}\.){3}\d{1,3}$|^(?:[0-9a-fA-F]{0,4}:){1,7}[0-9a-fA-F]{0,4}$/.test(trimmed);
}

/**
 * Only override the system DNS when a valid custom resolver value is explicitly configured.
 * CIDR ranges such as 0.0.0.0/0 are not valid DNS server addresses and will break MongoDB
 * hostname resolution.
 */
export function configureDNS(): void {
  const rawValue = process.env.MONGODB_DNS_SERVERS ?? '';
  const servers = rawValue
    .split(',')
    .map((value) => value.trim())
    .filter((value) => value.length > 0 && isValidResolver(value));

  if (servers.length === 0) {
    console.log('ℹ️ No valid MongoDB DNS override configured; using the system DNS resolver.');
    return;
  }

  dns.setServers(servers);
  console.log('✓ DNS configured to use custom servers:', servers.join(', '));
}

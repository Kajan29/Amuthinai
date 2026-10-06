import * as dns from 'dns';

/**
 * Configure DNS to use reliable public DNS servers
 * This fixes MongoDB SRV connection issues when system DNS is unreliable
 */
export function configureDNS(): void {
  // Use Google Public DNS and Cloudflare DNS as fallbacks
  const publicDNSServers = ['8.8.8.8', '8.8.4.4', '1.1.1.1', '1.0.0.1'];

  dns.setServers(publicDNSServers);

  console.log('✓ DNS configured to use public DNS servers:', publicDNSServers.join(', '));
}

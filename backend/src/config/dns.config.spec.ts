const setServersMock = jest.fn();

jest.mock('node:dns', () => {
  const actualDns = jest.requireActual('node:dns');

  return {
    ...actualDns,
    setServers: (...args: string[]) => setServersMock(...args),
  };
});

import { configureDNS } from './dns.config';

describe('configureDNS', () => {
  const originalDnsServers = process.env.MONGODB_DNS_SERVERS;

  beforeEach(() => {
    setServersMock.mockClear();
  });

  afterEach(() => {
    if (originalDnsServers === undefined) {
      delete process.env.MONGODB_DNS_SERVERS;
    } else {
      process.env.MONGODB_DNS_SERVERS = originalDnsServers;
    }
  });

  it('ignores invalid CIDR entries such as 0.0.0.0/0', () => {
    process.env.MONGODB_DNS_SERVERS = '0.0.0.0/0';

    configureDNS();

    expect(setServersMock).not.toHaveBeenCalled();
  });

  it('uses valid custom DNS servers when provided', () => {
    process.env.MONGODB_DNS_SERVERS = '8.8.8.8,1.1.1.1';

    configureDNS();

    expect(setServersMock).toHaveBeenCalledWith(['8.8.8.8', '1.1.1.1']);
  });
});

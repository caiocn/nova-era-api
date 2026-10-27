import { lookup } from 'node:dns/promises';
import net, { isIP } from 'node:net';
import tls from 'node:tls';
import { URL } from 'node:url';

import { Logger } from '@config/logger.config';
import { getLinkPreview } from 'link-preview-js';
import { Agent } from 'undici';

const logger = new Logger('SafeUrlPreview');

export function parseIpv4(ip: string): number[] | null {
  const parts = ip.split('.');
  if (parts.length !== 4) return null;
  const nums: number[] = [];
  for (const p of parts) {
    if (!/^\d+$/.test(p)) return null;
    const n = Number(p);
    if (n < 0 || n > 255 || String(n) !== p) return null;
    nums.push(n);
  }
  return nums;
}

export function isIpv4Blocked(nums: number[]): boolean {
  const [b0, b1, b2] = nums;
  // 0.0.0.0/8 (Current network / "this" host)
  if (b0 === 0) return true;
  // 10.0.0.0/8 (RFC 1918 Private)
  if (b0 === 10) return true;
  // 100.64.0.0/10 (Carrier-grade NAT, RFC 6598: 100.64.0.0 - 100.127.255.255)
  if (b0 === 100 && (b1 & 0xc0) === 64) return true;
  // 127.0.0.0/8 (Loopback)
  if (b0 === 127) return true;
  // 169.254.0.0/16 (Link-local / Cloud metadata, RFC 3927)
  if (b0 === 169 && b1 === 254) return true;
  // 172.16.0.0/12 (RFC 1918 Private: 172.16.0.0 - 172.31.255.255)
  if (b0 === 172 && (b1 & 0xf0) === 16) return true;
  // 192.0.0.0/24 (IETF Protocol Assignments)
  if (b0 === 192 && b1 === 0 && b2 === 0) return true;
  // 192.0.2.0/24 (TEST-NET-1, documentation)
  if (b0 === 192 && b1 === 0 && b2 === 2) return true;
  // 192.168.0.0/16 (RFC 1918 Private)
  if (b0 === 192 && b1 === 168) return true;
  // 198.18.0.0/15 (Network benchmark tests: 198.18.0.0 - 198.19.255.255)
  if (b0 === 198 && (b1 === 18 || b1 === 19)) return true;
  // 198.51.100.0/24 (TEST-NET-2, documentation)
  if (b0 === 198 && b1 === 51 && b2 === 100) return true;
  // 203.0.113.0/24 (TEST-NET-3, documentation)
  if (b0 === 203 && b1 === 0 && b2 === 113) return true;
  // 224.0.0.0/4 (Multicast) & 240.0.0.0/4 (Reserved / Broadcast 255.255.255.255)
  if (b0 >= 224) return true;
  return false;
}

export function parseIpv6(ip: string): number[] | null {
  let cleaned = ip.split('%')[0].toLowerCase().trim();
  if (cleaned.startsWith('[') && cleaned.endsWith(']')) {
    cleaned = cleaned.slice(1, -1);
  }
  // Check for embedded dotted IPv4 (e.g. ::ffff:192.168.1.1 or 0:0:0:0:0:ffff:192.168.1.1)
  const v4Match = cleaned.match(/^(.*:)(\d{1,3}(?:\.\d{1,3}){3})$/);
  if (v4Match) {
    const v4 = parseIpv4(v4Match[2]);
    if (!v4) return null;
    const hi = ((v4[0] << 8) | v4[1]).toString(16);
    const lo = ((v4[2] << 8) | v4[3]).toString(16);
    cleaned = v4Match[1] + hi + ':' + lo;
  }
  const parts = cleaned.split('::');
  if (parts.length > 2) return null;
  const left = parts[0] ? parts[0].split(':') : [];
  const right = parts.length === 2 && parts[1] ? parts[1].split(':') : [];
  const missing = 8 - (left.length + right.length);
  if (missing < 0 || (parts.length === 1 && missing !== 0)) return null;
  const words: number[] = [];
  for (const seg of left) {
    if (!/^[0-9a-f]{1,4}$/i.test(seg)) return null;
    words.push(parseInt(seg, 16));
  }
  for (let i = 0; i < missing; i++) words.push(0);
  for (const seg of right) {
    if (!/^[0-9a-f]{1,4}$/i.test(seg)) return null;
    words.push(parseInt(seg, 16));
  }
  return words.length === 8 ? words : null;
}

export function isIpv6Blocked(words: number[]): boolean {
  // ::/128 (Unspecified)
  if (words.every((w) => w === 0)) return true;
  // ::1/128 (Loopback)
  if (words.slice(0, 7).every((w) => w === 0) && words[7] === 1) return true;

  // Embedded IPv4 check:
  // - ::ffff:x.x.x.x (IPv4-mapped IPv6, RFC 4291)
  // - ::x.x.x.x (IPv4-compatible IPv6, deprecated)
  // - 64:ff9b::x.x.x.x (NAT64 well-known prefix, RFC 6052)
  const isV4Mapped = words.slice(0, 5).every((w) => w === 0) && words[5] === 0xffff;
  const isV4Compat = words.slice(0, 6).every((w) => w === 0) && words[6] !== 0;
  const isNat64 = words[0] === 0x64 && words[1] === 0xff9b && words.slice(2, 6).every((w) => w === 0);
  if (isV4Mapped || isV4Compat || isNat64) {
    const b0 = words[6] >> 8;
    const b1 = words[6] & 0xff;
    const b2 = words[7] >> 8;
    const b3 = words[7] & 0xff;
    if (isIpv4Blocked([b0, b1, b2, b3])) return true;
  }

  // 2002::/16 (6to4, RFC 3056, embedded IPv4 in words[1], words[2])
  if (words[0] === 0x2002) {
    const b0 = words[1] >> 8;
    const b1 = words[1] & 0xff;
    const b2 = words[2] >> 8;
    const b3 = words[2] & 0xff;
    if (isIpv4Blocked([b0, b1, b2, b3])) return true;
  }

  // fe80::/10 (Link-local unicast: fe80..febf, RFC 4291)
  if ((words[0] & 0xffc0) === 0xfe80) return true;
  // fc00::/7 (Unique local address / ULA: fc00..fdff, RFC 4193)
  if ((words[0] & 0xfe00) === 0xfc00) return true;
  // ff00::/8 (Multicast, RFC 4291)
  if ((words[0] & 0xff00) === 0xff00) return true;
  // 100::/64 (Discard prefix, RFC 6666)
  if (words[0] === 0x0100 && words.slice(1, 4).every((w) => w === 0)) return true;
  // 2001:db8::/32 (Documentation, RFC 3849)
  if (words[0] === 0x2001 && words[1] === 0x0db8) return true;

  return false;
}

export function isPrivateOrLocalAddress(ip: string): boolean {
  const v4 = parseIpv4(ip);
  if (v4) return isIpv4Blocked(v4);
  const v6 = parseIpv6(ip);
  if (v6) return isIpv6Blocked(v6);
  return false;
}

const DISALLOWED_HOSTNAME_SUFFIXES = [
  '.local',
  '.internal',
  '.lan',
  '.home.arpa',
  '.nip.io',
  '.sslip.io',
  '.localdomain',
];

export async function resolveSafeHostAddress(urlOrHost: string): Promise<string> {
  let hostname = urlOrHost.trim();
  if (hostname.includes('://')) {
    const parsed = new URL(hostname);
    const protocol = parsed.protocol.toLowerCase();
    if (protocol !== 'http:' && protocol !== 'https:') {
      throw new Error(`Invalid protocol for link preview: ${protocol}`);
    }
    hostname = parsed.hostname;
  }

  hostname = hostname
    .toLowerCase()
    .replace(/^\[|\]$/g, '')
    .replace(/\.$/, '');

  if (hostname === 'localhost' || DISALLOWED_HOSTNAME_SUFFIXES.some((suffix) => hostname.endsWith(suffix))) {
    throw new Error(`SSRF blocked: disallowed hostname ${hostname}`);
  }

  if (isIP(hostname)) {
    if (isPrivateOrLocalAddress(hostname)) {
      throw new Error(`SSRF blocked: private IP address ${hostname}`);
    }
    return hostname;
  }

  const addresses = await lookup(hostname, { all: true });
  if (!addresses || addresses.length === 0) {
    throw new Error(`DNS resolution failed for ${hostname}`);
  }

  for (const item of addresses) {
    if (isPrivateOrLocalAddress(item.address)) {
      throw new Error(`SSRF blocked: host ${hostname} resolved to private IP ${item.address}`);
    }
  }

  return addresses[0].address;
}

/**
 * Creates an Undici Agent that intercepts outgoing HTTP/HTTPS connections,
 * validates the target IP against SSRF rules, and pins the connection to the validated IP.
 */
export function createSafeUndiciAgent(): Agent {
  return new Agent({
    connect: (opts: any, cb: (err: Error | null, socket: any) => void) => {
      (async () => {
        try {
          const isHttps = opts.protocol === 'https:';
          const host = String(opts.hostname || '').replace(/^\[|\]$/g, '');
          const port = Number(opts.port) || (isHttps ? 443 : 80);

          let targetIp = host;
          if (isIP(host)) {
            if (isPrivateOrLocalAddress(host)) {
              return cb(new Error(`SSRF blocked: target IP ${host} is private or local`), null);
            }
          } else {
            if (host === 'localhost' || DISALLOWED_HOSTNAME_SUFFIXES.some((suffix) => host.endsWith(suffix))) {
              return cb(new Error(`SSRF blocked: hostname ${host} is disallowed`), null);
            }
            const addresses = await lookup(host, { all: true });
            if (!addresses || addresses.length === 0) {
              return cb(new Error(`DNS lookup failed for ${host}`), null);
            }
            for (const item of addresses) {
              if (isPrivateOrLocalAddress(item.address)) {
                return cb(new Error(`SSRF blocked: ${host} resolved to private IP ${item.address}`), null);
              }
            }
            targetIp = addresses[0].address;
          }

          const family = isIP(targetIp);
          const customLookup = (_h: string, o: any, c: (err: Error | null, res: any, family?: number) => void) => {
            if (o && o.all) {
              c(null, [{ address: targetIp, family }]);
            } else {
              c(null, targetIp, family);
            }
          };

          const socket = isHttps
            ? tls.connect({ host, servername: host, port, lookup: customLookup as any })
            : net.connect({ host: targetIp, port });

          const onError = (err: Error) => {
            socket.destroy();
            cb(err, null);
          };

          socket.once('error', onError);
          socket.once(isHttps ? 'secureConnect' : 'connect', () => {
            socket.removeListener('error', onError);
            cb(null, socket);
          });
        } catch (err) {
          cb(err instanceof Error ? err : new Error(String(err)), null);
        }
      })();
    },
  });
}

export async function safeGetLinkPreview(url: string, timeoutMs = 3000) {
  try {
    let target = url.trim();
    if (!target.startsWith('http://') && !target.startsWith('https://')) {
      target = `https://${target}`;
    }

    return await getLinkPreview(target, {
      followRedirects: 'follow',
      handleRedirects: (baseURL, forwardedURL) => {
        try {
          const baseObj = new URL(baseURL);
          const forwardedObj = new URL(forwardedURL);
          if (isPrivateOrLocalAddress(forwardedObj.hostname)) {
            return false;
          }
          return (
            forwardedObj.hostname === baseObj.hostname ||
            forwardedObj.hostname === `www.${baseObj.hostname}` ||
            `www.${forwardedObj.hostname}` === baseObj.hostname
          );
        } catch {
          return false;
        }
      },
      resolveDNSHost: resolveSafeHostAddress,
      timeout: timeoutMs,
    });
  } catch (error) {
    logger.warn(`Link preview fetch skipped: ${error instanceof Error ? error.message : String(error)}`);
    return undefined;
  }
}

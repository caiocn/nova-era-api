import assert from 'node:assert/strict';
import http from 'node:http';
import test from 'node:test';

import {
  createSafeUndiciAgent,
  isIpv4Blocked,
  isIpv6Blocked,
  isPrivateOrLocalAddress,
  parseIpv4,
  parseIpv6,
  resolveSafeHostAddress,
  safeGetLinkPreview,
} from '../../src/utils/safe-url-preview';

test('identifies loopback, link-local, cloud metadata, carrier-grade NAT and RFC1918 private IPv4 addresses', () => {
  // Loopback (127.0.0.0/8)
  assert.equal(isPrivateOrLocalAddress('127.0.0.1'), true);
  assert.equal(isPrivateOrLocalAddress('127.1.2.3'), true);
  assert.equal(isPrivateOrLocalAddress('127.255.255.255'), true);

  // Current network (0.0.0.0/8)
  assert.equal(isPrivateOrLocalAddress('0.0.0.0'), true);
  assert.equal(isPrivateOrLocalAddress('0.1.2.3'), true);

  // RFC 1918 Class A (10.0.0.0/8)
  assert.equal(isPrivateOrLocalAddress('10.0.0.1'), true);
  assert.equal(isPrivateOrLocalAddress('10.255.255.255'), true);

  // RFC 1918 Class B (172.16.0.0/12)
  assert.equal(isPrivateOrLocalAddress('172.16.0.1'), true);
  assert.equal(isPrivateOrLocalAddress('172.31.255.255'), true);
  assert.equal(isPrivateOrLocalAddress('172.15.255.255'), false);
  assert.equal(isPrivateOrLocalAddress('172.32.0.1'), false);

  // RFC 1918 Class C (192.168.0.0/16)
  assert.equal(isPrivateOrLocalAddress('192.168.0.1'), true);
  assert.equal(isPrivateOrLocalAddress('192.168.1.1'), true);
  assert.equal(isPrivateOrLocalAddress('192.168.255.255'), true);

  // Link-local / Cloud metadata (169.254.0.0/16)
  assert.equal(isPrivateOrLocalAddress('169.254.169.254'), true);
  assert.equal(isPrivateOrLocalAddress('169.254.1.1'), true);

  // Carrier-grade NAT (100.64.0.0/10)
  assert.equal(isPrivateOrLocalAddress('100.64.0.1'), true);
  assert.equal(isPrivateOrLocalAddress('100.127.255.255'), true);
  assert.equal(isPrivateOrLocalAddress('100.63.255.255'), false);
  assert.equal(isPrivateOrLocalAddress('100.128.0.1'), false);

  // IETF and documentation test networks
  assert.equal(isPrivateOrLocalAddress('192.0.0.1'), true);
  assert.equal(isPrivateOrLocalAddress('192.0.2.1'), true); // TEST-NET-1
  assert.equal(isPrivateOrLocalAddress('198.18.0.1'), true); // Benchmark
  assert.equal(isPrivateOrLocalAddress('198.19.255.255'), true);
  assert.equal(isPrivateOrLocalAddress('198.51.100.1'), true); // TEST-NET-2
  assert.equal(isPrivateOrLocalAddress('203.0.113.1'), true); // TEST-NET-3

  // Multicast & Reserved
  assert.equal(isPrivateOrLocalAddress('224.0.0.1'), true);
  assert.equal(isPrivateOrLocalAddress('239.255.255.255'), true);
  assert.equal(isPrivateOrLocalAddress('240.0.0.1'), true);
  assert.equal(isPrivateOrLocalAddress('255.255.255.255'), true);

  // Valid public addresses
  assert.equal(isPrivateOrLocalAddress('8.8.8.8'), false);
  assert.equal(isPrivateOrLocalAddress('1.1.1.1'), false);
  assert.equal(isPrivateOrLocalAddress('104.16.132.229'), false);
});

test('identifies loopback, link-local, ULA, multicast, 6to4, NAT64 and IPv4-mapped IPv6 addresses', () => {
  // Unspecified & Loopback
  assert.equal(isPrivateOrLocalAddress('::'), true);
  assert.equal(isPrivateOrLocalAddress('::1'), true);
  assert.equal(isPrivateOrLocalAddress('[::1]'), true);

  // Link-local unicast (fe80::/10 -> fe80..febf)
  assert.equal(isPrivateOrLocalAddress('fe80::1'), true);
  assert.equal(isPrivateOrLocalAddress('fe90::1'), true);
  assert.equal(isPrivateOrLocalAddress('fea0::1'), true);
  assert.equal(isPrivateOrLocalAddress('feb0::1'), true);
  assert.equal(isPrivateOrLocalAddress('febf:ffff::1'), true);

  // Unique local addresses (fc00::/7 -> fc00..fdff)
  assert.equal(isPrivateOrLocalAddress('fc00::1'), true);
  assert.equal(isPrivateOrLocalAddress('fd12:3456::1'), true);

  // Multicast (ff00::/8)
  assert.equal(isPrivateOrLocalAddress('ff02::1'), true);
  assert.equal(isPrivateOrLocalAddress('ff05::2'), true);

  // Discard prefix & Documentation
  assert.equal(isPrivateOrLocalAddress('100::1'), true);
  assert.equal(isPrivateOrLocalAddress('2001:db8::1'), true);

  // IPv4-mapped IPv6 (dotted)
  assert.equal(isPrivateOrLocalAddress('::ffff:127.0.0.1'), true);
  assert.equal(isPrivateOrLocalAddress('::ffff:169.254.169.254'), true);
  assert.equal(isPrivateOrLocalAddress('::ffff:10.0.0.1'), true);
  assert.equal(isPrivateOrLocalAddress('::ffff:192.168.1.1'), true);
  assert.equal(isPrivateOrLocalAddress('::ffff:8.8.8.8'), false);

  // IPv4-mapped IPv6 (hex representation)
  assert.equal(isPrivateOrLocalAddress('::ffff:7f00:1'), true); // 127.0.0.1
  assert.equal(isPrivateOrLocalAddress('::ffff:a9fe:a9fe'), true); // 169.254.169.254
  assert.equal(isPrivateOrLocalAddress('::ffff:0808:0808'), false); // 8.8.8.8

  // IPv4-compatible IPv6 (deprecated ::x.x.x.x)
  assert.equal(isPrivateOrLocalAddress('::127.0.0.1'), true);
  assert.equal(isPrivateOrLocalAddress('::8.8.8.8'), false);

  // NAT64 well-known prefix (64:ff9b::/96)
  assert.equal(isPrivateOrLocalAddress('64:ff9b::127.0.0.1'), true);
  assert.equal(isPrivateOrLocalAddress('64:ff9b::8.8.8.8'), false);

  // 6to4 prefix (2002::/16)
  assert.equal(isPrivateOrLocalAddress('2002:7f00:0001::'), true); // 127.0.0.1
  assert.equal(isPrivateOrLocalAddress('2002:0808:0808::'), false); // 8.8.8.8

  // Public IPv6
  assert.equal(isPrivateOrLocalAddress('2606:4700:4700::1111'), false);
  assert.equal(isPrivateOrLocalAddress('2001:4860:4860::8888'), false);
});

test('resolveSafeHostAddress rejects local hostnames, wildcard rebinding domains and private IP destinations', async () => {
  await assert.rejects(() => resolveSafeHostAddress('http://localhost'), /disallowed hostname/);
  await assert.rejects(() => resolveSafeHostAddress('http://internal.service.local'), /disallowed hostname/);
  await assert.rejects(() => resolveSafeHostAddress('http://app.internal'), /disallowed hostname/);
  await assert.rejects(() => resolveSafeHostAddress('http://router.lan'), /disallowed hostname/);
  await assert.rejects(() => resolveSafeHostAddress('http://gateway.home.arpa'), /disallowed hostname/);
  await assert.rejects(() => resolveSafeHostAddress('http://127.0.0.1.nip.io'), /disallowed hostname/);
  await assert.rejects(() => resolveSafeHostAddress('http://169.254.169.254.sslip.io'), /disallowed hostname/);

  // Direct IP rejection
  await assert.rejects(() => resolveSafeHostAddress('http://127.0.0.1:8080'), /private IP address/);
  await assert.rejects(() => resolveSafeHostAddress('http://169.254.169.254/latest/meta-data'), /private IP address/);
  await assert.rejects(() => resolveSafeHostAddress('http://[::1]:3000'), /private IP address/);

  // Protocol validation
  await assert.rejects(() => resolveSafeHostAddress('ftp://example.test'), /Invalid protocol/);
  await assert.rejects(() => resolveSafeHostAddress('file:///etc/passwd'), /Invalid protocol/);
  await assert.rejects(() => resolveSafeHostAddress('gopher://127.0.0.1:70'), /Invalid protocol/);
});

test('createSafeUndiciAgent blocks connections to loopback and private servers at socket connect layer', async () => {
  let serverHits = 0;
  const server = http.createServer((_req, res) => {
    serverHits++;
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('INTERNAL_DATA');
  });

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  const port = (server.address() as any).port;

  try {
    const agent = createSafeUndiciAgent();

    // Direct loopback IP fetch attempt
    await assert.rejects(
      () => fetch(`http://127.0.0.1:${port}/sensitive`, { dispatcher: agent }),
      (err: any) => err.message.includes('fetch failed'),
    );

    // Localhost fetch attempt
    await assert.rejects(
      () => fetch(`http://localhost:${port}/sensitive`, { dispatcher: agent }),
      (err: any) => err.message.includes('fetch failed'),
    );

    // Zero requests reached the internal HTTP server
    assert.equal(serverHits, 0);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

test('safeGetLinkPreview returns undefined without throwing when given a loopback or private URL', async () => {
  const result = await safeGetLinkPreview('http://127.0.0.1:8080');
  assert.equal(result, undefined);

  const localResult = await safeGetLinkPreview('http://localhost:3000');
  assert.equal(localResult, undefined);

  const metadataResult = await safeGetLinkPreview('http://169.254.169.254');
  assert.equal(metadataResult, undefined);

  const rebindingResult = await safeGetLinkPreview('http://127.0.0.1.nip.io');
  assert.equal(rebindingResult, undefined);
});

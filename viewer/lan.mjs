// What the viewer prints when it runs with --lan: the addresses other devices
// on the same network (a phone on the same Wi-Fi) can open it at, and the
// warning that comes with them. See server.mjs.

import os from 'node:os';

// This machine's addresses that other devices on its networks can reach:
// IPv4, not loopback, not link-local (169.254.x.x, which a machine gives
// itself when no network gave it an address).
export function networkAddresses(interfaces = os.networkInterfaces()) {
  return Object.entries(interfaces).flatMap(([name, list]) => (list || [])
    .filter((i) => i.family === 'IPv4' && !i.internal && !i.address.startsWith('169.254.'))
    .map((i) => ({ name, address: i.address })));
}

// The lines printed under the address for this machine. `at(host)` gives the
// full address on that host.
export function lanLines(at, interfaces) {
  const others = networkAddresses(interfaces);
  const lines = others.map(({ name, address }) => `from a phone or another device on the same network (${name}): ${at(address)}`);
  if (!others.length) lines.push('from another device: none, this machine has no network address right now (is Wi-Fi on?)');
  lines.push('warning: --lan is on, so anyone on the same network can read every board shown here, without a password');
  return lines;
}

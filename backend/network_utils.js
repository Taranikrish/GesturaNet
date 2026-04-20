const os = require('os');

/**
 * Finds the first non-internal IPv4 address of the host machine.
 * This is the secure, native replacement for the 'ip' package.
 */
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  const addresses = [];

  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if ((iface.family === 'IPv4' || iface.family === 4) && !iface.internal) {
        addresses.push(iface.address);
      }
    }
  }

  // Prioritize 192.168.x.x (Common Home/Office LAN)
  const lan = addresses.find(addr => addr.startsWith('192.168.'));
  if (lan) return lan;

  // Prioritize 10.x.x.x (Common Corporate LAN)
  const corp = addresses.find(addr => addr.startsWith('10.'));
  if (corp) return corp;

  // Prioritize 172.x.x.x (Common Private LAN)
  const pvt = addresses.find(addr => addr.startsWith('172.'));
  if (pvt) return pvt;

  return addresses[0] || '127.0.0.1';
}

module.exports = { getLocalIP };

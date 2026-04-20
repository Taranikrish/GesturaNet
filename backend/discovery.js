const dgram = require('dgram');
const ip = require('./network_utils'); // Native secure IP helper
const chalk = require('./colors'); // Native secure color helper

const DISCOVERY_PORT = 41234;
const BROADCAST_ADDR = '255.255.255.255';
const HEARTBEAT_INTERVAL = 5000;
const PEER_TTL = 30000;

class Discovery {
  constructor(deviceName, serverPort) {
    this.name = deviceName;
    this.port = serverPort;
    this.ip = ip.getLocalIP(); // Uses native os module
    this.peers = new Map(); // name -> { name, ip, port, lastSeen }
    
    this.socket = dgram.createSocket('udp4');
  }

  start() {
    this.socket.on('message', (msg, rinfo) => {
      try {
        const data = JSON.parse(msg.toString());
        if (data.type === 'ANNOUNCE' && (data.ip !== this.ip || data.port !== this.port)) {
          const peerKey = data.name;
          this.peers.set(peerKey, {
            name: data.name,
            ip: rinfo.address, // Use the actual reachable source IP instead of the self-reported one
            port: data.port,
            lastSeen: Date.now()
          });
        }
      } catch (e) {
        // Ignore non-JSON or malformed packets
      }
    });

    this.socket.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.warn(chalk.yellow(`[Discovery] Port ${DISCOVERY_PORT} busy (Normal for Simulation). Listening for broadcasts only.`));
      } else {
        console.error(chalk.red(`[Discovery] UDP Error: ${err.message}`));
      }
    });

    this.socket.on('listening', () => {
      try {
        this.socket.setBroadcast(true);
        const address = this.socket.address();
        console.log(chalk.blue(`[Discovery] Listening on UDP ${address.port}`));
      } catch (e) {
        // Broadcast set failed but listener is still active
      }
    });

    // Try to bind normally. If blocked (EADDRINUSE), node will still send heartbeats.
    this.socket.bind({ port: DISCOVERY_PORT, exclusive: false });

    // Start broadcasting heartbeat
    setInterval(() => this.broadcast(), HEARTBEAT_INTERVAL);

    // Cleanup stale peers
    setInterval(() => this.cleanup(), 5000);
  }

  broadcast() {
    const payload = JSON.stringify({
      type: 'ANNOUNCE',
      name: this.name,
      ip: this.ip,
      port: this.port
    });

    this.socket.send(payload, 0, payload.length, DISCOVERY_PORT, BROADCAST_ADDR);
  }

  cleanup() {
    const now = Date.now();
    for (const [key, peer] of this.peers.entries()) {
      if (now - peer.lastSeen > PEER_TTL) {
        this.peers.delete(key);
        console.log(chalk.yellow(`[Discovery] Peer ${peer.name} (${peer.ip}:${peer.port}) went offline`));
      }
    }
  }

  getPeers() {
    return Array.from(this.peers.values());
  }
}

module.exports = Discovery;

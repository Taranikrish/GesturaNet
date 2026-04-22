/**
 * GesturaNet Unified Backend (Node.js 22.x)
 * Gesture engine bridge is preserved but disconnected —
 * connectToEngine() is called only when gesture mode is enabled.
 */

const express = require('express');
const http = require('http');
const { WebSocketServer, WebSocket } = require('ws');
const cors = require('cors');
const os = require('os');
const path = require('path');
const crypto = require('node:crypto');
const Busboy = require('busboy');

const ip = require('./network_utils');
const chalk = require('./colors');

try { process.loadEnvFile(); } catch (e) { /* .env optional */ }

const Discovery = require('./discovery');
const Handshake = require('./handshake');
const Transfer = require('./transfer');
const Progress = require('./progress');
const Resume = require('./resume');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;
const DEVICE_NAME = process.env.DEVICE_NAME || os.hostname();

app.use(cors());
app.use(express.json());

// ── GESTURE ENGINE BRIDGE (preserved, dormant) ────────────────────────────────
let engineSocket = null;
let lastEngineState = { gesture: 'none', active: false, fps: 5, cursor_x: 0, cursor_y: 0, scroll_delta: 0, timestamp: 0 };

function connectToEngine() {
  const ENGINE_WS = process.env.ENGINE_WS || 'ws://localhost:8765';
  console.log(chalk.yellow(`[Bridge] Connecting to Python engine at ${ENGINE_WS}...`));
  engineSocket = new WebSocket(ENGINE_WS);
  engineSocket.on('open', () => { console.log(chalk.green('[Bridge] Connected ✓')); broadcastToClients({ type: 'engine_connected' }); });
  engineSocket.on('message', (data) => { try { const s = JSON.parse(data.toString()); lastEngineState = { ...s, gesture: 'none' }; broadcastToClients({ type: 'gesture_state', ...s }); } catch (e) {} });
  engineSocket.on('close', () => { console.log(chalk.red('[Bridge] Disconnected. Retrying in 3s...')); broadcastToClients({ type: 'engine_disconnected' }); setTimeout(connectToEngine, 3000); });
  engineSocket.on('error', (err) => { console.error('[Bridge] Error:', err.message); });
}

function sendToEngine(cmd) {
  if (engineSocket?.readyState === WebSocket.OPEN) { engineSocket.send(JSON.stringify(cmd)); return true; }
  return false;
}

const wss = new WebSocketServer({ server, path: '/ws' });
const frontendClients = new Set();

wss.on('connection', (ws) => {
  frontendClients.add(ws);
  ws.send(JSON.stringify({
    type: 'init',
    engineConnected: !!(engineSocket && engineSocket.readyState === WebSocket.OPEN),
    state: lastEngineState
  }));
  ws.on('message', (data) => { 
    try { 
      const cmd = JSON.parse(data.toString()); 
      if (cmd.action === 'handshake_response') {
        Handshake.resolveRequest(cmd.requestId, cmd.accepted);
      } else if (['enable','disable','camera_on','camera_off','set_smoothing','set_sensitivity','set_camera'].includes(cmd.action)) {
        sendToEngine(cmd); 
      }
    } catch (e) {} 
  });
  ws.on('close', () => frontendClients.delete(ws));
});

function broadcastToClients(msg) {
  const data = JSON.stringify(msg);
  frontendClients.forEach(ws => { if (ws.readyState === WebSocket.OPEN) ws.send(data); });
}

// ── P2P FILE SHARING ──────────────────────────────────────────────────────────
const discovery = new Discovery(DEVICE_NAME, PORT);
// discovery.start() moved inside startServer callback to ensure correct PORT is shared


app.get('/', (req, res) => {
  res.send(`
    <div style="background:#0a0f14;color:#94ccff;height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:sans-serif;">
      <h1 style="border-bottom:1px solid #30353b;padding-bottom:10px;">GESTRUA NET NODE</h1>
      <p>Device: <b>${DEVICE_NAME}</b></p>
      <p style="color:#66d9cc;">Status: <b>ACTIVE</b></p>
      <p style="font-size:12px;color:#8f9195;">Handshake ready for LAN File Sharing</p>
    </div>
  `);
});

app.get('/peers', (req, res) => res.json(discovery.getPeers()));

app.post('/receive-request', (req, res) => {
  Handshake.handleReceiveRequest(req, res, broadcastToClients);
});

app.get('/upload/:transferId/status', (req, res) => {
  res.json(Resume.getTransferStatus(req.params.transferId, Handshake.getTransfers()));
});

app.post('/upload/:transferId', (req, res) => {
  Transfer.handleUpload(req.params.transferId, req, res, Handshake.getTransfers());
});

app.get('/progress/:transferId', (req, res) => {
  const status = Progress.getStatus(req.params.transferId);
  res.json(status || { error: 'Not found' });
});

// ── NATIVE DISPATCH FROM PYTHON ────────────────────────────────────────────────
app.post('/native-dispatch', (req, res) => {
  const { filePath } = req.body;
  if (!filePath) return res.status(400).json({ error: 'Missing filePath' });

  const fs = require('fs');
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found on disk' });

  const stats = fs.statSync(filePath);
  if (!stats.isFile()) return res.status(400).json({ error: 'Not a file' });

  const fileName = path.basename(filePath);
  const fileSize = stats.size;
  const peers = discovery.getPeers();

  if (peers.length === 0) {
    console.log(chalk.red(`[NativeDispatch] No peers available for ${fileName}`));
    return res.status(400).json({ error: 'No peers found' });
  }

  console.log(chalk.green(`[NativeDispatch] Broadcasting ${fileName} to ${peers.length} peers...`));
  
  // Inform UI just in case
  broadcastToClients({ type: 'info_toast', message: `Native Dispatch: Sending ${fileName} to peers...` });

  for (const peer of peers) {
    Handshake.sendHandshake(
      { ip: peer.ip, port: peer.port },
      {
        fileName,
        fileSize,
        mimeType: 'application/octet-stream',
        senderIp: ip.getLocalIP(),
        senderPort: PORT,
        hash: 'pending'
      }
    ).then(async (result) => {
      if (result.status === 'accepted') {
        const stream = fs.createReadStream(filePath);
        const hasher = crypto.createHash('sha256');
        try {
          await Transfer.sendRawStream(peer.ip, peer.port, result.transferId, stream, fileSize, hasher);
          console.log(chalk.green(`[NativeDispatch] Sent ${fileName} to ${peer.ip}`));
        } catch(e) {
          console.error(chalk.red(`[NativeDispatch] Transfer error: ${e.message}`));
        }
      }
    }).catch(e => console.error(chalk.red(`[NativeDispatch] Handshake failed: ${e.message}`)));
  }

  res.json({ status: 'dispatching', fileName, peers: peers.length });
});

// ── RELAY PUSH ────────────────────────────────────────────────────────────────
app.post('/relay-push/:targetIp/:targetPort', (req, res) => {
  const { targetIp, targetPort } = req.params;
  const contentLength = parseInt(req.headers['content-length'] || '0', 10);
  const busboy = Busboy({ headers: req.headers });

  busboy.on('error', (err) => {
    console.error(chalk.red(`[Relay] Busboy error: ${err.message}`));
    if (!res.headersSent) res.status(500).json({ error: err.message });
  });

  busboy.on('file', (fieldName, file, info) => {
    const { filename, mimeType } = info;
    const hasher = crypto.createHash('sha256');

    file.pause();
    console.log(chalk.blue(`[Relay] Browser wants to send "${filename}" to ${targetIp}:${targetPort}`));

    Handshake.sendHandshake(
      { ip: targetIp, port: targetPort },
      {
        fileName: filename,
        fileSize: contentLength,
        mimeType,
        senderIp: ip.getLocalIP(),
        senderPort: PORT,
        hash: 'pending'
      }
    ).then(async (handshakeResult) => {
      if (handshakeResult.status !== 'accepted') {
        file.resume();
        if (!res.headersSent) return res.status(403).json({ status: 'rejected' });
        return;
      }

      file.resume();

      // sendRawStream — sends plain bytes (no multipart wrapping)
      // prevents double-wrapping the browser's multipart upload which corrupts files
      const uploadResult = await Transfer.sendRawStream(
        targetIp,
        targetPort,
        handshakeResult.transferId,
        file,
        contentLength,
        hasher
      );

      const finalHash = hasher.digest('hex');
      console.log(chalk.green(`[Relay] Done: ${filename} | Hash: ${finalHash.substring(0, 12)}...`));
      if (!res.headersSent) res.json({ status: uploadResult.status || 'completed', hash: finalHash });

    }).catch(err => {
      console.error(chalk.red(`[Relay] Error: ${err.message}`));
      if (!res.headersSent) res.status(500).json({ status: 'error', message: err.message });
    });
  });

  req.pipe(busboy);
});

// ── START ─────────────────────────────────────────────────────────────────────
const startServer = (portToTry) => {
  server.listen(portToTry, '0.0.0.0', () => {
    const localIP = ip.getLocalIP();
    console.log(chalk.cyan('\n========================================'));
    console.log(chalk.green('  GESTRUA NET UNIFIED NODE ACTIVE'));
    console.log(chalk.whiteBright(`  Device : ${DEVICE_NAME}`));
    console.log(chalk.whiteBright(`  URL    : http://localhost:${portToTry}`));
    console.log(chalk.cyan('========================================\n'));

    // Update discovery with the actual bound port
    discovery.port = portToTry;
    discovery.start();
    
    connectToEngine();
  }).on('error', (err) => {
    if (err.code === 'EADDRINUSE' && portToTry < 5005) {
      console.warn(chalk.yellow(`[Server] Port ${portToTry} in use, trying ${portToTry + 1}...`));
      startServer(portToTry + 1);
    } else {
      console.error(chalk.red(`[Server] Error: ${err.message}`));
    }
  });
};

startServer(PORT);

setInterval(() => {
  const peers = discovery.getPeers();
  if (peers.length > 0)
    console.log(chalk.gray(`[Network] Peers: ${peers.map(p => `${p.name}(${p.ip})`).join(', ')}`));
}, 10000);
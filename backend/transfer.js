const fs = require('fs');
const path = require('path');
const Busboy = require('busboy');
const { request } = require('undici');
const { Readable } = require('stream');
const chalk = require('./colors');
const Integrity = require('./integrity');
const Progress = require('./progress');
const os = require('os');

const RECEIVED_DIR = path.join(os.homedir(), 'Downloads');

const Transfer = {

  // ── RECEIVER ─────────────────────────────────────────────────────────────
  // Handles both:
  //   - multipart/form-data      (device-to-device direct send)
  //   - application/octet-stream (relay push — raw bytes, no double-wrap)
  handleUpload: (transferId, req, res, transfersMap) => {
    const transfer = transfersMap.get(transferId);
    if (!transfer) return res.status(404).json({ error: 'Transfer session not found' });

    if (!fs.existsSync(RECEIVED_DIR)) fs.mkdirSync(RECEIVED_DIR, { recursive: true });

    const savePath = path.join(RECEIVED_DIR, transfer.fileName);
    const startBytes = fs.existsSync(savePath) ? fs.statSync(savePath).size : 0;
    const writeStream = fs.createWriteStream(savePath, { flags: startBytes > 0 ? 'a' : 'w' });

    if (startBytes > 0) console.log(chalk.yellow(`[Transfer] Resuming from byte ${startBytes}`));

    const contentType = req.headers['content-type'] || '';

    // ── RAW binary path (relay) ─────────────────────────────────────────────
    if (contentType.includes('application/octet-stream')) {
      let bytesReceived = startBytes;

      req.on('data', (chunk) => {
        bytesReceived += chunk.length;
        transfer.bytesReceived = bytesReceived;
        Progress.update(transferId, bytesReceived, transfer.fileSize, 'Receiving');
      });

      req.pipe(writeStream);

      writeStream.on('finish', async () => {
        console.log(chalk.blue(`\n[Transfer] Stream complete — verifying ${transfer.fileName}...`));
        const result = await Integrity.verifyHash(savePath, transfer.hash);
        if (result.verified) {
          transfer.status = 'completed';
          transfer.computedHash = result.computed;
          console.log(chalk.green(`[Transfer] Saved to: ${savePath}`));
          if (!res.headersSent) res.json({ status: 'completed', path: savePath, hash: result.computed });
        } else {
          try { fs.unlinkSync(savePath); } catch (_) {}
          transfer.status = 'failed';
          if (!res.headersSent) res.status(400).json({ status: 'failed', error: 'Hash mismatch — file deleted' });
        }
      });

      writeStream.on('error', (err) => {
        console.error(chalk.red(`[Transfer] Write error: ${err.message}`));
        if (!res.headersSent) res.status(500).json({ error: err.message });
      });

      return; // don't fall through to busboy
    }

    // ── MULTIPART path (device-to-device) ───────────────────────────────────
    const busboy = Busboy({ headers: req.headers });

    busboy.on('error', (err) => {
      console.error(chalk.red(`[Transfer] Busboy error: ${err.message}`));
      if (!res.headersSent) res.status(500).json({ error: err.message });
    });

    busboy.on('file', (fieldName, file, info) => {
      let bytesReceived = startBytes;

      file.on('data', (chunk) => {
        bytesReceived += chunk.length;
        transfer.bytesReceived = bytesReceived;
        Progress.update(transferId, bytesReceived, transfer.fileSize, 'Receiving');
      });

      file.on('error', (err) => {
        console.error(chalk.red(`[Transfer] File stream error: ${err.message}`));
        if (!res.headersSent) res.status(500).json({ error: err.message });
      });

      file.pipe(writeStream);

      writeStream.on('finish', async () => {
        console.log(chalk.blue(`\n[Transfer] Stream complete — verifying ${transfer.fileName}...`));
        const result = await Integrity.verifyHash(savePath, transfer.hash);
        if (result.verified) {
          transfer.status = 'completed';
          transfer.computedHash = result.computed;
          console.log(chalk.green(`[Transfer] Saved to: ${savePath}`));
          if (!res.headersSent) res.json({ status: 'completed', path: savePath, hash: result.computed });
        } else {
          try { fs.unlinkSync(savePath); } catch (_) {}
          transfer.status = 'failed';
          if (!res.headersSent) res.status(400).json({ status: 'failed', error: 'Hash mismatch — file deleted' });
        }
      });

      writeStream.on('error', (err) => {
        console.error(chalk.red(`[Transfer] Write error: ${err.message}`));
        if (!res.headersSent) res.status(500).json({ error: err.message });
      });
    });

    req.pipe(busboy);
  },

  // ── SENDER (device-to-device) ─────────────────────────────────────────────
  sendFile: async (receiverIp, receiverPort, transferId, source, fileSize = 0, resumeFrom = 0, optionalHasher = null) => {
    try {
      const uploadUrl = `http://${receiverIp}:${receiverPort}/upload/${transferId}`;

      const readStream = typeof source === 'string'
        ? fs.createReadStream(source, resumeFrom > 0 ? { start: resumeFrom } : {})
        : source;

      const boundary = 'GesturaNetBoundary' + Math.random().toString(36).substring(2, 9);
      const prefix = Buffer.from(
        `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="file"; filename="upload"\r\n` +
        `Content-Type: application/octet-stream\r\n\r\n`
      );
      const suffix = Buffer.from(`\r\n--${boundary}--\r\n`);

      let bytesSent = resumeFrom;

      const combinedStream = Readable.from((async function* () {
        yield prefix;
        for await (const chunk of readStream) {
          if (optionalHasher) optionalHasher.update(chunk);
          bytesSent += chunk.length;
          Progress.update(transferId, bytesSent, fileSize, 'Sending');
          yield chunk;
        }
        yield suffix;
      })());

      const { statusCode, body } = await request(uploadUrl, {
        method: 'POST',
        headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` },
        body: combinedStream
      });

      const responseData = await body.json();
      if (statusCode === 200) return responseData;
      throw new Error(`Transfer failed: HTTP ${statusCode} — ${JSON.stringify(responseData)}`);
    } catch (e) {
      console.error(chalk.red('[Sender] Error:'), e.message);
      return { status: 'error', message: e.message };
    }
  },

  // ── RELAY SENDER ──────────────────────────────────────────────────────────
  // Buffers the busboy stream then sends as raw octet-stream.
  // Why buffer: busboy streams are unreliable as async iterators after
  // pause/resume — async generator sees an ended stream and sends 0 bytes.
  // Why no Transfer-Encoding header: undici sets it automatically;
  // setting it manually causes "invalid transfer-encoding" error.
  sendRawStream: async (receiverIp, receiverPort, transferId, stream, fileSize = 0, hasher = null) => {
    try {
      const uploadUrl = `http://${receiverIp}:${receiverPort}/upload/${transferId}`;
      let bytesSent = 0;

      const chunks = [];
      await new Promise((resolve, reject) => {
        stream.on('data', (chunk) => {
          if (hasher) hasher.update(chunk);
          bytesSent += chunk.length;
          Progress.update(transferId, bytesSent, fileSize, 'Sending');
          chunks.push(chunk);
        });
        stream.on('end', resolve);
        stream.on('error', reject);
      });

      const buffer = Buffer.concat(chunks);
      console.log(chalk.gray(`[Relay Sender] Buffered ${buffer.length} bytes — sending...`));

      const { statusCode, body } = await request(uploadUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/octet-stream',
          'Content-Length': String(buffer.length)
        },
        body: buffer
      });

      const responseData = await body.json();
      if (statusCode === 200) return responseData;
      throw new Error(`HTTP ${statusCode} — ${JSON.stringify(responseData)}`);
    } catch (e) {
      console.error(chalk.red('[Relay Sender] Error:'), e.message);
      return { status: 'error', message: e.message };
    }
  }
};

module.exports = Transfer;
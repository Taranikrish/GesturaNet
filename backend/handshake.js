const crypto = require('node:crypto');
const readline = require('readline');
const chalk = require('./colors');
const { fetch } = require('undici');

// Store active/pending transfers in memory
const transfers = new Map();

const pendingRequests = new Map(); // requestId -> resolve function

const Handshake = {
  handleReceiveRequest: async (req, res, broadcastToClients) => {
    const { fileName, fileSize, mimeType, senderIp, senderPort, hash } = req.body;

    if (!fileName || !senderIp || !senderPort) {
      return res.status(400).json({ status: 'rejected', reason: 'Missing required fields' });
    }

    const sizeMB = fileSize > 0
      ? `${(fileSize / (1024 * 1024)).toFixed(2)} MB`
      : 'Unknown size';

    console.log('\n' + chalk.cyan('----------------------------------------'));
    console.log(chalk.yellow(`Incoming file : ${fileName}`));
    console.log(chalk.gray(`Size          : ${sizeMB}`));
    console.log(chalk.gray(`From          : ${senderIp}:${senderPort}`));
    console.log(chalk.cyan('----------------------------------------'));

    const requestId = crypto.randomUUID();
    
    const resultPromise = new Promise((resolve) => {
      pendingRequests.set(requestId, resolve);
    });

    if (broadcastToClients) {
      broadcastToClients({
        type: 'file_receive_request',
        requestId,
        fileName,
        fileSize,
        senderIp,
        senderPort
      });
      console.log(chalk.gray('[Handshake] Waiting for UI to accept/reject...'));
    }

    // Auto-timeout after 60s
    setTimeout(() => {
      if (pendingRequests.has(requestId)) {
        console.log(chalk.red('[Handshake] Request timed out.'));
        const resolve = pendingRequests.get(requestId);
        pendingRequests.delete(requestId);
        resolve(false);
      }
    }, 60000);

    const accepted = await resultPromise;

    if (accepted) {
      const transferId = crypto.randomUUID();
      transfers.set(transferId, {
        id: transferId,
        fileName,
        fileSize,
        mimeType,
        senderIp,
        senderPort,
        hash,
        status: 'accepted',
        bytesReceived: 0,
        startTime: Date.now()
      });

      console.log(chalk.green(`[Handshake] Accepted — ID: ${transferId}`));
      return res.json({ status: 'accepted', uploadUrl: `/upload/${transferId}`, transferId });
    } else {
      console.log(chalk.red('[Handshake] Rejected.'));
      return res.json({ status: 'rejected' });
    }
  },

  resolveRequest: (requestId, accepted) => {
    if (pendingRequests.has(requestId)) {
      const resolve = pendingRequests.get(requestId);
      pendingRequests.delete(requestId);
      resolve(accepted);
    }
  },

  acceptAnyPending: () => {
    let acceptedCount = 0;
    for (const [requestId, resolve] of pendingRequests.entries()) {
      resolve(true);
      pendingRequests.delete(requestId);
      acceptedCount++;
    }
    return acceptedCount;
  },

  sendHandshake: async (receiverPeer, fileMetadata) => {
    try {
      const url = `http://${receiverPeer.ip}:${receiverPeer.port}/receive-request`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fileMetadata)
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (e) {
      console.error(chalk.red('[Handshake] Error:'), e.message);
      return { status: 'error', message: e.message };
    }
  },

  getTransfers: () => transfers,
  getTransfer: (id) => transfers.get(id)
};

module.exports = Handshake;
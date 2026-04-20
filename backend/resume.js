const fs = require('fs');
const path = require('path');
const chalk = require('./colors'); // Native color helper

const Resume = {
  // Check how much of a file has already been received
  getTransferStatus: (transferId, transfersMap) => {
    const transfer = transfersMap.get(transferId);
    if (!transfer) return { status: 'none', bytesReceived: 0 };
    
    // We check the physical file size on the receiver's disk
    const savePath = path.join(process.cwd(), 'received_files', transfer.fileName);
    
    if (fs.existsSync(savePath)) {
      const stats = fs.statSync(savePath);
      console.log(chalk.yellow(`[Resume] Found partial file: ${stats.size} bytes`));
      return { 
        status: 'partial',
        bytesReceived: stats.size,
        fileName: transfer.fileName 
      };
    }
    
    return { status: 'new', bytesReceived: 0 };
  }
};

module.exports = Resume;







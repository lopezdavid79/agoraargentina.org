const fs = require('fs');
const path = require('path');

const LOG_DIR = path.join(__dirname, '..', 'logs');
const LOG_FILE = path.join(LOG_DIR, 'app.log');

// Ensure logs directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

const logStream = fs.createWriteStream(LOG_FILE, { flags: 'a' });

function timestamp() {
  return new Date().toISOString();
}

const logger = {
  info: (...args) => {
    const msg = `[${timestamp()}] [INFO] ${args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' ')}`;
    console.log(msg);
    logStream.write(msg + '\n');
  },
  error: (...args) => {
    const msg = `[${timestamp()}] [ERROR] ${args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : a).join(' ')}`;
    console.error(msg);
    logStream.write(msg + '\n');
  },
  warn: (...args) => {
    const msg = `[${timestamp()}] [WARN] ${args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' ')}`;
    console.warn(msg);
    logStream.write(msg + '\n');
  }
};

module.exports = logger;

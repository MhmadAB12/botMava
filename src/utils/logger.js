const fs = require('fs');
const path = require('path');

const logDir = path.join(__dirname, '../../logs');
const logFile = path.join(logDir, 'bot.log');

if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

function write(level, message) {
  const line = `[${new Date().toISOString()}] ${level}: ${message}\n`;
  fs.appendFileSync(logFile, line);
  console.log(line.trim());
}

module.exports = {
  info: (msg) => write('INFO', msg),
  error: (msg) => write('ERROR', msg),
  warn: (msg) => write('WARN', msg)
};

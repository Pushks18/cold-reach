const net = require('net');
const dns = require('dns').promises;

function parseSmtpResponse(line) {
  return line.startsWith('250');
}

function buildMxDomain(email) {
  return email.split('@')[1];
}

async function getMxHost(domain) {
  try {
    const records = await dns.resolveMx(domain);
    records.sort((a, b) => a.priority - b.priority);
    return records[0]?.exchange || null;
  } catch {
    return null;
  }
}

function smtpCheck(host, email) {
  return new Promise((resolve) => {
    const socket = net.createConnection(25, host);
    let step = 0;
    let result = false;

    socket.setTimeout(8000);

    const send = (cmd) => socket.write(cmd + '\r\n');

    socket.on('data', (data) => {
      const line = data.toString().trim();
      if (step === 0 && line.startsWith('220')) {
        send('EHLO coldreach.local');
        step++;
      } else if (step === 1 && line.startsWith('250')) {
        send('MAIL FROM:<verify@coldreach.local>');
        step++;
      } else if (step === 2 && line.startsWith('250')) {
        send(`RCPT TO:<${email}>`);
        step++;
      } else if (step === 3) {
        result = parseSmtpResponse(line);
        send('QUIT');
        socket.destroy();
        resolve(result);
      }
    });

    socket.on('timeout', () => { socket.destroy(); resolve(false); });
    socket.on('error', () => resolve(false));
    socket.on('close', () => resolve(result));
  });
}

async function verifyEmail(email) {
  const domain = buildMxDomain(email);
  if (!domain) return false;
  const mxHost = await getMxHost(domain);
  if (!mxHost) return false;
  return smtpCheck(mxHost, email);
}

async function verifyBatch(emails) {
  const results = [];
  for (const email of emails) {
    const valid = await verifyEmail(email);
    if (valid) results.push(email);
  }
  return results;
}

module.exports = { verifyEmail, verifyBatch, parseSmtpResponse, buildMxDomain };

// test-p12-load.js
const fs = require('fs');
const https = require('https');

const pfx = fs.readFileSync('./certs/keystore.p12');

try {
  const agent = new https.Agent({
    pfx,
    passphrase: 'Axis1234@A',
    rejectUnauthorized: false
  });
  console.log('P12 loaded OK');
} catch (e) {
  console.error('Failed to load P12:', e.message);
}

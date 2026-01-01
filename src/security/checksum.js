const crypto = require('crypto');

function buildChecksumString(data) {
  // data is the object mapped under "Data" in body
  const keys = Object.keys(data).filter(k => k !== 'checksum');
  // keep Axis order. If they demand specific ordering, mimic their Java: LinkedHashMap iteration order.[file:1][file:7]
  let concat = '';
  for (const k of keys) {
    const v = data[k];
    if (v === null || v === undefined) continue;
    concat += String(v);
  }
  return concat.trim();
}

function generateChecksum(data) {
  const base = buildChecksumString(data);
  return crypto.createHash('md5').update(base, 'utf8').digest('hex');
}

function verifyChecksum(data) {
  const checksum = data.checksum;
  if (!checksum) return false;
  const calculated = generateChecksum(data);
  return calculated.toLowerCase() === String(checksum).toLowerCase();
}

module.exports = {
  generateChecksum,
  verifyChecksum
};

// src/security/axisAes128.js
const crypto = require('crypto');
const { callback } = require('../config/axisConfig');

// 16‑byte AES‑128 key (from Axis, base64 or hex they share)
// Replace this with your actual key from Axis config:
// const AES_KEY_HEX = process.env.AXIS_CALLBACK_AES_KEY_HEX || '00112233445566778899aabbccddeeff';

const AES_KEY_HEX = (callback.aesKeyHex); // Axis shared secret

// Fixed 16‑byte IV 0x00..0x0f as in Axis Java sample [file:88]
const IV = Buffer.from([
  0x00, 0x01, 0x02, 0x03,
  0x04, 0x05, 0x06, 0x07,
  0x08, 0x09, 0x0a, 0x0b,
  0x0c, 0x0d, 0x0e, 0x0f
]);

function getKeyBuffer() {
  // AES‑128 = 16 bytes
  const key = Buffer.from(AES_KEY_HEX, 'hex');
  if (key.length !== 16) {
    throw new Error('AXIS_CALLBACK_AES_KEY_HEX must be 16 bytes (32 hex chars) for AES‑128');
  }
  return key;
}

// Decrypt hex → JSON string
function decryptHexAes128Cbc(hexCipherText) {
  const key = getKeyBuffer();
  const cipherBuf = Buffer.from(hexCipherText, 'hex');

  const decipher = crypto.createDecipheriv('aes-128-cbc', key, IV);
  let decrypted = decipher.update(cipherBuf, undefined, 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

// Encrypt JSON string → hex (for testing)
function encryptToHexAes128Cbc(plaintext) {
  const key = getKeyBuffer();
  const cipher = crypto.createCipheriv('aes-128-cbc', key, IV);
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
}

module.exports = {
  decryptHexAes128Cbc,
  encryptToHexAes128Cbc
};

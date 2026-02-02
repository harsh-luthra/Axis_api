// src/security/axisAes128Ecb.js
const crypto = require('crypto');
const { callback } = require('../config/axisConfig');

// 16‑byte AES‑128 key (from Axis)
// Example: 32 hex chars → 16 bytes
// Set in env: AXIS_CALLBACK_AES_KEY_HEX
const AES_KEY_HEX = (callback.aesKeyHex); // Axis shared secret

function getKeyBuffer() {
  const key = Buffer.from(AES_KEY_HEX, 'hex');
  if (key.length !== 16) {
    throw new Error('AXIS_CALLBACK_AES_KEY_HEX must be 16 bytes (32 hex chars) for AES‑128');
  }
  return key;
}

// Decrypt HEX cipher → UTF‑8 string, AES‑128‑ECB/PKCS5/PKCS7
function decryptHexAes128Ecb(hexCipherText) {
  const key = getKeyBuffer();
  const cipherBuf = Buffer.from(hexCipherText, 'hex');

  const decipher = crypto.createDecipheriv('aes-128-ecb', key, null);
  // Important: disable auto padding only if bank explicitly says “no padding”.
  // For standard PKCS5/PKCS7 padding, keep auto padding = true (default).
  decipher.setAutoPadding(true);

  let decrypted = decipher.update(cipherBuf, undefined, 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

// Encrypt UTF‑8 string → HEX cipher, AES‑128‑ECB/PKCS5/PKCS7
// (useful for local testing to match bank’s sample)
function encryptToHexAes128Ecb(plaintext) {
  const key = getKeyBuffer();

  const cipher = crypto.createCipheriv('aes-128-ecb', key, null);
  cipher.setAutoPadding(true);

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
}

module.exports = {
  decryptHexAes128Ecb,
  encryptToHexAes128Ecb
};

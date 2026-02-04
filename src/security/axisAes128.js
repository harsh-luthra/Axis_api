// src/security/axisCallbackAes.js
const crypto = require('crypto');
const { callback } = require('../config/axisConfig');

// This MUST be the same key string they configured,
// e.g. "E795C6D2FA3C423598A0BA1D45EB8703" from their sample main(). [file:106]
// const AXIS_CALLBACK_KEY_STRING = process.env.AXIS_CALLBACK_KEY_STRING;
const AXIS_CALLBACK_KEY_STRING = (callback.aesKeyHex); // Axis shared secret

// Derive AES key: MD5(keyString) -> 16 bytes. [file:106]
function getAxisAesKey() {
  if (!AXIS_CALLBACK_KEY_STRING) {
    throw new Error('AXIS_CALLBACK_KEY_STRING not set');
  }
  return crypto.createHash('md5')
    .update(AXIS_CALLBACK_KEY_STRING, 'utf8')
    .digest(); // 16‑byte Buffer
}

// Fixed IV: 00 01 02 ... 0f. [file:106]
const AXIS_IV = Buffer.from([
  0x00, 0x01, 0x02, 0x03,
  0x04, 0x05, 0x06, 0x07,
  0x08, 0x09, 0x0a, 0x0b,
  0x0c, 0x0d, 0x0e, 0x0f
]);

// Decrypt HEX → UTF‑8 JSON string, AES/CBC/PKCS5Padding. [file:106]
function decryptAxisCallbackHex(hexCipherText) {
  const key = getAxisAesKey();

  const cleanHex = hexCipherText.trim();
  const cipherBuf = Buffer.from(cleanHex, 'hex');

  const decipher = crypto.createDecipheriv('aes-128-cbc', key, AXIS_IV);
  decipher.setAutoPadding(true); // PKCS5/PKCS7 (same as Java default) [web:98]

  let decrypted = decipher.update(cipherBuf, undefined, 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

// Optional: local test to match their sample encrypt/decrypt
function encryptAxisCallbackPlain(plaintext) {
  const key = getAxisAesKey();
  const cipher = crypto.createCipheriv('aes-128-cbc', key, AXIS_IV);
  cipher.setAutoPadding(true);

  let enc = cipher.update(plaintext, 'utf8', 'hex');
  enc += cipher.final('hex');
  return enc;
}

module.exports = {
  decryptAxisCallbackHex,
  encryptAxisCallbackPlain
};

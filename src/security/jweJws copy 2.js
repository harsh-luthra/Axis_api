// src/security/jweJws.js
const {
  CompactEncrypt,
  CompactSign,
  compactVerify,
  importPKCS8,
  importSPKI
} = require('jose');
const { TextEncoder, TextDecoder } = require('util');
const { loadKeys } = require('./p12');

let cache = null;

async function loadJoseKeys() {
  if (cache) return cache;
  const { privateKeyPemPkcs8, axisPublicKeyPem } = loadKeys(); // from your P12 loader

  const privateKeyForSign = await importPKCS8(privateKeyPemPkcs8, 'RS256');
  const privateKeyForDecrypt = await importPKCS8(privateKeyPemPkcs8, 'RSA-OAEP-256');

  const publicKeyForEncrypt = await importSPKI(axisPublicKeyPem, 'RSA-OAEP-256');
  const publicKeyForVerify = await importSPKI(axisPublicKeyPem, 'RS256');

  cache = { privateKeyForSign, privateKeyForDecrypt, publicKeyForEncrypt, publicKeyForVerify };
  return cache;
}

// ---- THIS is the function you asked for ----
async function jweEncryptAndSign(payloadObj) {
  const { privateKeyForSign, publicKeyForEncrypt } = await loadJoseKeys();
  const enc = new TextEncoder();

  const payloadJson = JSON.stringify(payloadObj);

  // 1) JWE encrypt JSON (RSA-OAEP-256 + A256GCM)[file:2]
  const jweCompact = await new CompactEncrypt(enc.encode(payloadJson))
    .setProtectedHeader({ alg: 'RSA-OAEP-256', enc: 'A256GCM' })
    .encrypt(publicKeyForEncrypt);

  // 2) JWS sign over the JWE compact string (raw text payload)[file:2]
  const jwsCompact = await new CompactSign(enc.encode(jweCompact))
    .setProtectedHeader({ alg: 'RS256' })
    .sign(privateKeyForSign);

  // This compact JWS string is what you send as HTTP body
  return jwsCompact;
}

// Optional: verify + decrypt Axis responses
async function jweVerifyAndDecrypt(jwsCompact) {
  const { privateKeyForDecrypt, publicKeyForVerify } = await loadJoseKeys();
  const dec = new TextDecoder();

  // 1) verify JWS
  const { payload } = await compactVerify(jwsCompact, publicKeyForVerify);
  const jweCompact = dec.decode(payload); // JWS payload is JWE string[file:2]

  // 2) decrypt JWE
  const { decryptCompact } = await import('jose');
  const decrypted = await decryptCompact(jweCompact, privateKeyForDecrypt);
  return JSON.parse(dec.decode(decrypted.plaintext));
}

module.exports = {
  jweEncryptAndSign,
  jweVerifyAndDecrypt
};

const fs = require('fs');
const forge = require('node-forge');
const path = require('path');
const config = require('../config/axisConfig');
const { X509Certificate } = require('crypto');

let cached = null;

function loadKeys() {
  if (cached) return cached;

  const p12Buffer = fs.readFileSync(path.resolve(config.jwe.clientP12Path));
  const p12Der = forge.util.createBuffer(p12Buffer.toString('binary'));
  const p12Asn1 = forge.asn1.fromDer(p12Der);
  const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, config.jwe.clientP12Password);

  let privateKeyPem;

  for (const safeContent of p12.safeContents) {
    for (const safeBag of safeContent.safeBags) {
      if (safeBag.type === forge.pki.oids.keyBag || safeBag.type === forge.pki.oids.pkcs8ShroudedKeyBag) {
        const pk = safeBag.key;
        privateKeyPem = forge.pki.privateKeyToPem(pk);
      }
    }
  }

  if (!privateKeyPem) throw new Error('Private key not found in P12');

  // Axis public cert
  const axisCertPem = fs.readFileSync(path.resolve(config.jwe.axisPublicCertPath), 'utf8');
  const axisX509 = new X509Certificate(axisCertPem);
  const axisPublicKeyPem = axisX509.publicKey.export({ type: 'spki', format: 'pem' });

  cached = { privateKeyPem, axisPublicKeyPem };
  return cached;
}

module.exports = {
  loadKeys
};

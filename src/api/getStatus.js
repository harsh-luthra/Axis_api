const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const config = require('../config/axisConfig');
const { jweEncryptAndSign, jweVerifyAndDecrypt } = require('../security/jweJws');
const { generateChecksum } = require('../security/checksum');
const { generateChecksumAxis } = require('./security/checksumAxis');
const { axisRequest } = require('../http/axisHttp');

function baseHeaders() {
  const nowMillis = Date.now().toString();
  return {
    'Content-Type': 'text/plain',
    'x-fapi-epoch-millis': nowMillis,
    'x-fapi-channel-id': config.channelId,
    'x-fapi-uuid': uuidv4(),
    'x-fapi-serviceId': config.headersBase['x-fapi-serviceId'],
    'x-fapi-serviceVersion': config.headersBase['x-fapi-serviceVersion'],
    'X-IBM-Client-Id': config.clientId,
    'X-IBM-Client-Secret': config.clientSecret
  };
}

function buildStatusData(crn) {
  const data = {
    channelId: config.channelId,
    corpCode: config.corpCode,
    crn,
    checksum: '' // placeholder
  };
  data.checksum = generateChecksumAxis(data);
  return { Data: data };
}

async function getStatus(crn) {
  const url = config.urls[config.env].getStatus;
  const headers = baseHeaders();
  const body = buildStatusData(crn);
  const encryptedAndSigned = await jweEncryptAndSign(body);
//   const response = await axios.post(url, encryptedAndSigned, { headers });

  const response = await axisRequest({
        url,
        method: 'POST',
        headers,
        data: encryptedAndSigned
    });

  // decrypt response JWE/JWS
  const decrypted = await jweVerifyAndDecrypt(response.data);
  return { raw: response.data, decrypted };
}

module.exports = {
  getStatus
};

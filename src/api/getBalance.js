const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const config = require('../config/axisConfig');
const { jweEncryptAndSign, jweVerifyAndDecrypt } = require('../security/jweJws');
// const { generateChecksum } = require('../security/checksum');
const { generateChecksumAxis } = require('./security/checksumAxis');

const { axisRequest } = require('../http/axisHttp');

function baseHeaders() {
  const nowMillis = Date.now().toString();
  return {
    'Content-Type': 'application/json',
    'x-fapi-epoch-millis': nowMillis,
    'x-fapi-channel-id': config.channelId,
    'x-fapi-uuid': uuidv4(),
    'x-fapi-serviceId': config.headersBase['x-fapi-serviceId'],
    'x-fapi-serviceVersion': config.headersBase['x-fapi-serviceVersion'],
    'X-IBM-Client-Id': config.clientId,
    'X-IBM-Client-Secret': config.clientSecret
  };
}

function buildBalanceData(corpAccNum) {
  const data = {
    corpAccNum,
    channelId: config.channelId,
    corpCode: config.corpCode,
    checksum: ''
  };
//   data.checksum = generateChecksum(data);
  data.checksum = generateChecksumAxis(data);
  return { Data: data };
}

async function getBalance() {
  const corpAccNum = '309010100067740'
  const url = config.urls[config.env].getBalance;
  const headers = baseHeaders();
  const body = buildBalanceData(corpAccNum);
  const encryptedAndSigned = await jweEncryptAndSign(body);

//   const response = await axios.post(url, encryptedAndSigned, { headers });

  const response = await axisRequest({
        url,
        method: 'POST',
        headers,
        data: encryptedAndSigned
    });

  const decrypted = await jweVerifyAndDecrypt(response.data);
  return { raw: response.data, decrypted };
}

module.exports = {
  getBalance
};

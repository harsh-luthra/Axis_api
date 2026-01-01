// src/app.js
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { axisRequest } = require('./http/axisHttp');
const config = require('./config/axisConfig');
const { jweEncryptAndSign, jweVerifyAndDecrypt } = require('./security/jweJws');
const { generateChecksumAxis } = require('./security/checksumAxis');

const app = express();

// helper to build headers[file:2]
function buildHeaders() {
  const now = Date.now().toString();
  return {
    'Content-Type': 'text/plain',
    'x-fapi-epoch-millis': now,
    'x-fapi-channel-id': config.channelId,
    'x-fapi-uuid': uuidv4(),
    'x-fapi-serviceId': config.headersBase['x-fapi-serviceId'],
    'x-fapi-serviceVersion': config.headersBase['x-fapi-serviceVersion'],
    'X-IBM-Client-Id': config.clientId,
    'X-IBM-Client-Secret': config.clientSecret
  };
}

// helper to build Get Balance body[file:2]
function buildGetBalanceData(corpAccNum) {
  const data = {
    corpAccNum,
    channelId: config.channelId,
    corpCode: config.corpCode
  };
  data.checksum = generateChecksumAxis(data);
  return { Data: data };
}

// GET /test-balance?acc=309010100067740
app.get('/test-balance', async (req, res) => {
  const corpAccNum = '309010100067740'; // sample from doc[file:2]

  try {
    const url = config.urls[config.env].getBalance; // UAT/PROD URL[file:2]
    const headers = buildHeaders();
    const body = buildGetBalanceData(corpAccNum);

    // encrypt + sign body
    const jwsPayload = await jweEncryptAndSign(body);

    const axiosConfig = {
      method: 'POST',
      url,
      headers,
      data: jwsPayload
    };

    const axisResp = await axisRequest(axiosConfig);

    // verify + decrypt response
    const decrypted = await jweVerifyAndDecrypt(axisResp.data);

    // Try to normalize to a clean JSON for client
    const root = decrypted.Data || decrypted.data || decrypted;
    res.json({
      rawAxisStatus: axisResp.status,
      decrypted
    });
  } catch (err) {
    const status = err.response?.status || 500;
    res.status(status).json({
      error: true,
      message: err.message,
      axisStatus: err.response?.status,
      axisData: err.response?.data
    });
  }
});

module.exports = app;

// src/api/beneEnquiry.js
const { v4: uuidv4 } = require('uuid');
const config = require('../config/axisConfig');
const { jweEncryptAndSign, jweVerifyAndDecrypt } = require('../security/jweJws');
const { generateChecksumAxis } = require('../security/checksumAxis');
const { axisRequest } = require('../http/axisHttp');

function baseHeaders() {
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

function buildBeneEnquiryData({ beneCode, status = 'All', emailId = 'dev@kitepay.in' } = {}) {
  const data = {
    channelId: config.channelId,
    corpCode: config.corpCode,
    beneCode: beneCode || '',
    status: status,
    emailId: emailId,
    checksum: ''
  };
  
  data.checksum = generateChecksumAxis(data);
  return { Data: data };
}

async function beneEnquiry(queryParams) {
  const url = config.urls[config.env].beneEnquiry; // /payee-mgmt/beneficiary-enquiry
  const headers = baseHeaders();
  const body = buildBeneEnquiryData(queryParams);
  const encryptedAndSigned = await jweEncryptAndSign(body);

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
  beneEnquiry
};

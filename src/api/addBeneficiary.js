// src/api/addBeneficiary.js
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const config = require('../config/axisConfig');
const { jweEncryptAndSign, jweVerifyAndDecrypt } = require('../security/jweJws');
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

function buildAddBeneficiaryData(beneDetails) {
  const data = {
    channelId: config.channelId,
    corpCode: config.corpCode,
    userId: "kitepay_user", // Your system user
    beneinsert: [{
      apiVersion: "1.0",
      beneCode: beneDetails.beneCode || `KITE_${Date.now()}`,
      beneName: beneDetails.beneName,
      beneAccNum: beneDetails.beneAccNum,
      beneIfscCode: beneDetails.beneIfscCode,
      beneAcType: beneDetails.beneAcType || "10",
      beneBankName: beneDetails.beneBankName || "",
      beneEmailAddr1: beneDetails.beneEmailAddr1 || "",
      beneMobileNo: beneDetails.beneMobileNo || "",
      checksum: '' // Will be calculated
    }]
  };
  
  data.checksum = generateChecksumAxis(data);
  return { Data: data };
}

async function addBeneficiary(beneDetails) {
  const url = config.urls[config.env].beneReg; // /payee-mgmt/beneficiary-registration
  const headers = baseHeaders();
  const body = buildAddBeneficiaryData(beneDetails);
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
  addBeneficiary
};

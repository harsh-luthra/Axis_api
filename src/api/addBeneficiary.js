// src/api/addBeneficiary.js
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

function buildAddBeneficiaryData(beneDetails) {
  const beneItem = {
    apiVersion: "1.0",
    beneCode: beneDetails.beneCode || `KITE_${Date.now()}`,
    beneName: beneDetails.beneName,
    beneAccNum: beneDetails.beneAccNum,
    beneIfscCode: beneDetails.beneIfscCode,
    beneAcType: beneDetails.beneAcType || "10",
    beneBankName: beneDetails.beneBankName || "",
    beneEmailAddr1: beneDetails.beneEmailAddr1 || "",
    beneMobileNo: beneDetails.beneMobileNo || ""
  };
  
  // Checksum FIRST on beneItem
  // beneItem.checksum = generateChecksumAxis(beneItem);
  
  const data = {
    channelId: config.channelId,
    corpCode: config.corpCode,
    userId: "DEMOCORP159_USER1",
    beneinsert: [beneItem]  // Array with checksum
  };
  
  console.log('🔍 Beneficiary Item with Checksum:', data); // Debug

  // Final checksum on WHOLE data
  data.checksum = generateChecksumAxis(data);
  return { Data: data };
}

async function addBeneficiary(beneDetails) {
  const url = config.urls[config.env].beneReg; // /payee-mgmt/beneficiary-registration
  const headers = baseHeaders();
  const body = buildAddBeneficiaryData(beneDetails);
  const encryptedAndSigned = await jweEncryptAndSign(body);

    console.log('🔍 PAYLOAD:', body); // Debug
    console.log('🔍 HEADERS:', headers); // Debug
    console.log('🔍 URL:', url); // Debug

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

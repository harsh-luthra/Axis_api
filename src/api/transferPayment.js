const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const config = require('../config/axisConfig');
const { jweEncryptAndSign } = require('../security/jweJws');
const { generateChecksum } = require('../security/checksum');

const { generateChecksumAxis } = require('../security/checksumAxis');

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

// build Data object as per docs[file:6]
function buildTransferData(payload) {
  const data = {
    channelId: config.channelId,
    corpCode: config.corpCode,
    paymentDetails: {
      txnPaymode: payload.txnPaymode, // 'NE', 'RT', 'FT', etc
      custUniqRef: payload.custUniqRef,
      txnType: payload.txnType || 'CUST',
      txnAmount: payload.txnAmount,
      beneLEI: payload.beneLEI || '',
      corpAccNum: payload.corpAccNum,
      beneCode: payload.beneCode,
      valueDate: payload.valueDate, // 'YYYY-MM-DD'
      beneName: payload.beneName,
      beneAccNum: payload.beneAccNum,
      beneAcType: payload.beneAcType || '',
      beneAddr1: payload.beneAddr1 || '',
      beneAddr2: payload.beneAddr2 || '',
      beneAddr3: payload.beneAddr3 || '',
      beneCity: payload.beneCity || '',
      beneState: payload.beneState || '',
      benePincode: payload.benePincode || '',
      beneIfscCode: payload.beneIfscCode || '',
      beneBankName: payload.beneBankName || '',
      baseCode: payload.baseCode || '',
      chequeNumber: payload.chequeNumber || '',
      chequeDate: payload.chequeDate || '',
      payableLocation: payload.payableLocation || '',
      printLocation: payload.printLocation || '',
      beneEmailAddr1: payload.beneEmailAddr1 || '',
      beneMobileNo: payload.beneMobileNo || '',
      productCode: payload.productCode || '',
      invoiceDetails: payload.invoiceDetails || {},
      enrichment1: payload.enrichment1 || '',
      enrichment2: payload.enrichment2 || '',
      enrichment3: payload.enrichment3 || '',
      enrichment4: payload.enrichment4 || '',
      enrichment5: payload.enrichment5 || '',
      senderToReceiverInfo: payload.senderToReceiverInfo || ''
    }
  };

  // Axis checksum is "only attributes within body"; docs show checksum at root Data.[file:6]
  data.checksum = generateChecksumAxis(data);
  return { Data: data };
}

async function transferPayment(payload) {
  const url = config.urls[config.env].transferPayment;
  const headers = baseHeaders();
  const nonEncryptedBody = buildTransferData(payload);

  // JWE+JWS
  const encryptedAndSigned = await jweEncryptAndSign(nonEncryptedBody);

  const axiosBody = encryptedAndSigned; // Axis expects compact JWS string as body (per their sample Java/jwe).[file:2][file:6]

//   const response = await axios.post(url, axiosBody, { headers });
//   const responseBody = response.data;

    const response = await axisRequest({
        url,
        method: 'POST',
        headers,
        data: encryptedAndSigned
    });

    const responseBody = response.data;

  // If Axis returns encrypted (JWS string), decrypt:
  // const decrypted = await jweVerifyAndDecrypt(responseBody);
  // return { raw: responseBody, decrypted };

  return responseBody;
}

module.exports = {
  transferPayment
};

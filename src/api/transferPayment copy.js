// src/api/fundTransfer.js
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

function validateFundTransfer(ft) {
  const errors = [];

  // 1. txnPaymode validation (char 2)
  const validModes = ['RT', 'NE', 'PA', 'FT', 'CC', 'DD'];
  if (!ft.txnPaymode || !validModes.includes(ft.txnPaymode)) {
    errors.push(`txnPaymode invalid. Must be one of: ${validModes.join(', ')}`);
  }

  // 2. RT/NE requires beneIfscCode (varchar 11)
  if (['RT', 'NE'].includes(ft.txnPaymode) && (!ft.beneIfscCode || ft.beneIfscCode.length !== 11)) {
    errors.push('beneIfscCode mandatory for RT/NE (exactly 11 chars)');
  }

  // 3. Length validations
  if (ft.custUniqRef && ft.custUniqRef.length > 30) errors.push('custUniqRef max 30 chars');
  if (ft.corpCode && ft.corpCode.length > 15) errors.push('corpCode max 15 chars');
  if (ft.corpAccNum && ft.corpAccNum.length > 15) errors.push('corpAccNum max 15 chars');
  if (ft.beneCode && ft.beneCode.length > 30) errors.push('beneCode max 30 chars');
  if (ft.beneName && ft.beneName.length > 70) errors.push('beneName max 70 chars');
  if (ft.beneAccNum && ft.beneAccNum.length > 30) errors.push('beneAccNum max 30 chars');
  if (ft.beneIfscCode && ft.beneIfscCode.length !== 11) errors.push('beneIfscCode exactly 11 chars');
  if (ft.beneBankName && ft.beneBankName.length > 70) errors.push('beneBankName max 70 chars');
  if (ft.txnAmount && !/^\d{1,13}\.\d{2}$/.test(ft.txnAmount)) errors.push('txnAmount Number(15,2) format');

  // 4. Mandatory fields
  if (!ft.txnPaymode) errors.push('txnPaymode mandatory');
  if (!ft.custUniqRef) errors.push('custUniqRef mandatory');
  if (!ft.txnType) errors.push('txnType mandatory');
  if (!ft.txnAmount) errors.push('txnAmount mandatory');
  if (!ft.corpAccNum) errors.push('corpAccNum mandatory');
  if (!ft.beneCode) errors.push('beneCode mandatory');
  if (!ft.valueDate) errors.push('valueDate mandatory (YYYY-MM-DD)');
  if (!ft.beneName) errors.push('beneName mandatory');
  if (!ft.beneAccNum) errors.push('beneAccNum mandatory');

  if (errors.length > 0) {
    throw new Error(`Validation failed: ${errors.join('; ')}`);
  }
}

function buildFundTransferData(ft) {

  validateFundTransfer(ft);

  const paymentDetails = {
    txnPaymode: ft.txnPaymode || 'NE',                        // NE / RT / PA / FT etc
    custUniqRef: ft.custUniqRef || `KITE-${Date.now()}`,      // CRN
    txnType: ft.txnType || 'CUST',                            // CUST / VEND etc
    txnAmount: ft.txnAmount,                                  // "500.00"
    beneLEI: ft.beneLEI || '',                                // optional
    corpAccNum: ft.corpAccNum || '309010100067740',           // your debit account
    beneCode: ft.beneCode,                                    // merchant / vendor code
    valueDate: ft.valueDate || new Date().toISOString().slice(0, 10), // YYYY-MM-DD
    beneName: ft.beneName,
    beneAccNum: ft.beneAccNum,
    beneAcType: ft.beneAcType || '',                          // optional
    beneAddr1: ft.beneAddr1 || '',
    beneAddr2: ft.beneAddr2 || '',
    beneAddr3: ft.beneAddr3 || '',
    beneCity: ft.beneCity || '',
    beneState: ft.beneState || '',
    benePincode: ft.benePincode || '',
    beneIfscCode: ft.beneIfscCode,                            // mandatory for RT/NE
    beneBankName: ft.beneBankName || '',
    baseCode: ft.baseCode || '',
    chequeNumber: ft.chequeNumber || '',
    chequeDate: ft.chequeDate || '',
    payableLocation: ft.payableLocation || '',
    printLocation: ft.printLocation || '',
    beneEmailAddr1: ft.beneEmailAddr1 || '',
    beneMobileNo: ft.beneMobileNo || '',
    productCode: ft.productCode || '',
    // invoiceDetails etc → optional; add if required
    senderToReceiverInfo: ft.senderToReceiverInfo || '',
    checksum: ''                                              // to be filled
  };

  // checksum on paymentDetails OR entire Data – Axis doc says “within body”,
  // you are already using generateChecksumAxis consistently across APIs.
  const data = {
    channelId: config.channelId,
    corpCode: config.corpCode,
    paymentDetails
  };

  data.checksum = generateChecksumAxis(data);
  return { Data: data };
}

async function fundTransfer(ftDetails) {
  const url = config.urls[config.env].fundTransfer; // https://sakshamuat.axisbank.co.in/gateway/api/txb/v3/payments/transfer-payment
  const headers = baseHeaders();
  const body = buildFundTransferData(ftDetails);

  console.log('🔍 TransferPayment Data:', JSON.stringify(body, null, 2));

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

module.exports = { fundTransfer };

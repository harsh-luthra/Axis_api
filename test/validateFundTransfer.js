const { fundTransferSchema } = require('../src/validators/schemas');

const payload = {
  txnPaymode: 'NE',
  custUniqRef: 'FT0988650054',
  txnType: 'CUST',
  valueDate: '2026-01-12',
  txnAmount: '25000.00',
  corpAccNum: '309010100067740',
  beneCode: 'MERCHANT009',
  beneName: 'Test Merchant',
  beneAccNum: '89098765678',
  beneIfscCode: 'HDFC0000520',
  beneBankName: 'HDFC BANK',
  beneEmailAddr1: 'merchant@gmail.in',
  beneMobileNo: '9087654567'
};

const { error, value } = fundTransferSchema.validate(payload, {
  abortEarly: false,
  stripUnknown: true,
  convert: true
});

if (error) {
  console.error('VALIDATION: INVALID');
  console.error(JSON.stringify(error.details.map(d => ({ field: d.path.join('.'), message: d.message })), null, 2));
  process.exit(1);
}

console.log('VALIDATION: VALID');
console.log(JSON.stringify(value, null, 2));
process.exit(0);

// src/validators/schemas.js
// Input validation schemas using Joi
const Joi = require('joi');

/**
 * POST /admin/generate-api-key
 * Requires master key in header; validates merchant creation payload
 */
const generateApiKeySchema = Joi.object({
  merchant_name: Joi.string().required().max(100).trim(),
  corp_code: Joi.string().max(50).trim().optional(),
  vendor_code: Joi.string().max(50).trim().optional(),
  corporate_account: Joi.string().max(20).trim().optional()
});

/**
 * POST /fund-transfer
 * Fund transfer request payload validation (simplified; use full spec per Axis)
 */
const fundTransferSchema = Joi.object({
  txnPaymode: Joi.string().valid('RT', 'NE', 'PA', 'FT', 'CC', 'DD').required(),
  custUniqRef: Joi.string().required().max(30).trim(),
  txnType: Joi.string().valid('CUST', 'MERC', 'DIST', 'INTN', 'VEND').default('CUST'),
  txnAmount: Joi.string().regex(/^\d+(\.\d{1,2})?$/).required(), // accepts "1000" or "1000.50"
  corpAccNum: Joi.string().max(30).optional().trim(),
  beneCode: Joi.string().required().max(30),
  beneName: Joi.string().required().max(70),
  valueDate: Joi.string().regex(/^\d{4}-\d{2}-\d{2}$/).required(), // YYYY-MM-DD
  beneAccNum: Joi.string().when('txnPaymode', {
    is: Joi.string().valid('RT', 'NE', 'FT'),
    then: Joi.string().required().max(30),
    otherwise: Joi.string().optional().max(30)
  }),
  beneIfscCode: Joi.string().when('txnPaymode', {
    is: Joi.string().valid('RT', 'NE'),
    then: Joi.string().required().length(11),
    otherwise: Joi.string().optional().allow('', null)
  }),
  beneLEI: Joi.string().max(100).optional(),
  beneAddr1: Joi.string().max(100).optional(),
  beneAddr2: Joi.string().max(100).optional(),
  beneAddr3: Joi.string().max(100).optional(),
  beneCity: Joi.string().max(50).optional(),
  beneState: Joi.string().max(50).optional(),
  benePincode: Joi.string().max(10).optional(),
  beneBankName: Joi.string().max(70).optional(),
  beneEmailAddr1: Joi.string().email().max(250).optional(),
  beneMobileNo: Joi.string().regex(/^[0-9]{10}$/).optional(),
  productCode: Joi.string().max(20).optional(),
  senderToReceiverInfo: Joi.string().max(500).optional(),
  baseCode: Joi.string().max(30).optional(),
  chequeNumber: Joi.string().max(20).optional(),
  chequeDate: Joi.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  payableLocation: Joi.string().max(50).optional(),
  printLocation: Joi.string().max(50).optional()
}).unknown(false);

/**
 * POST /fund-transfer/status
 * Status query validation
 */
const transferStatusSchema = Joi.object({
  crn: Joi.string().required().max(30).trim()
}).unknown(false);

/**
 * POST /test-add-beneficiary
 * Add beneficiary request (simplified; use full Axis spec)
 */
const addBeneficiarySchema = Joi.object({
  beneCode: Joi.string().max(30).optional(),
  beneName: Joi.string().required().max(70),
  beneAddr: Joi.string().max(100).optional(),
  beneCity: Joi.string().max(50).optional(),
  beneState: Joi.string().max(50).optional(),
  benePincode: Joi.string().max(10).optional(),
  beneAccNum: Joi.string().required().max(30),
  beneIfscCode: Joi.string().required().length(11),
  beneBankName: Joi.string().max(70).optional(),
  beneMobileNo: Joi.string().regex(/^[0-9]{10}$/).optional(),
  beneEmailAddr: Joi.string().email().max(250).optional(),
  beneAcType: Joi.string().valid('SB', 'CA', 'CC', 'OD').optional()
}).unknown(false);

/**
 * GET /balance/:merchantId
 * Validate numeric merchant ID (handled via parseInt, but documented here)
 */
const merchantIdSchema = Joi.object({
  merchantId: Joi.number().integer().positive().required()
});

// ============================================================================
// Validation middleware factory
// ============================================================================

/**
 * Create a Joi validation middleware
 * Usage: app.post('/endpoint', validateRequest(schema, 'body'), handler)
 */
function validateRequest(schema, source = 'body') {
  return (req, res, next) => {
    const toValidate = req[source];
    const { error, value } = schema.validate(toValidate, {
      abortEarly: false,
      stripUnknown: true,
      convert: true
    });

    if (error) {
      const details = error.details.map(d => ({
        field: d.path.join('.'),
        message: d.message,
        type: d.type
      }));

      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details
      });
    }

    // Replace req[source] with validated and sanitized data
    req[source] = value;
    next();
  };
}

module.exports = {
  generateApiKeySchema,
  fundTransferSchema,
  transferStatusSchema,
  addBeneficiarySchema,
  merchantIdSchema,
  validateRequest
};

// src/security/checksumAxis.js
const crypto = require('crypto');

/**
 * Java: validateInfo(String value)
 * returns value if not empty, else "".[file:7]
 */
function validateInfo(value) {
  if (value === null || value === undefined) return '';
  const s = String(value);
  return s.length > 0 ? s : '';
}

/**
 * Core recursive part: Java getInnerLevel2Map(entryInnLvl2, finalChkSum)[file:7]
 * Handles nested List / Map / primitive exactly as in doc.
 */
function appendInnerLevel2(value, builder) {
  if (Array.isArray(value)) {
    const tempLst = value;
    if (tempLst.length > 0 && typeof tempLst[0] === 'object' && tempLst[0] !== null && !Array.isArray(tempLst[0])) {
      // List<? extends Map<String, Object>>
      for (const innerMap of tempLst) {
        for (const [k, v] of Object.entries(innerMap)) {
          // Java appends key to a separate 'keys' builder but only values are used for checksum.[file:7]
          appendInnerLevel2(v, builder);
        }
      }
    } else {
      // List of primitives
      for (const v of tempLst) {
        builder.push(validateInfo(v));
      }
    }
  } else if (value && typeof value === 'object') {
    // Map<String, Object>
    for (const [k, v] of Object.entries(value)) {
      builder.push(validateInfo(v));
    }
  } else {
    // Primitive
    builder.push(validateInfo(value));
  }
}

/**
 * Java: generateCheckSum(LinkedHashMap<String, Object> requestMap)[file:7]
 * requestMap is the body under "Data".
 */
function buildChecksumString(requestMap) {
  if (!requestMap || typeof requestMap !== 'object') return '';

  const finalParts = [];

  for (const [key, value] of Object.entries(requestMap)) {
    if (key === 'checksum') continue; // skip checksum field itself[file:7]

    if (Array.isArray(value)) {
      const tempLst = value;
      if (tempLst.length > 0 && typeof tempLst[0] === 'object' && tempLst[0] !== null && !Array.isArray(tempLst[0])) {
        // List<? extends Map<String, Object>>
        for (const innerMap of tempLst) {
          for (const [innerKey, innerVal] of Object.entries(innerMap)) {
            appendInnerLevel2(innerVal, finalParts);
          }
        }
      } else {
        // List of primitives
        for (const v of tempLst) {
          finalParts.push(validateInfo(v));
        }
      }
    } else if (value && typeof value === 'object') {
      // Map<String, Object>
      const innerMap = value;
      for (const [innerKey, innerVal] of Object.entries(innerMap)) {
        appendInnerLevel2(innerVal, finalParts);
      }
    } else {
      // Primitive
      finalParts.push(validateInfo(value));
    }
  }

  return finalParts.join('').trim();
}

/**
 * Java: encodeCheckSumWithSHA256(data) but actually MD5 in doc.[file:7]
 */
function generateChecksumAxis(requestMap) {
  const base = buildChecksumString(requestMap);
  return crypto.createHash('md5').update(base, 'utf8').digest('hex');
}

function verifyChecksumAxis(requestMap) {
  const supplied = requestMap.checksum;
  if (!supplied) return false;
  const calculated = generateChecksumAxis(requestMap);
  return calculated.toLowerCase() === String(supplied).toLowerCase();
}

module.exports = {
  buildChecksumString,
  generateChecksumAxis,
  verifyChecksumAxis
};

const crypto = require('crypto');
const axios = require('axios');
const { getSettingValue } = require('./settingsService');

/**
 * Get MoMo Configuration from Database
 */
async function getMomoConfig() {
  return {
    partnerCode: await getSettingValue('momo_partner_code') || process.env.MOMO_PARTNER_CODE || 'MOMO',
    accessKey: await getSettingValue('momo_access_key') || process.env.MOMO_ACCESS_KEY || 'F8BBA842ECF85',
    secretKey: await getSettingValue('momo_secret_key') || process.env.MOMO_SECRET_KEY || 'K951B6PE1waDMi640xX08PD3vg6EkVlz',
    endpoint: await getSettingValue('momo_endpoint') || process.env.MOMO_ENDPOINT || 'https://test-payment.momo.vn',
    returnUrl: await getSettingValue('momo_return_url') || process.env.MOMO_RETURN_URL || 'http://localhost:3001/payment/success',
    notifyUrl: await getSettingValue('momo_notify_url') || process.env.MOMO_NOTIFY_URL || 'http://localhost:3000/api/payment/callback'
  };
}

/**
 * Generate HMAC-SHA256 signature for MoMo
 */
function generateSignature(rawData, secretKey) {
  return crypto
    .createHmac('sha256', secretKey)
    .update(rawData)
    .digest('hex');
}

/**
 * Create MoMo payment
 */
async function createPayment(userId, durationMonths, transactionId) {
  const { getVIPPackageByDuration } = require('./userService');
  const package = await getVIPPackageByDuration(durationMonths);
  
  if (!package || !package.is_active) {
    throw new Error('Invalid or inactive package');
  }

  const config = await getMomoConfig();
  const amount = package.price;
  const orderId = `VIP_${transactionId}_${Date.now()}`;
  const requestId = `REQ_${Date.now()}`;
  const orderInfo = package.title || `VIP ${durationMonths} month${durationMonths > 1 ? 's' : ''} subscription`;
  const requestType = 'captureWallet';
  const extraData = ''; // Optional

  // Create raw signature string (follow MoMo's exact order)
  const rawSignature = `accessKey=${config.accessKey}&amount=${amount}&extraData=${extraData}&ipnUrl=${config.notifyUrl}&orderId=${orderId}&orderInfo=${orderInfo}&partnerCode=${config.partnerCode}&redirectUrl=${config.returnUrl}&requestId=${requestId}&requestType=${requestType}`;
  
  const signature = generateSignature(rawSignature, config.secretKey);

  const requestBody = {
    partnerCode: config.partnerCode,
    partnerName: 'IOSGods Store',
    storeId: 'IOSGodsStore',
    requestId,
    amount,
    orderId,
    orderInfo,
    redirectUrl: config.returnUrl,
    ipnUrl: config.notifyUrl,
    lang: 'vi',
    requestType,
    autoCapture: true,
    extraData,
    signature
  };

  try {
    const response = await axios.post(`${config.endpoint}/v2/gateway/api/create`, requestBody, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });

    if (response.data.resultCode === 0) {
      return {
        payUrl: response.data.payUrl,
        orderId,
        requestId
      };
    } else {
      console.error('MoMo Error Response:', response.data);
      throw new Error(response.data.message || 'Payment creation failed');
    }
  } catch (error) {
    console.error('MoMo Request Error:', error.response?.data || error.message);
    throw new Error('Failed to connect to MoMo gateway');
  }
}

/**
 * Verify MoMo IPN signature
 */
async function verifySignature(data) {
  const config = await getMomoConfig();
  const { signature, ...rest } = data;
  
  // Follow MoMo's exact order for IPN signature
  const rawData = `accessKey=${config.accessKey}&amount=${rest.amount}&extraData=${rest.extraData || ''}&message=${rest.message}&orderId=${rest.orderId}&orderInfo=${rest.orderInfo}&orderType=${rest.orderType}&partnerCode=${config.partnerCode}&payType=${rest.payType}&requestId=${rest.requestId}&responseTime=${rest.responseTime}&resultCode=${rest.resultCode}&transId=${rest.transId}`;
  
  const generated = generateSignature(rawData, config.secretKey);
  return generated === signature;
}

/**
 * Check payment status
 */
async function checkTransactionStatus(orderId, requestId) {
  const config = await getMomoConfig();
  const rawSignature = `accessKey=${config.accessKey}&orderId=${orderId}&partnerCode=${config.partnerCode}&requestId=${requestId}`;
  const signature = generateSignature(rawSignature, config.secretKey);

  const requestBody = {
    partnerCode: config.partnerCode,
    requestId,
    orderId,
    signature,
    lang: 'vi'
  };

  try {
    const response = await axios.post(`${config.endpoint}/v2/gateway/api/query`, requestBody, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });

    return response.data;
  } catch (error) {
    console.error('MoMo Status Check Error:', error.response?.data || error.message);
    throw new Error('Failed to check payment status');
  }
}

/**
 * Get VIP pricing from database
 */
async function getVIPPricing() {
  const { getActiveVIPPackages } = require('./userService');
  const packages = await getActiveVIPPackages();
  
  // Convert to the expected format: { 1: 50000, 3: 120000, ... }
  const pricing = {};
  packages.forEach(pkg => {
    pricing[pkg.duration_months] = pkg.price;
  });
  
  return pricing;
}

module.exports = {
  createPayment,
  verifySignature,
  checkTransactionStatus,
  getVIPPricing
};

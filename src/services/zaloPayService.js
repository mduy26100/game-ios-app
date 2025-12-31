const crypto = require('crypto');
const axios = require('axios');
const { getSettingValue } = require('./settingsService');

/**
 * Get ZaloPay Configuration from Database
 */
async function getZaloPayConfig() {
  return {
    app_id: (await getSettingValue('zalopay_app_id') || process.env.ZALOPAY_APP_ID || '2553').trim(),
    key1: (await getSettingValue('zalopay_key1') || process.env.ZALOPAY_KEY1 || 'PcY4iZIKFCIdgZvA21hgDTRLxnoXaOSy').trim(),
    key2: (await getSettingValue('zalopay_key2') || process.env.ZALOPAY_KEY2 || 'kLtgPl8HHhfvMuDHPwKfgfsY4Ydm9eIz').trim(),
    endpoint: await getSettingValue('zalopay_endpoint') || process.env.ZALOPAY_ENDPOINT || 'https://sb-openapi.zalopay.vn/v2',
    callback_url: await getSettingValue('zalopay_callback_url') || process.env.ZALOPAY_CALLBACK_URL || 'http://localhost:3000/api/payment/zalopay-callback'
  };
}

/**
 * Create ZaloPay Order
 */
async function createZaloPayOrder(userId, durationMonths, transactionId) {
  const { getVIPPackageByDuration } = require('./userService');
  const package = await getVIPPackageByDuration(durationMonths);
  
  if (!package || !package.is_active) {
    throw new Error('Invalid or inactive package');
  }

  const config = await getZaloPayConfig();
  const embed_data = {
    redirecturl: 'http://localhost:3000/vip'
  };

  const items = [];
  const transID = Math.floor(Math.random() * 1000000);
  
  // Format YYMMDD using native Date
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const yymmdd = `${year}${month}${day}`;
  
  const app_trans_id = `${yymmdd}_${transID}`; // ZaloPay format: yymmdd_xxxx

  const order = {
    app_id: parseInt(config.app_id),
    app_trans_id: app_trans_id, // This needs to be saved to our DB transaction to map back
    app_user: userId.toString(),
    app_time: Date.now(), // miliseconds
    item: JSON.stringify(items),
    embed_data: JSON.stringify(embed_data),
    amount: parseInt(package.price),
    description: `IOSGods VIP ${durationMonths} Month(s) - Payment for #${transactionId}`,
    bank_code: "zalopayapp",
    callback_url: config.callback_url
  };

  // app_id|app_trans_id|app_user|amount|app_time|embed_data|item
  const data = config.app_id + "|" + order.app_trans_id + "|" + order.app_user + "|" + order.amount + "|" + order.app_time + "|" + order.embed_data + "|" + order.item;
  order.mac = crypto.createHmac('sha256', config.key1).update(data).digest('hex');

  console.log('ZaloPay Create Payload:', order);
  console.log('ZaloPay MAC Data:', data);
  console.log('ZaloPay Signature:', order.mac);

  try {
    const response = await axios.post(`${config.endpoint}/create`, order);
    
    if (response.data.return_code === 1) {
      return {
        payUrl: response.data.order_url,
        app_trans_id: app_trans_id,
        zp_trans_token: response.data.zp_trans_token
      };
    } else {
      console.error('ZaloPay Create Error:', response.data);
      throw new Error(response.data.return_message || 'ZaloPay creation failed');
    }
  } catch (error) {
    console.error('ZaloPay Request Error:', error.message);
    throw new Error('Failed to connect to ZaloPay gateway');
  }
}

/**
 * Verify Callback MAC
 */
async function verifyCallback(data) {
  const config = await getZaloPayConfig();
  const reqMac = data.mac;

  // mac = hmac(key2, data)
  const mac = crypto.createHmac('sha256', config.key2).update(data.data).digest('hex');
  
  return {
    isValid: reqMac === mac,
    data: JSON.parse(data.data)
  };
}

/**
 * Query Order Status
 */
async function queryZaloPayStatus(app_trans_id) {
  const config = await getZaloPayConfig();
  
  const postData = {
    app_id: config.app_id,
    app_trans_id: app_trans_id // Input your app_trans_id
  }

  const data = postData.app_id + "|" + postData.app_trans_id + "|" + config.key1; // app_id|app_trans_id|key1
  postData.mac = crypto.createHmac('sha256', config.key1).update(data).digest('hex');

  try {
    const response = await axios.post(`${config.endpoint}/query`, null, { params: postData });
    return response.data;
  } catch (error) {
    console.error('ZaloPay Query Error:', error.message);
    throw error;
  }
}

module.exports = {
  createZaloPayOrder,
  verifyCallback,
  queryZaloPayStatus
};

const express = require('express');
const router = express.Router();
const { requireAuth, optionalAuth, requirePermission } = require('../middleware/auth');
const { createPayment, verifySignature, checkTransactionStatus, getVIPPricing } = require('../services/momoService');
const { createZaloPayOrder, verifyCallback: verifyZaloCallback, queryZaloPayStatus } = require('../services/zaloPayService');
const { createTransaction, updateTransaction, getTransactionByMomoOrderId, getTransactionByZaloAppTransId } = require('../services/userService');
const { updateUserVIP } = require('../services/userService');

/**
 * @route   GET /api/payment/pricing
 * @desc    Get VIP pricing plans
 * @access  Public
 */
router.get('/pricing', async (req, res) => {
  try {
    const { getActiveVIPPackages } = require('../services/userService');
    const packages = await getActiveVIPPackages();
    
    res.json({
      success: true,
      pricing: packages.map(pkg => ({
        duration: pkg.duration_months,
        price: pkg.price,
        title: pkg.title,
        description: pkg.description,
        discount_label: pkg.discount_label || null,
        is_featured: pkg.is_featured
      }))
    });
  } catch (error) {
    console.error('Get pricing error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route   POST /api/payment/create
 * @desc    Create MoMo payment
 * @access  Private
 */
router.post('/create', requireAuth, async (req, res) => {
  try {
    const { duration_months } = req.body;
    const userId = req.user.id;

    const pricing = await getVIPPricing();
    const validDurations = Object.keys(pricing).map(Number);
    
    if (!validDurations.includes(duration_months)) {
      return res.status(400).json({
        success: false,
        error: `Invalid duration. Available durations: ${validDurations.join(', ')} months`
      });
    }

    const amount = pricing[duration_months];

    // Create transaction record
    const transaction = await createTransaction({
      user_id: userId,
      amount,
      duration_months,
      momo_order_id: '', // Will be updated
      momo_request_id: ''
    });

    // Create MoMo payment
    const paymentResult = await createPayment(userId, duration_months, transaction.id);

    // Update transaction with MoMo IDs
    await updateTransaction(transaction.id, {
      momo_order_id: paymentResult.orderId,
      momo_request_id: paymentResult.requestId
    });

    console.log(`✅ Created transaction ${transaction.id} with orderId: ${paymentResult.orderId}`);

    res.json({
      success: true,
      payUrl: paymentResult.payUrl,
      orderId: paymentResult.orderId,
      deeplink: paymentResult.deeplink,
      qrCodeUrl: paymentResult.qrCodeUrl,
      transactionId: transaction.id
    });
  } catch (error) {
    console.error('Payment creation error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route   POST /api/payment/callback
 * @desc    MoMo IPN callback
 * @access  Public (called by MoMo)
 */
router.post('/callback', async (req, res) => {
  try {
    console.log('🔔 MoMo Callback received:', JSON.stringify(req.body, null, 2));

    // Verify signature
    const isValid = verifySignature(req.body);
    if (!isValid) {
      console.error('❌ Invalid signature from MoMo callback');
      return res.status(400).json({
        success: false,
        error: 'Invalid signature'
      });
    }

    const { orderId, resultCode, transId } = req.body;

    // Get transaction
    const transaction = await getTransactionByMomoOrderId(orderId);
    if (!transaction) {
      console.error('❌ Transaction not found for order:', orderId);
      return res.status(404).json({
        success: false,
        error: 'Transaction not found'
      });
    }

    // Update transaction
    if (resultCode === 0) {
      // Payment successful
      await updateTransaction(transaction.id, {
        status: 'completed',
        momo_trans_id: String(transId)
      });

      // Grant VIP access
      await updateUserVIP(transaction.user_id, transaction.duration_months);

      console.log(`✅ VIP granted to user ${transaction.user_id} for ${transaction.duration_months} months`);
    } else {
      // Payment failed
      await updateTransaction(transaction.id, {
        status: 'failed'
      });

      console.log(`❌ Payment failed for transaction ${transaction.id}, resultCode: ${resultCode}`);
    }

    // Return 200 to MoMo
    res.status(200).json({
      success: true
    });
  } catch (error) {
    console.error('❌ Callback processing error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route   GET /api/payment/status/:orderId
 * @desc    Check payment status
 * @access  Private (or public for testing)
 */
router.get('/status/:orderId', optionalAuth, async (req, res) => {
  try {
    const { orderId } = req.params;

    console.log(`🔍 Checking status for orderId: ${orderId}`);

    const transaction = await getTransactionByMomoOrderId(orderId);
    if (!transaction) {
      console.log(`❌ Transaction not found for orderId: ${orderId}`);
      return res.status(404).json({
        success: false,
        error: 'Transaction not found',
        debug: { orderId }
      });
    }

    console.log(`✅ Found transaction:`, {
      id: transaction.id,
      user_id: transaction.user_id,
      momo_order_id: transaction.momo_order_id,
      status: transaction.status
    });

    // Verify user owns this transaction (skip if not authenticated)
    if (req.user && transaction.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    // Check with MoMo if still pending
    if (transaction.status === 'pending') {
      try {
        console.log(`🔄 Checking MoMo status for pending transaction...`);
        const momoStatus = await checkTransactionStatus(orderId, transaction.momo_request_id);
        console.log(`📊 MoMo status response:`, momoStatus);
        
        if (momoStatus.resultCode === 0) {
          // Payment completed
          await updateTransaction(transaction.id, {
            status: 'completed',
            momo_trans_id: String(momoStatus.transId)
          });
          await updateUserVIP(transaction.user_id, transaction.duration_months);
          transaction.status = 'completed';
          console.log(`✅ Updated transaction to completed`);
        } else if (momoStatus.resultCode !== 1000) {
          // Failed (resultCode 1000 means still pending)
          await updateTransaction(transaction.id, {
            status: 'failed'
          });
          transaction.status = 'failed';
          console.log(`❌ Updated transaction to failed, resultCode: ${momoStatus.resultCode}`);
        }
      } catch (error) {
        console.error('Error checking MoMo status:', error);
      }
    }

    res.json({
      success: true,
      transaction: {
        id: transaction.id,
        orderId: transaction.momo_order_id,
        amount: transaction.amount,
        duration: transaction.duration_months,
        status: transaction.status,
        createdAt: transaction.created_at
      }
    });
  } catch (error) {
    console.error('Status check error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});



/**
 * @route   POST /api/payment/create-zalopay
 * @desc    Create ZaloPay payment
 * @access  Private
 */
router.post('/create-zalopay', requireAuth, async (req, res) => {
  try {
    const { duration_months } = req.body;
    const userId = req.user.id;

    const pricing = await getVIPPricing();
    const validDurations = Object.keys(pricing).map(Number);
    
    if (!validDurations.includes(duration_months)) {
      return res.status(400).json({
        success: false,
        error: `Invalid duration. Available durations: ${validDurations.join(', ')} months`
      });
    }

    const amount = pricing[duration_months];

    // Create transaction record
    const transaction = await createTransaction({
      user_id: userId,
      amount,
      duration_months,
      payment_method: 'zalopay'
    });

    // Create ZaloPay order
    const result = await createZaloPayOrder(userId, duration_months, transaction.id);

    // Update transaction with app_trans_id
    await updateTransaction(transaction.id, {
      zalopay_app_trans_id: result.app_trans_id,
      zalopay_zp_trans_token: result.zp_trans_token
    });

    res.json({
      success: true,
      payUrl: result.payUrl,
      app_trans_id: result.app_trans_id
    });
  } catch (error) {
    console.error('Create ZaloPay error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Payment creation failed'
    });
  }
});

/**
 * @route   POST /api/payment/zalopay-callback
 * @desc    Handle ZaloPay IPN callback
 * @access  Public
 */
router.post('/zalopay-callback', async (req, res) => {
  try {
    const verification = await verifyZaloCallback(req.body);

    if (!verification.isValid) {
      return res.json({ return_code: 0, return_message: "Mac not equal" });
    }

    const data = verification.data;
    const appTransId = data.app_trans_id;
    const transaction = await getTransactionByZaloAppTransId(appTransId);

    if (!transaction) {
      return res.json({ return_code: 0, return_message: "Order not found" });
    }

    if (transaction.status === 'completed') {
      return res.json({ return_code: 1, return_message: "success" });
    }

    // Payment successful
    await updateTransaction(transaction.id, {
      status: 'completed',
      // Store other data if needed
    });

    // Grant VIP access
    await updateUserVIP(transaction.user_id, transaction.duration_months);

    console.log(`✅ ZaloPay: VIP granted to user ${transaction.user_id} for ${transaction.duration_months} months`);

    res.json({ return_code: 1, return_message: "success" });
  } catch (error) {
    console.error('ZaloPay Callback Error:', error);
    res.json({ return_code: 0, return_message: error.message });
  }
});

/**
 * @route   GET /api/payment/check-zalopay-status/:app_trans_id
 * @desc    Check ZaloPay transaction status
 * @access  Private
 */
router.get('/check-zalopay-status/:app_trans_id', requireAuth, async (req, res) => {
  try {
    const { app_trans_id } = req.params;
    const transaction = await getTransactionByZaloAppTransId(app_trans_id);

    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    // Check with ZaloPay
    const zpStatus = await queryZaloPayStatus(app_trans_id);

    if (zpStatus.return_code === 1) { // 1 means success
      if (transaction.status !== 'completed') {
         await updateTransaction(transaction.id, {
          status: 'completed'
        });
        await updateUserVIP(transaction.user_id, transaction.duration_months);
      }
      return res.json({ success: true, status: 'completed' });
    } else if (zpStatus.return_code === 2) { // 2 means failed
       if (transaction.status !== 'failed') {
        await updateTransaction(transaction.id, {
          status: 'failed'
        });
      }
      return res.json({ success: true, status: 'failed', message: zpStatus.return_message });
    }

    // 3 means pending
    res.json({ success: true, status: 'pending' });
  } catch (error) {
    console.error('Check ZaloPay status error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to check status'
    });
  }
});

/**
 * @route   POST /api/payment/manual-complete/:orderId
 * @desc    Manually mark payment as complete
 * @access  Admin (transactions:manage)
 */
router.post('/manual-complete/:orderId', requirePermission('transactions:manage'), async (req, res) => {
  try {
    const { orderId } = req.params;

    const transaction = await getTransactionByMomoOrderId(orderId);
    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: 'Transaction not found'
      });
    }

    // Update transaction to completed
    await updateTransaction(transaction.id, {
      status: 'completed',
      momo_trans_id: 'MANUAL_' + Date.now()
    });

    // Grant VIP access
    await updateUserVIP(transaction.user_id, transaction.duration_months);

    console.log(`✅ Manually completed transaction ${transaction.id} for user ${transaction.user_id}`);

    res.json({
      success: true,
      message: 'Transaction marked as completed',
      transaction: {
        id: transaction.id,
        orderId: transaction.momo_order_id,
        status: 'completed'
      }
    });
  } catch (error) {
    console.error('Manual complete error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;

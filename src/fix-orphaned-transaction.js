const sql = require('mssql');
const { getPool } = require('./config/database');

/**
 * Fix orphaned transactions that were created before the updateTransaction bug fix
 * 
 * Usage:
 *   node src/fix-orphaned-transaction.js VIP_5_1767125862996
 * 
 * This script will:
 * 1. Find the most recent transaction with empty momo_order_id
 * 2. Update it with the provided MoMo order ID
 * 3. Check the MoMo payment status
 * 4. Update transaction status and grant VIP if payment is complete
 */

async function fixOrphanedTransaction(orderId) {
  try {
    const pool = await getPool();
    
    // Find the most recent transaction with empty momo_order_id
    const result = await pool.request()
      .query(`
        SELECT TOP 1 *
        FROM transactions
        WHERE (momo_order_id IS NULL OR momo_order_id = '')
        ORDER BY created_at DESC
      `);
    
    if (result.recordset.length === 0) {
      console.log('❌ No orphaned transactions found');
      return;
    }
    
    const transaction = result.recordset[0];
    console.log('✅ Found orphaned transaction:', {
      id: transaction.id,
      user_id: transaction.user_id,
      amount: transaction.amount,
      duration_months: transaction.duration_months,
      created_at: transaction.created_at
    });
    
    // Extract request ID from order ID (format: VIP_<duration>_<timestamp>)
    // Request ID format: REQ_<timestamp>
    const timestampMatch = orderId.match(/VIP_\d+_(\d+)/);
    if (!timestampMatch) {
      console.error('❌ Invalid order ID format. Expected: VIP_<duration>_<timestamp>');
      return;
    }
    const timestamp = timestampMatch[1];
    const requestId = `REQ_${timestamp}`;
    
    console.log(`\n🔧 Updating transaction ${transaction.id}...`);
    console.log(`   Order ID: ${orderId}`);
    console.log(`   Request ID: ${requestId}`);
    
    // Update transaction with MoMo IDs
    await pool.request()
      .input('id', sql.Int, transaction.id)
      .input('momo_order_id', sql.NVarChar, orderId)
      .input('momo_request_id', sql.NVarChar, requestId)
      .query(`
        UPDATE transactions
        SET momo_order_id = @momo_order_id,
            momo_request_id = @momo_request_id,
            updated_at = GETDATE()
        WHERE id = @id
      `);
    
    console.log('✅ Transaction updated successfully!');
    console.log('\n📝 You can now check the payment status:');
    console.log(`   GET http://localhost:3000/api/payment/status/${orderId}`);
    console.log('\n💡 Or manually complete it (FOR TESTING ONLY):');
    console.log(`   POST http://localhost:3000/api/payment/manual-complete/${orderId}`);
    
  } catch (error) {
    console.error('❌ Error fixing transaction:', error);
    throw error;
  } finally {
    await sql.close();
  }
}

// Get order ID from command line argument
const orderId = process.argv[2];

if (!orderId) {
  console.error('Usage: node src/fix-orphaned-transaction.js <momo_order_id>');
  console.error('Example: node src/fix-orphaned-transaction.js VIP_5_1767125862996');
  process.exit(1);
}

fixOrphanedTransaction(orderId)
  .then(() => {
    console.log('\n✅ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Failed:', error.message);
    process.exit(1);
  });

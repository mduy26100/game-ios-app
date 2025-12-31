const bcrypt = require('bcryptjs');

async function generateHashes() {
  const passwords = {
    'admin123': await bcrypt.hash('admin123', 10),
    'test123': await bcrypt.hash('test123', 10)
  };

  console.log('Password Hashes:');
  console.log('================');
  console.log(`admin123: ${passwords.admin123}`);
  console.log(`test123: ${passwords.test123}`);
  console.log('');
  console.log('Copy these hashes to scripts/seed-data.sql');
}

generateHashes().catch(console.error);

/**
 * Payment Accounts Configuration Script
 * 
 * This script configures crypto wallet addresses for the trading platform.
 * Run this with: node configure-payment-accounts.js
 * 
 * Make sure you have your admin JWT token ready.
 */

const cryptoAddresses = {
  // Tron (TRC-20)
  TRON: "TJJwio3cDnPFf214nCfHc7wCskfmJpf1Pr",
  USDT_TRC20: "TJJwio3cDnPFf214nCfHc7wCskfmJpf1Pr",
  
  // Bitcoin
  BTC: "bc1qy4dl4rz9twxzhgvm4qOc7a56xdmnz6f6mt5le6",
  
  // Solana
  SOLANA: "By9qdy3EtEaxTLdMXNU1B7v5PiamkXL4aBjvfUJW1",
  
  // EVM-compatible chains (same address for all)
  LINEA: "0xf65095068d92161BE75AffE85402ad9E78AC4719",
  ARBITRUM: "0xf65095068d92161BE75AffE85402ad9E78AC4719",
  BNB: "0xf65095068d92161BE75AffE85402ad9E78AC4719",
  BASE: "0xf65095068d92161BE75AffE85402ad9E78AC4719",
  POLYGON: "0xf65095068d92161BE75AffE85402ad9E78AC4719",
  
  // Ethereum and ERC-20 tokens
  ETH: "0xf65095068d92161BE75AffE85402ad9E78AC4719",
  USDT_ERC20: "0xf65095068d92161BE75AffE85402ad9E78AC4719",
};

const config = {
  cryptoAddresses: cryptoAddresses
};

console.log('Payment Accounts Configuration:');
console.log(JSON.stringify(config, null, 2));
console.log('\nTo configure, use this API call:');
console.log('\nPUT /admin/payment-config');
console.log('Authorization: Bearer <your_admin_jwt_token>');
console.log('Content-Type: application/json');
console.log('\nBody:');
console.log(JSON.stringify(config, null, 2));

// If running in Node.js with fetch support
if (typeof fetch !== 'undefined') {
  const API_URL = process.env.API_URL || 'http://localhost:3001';
  const ADMIN_TOKEN = process.env.ADMIN_TOKEN;
  
  if (ADMIN_TOKEN) {
    console.log('\n\nAttempting to configure automatically...');
    fetch(`${API_URL}/admin/payment-config`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${ADMIN_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(config),
    })
      .then(res => res.json())
      .then(data => {
        console.log('✅ Configuration successful!');
        console.log(data);
      })
      .catch(err => {
        console.error('❌ Configuration failed:', err.message);
        console.log('\nPlease configure manually using the API call above.');
      });
  } else {
    console.log('\n⚠️  ADMIN_TOKEN not set. Set it as environment variable to auto-configure.');
    console.log('Example: ADMIN_TOKEN=your_token node configure-payment-accounts.js');
  }
}

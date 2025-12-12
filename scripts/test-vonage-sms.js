/**
 * Test Vonage SMS Sending
 * Run with: node scripts/test-vonage-sms.js
 */

require('dotenv').config({ path: '.env.local' });
const { Vonage } = require('@vonage/server-sdk');

const vonage = new Vonage({
  apiKey: process.env.VONAGE_API_KEY,
  apiSecret: process.env.VONAGE_API_SECRET
});

const from = process.env.VONAGE_FROM_NUMBER || "17208930052";
const to = "17349287832";
const text = 'Test message from Bright Audio - Vonage SMS API is working!';

async function sendSMS() {
  console.log('🚀 Sending SMS via Vonage...');
  console.log(`From: ${from}`);
  console.log(`To: ${to}`);
  console.log(`Message: ${text}`);
  console.log('---');

  try {
    const response = await vonage.sms.send({ to, from, text });
    console.log('✅ Message sent successfully!');
    console.log('Response:', JSON.stringify(response, null, 2));
  } catch (err) {
    console.error('❌ Error sending message:');
    console.error(err);
  }
}

sendSMS();

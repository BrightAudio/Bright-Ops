# Secure Payment Processing Implementation

## Overview
The financing system uses **Stripe** for secure, PCI-compliant payment processing. Customer payment information is encrypted and stored by Stripe - your employees never see full account numbers or sensitive data.

## Security Features

### ✅ What Employees CAN See:
- Last 4 digits of bank account or card
- Bank name or card brand (e.g., "Chase", "Visa")
- Payment method type (Bank Account or Card)
- Payment history and transaction status
- Payment amounts and dates

### ❌ What Employees CANNOT See:
- Full account numbers
- Routing numbers
- Full card numbers
- CVV/CVC codes
- Complete card expiration dates
- Customer SSN or Tax ID

## How It Works

### 1. **Customer Payment Method Collection**
When a customer applies for financing:
- They enter their payment information securely via Stripe Elements
- Stripe encrypts and stores the payment details
- Your database only stores:
  - Stripe Customer ID (`cus_xxxxx`)
  - Stripe Payment Method ID (`pm_xxxxx`)
  - Last 4 digits (for display only)
  - Payment method type

### 2. **Payment Processing**
When you process a payment:
```javascript
// Your code only sends references, not actual account details
{
  applicationId: "uuid",
  paymentId: "uuid",
  amount: 150.00
}

// Stripe handles the actual charge using stored payment method
stripe.paymentIntents.create({
  amount: 15000, // $150.00 in cents
  customer: "cus_xxxxx",
  payment_method: "pm_xxxxx",
  off_session: true,
  confirm: true
})
```

### 3. **Data Storage**
Database schema (what YOU store):
```sql
financing_applications:
  stripe_customer_id: 'cus_xxxxx' -- Reference only
  stripe_payment_method_id: 'pm_xxxxx' -- Reference only
  payment_method_last4: '1234' -- Safe to display
  payment_method_brand: 'Chase' -- Safe to display
  payment_method_type: 'us_bank_account' -- Safe to display
```

What STRIPE stores (encrypted):
- Full account numbers
- Routing numbers
- Card security codes
- Full card numbers
- All sensitive PII

## Setup Instructions

### 1. Create Stripe Account
1. Go to [https://stripe.com](https://stripe.com)
2. Sign up for a free account
3. Verify your email and business information

### 2. Get API Keys
1. Log into Stripe Dashboard
2. Go to **Developers** → **API keys**
3. Copy your **Publishable key** (starts with `pk_test_`)
4. Copy your **Secret key** (starts with `sk_test_`)

### 3. Configure Environment Variables
Add to your `.env.local` file:
```bash
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here
STRIPE_SECRET_KEY=sk_test_your_key_here
```

### 4. Configure in Application
1. Navigate to **Settings** → **Payment Settings** (click profile dropdown)
2. Go to **Stripe Integration** tab
3. Paste your Publishable Key and Secret Key
4. Enable Stripe processing
5. Click **Save Stripe Settings**

### 5. Test Mode vs Live Mode
**Test Mode** (Development):
- Use `pk_test_...` and `sk_test_...` keys
- Use test card numbers (4242 4242 4242 4242)
- Use test bank accounts
- No real money is charged

**Live Mode** (Production):
- Switch to `pk_live_...` and `sk_live_...` keys
- Real payments are processed
- Requires business verification with Stripe
- PCI compliance handled by Stripe

## Payment Method Collection Flow

### For Bank Accounts (ACH):
```javascript
// 1. Customer enters bank details in Stripe-hosted form
// 2. Stripe verifies the account (micro-deposits or instant verification)
// 3. Payment method saved as pm_xxxxx
// 4. Only last 4 digits stored in your database
```

### For Cards:
```javascript
// 1. Customer enters card in Stripe Elements
// 2. Stripe validates and tokenizes
// 3. Payment method saved as pm_xxxxx
// 4. Only last 4 and brand stored in your database
```

## Processing Payments

### Manual Payment Processing:
1. Navigate to **Financing** → **Active Loans**
2. Find the loan you want to process
3. Click **Process Payment** button
4. Confirm the payment details
5. System charges customer's saved payment method
6. Email receipt sent automatically

### Payment Flow:
```
User clicks "Process Payment"
  ↓
API calls Stripe with payment method ID
  ↓
Stripe charges customer's account
  ↓
Money transferred to your Stripe balance
  ↓
Stripe auto-transfers to your bank account
  ↓
Email receipt sent to customer
  ↓
Loan balance updated
```

## Compliance & Security

### PCI DSS Compliance
- Stripe is PCI DSS Level 1 certified (highest level)
- Your application never handles raw card data
- No PCI compliance required for your infrastructure
- Stripe handles all card data encryption

### Data Encryption
- Payment data encrypted at rest (AES-256)
- Data encrypted in transit (TLS 1.2+)
- Payment method IDs are tokenized references
- No sensitive data in your database

### Audit Trail
All transactions logged with:
- Timestamp
- Amount
- Status (completed/failed)
- Stripe transaction ID
- Customer email
- Error messages (if failed)

## Testing

### Test Card Numbers:
```
Success: 4242 4242 4242 4242
Decline: 4000 0000 0000 0002
Insufficient Funds: 4000 0000 0000 9995
```

### Test Bank Accounts:
```
Routing: 110000000
Account: 000123456789
```

### Test Flow:
1. Create a financing application
2. Add test payment method
3. Approve the application
4. Process a test payment
5. Check Stripe Dashboard for transaction
6. Verify email receipt was sent

## Stripe Dashboard

View in Stripe Dashboard:
- All transactions
- Customer payment methods
- Failed payments
- Refunds and disputes
- Revenue analytics
- Transfer schedule to your bank

Access: [https://dashboard.stripe.com](https://dashboard.stripe.com)

## Webhook Integration (Optional)

Set up webhooks to receive real-time updates:
1. Go to Stripe Dashboard → **Developers** → **Webhooks**
2. Add endpoint: `https://yourdomain.com/api/webhooks/stripe`
3. Subscribe to events:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `customer.updated`
4. Copy webhook signing secret
5. Add to `.env.local`: `STRIPE_WEBHOOK_SECRET=whsec_...`

## Support & Resources

- **Stripe Documentation**: [https://stripe.com/docs](https://stripe.com/docs)
- **Stripe Support**: Available in dashboard
- **Test Mode**: Practice without real money
- **Stripe CLI**: For local webhook testing

## Production Checklist

Before going live:
- [ ] Switch to live API keys (`pk_live_` and `sk_live_`)
- [ ] Complete Stripe business verification
- [ ] Set up bank account for payouts
- [ ] Configure payout schedule (daily/weekly/monthly)
- [ ] Set up webhooks for production URL
- [ ] Test a small real payment
- [ ] Review Stripe fees (2.9% + 30¢ for cards, 0.8% for ACH)
- [ ] Set up fraud prevention rules in Stripe Radar
- [ ] Configure email receipts
- [ ] Update terms of service with payment terms

## Troubleshooting

### "No payment method on file"
- Customer hasn't completed payment method setup
- Re-send setup link to customer

### "Payment failed - insufficient funds"
- Customer's account doesn't have enough money
- Send payment reminder
- Customer can update payment method

### "Card declined"
- Customer should contact their bank
- May need to approve the charge
- Can try a different card

### "Webhook signature verification failed"
- Check webhook secret in environment variables
- Ensure endpoint URL is correct
- Verify webhook is active in Stripe Dashboard

## Cost Breakdown

### Stripe Fees:
- **Credit/Debit Cards**: 2.9% + $0.30 per transaction
- **ACH Bank Transfers**: 0.8% (capped at $5.00)
- **No monthly fees**
- **No setup fees**

Example:
- $500 payment via card: $500 - ($14.50 + $0.30) = $485.20 received
- $500 payment via ACH: $500 - $4.00 = $496.00 received

## Additional Features

### Auto-Pay
Enable automatic monthly charges:
```javascript
// Set auto_pay_enabled = true
// Stripe will automatically charge on due date
```

### Payment Plans
Create custom payment schedules:
- Monthly installments
- Bi-weekly payments
- Custom due dates

### Late Fees
Automatically add late fees:
```javascript
// Add to financing_payments table
late_fee: 25.00
```

### Refunds
Process refunds through Stripe Dashboard or API

---

**Note**: This system is production-ready and fully secure. Customer payment data is protected by Stripe's bank-level security and never exposed to your employees.

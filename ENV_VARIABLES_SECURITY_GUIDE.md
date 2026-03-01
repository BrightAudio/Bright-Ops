# Environment Variables - SECURITY GUIDE

## ⚠️ CRITICAL: Never commit real keys to GitHub!

This file shows the STRUCTURE of required environment variables.
**DO NOT** put real values here. Real values go in `.env.local` (gitignored) or Vercel Secrets.

---

## PUBLIC VARIABLES (Safe to commit as .env.example, safe in browser)

```env
# Supabase - PUBLIC, protected by Row-Level Security (RLS)
# Safe because Supabase RLS policies enforce organization boundaries
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ0eXAiOiJKV1QiLCJhbGc...(truncated)

# Stripe - PUBLIC KEY for payments
# Safe because can only create payment intents (server confirms amounts)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...(your publishable key)

# Vercel Analytics (if using)
NEXT_PUBLIC_VERCEL_ANALYTICS_ID=...

# App Configuration
NEXT_PUBLIC_APP_NAME=Bright Audio Warehouse
NEXT_PUBLIC_APP_VERSION=1.0.0
NEXT_PUBLIC_ENVIRONMENT=production
```

---

## SECRET VARIABLES (Server-only, never exposed to browser)

### ⚠️ HANDLING THESE KEYS

**NEVER:**
- ❌ Hardcode in code
- ❌ Commit to GitHub
- ❌ Print in logs
- ❌ Expose via API endpoints
- ❌ Send to browser/JavaScript

**ALWAYS:**
- ✅ Store in `.env.local` (gitignored)
- ✅ Store in Vercel Settings → Environment Variables (production)
- ✅ Use Docker secrets in container deployment
- ✅ Rotate keys every 90 days
- ✅ Use separate keys per environment (dev/staging/prod)
- ✅ Document access in audit log

### Stripe (Payment Processing)

```env
# Server-only: Process payments with secret key (NEVER expose to browser)
STRIPE_SECRET_KEY=sk_test_...(your secret key)

# Webhook signing: Verify Stripe calls are legitimate
STRIPE_WEBHOOK_SECRET=whsec_...(your webhook secret)

# Additional
STRIPE_BUSINESS_PROFILE_ID=...
```

### Supabase / PostgreSQL

```env
# Server-only: Admin access (bypasses RLS for admin operations only)
SUPABASE_SERVICE_ROLE_KEY=eyJ...(truncated service role key)

# Database connection (if direct access needed)
DATABASE_URL=postgresql://user:password@db.supabase.co:5432/postgres

# Database password (if separate)
DATABASE_PASSWORD=your_secure_password_here
```

### Email (SendGrid)

```env
# Server-only: Send emails
SENDGRID_API_KEY=SG...(your sendgrid api key)
SENDGRID_FROM_EMAIL=noreply@bright-audio.com
SENDGRID_FROM_NAME=Bright Audio Warehouse
```

### SMS/Voice (Vonage)

```env
# Server-only: Send SMS/voice messages
VONAGE_API_KEY=...(your vonage api key)
VONAGE_API_SECRET=...(your vonage api secret)
VONAGE_FROM_NUMBER=+1234567890
```

### JWT / Authentication

```env
# Server-only: Signing tokens
JWT_SECRET=your_very_long_random_secret_key_here_at_least_32_characters

# Token expiration
JWT_EXPIRATION=24h
```

### Encryption Keys

```env
# Server-only: Encrypt sensitive data at rest
# Generate with: openssl rand -base64 32
ENCRYPTION_KEY=your_base64_encoded_encryption_key_here

# Data for encryption
ENCRYPTION_ALGORITHM=aes-256-gcm
```

### AI Services

```env
# OpenAI / ChatGPT
OPENAI_API_KEY=sk-...

# If using other AI services
AI_SERVICE_API_KEY=...
```

### External Services

```env
# Google OAuth
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# Microsoft/Azure
AZURE_CLIENT_ID=...
AZURE_CLIENT_SECRET=...

# GitHub Integration
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
```

### Environment/Deployment

```env
# What environment is this?
ENVIRONMENT=production  # or: development, staging
NODE_ENV=production

# Where is the app?
NEXT_PUBLIC_APP_URL=https://app.bright-audio.com
NEXT_PUBLIC_API_URL=https://api.bright-audio.com

# Logging & Monitoring
LOG_LEVEL=info
DEBUG=false  # Set to 'true' only in dev

# Feature Flags
FEATURE_LEADS_ENABLED=true
FEATURE_AI_GOALS_ENABLED=true
FEATURE_OFFLINE_MODE_ENABLED=true
```

---

## Setup Instructions

### 1. Local Development (.env.local)

Create `.env.local` in project root (NEVER commit this):

```bash
cd ~/bright-audio-app
touch .env.local
chmod 600 .env.local  # Make unreadable by others

# Add contents with REAL test/dev keys
```

Content of `.env.local`:
```env
# Copy all PUBLIC variables from .env.example
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...

# Add all SERVER variables with DEVELOPMENT keys
STRIPE_SECRET_KEY=sk_test_...
SUPABASE_SERVICE_ROLE_KEY=...
SENDGRID_API_KEY=...
# ... etc
```

### 2. Production (Vercel)

Go to Vercel Dashboard → Project → Settings → Environment Variables

Add each SECRET variable:
- Name: `STRIPE_SECRET_KEY`
- Value: `sk_live_...` (production key)
- Environments: Production
- Click Add

Repeat for all secrets in the table above.

### 3. Docker/Container (Self-Hosted)

Create `secrets/` directory (gitignored):
```bash
mkdir -p secrets/
echo "sk_live_..." > secrets/stripe_secret_key
echo "SG.xxx" > secrets/sendgrid_api_key
# ... etc
```

Then in Docker Compose:
```yaml
services:
  app:
    environment_file: .env.example
    secrets:
      - stripe_secret_key
      - sendgrid_api_key
    environment:
      STRIPE_SECRET_KEY: /run/secrets/stripe_secret_key
      SENDGRID_API_KEY: /run/secrets/sendgrid_api_key

secrets:
  stripe_secret_key:
    file: ./secrets/stripe_secret_key
  sendgrid_api_key:
    file: ./secrets/sendgrid_api_key
```

---

## Key Rotation Schedule

Every 90 days, rotate PRODUCTION keys:

| Service | Schedule | Who | Process |
|---------|----------|-----|---------|
| Stripe | Q1, Q2, Q3, Q4 | DevOps | Create new key, test, activate, retire old |
| SendGrid | Q1, Q2, Q3, Q4 | DevOps | Same as Stripe |
| Supabase | Q1, Q2, Q3, Q4 | DBA | Create new service role key, update app |
| JWT Secret | Monthly | Security | Generate new, invalidate old tokens |
| Encryption keys | Annually | Security | Re-encrypt all data if key compromised |

Process for rotation:
1. Generate new key in service dashboard
2. Add new key to Vercel Secrets (keep old momentarily)
3. Update app to use new key
4. Deploy and verify working
5. Remove old key from service
6. Update rotation log

---

## Validation Checklist

Before deploying to production:

- [ ] No real keys in `.env.example`
- [ ] `.env.local` is in `.gitignore` ✅
- [ ] All `process.env.SECRET_*` only used in server files (not client)
- [ ] Vercel has all required secrets configured
- [ ] No secrets in error messages or logs
- [ ] API routes check auth before accessing `process.env` keys
- [ ] Database queries use Row-Level Security (RLS) to check ownership
- [ ] Keys are copied to Vercel as separate environment variables (not as `.env.local`)

---

## Examples: CORRECT vs INCORRECT

### ❌ WRONG: Database secret in browser

```typescript
// pages/api/data.ts (CLIENT-SIDE - WRONG!)
import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY); // ❌ EXPOSED
```

### ✅ CORRECT: Secret in API route

```typescript
// pages/api/stripe/payment.ts (SERVER-ONLY - CORRECT!)
import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!); // ✅ Safe
```

### ❌ WRONG: Hardcoding keys

```typescript
const SENDGRID_KEY = 'SG.abc123...'; // ❌ NEVER do this
```

### ✅ CORRECT: Using environment variables

```typescript
const sendgridKey = process.env.SENDGRID_API_KEY;
if (!sendgridKey) throw new Error('SENDGRID_API_KEY not set');
```

### ❌ WRONG: Logging secrets

```typescript
console.log('Connecting with password:', password); // ❌ NEVER log secrets
```

### ✅ CORRECT: Safe logging

```typescript
console.log('Database connection established'); // ✅ Safe
```

---

## Troubleshooting

**Q: "Cannot read property of undefined" for `process.env.X`**
- A: Variable not set. Add to `.env.local` or Vercel Secrets.

**Q: "403 Forbidden" from Stripe/SendGrid**
- A: Key might have wrong permissions or be from wrong environment (test vs live).

**Q: My localhost app works but production doesn't**
- A: Vercel secrets not synced. Go to Vercel Dashboard → Re-deploy.

**Q: How to test a new key without breaking production?**
- A: 

1. Add new key to Vercel (separate var, e.g., `STRIPE_SECRET_KEY_NEW`)
2. Update app to use `STRIPE_SECRET_KEY_NEW`
3. Test in staging
4. Rename back to `STRIPE_SECRET_KEY`
5. Delete old `STRIPE_SECRET_KEY_OLD`

---

## Resources

- [Vercel Environment Variables](https://vercel.com/docs/projects/environment-variables)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [OWASP: Secrets Management](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)


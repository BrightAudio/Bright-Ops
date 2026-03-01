# Vercel Deployment Fix - Build Error Resolution

**Issue**: Build failed with `Error: Neither apiKey nor config.authenticator provided` when Stripe webhook route tried to initialize at build time.

**Root Cause**: Environment variables were being accessed at module load time (build time) instead of request time, causing the build to fail when variables weren't set.

**Solution Applied**: Refactored Stripe webhook route to initialize clients **lazily** (inside the request handler) instead of at module level.

---

## Changes Made

### File: `app/api/stripe/webhook/route.ts`

**Before** (❌ Build-time initialization):
```typescript
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20' as any,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);
```

**After** (✅ Request-time initialization):
```typescript
function initializeClients() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('Missing STRIPE_SECRET_KEY environment variable');
  }
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable');
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2024-06-20' as any,
  });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );

  return { stripe, supabase };
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    var { stripe, supabase } = initializeClients();
  } catch (error) {
    console.error('❌ Failed to initialize Stripe/Supabase clients:', error);
    return NextResponse.json(
      { error: 'Webhook handler misconfigured' },
      { status: 500 }
    );
  }
  // ... rest of handler
}
```

---

## What This Fixes

✅ **Build succeeds** even without environment variables (only fails at runtime when webhook is called)

✅ **Lazy loading** means clients are only instantiated when a request comes in

✅ **Better error handling** for missing environment variables

✅ **No more `Error: Failed to collect page data for /api/stripe/webhook`**

---

## Vercel Deployment - Required Configuration

Before deploying to Vercel, ensure these environment variables are set:

### In Vercel Dashboard → Settings → Environment Variables:

```
STRIPE_SECRET_KEY=sk_live_... (or sk_test_... for staging)
STRIPE_WEBHOOK_SECRET=whsec_... (webhook signing secret from Stripe dashboard)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc... (from Supabase Settings → API)
OPENAI_API_KEY=sk-... (optional but recommended)
```

**Important**: These must be set in the Vercel environment BEFORE running the build, which happens automatically on push/deploy.

---

## Post-Deployment Verification

After deploying to Vercel:

1. **Check the build log** - should complete without "Neither apiKey nor config.authenticator" error
2. **Test webhook** - Send a test webhook from Stripe dashboard to verify integration works
3. **Monitor edge cases** - Webhook should gracefully handle missing env vars with 500 error

---

## Why This Pattern is Best Practice

1. **Build-time safety**: Build completes even if environment variables aren't available yet
2. **Runtime validation**: Actually validates environment variables exist when they're used
3. **Better error messages**: Specific error about which variable is missing
4. **Faster CI/CD**: No failures during build step due to missing production secrets

---

## Other API Routes

The following routes already follow this pattern (lazy initialization inside request handlers):
- `app/api/financing/setup-payment/route.ts` ✅
- `app/api/financing/process-payment-stripe/route.ts` ✅
- `app/api/leads/generate-email/route.ts` ✅
- `app/api/chat/route.ts` ✅

These don't need changes.

---

## Next Steps

1. Set environment variables in Vercel dashboard
2. Push code to trigger new build
3. Monitor build logs for successful completion
4. Test Stripe webhook integration

Build should now complete successfully! ✅

# Step 4: License Verification & Device Binding - Testing Guide

**Status**: ✅ Implementation Complete
**Date**: March 1, 2026
**Components**: 
- ✅ `/api/license/verify` endpoint (existing)
- ✅ Device ID generation & binding (desktop/ipc/license.ts)
- ✅ Offline 7-day cache grace period
- ✅ Stripe webhook handler (app/api/webhooks/stripe/route.ts)
- ✅ License state persistence (SQLite)

---

## Architecture Overview

### License Verification Flow

```
Desktop App Startup
    ↓
1. Load cached license_state from SQLite (device_id, status, cache_expires_at)
2. Call /api/license/verify with (userId, deviceId, appVersion)
    ↓
If ONLINE:
    → Server queries Supabase licenses table
    → Computes status based on delinquent_since (0-7=warning, 8-14=limited, 15+=restricted)
    → Updates license_devices table for tracking
    → Returns verification response
    → Desktop caches response (7-day offline grace)
    ↓
If OFFLINE:
    → Check if cached state is valid (cache_expires_at > now)
    → If valid → use cached state with offline=true flag
    → If expired → error (device offline for >7 days)

License Status Degradation (after delinquent_since):
    0-7 days    → status='warning'    (full access + warning banner)
    8-14 days   → status='limited'    (read-only + no sync)
    15+ days    → status='restricted' (read-only + returns only)
```

### Device Binding

```
First Run:
    → Generate UUID device_id
    → Store in license_state table (device_bound_at = now)
    
Subsequent Runs:
    → Read device_id from license_state table
    → Send in /api/license/verify request
    → Server registers device in license_devices table
    
Different Device Detection:
    → App detects device_id mismatch (requires sign-in)
    → User signs in on new device
    → New device_id generated and registered
    → Prevents license sharing across devices
```

---

## Test Scenarios

### Scenario 1: Online Verification (Active License)

**Setup**:
- User has active Stripe subscription (status='active')
- Device is online with internet connectivity
- Supabase is accessible

**Steps**:
1. Launch Bright Ops desktop app
2. App calls `license:verify` IPC handler
3. Handler calls `/api/license/verify` with userId, deviceId, appVersion

**Expected Behavior**:
```
POST /api/license/verify
{
  userId: "user-123",
  deviceId: "550e8400-e29b-41d4-a716-446655440000",
  appVersion: "0.1.0"
}

Response (200 OK):
{
  status: "active",
  plan: "starter",
  license_id: "lic_abc123",
  sync_enabled: true,
  can_create_jobs: true,
  can_add_inventory: true,
  grace_period: {
    days_remaining: 0,
    expires_at: null
  }
}

Desktop Action:
✅ Cache response to license_state table
✅ Set cache_expires_at = now + 7 days
✅ Set next_verify_at = now + 24 hours (adaptive)
✅ App shows normal UI (no banner)
✅ All IPC handlers allow operations
```

**Pass Criteria**:
- [ ] Response received within 2 seconds
- [ ] License state saved to SQLite
- [ ] App displays no warnings
- [ ] sync:syncNow executes without gate errors
- [ ] inventory:create succeeds
- [ ] cache_expires_at is 7 days in future

---

### Scenario 2: Online Verification (Warning State - Days 1-7)

**Setup**:
- Supabase licenses.delinquent_since = now (payment failed)
- Stripe subscription marked as delinquent
- App is online

**Steps**:
1. Launch app (or trigger manual license:verify)
2. Server calculates: daysDelinquent = 4
3. API returns status='warning'

**Expected Behavior**:
```
POST /api/license/verify returns:
{
  status: "warning",
  sync_enabled: true,
  can_create_jobs: true,
  can_add_inventory: true,
  grace_period: {
    days_remaining: 11,
    expires_at: "2026-03-16T14:30:00Z"
  }
}

Desktop Action:
✅ Show warning banner: "Payment failed - 11 days remaining"
✅ All operations allowed (sync, create, add inventory)
✅ Set next_verify_at = now + 2 hours (warning check frequency)
```

**Verification**:
- [ ] Banner displays with correct day count
- [ ] Sync, create, inventory all work
- [ ] Desktop shows warning in UI
- [ ] next_verify_at = now + 2h (adaptive interval)

---

### Scenario 3: Online Verification (Limited State - Days 8-14)

**Setup**:
- delinquent_since = 10 days ago
- App is online
- Server computes status='limited'

**Steps**:
1. Launch app or trigger license:verify
2. Desktop receives status='limited'
3. sync:syncNow is called

**Expected Behavior**:
```
POST /api/license/verify returns:
{
  status: "limited",
  sync_enabled: false,           ← BLOCKED
  can_create_jobs: true,
  can_add_inventory: true,
  grace_period: {
    days_remaining: 5,
    expires_at: "2026-03-16T14:30:00Z"
  }
}

Desktop Action:
✅ Show warning: "Sync blocked - 5 days until restricted mode"
✅ sync:syncNow IPC → assertAllowed('sync.run') → ❌ LICENSE_LIMITED error
✅ inventory:create → ✅ ALLOWED
✅ ops.checkout → ✅ ALLOWED
```

**IPC Handler Test**:
```typescript
// desktop/ipc/sync.ts
ipcMain.handle('sync:syncNow', async () => {
  assertAllowed('sync.run');  // ← Throws: code='LICENSE_LIMITED'
  // ... never reaches here
});
```

**Verification**:
- [ ] Sync operation blocked with error: code='LICENSE_LIMITED'
- [ ] Inventory operations still work
- [ ] Ops (checkout/return) still work
- [ ] DB operations (write locally) still work
- [ ] Warning banner shows 5 days remaining
- [ ] next_verify_at = now + 1h (limited check frequency)

---

### Scenario 4: Online Verification (Restricted State - Days 15+)

**Setup**:
- delinquent_since = 20 days ago
- Server computes status='restricted'
- App is online

**Steps**:
1. Launch app
2. Desktop receives status='restricted'
3. Try various operations

**Expected Behavior**:
```
POST /api/license/verify returns:
{
  status: "restricted",
  sync_enabled: false,
  can_create_jobs: false,        ← BLOCKED
  can_add_inventory: false,      ← BLOCKED
  grace_period: {
    days_remaining: 0,
    expires_at: "2026-03-16T14:30:00Z"  (expired)
  }
}

Desktop Policy Engine decisions:
sync.run            → ❌ LICENSE_RESTRICTED
inventory.create    → ❌ LICENSE_RESTRICTED
ops.checkout        → ✅ ALLOWED (liability safe)
ops.return          → ✅ ALLOWED (liability safe)
read.any            → ✅ ALLOWED
export.data         → ✅ ALLOWED
pullsheets.update   → ❌ LICENSE_RESTRICTED

UI Action:
✅ Show HARD banner: "License suspended - return items only"
✅ Hide create/sync buttons
✅ Show read-only mode indicator
✅ Allow checkout/returns for items
```

**Verification**:
- [ ] Sync completely blocked
- [ ] Job creation blocked
- [ ] Inventory operations blocked (except returns)
- [ ] Item returns still work
- [ ] Read-only UI displayed
- [ ] Banner shows "License suspended"
- [ ] Policy.canPerform('sync.run') returns { allowed: false, code: 'LICENSE_RESTRICTED' }

---

### Scenario 5: Offline Mode (7-Day Cache Grace)

**Setup**:
- App last verified license while online (cache_expires_at = now + 7 days)
- Device disconnects from internet
- App tries to verify license

**Steps**:
1. Disconnect network
2. Launch app (or trigger license:verify)
3. Fetch to `/api/license/verify` fails (no internet)

**Expected Behavior**:
```
LICENSE:VERIFY IPC Handler Logic:
1. Attempt fetch to /api/license/verify → TIMEOUT or CONNECTION_ERROR
2. Catch error block:
   - Check cache_expires_at
   - If cache_expires_at > now → USE CACHED STATE
   - Return: { success: true, data: cachedState, offline: true }

Desktop UI:
✅ Show warning: "Working offline - using cached license state"
✅ Use cached status (e.g., 'active' or 'limited')
✅ Apply cached permissions
✅ Allow normal operations (based on cached state)
```

**Verification**:
- [ ] App operates with cached state
- [ ] Offline badge shown (small indicator)
- [ ] All operations work (based on cached status)
- [ ] UI remains responsive
- [ ] No crash or hard error
- [ ] Response includes offline: true flag

---

### Scenario 6: Cache Expiration (7+ Days Offline)

**Setup**:
- Device offline for 8 days
- cache_expires_at has passed (cache_expires_at < now)
- App tries to verify

**Steps**:
1. Device offline for 8+ days
2. Launch app
3. License:verify calls API, fails

**Expected Behavior**:
```
OFFLINE Check:
- cache_expires_at < now → FALSE (expired)
- status === 'unknown' → TRUE
- Return error: "License cache expired - device offline for >7 days"

Desktop UI:
❌ Hard block: "Device offline too long - internet required"
❌ Prevent sync, operations blocked
❌ Show "Connect online to verify license"
❌ Only allow offline read-only operations
```

**Verification**:
- [ ] App shows hard error message
- [ ] Cache considered expired (>7 days)
- [ ] Most operations blocked (except read-only)
- [ ] Error message clear: internet required

---

### Scenario 7: Device Binding - Same Device

**Setup**:
- First run: app generates device_id = "uuid-1"
- Stores in license_state table
- Restart app on same device

**Steps**:
1. Run app → device_id generated & stored
2. Restart app
3. App loads device_id from SQLite

**Expected Behavior**:
```
Desktop Flow:
1. getCachedLicenseState() reads device_id="uuid-1" from DB
2. license:verify IPC passes deviceId="uuid-1"
3. Server receives same device_id
4. Server updates license_devices (upsert)
5. Response includes same deviceId

Desktop Action:
✅ No re-authentication needed
✅ License verified seamlessly
✅ Continues with normal startup
```

**Verification**:
- [ ] device_id persists across restarts
- [ ] No user re-auth required
- [ ] License_devices table shows updated last_seen_at
- [ ] Same device_id used in all requests

---

### Scenario 8: Device Binding - New Device

**Setup**:
- License was used on Device A (device_id = "uuid-a")
- User installs Bright Ops on Device B
- Device B's SQLite generates new device_id = "uuid-b"

**Steps**:
1. Install app on Device B
2. SQLite creates new device_id="uuid-b"
3. Call license:verify with userId but deviceId="uuid-b"
4. Server processes registration

**Expected Behavior**:
```
Server Flow (in /api/license/verify):
1. Receive deviceId="uuid-b"
2. Query license_devices:
   - Find license by org_id
   - Register device_b: upsert(license_id, device_id="uuid-b")
3. Return successful verification

Desktop Action:
✅ Device registered in license_devices table
✅ User can use license on new device (Starter=1 device, Pro=2 devices, etc.)
✅ last_seen_at updated for Device B
```

**Prevention of Sharing**:
- Enterprise plan: multiple devices allowed
- Pro plan: 2 devices allowed
- Starter: 1 device allowed
- (Server-side enforcement through license_devices count)

**Verification**:
- [ ] license_devices table has entries for both Device A and Device B
- [ ] Both devices show last_seen_at timestamp
- [ ] Device B verification succeeds
- [ ] No manual sign-in needed device binding is automatic

---

### Scenario 9: Stripe Webhook - Payment Failed

**Setup**:
- Customer Stripe subscription is active (status='active', paymill_status='active')
- Payment processing fails (e.g., card declined)

**External Trigger**:
- Stripe sends `payment_intent.payment_failed` event to `/api/webhooks/stripe`

**Steps**:
1. Stripe API processes failed payment
2. Sends webhook: POST /api/webhooks/stripe
3. Webhook handler receives signature
4. Verifies signature using STRIPE_WEBHOOK_SECRET
5. Updates Supabase licenses table

**Expected Behavior**:
```
Webhook POST body:
{
  type: "payment_intent.payment_failed",
  data: {
    object: {
      id: "pi_abc123",
      customer: "cus_xyz789",
      status: "requires_payment_method"
    }
  }
}

Webhook Handler:
1. Verify signature ← stripe.webhooks.constructEvent()
2. Extract customerId="cus_xyz789"
3. Find org by stripe_customer_id
4. Query org WHERE stripe_customer_id="cus_xyz789"
5. UPDATE licenses SET:
   - delinquent_since=now (marks Day 1)
   - status='delinquent'
6. Queue email notification (TODO)

Supabase Update:
licenses table:
  - organization_id: org-123
  - delinquent_since: "2026-03-01T12:00:00Z" ← SET HERE
  - status: 'delinquent'
  - Last updated: "2026-03-01T12:05:00Z"

On Next Verification (app calls /api/license/verify):
- Server calculates: daysDelinquent = (now - delinquent_since) / 86400000
- Returns status='warning' (days 0-7)
```

**Verification**:
- [ ] Webhook received and processed (check logs)
- [ ] Supabase licenses.delinquent_since set to now
- [ ] licenses.status updated to 'delinquent'
- [ ] Next app verification shows status='warning'
- [ ] Day counter starts from delinquent_since

---

### Scenario 10: Stripe Webhook - Invoice Payment Failed

**Setup**:
- Recurring invoice payment fails
- Alternative webhook event: `invoice.payment_failed`

**External Trigger**:
- Stripe sends `invoice.payment_failed` webhook

**Steps**:
1. Stripe invoice system fails payment retry
2. Sends webhook: POST /api/webhooks/stripe with type='invoice.payment_failed'
3. Webhook extracts customer and invoice details

**Expected Behavior**:
```
Webhook Handler Flow (handleInvoicePaymentFailed):
1. Extract customer_id from invoice.customer
2. Find org by stripe_customer_id
3. UPDATE licenses set delinquent_since=now
4. Same degradation as payment_intent.payment_failed

Result:
✅ License degradation begins (Day 1)
✅ Grace period starts countdown
✅ Next app verification returns status='warning'
```

---

## Testing Checklist

### Manual Testing Sequence

**Phase 1: Online Verification**
- [ ] Test Scenario 1: Active license online
- [ ] Verify cache stored to SQLite
- [ ] Verify cache_expires_at is 7 days future
- [ ] Check DeskTop IPC handlers work properly

**Phase 2: License Degradation**
- [ ] Test Scenario 2: Warning state (days 1-7)
- [ ] Test Scenario 3: Limited state (days 8-14)
- [ ] Test Scenario 4: Restricted state (days 15+)
- [ ] Verify UI updates correctly for each state

**Phase 3: Offline Scenarios**
- [ ] Test Scenario 5: Offline with valid cache
- [ ] Test Scenario 6: Offline with expired cache
- [ ] Simulate network disconnection
- [ ] Verify fallback to cached state

**Phase 4: Device Binding**
- [ ] Test Scenario 7: Same device restart
- [ ] Test Scenario 8: Different device registration
- [ ] Check license_devices table populated
- [ ] Verify device_id persistence

**Phase 5: Stripe Integration**
- [ ] Test Scenario 9: Payment failed webhook
- [ ] Test Scenario 10: Invoice payment failed
- [ ] Use Stripe test keys
- [ ] Verify Supabase delinquent_since updated
- [ ] Trigger app verification → shows 'warning'

---

## Implementation Files

| File | Purpose | Status |
|------|---------|--------|
| `desktop/ipc/license.ts` | Device binding, cache mgmt | ✅ Updated |
| `app/api/license/verify/route.ts` | Server verification | ✅ Existing |
| `app/api/webhooks/stripe/route.ts` | Stripe webhook handler | ✅ Created |
| `desktop/main.ts` | License initialization | ✅ Integrated |

---

## Stripe Webhook Setup

### Environment Variables Required

```bash
STRIPE_SECRET_KEY=sk_test_...          # From Stripe Dashboard
STRIPE_WEBHOOK_SECRET=whsec_test_...   # From Stripe Webhooks endpoint config
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
```

### Stripe Dashboard Setup

1. Go to: https://dashboard.stripe.com/developers/webhooks
2. Create new endpoint: `/api/webhooks/stripe`
3. Subscribe to events:
   - `charge.failed`
   - `invoice.payment_failed`
   - `invoice.payment_action_required`
   - `payment_intent.payment_failed`
4. Copy webhook secret → `STRIPE_WEBHOOK_SECRET`

### Testing Webhooks Locally

```bash
# Using Stripe CLI (for local testing)
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Trigger test event
stripe trigger payment_intent.payment_failed
```

---

## Success Criteria for Step 4

- [ ] Device ID generation on first run
- [ ] Device ID persists across restarts
- [ ] License state cached to SQLite (7-day offline grace)
- [ ] Offline mode uses cached state (status, permissions)
- [ ] Cache expires after 7 days offline
- [ ] Stripe webhooks update delinquent_since
- [ ] License status degrades: warning (1-7) → limited (8-14) → restricted (15+)
- [ ] UI displays correct banner for each state
- [ ] IPC handlers enforce state-based permissions
- [ ] All four scenarios test successfully

---

## Next Steps (Step 5)

Once Step 4 testing complete:

1. **Production Stripe Setup**
   - Migrate from test keys to production
   - Set live webhook endpoint in Stripe Dashboard
   - Test with real card transactions

2. **Email Notifications**
   - Implement transactional email queue
   - Send warning emails (days 1-7)
   - Send final notice (days 13-15)

3. **UI Refinements**
   - Add payment retry UI
   - Add "Update payment method" button
   - Add grace period countdown widget

4. **Monitoring**
   - Track webhook processing success rate
   - Monitor license state transitions
   - Alert on failures

---

**Author**: Bright Audio Development Team  
**Date**: March 1, 2026  
**Status**: Ready for Testing

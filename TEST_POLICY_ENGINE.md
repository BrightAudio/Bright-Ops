# Step 3 Policy Engine - Test Plan

## Test Scenarios

### Test Restricted (Days 15+)
**Status:** `restricted`  
**License Plan:** `starter`

#### Setup
1. Current build is set to: `setLicenseGate({ status: "restricted", plan: "starter" })`
2. Installer: `dist/Bright Ops Setup 0.1.0.exe`

#### Expected Results

| Action | Expected Behavior | Error Code |
|--------|-------------------|-----------|
| **Checkout Item** | ❌ BLOCKED | `LICENSE_RESTRICTED` |
| **Pullsheet Update** | ❌ BLOCKED | `LICENSE_RESTRICTED` |
| **Create Inventory** | ❌ BLOCKED | `LICENSE_RESTRICTED` |
| **Sync** | ❌ BLOCKED | `LICENSE_RESTRICTED` |
| **AI/Leads/Goals** | ❌ BLOCKED | `LICENSE_RESTRICTED` + `PLAN_REQUIRED` |
| **Return Item** | ✅ ALLOWED | None |
| **Export Data** | ✅ ALLOWED | None |
| **Read/List** | ✅ ALLOWED | None |

#### How to Verify
1. Install and launch app
2. Renderer should show red banner: "Account in read-only mode due to non-payment (15+ days). Returns and exports allowed."
3. Try to checkout → IPC rejects with `LICENSE_RESTRICTED`
4. Try to create inventory → IPC rejects with `LICENSE_RESTRICTED`
5. Try to sync → IPC rejects with `LICENSE_RESTRICTED`
6. Try to return item → IPC accepts (no error)
7. Try to view inventory/export → works (no error)

---

### Test Limited (Days 8–14)
**Status:** `limited`  
**License Plan:** `starter`

#### Setup
To test, edit `desktop/main.ts`:
```typescript
setLicenseGate({ status: "limited", plan: "starter" });
```
Then rebuild: `npm run electron:build`

#### Expected Results

| Action | Expected Behavior | Error Code |
|--------|-------------------|-----------|
| **Sync** | ❌ BLOCKED | `LICENSE_LIMITED` |
| **Checkout Item** | ✅ ALLOWED | None |
| **Pullsheet Update** | ✅ ALLOWED | None |
| **Create Inventory** | ✅ ALLOWED | None |
| **Return Item** | ✅ ALLOWED | None |
| **Export Data** | ✅ ALLOWED | None |
| **Read/List** | ✅ ALLOWED | None |

#### How to Verify
1. Install and launch app
2. Renderer should show orange banner: "Sync disabled while payment is past due (grace days 8–14)."
3. Try to sync → IPC rejects with `LICENSE_LIMITED`
4. Try to checkout → IPC accepts (no error)
5. Try to create inventory → IPC accepts (no error)
6. Try to return item → IPC accepts (no error)

---

### Test UpdateRequired (Ops-safe)
**Update Policy:** `min_version: "9.9.9"`  
**License Status:** `active`

#### Setup
To test, edit `app/api/app/version/route.ts`:
```typescript
min_version: "9.9.9"  // (higher than 0.1.0)
```
Then rebuild: `npm run electron:build`

#### Expected Results

| Action | Expected Behavior | Error Code |
|--------|-------------------|-----------|
| **Sync** | ❌ BLOCKED | `UPDATE_REQUIRED` |
| **Create Inventory** | ❌ BLOCKED | `UPDATE_REQUIRED` |
| **Checkout Item** | ✅ ALLOWED | None |
| **Pullsheet Update** | ✅ ALLOWED | None |
| **Return Item** | ✅ ALLOWED | None |
| **Export Data** | ✅ ALLOWED | None |
| **Read/List** | ✅ ALLOWED | None |

#### How to Verify
1. Install and launch app
2. Renderer should show yellow banner: "Update required to use sync, create, and premium features."
3. Try to sync → IPC rejects with `UPDATE_REQUIRED`
4. Try to create inventory → IPC rejects with `UPDATE_REQUIRED`
5. Try to checkout → IPC accepts (no error)
6. Try to return item → IPC accepts (no error)

---

## Test Execution Checklist

### Test Restricted
- [ ] Build with `setLicenseGate({ status: "restricted", plan: "starter" })`
- [ ] Install NSIS installer
- [ ] Verify banner appears
- [ ] Test each action from matrix
- [ ] Confirm only ops.return + export + read allowed
- [ ] Document results

### Test Limited
- [ ] Build with `setLicenseGate({ status: "limited", plan: "starter" })`
- [ ] Install NSIS installer
- [ ] Verify banner appears
- [ ] Test sync fails
- [ ] Test checkout/create/return work
- [ ] Document results

### Test UpdateRequired
- [ ] Build with `min_version: "9.9.9"` in API
- [ ] Install NSIS installer
- [ ] Verify banner appears
- [ ] Test sync/create fail
- [ ] Test checkout/return/pullsheet work
- [ ] Document results

## Pass Criteria

✅ All three tests pass if:
1. Restricted mode blocks all paid actions except returns/export/read
2. Limited mode blocks sync only, allows ops
3. UpdateRequired blocks sync/create/premium, allows ops

If any action unexpectedly fails or passes, update `desktop/policy.ts` `canPerform()` logic and rebuild.

# FEATURE GATING AUDIT & CORRECTIONS NEEDED

**Date**: March 1, 2026  
**Status**: INCOMPLETE - Requires updates

---

## 📍 CURRENT STATE: Policy Engine (desktop/policy.ts)

### ✅ CORRECTLY IMPLEMENTED

**License Status-Based Gating**:
```
✅ active/warning   → All operations allowed (plan gates apply)
✅ limited (8-14d)  → sync.run BLOCKED
✅ restricted (15+) → sync, create, ai, leads, goals, checkout, pullsheets BLOCKED
✅                 → Returns + exports ALWAYS ALLOWED
```

**Plan-Based Gating** (Current Implementation):
```
✅ Starter Plan:
   ❌ ai.use         ← Should block
   ❌ leads.use      ← Should block (Enterprise-only)
   ❌ goals.use      ← Should block

✅ Pro Plan:
   ❌ leads.use      ← Should block (Enterprise-only)
   ✅ ai.use        ← Allowed
   ✅ goals.use     ← Allowed

✅ Enterprise Plan:
   ✅ ai.use        ← Allowed
   ✅ leads.use     ← Allowed (Enterprise-only)
   ✅ goals.use     ← Allowed
```

---

## ❌ WHAT'S MISSING: Tier-Specific Feature Gating

### Issue: Not All Features Are Gated

**Features That SHOULD Be Gated But Aren't Currently**:

| Feature | Starter | Pro | Enterprise | Action Needed |
|---------|---------|-----|------------|---------------|
| Barcode scanning | ✅ | ✅ | ✅ | ✅ GATED (basic tier) |
| Pull sheets | ✅ | ✅ | ✅ | ✅ GATED (basic tier) |
| Returns management | ✅ | ✅ | ✅ | ✅ GATED (basic tier) |
| Basic crew scheduling | ✅ | ✅ | ✅ | ⚠️ NOT GATED (should be basic) |
| **Advanced crew scheduling** | ❌ | ✅ | ✅ | ❌ NOT GATED (should be Pro+) |
| **Profit margin tracking** | ❌ | ✅ | ✅ | ❌ NOT GATED (should be Pro+) |
| **Quarterly/YTD reports** | ❌ | ✅ | ✅ | ❌ NOT GATED (should be Pro+) |
| **AI Speaker Designer** | ❌ | ✅ | ✅ | ❌ NOT GATED (should be Pro+) |
| **Goals/Quest system** | ❌ | ✅ | ✅ | ✅ GATED via 'goals.use' |
| **Multi-warehouse (5)** | ❌ | ✅ | ✅ | ❌ NOT GATED (should be Pro+) |
| **Leads CRM** | ❌ | ❌ | ✅ | ✅ GATED via 'leads.use' |
| **AI Lead Discovery** | ❌ | ❌ | ✅ | ❌ NOT GATED (Enterprise-only) |
| **AI Email Generation** | ❌ | ❌ | ✅ | ❌ NOT GATED (Enterprise-only) |
| **Campaign tracking** | ❌ | ❌ | ✅ | ❌ NOT GATED (Enterprise-only) |
| **API access** | ❌ | ❌ | ✅ | ❌ NOT GATED |
| **Advanced analytics/BI** | ❌ | ❌ | ✅ | ❌ NOT GATED |

---

## 🔧 FIXES NEEDED

### Step 1: Extend Action Vocabulary (desktop/policy.ts)

**Add missing actions**:

```typescript
export type Action =
  | 'sync.run'
  | 'inventory.create'
  | 'jobs.create'
  | 'ai.use'                    // ✅ Exists
  | 'ai.speaker_designer'       // ⚠️ ADD - Pro+
  | 'ai.lead_discovery'         // ⚠️ ADD - Enterprise
  | 'ai.email_generation'       // ⚠️ ADD - Enterprise
  | 'leads.use'                 // ✅ Exists
  | 'leads.campaign_tracking'   // ⚠️ ADD - Enterprise
  | 'goals.use'                 // ✅ Exists
  | 'goals.quests'              // ⚠️ ADD - Pro+
  | 'crew.advanced_scheduling'  // ⚠️ ADD - Pro+
  | 'analytics.advanced'        // ⚠️ ADD - Pro+
  | 'analytics.quarterly_ytd'   // ⚠️ ADD - Pro+
  | 'warehouse.multi'           // ⚠️ ADD - Pro+
  | 'warehouse.unlimited'       // ⚠️ ADD - Enterprise
  | 'api.access'                // ⚠️ ADD - Enterprise
  | 'ops.checkout'              // ✅ Exists
  | 'ops.return'                // ✅ Exists
  | 'pullsheets.update'         // ✅ Exists
  | 'export.data'               // ✅ Exists
```

### Step 2: Update canPerform() Logic

**Add tier-based feature checks**:

```typescript
export function canPerform(action: Action): PermissionResult {
  // ... existing license status checks ...

  // 🔒 Plan gating: feature access by subscription level
  if (license.plan === 'starter') {
    // Starter blocklist
    const starterBlocked = [
      'ai.use',
      'ai.speaker_designer',
      'ai.lead_discovery',
      'ai.email_generation',
      'leads.use',
      'leads.campaign_tracking',
      'goals.use',
      'goals.quests',
      'crew.advanced_scheduling',
      'analytics.advanced',
      'analytics.quarterly_ytd',
      'warehouse.multi',
      'warehouse.unlimited',
      'api.access',
    ];
    
    if (starterBlocked.includes(action)) {
      return {
        allowed: false,
        code: 'PLAN_REQUIRED',
        message: `This feature requires Pro plan or higher.`,
        details: { requiredPlan: 'pro', currentPlan: license.plan },
      };
    }
  }

  if (license.plan === 'pro') {
    // Pro blocklist (Enterprise-only features)
    const proBlocked = [
      'ai.lead_discovery',
      'ai.email_generation',
      'leads.campaign_tracking',
      'warehouse.unlimited',
      'api.access',
    ];
    
    if (proBlocked.includes(action)) {
      return {
        allowed: false,
        code: 'PLAN_REQUIRED',
        message: `This feature is Enterprise-only.`,
        details: { requiredPlan: 'enterprise', currentPlan: license.plan },
      };
    }
  }

  // Enterprise has all features ✅

  return { allowed: true };
}
```

### Step 3: Update IPC Handlers

**Add gating checks to UI handlers**:

Currently only a few handlers check gating:
- ✅ sync:syncNow → assertAllowed('sync.run')
- ✅ inventory:create → assertAllowed('inventory.create')
- ✅ inventory:checkoutItem → assertAllowed('ops.checkout')

**Need to add**:
- ❌ analytics:getAdvanced → assertAllowed('analytics.advanced')
- ❌ analytics:getQuarterlyReport → assertAllowed('analytics.quarterly_ytd')
- ❌ crew:scheduleAdvanced → assertAllowed('crew.advanced_scheduling')
- ❌ warehouse:create → assertAllowed('warehouse.multi')
- ❌ leads:* (all leads endpoints) → assertAllowed('leads.use')
- ❌ api:getToken → assertAllowed('api.access')
- ❌ ai:speakerDesigner → assertAllowed('ai.speaker_designer')
- ❌ ai:leadDiscovery → assertAllowed('ai.lead_discovery')
- ❌ ai:emailGeneration → assertAllowed('ai.email_generation')

---

## 🎯 Memory Allocation Error: 16106127360 bytes

### Root Cause Analysis

**Error**: Memory allocation of 16,106,127,360 bytes (≈15GB) failed

**Likely Causes** (in order of probability):

1. **Build Process Memory Leak** (Most Likely)
   - Webpack/Next.js compilation consuming excessive memory
   - Large asset bundling (dist/ folder growing)
   - Multiple Electron builds without cleanup

2. **Node.js Heap Limit Exceeded**
   - Default Node heap ~2GB
   - Hitting ceiling during minification/bundling
   - Tree-shaking / source maps generation

3. **Electron-Builder Process**
   - electron-builder creating large staging directories
   - native module compilation (isolated-vm)
   - Multiple parallel build processes

4. **Development Server**
   - Hot reload memory accumulation
   - Webpack dev server memory leaks
   - File watcher memory growth

---

## ✅ SOLUTION

### For Memory Error: Increase Node Heap

Create/update `.env` or add to build script:

```bash
# Option 1: Set environment variable before npm run
$env:NODE_OPTIONS = "--max-old-space-size=4096"
npm run electron:build

# Option 2: Add to package.json scripts
"electron:build": "NODE_OPTIONS=--max-old-space-size=4096 electron-builder build"

# Option 3: Permanent in .npmrc
node-options=--max-old-space-size=4096
```

### Recommended Values

- **Standard development**: --max-old-space-size=2048 (2GB)
- **Large projects**: --max-old-space-size=4096 (4GB)
- **Electron builds**: --max-old-space-size=4096 (4GB)
- **Maximum (if needed)**: --max-old-space-size=8192 (8GB, half of 16GB)

### Build Cleanup

Add cleanup script:

```bash
# Before building, clean everything
Remove-Item -Path ".next","dist","out","node_modules/.cache" -Recurse -Force -ErrorAction SilentlyContinue
npm run electron:build
```

---

## 📋 IMPLEMENTATION PRIORITY

### CRITICAL (Blocking Deployment)
1. ✅ Add AI Speaker Designer gating (Pro+)
2. ✅ Add Advanced Crew Scheduling gating (Pro+)
3. ✅ Add Leads CRM gating (Enterprise-only)
4. ✅ Add Multi-Warehouse gating (Pro+)
5. ✅ Add Advanced Analytics gating (Pro+)
6. ✅ Add Enterprise-only features gating (API, unlimited)

### HIGH (Important but Not Blocking)
1. Update IPC handlers with full gating
2. Add UI warnings for gated features
3. Update error messages to show "Upgrade to Pro/Enterprise"

### MEDIUM (Polish)
1. Add capability checking in UI (show/hide features)
2. Add "Upgrade" CTA on locked features
3. Add usage telemetry for gated features

---

## 🧪 TESTING CHECKLIST

### Feature Gating Tests

- [ ] Starter user cannot access AI Speaker Designer
- [ ] Starter user cannot access Goals/Quests
- [ ] Starter user cannot access Multi-Warehouse setup
- [ ] Starter user cannot access Advanced Analytics
- [ ] Pro user CAN access AI Speaker Designer
- [ ] Pro user CAN access Goals/Quests
- [ ] Pro user CANNOT access Leads CRM
- [ ] Pro user CANNOT access Enterprise-only API
- [ ] Enterprise user has access to ALL features
- [ ] License change (active → limited) blocks sync immediately
- [ ] License change (limited → restricted) disables checkouts

### Memory Tests

- [ ] Dev server runs without memory errors
- [ ] Electron build completes with 4GB heap
- [ ] Multiple consecutive builds don't accumulate memory
- [ ] Hot reload doesn't leak memory over time

---

## 📝 SUMMARY

### What's Working ✅
- Policy engine structure is solid
- License status gating (active/warning/limited/restricted) works
- Basic plan differentiation (ai.use, leads.use, goals.use) exists
- IPC handler integration pattern established

### What's Missing ❌
- Advanced feature gating (crew scheduling, analytics, warehouses)
- Full IPC handler coverage with gating
- Device limit enforcement (1 device Starter, 3 Pro, 10 Enterprise)
- Token usage limits (1K Pro, 15K Enterprise)

### Quick Fix
Update `desktop/policy.ts` to add missing actions and Pro+/Enterprise-only checks.


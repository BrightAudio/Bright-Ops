# Security Hardening & Desktop Delivery Strategy
**Date**: March 1, 2026  
**Phase**: Security Lockdown + Desktop Installation

---

## I. SECURITY AUDIT & RLS RE-ENABLEMENT

### Current Status: RLS Partially Enabled
- ✅ Some tables have RLS WITH proper organization-scoped policies (ai_tokens, quests, licenses)
- ⚠️ Some tables have RLS with BLANKET "Allow all" policies (speaker_parts, speaker_designs)
- ❌ Unknown tables may have RLS disabled (needs audit via Supabase dashboard)

### A. RLS Audit Checklist

Run this in Supabase SQL Editor to check RLS status on ALL tables:

```sql
-- List all tables and their RLS status
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- List all existing RLS policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  COALESCE(qual::text, 'N/A') as select_condition,
  COALESCE(with_check::text, 'N/A') as check_condition
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

### B. Critical Tables Requiring Strong RLS Policies

#### Priority 1: Authentication & Organization Tables
| Table | Current Status | Required Policy |
|-------|----------------|-----------------|
| `user_profiles` | Need to verify | Users can only see/edit own profile |
| `organizations` | Need to verify | Users can only see org they're in |
| `organization_members` | Need to verify | Members can only see members in their org |

#### Priority 2: Financial Data (HIGHLY SENSITIVE)
| Table | Current Status | Required Policy |
|-------|----------------|-----------------|
| `jobs` | Need to verify | Organization-scoped (jobs.organization_id) |
| `pull_sheets` | Need to verify | Organization-scoped |
| `pull_sheet_items` | Need to verify | Organization-scoped |
| `financial_goals` | Need to verify | Organization-scoped |
| `quarterly_metrics` | Need to verify | Organization-scoped |

#### Priority 3: AI/Licensing (REVENUE CRITICAL)
| Table | Current Status | Required Policy |
|-------|----------------|-----------------|
| `ai_tokens` | ✅ Has RLS | Organization-scoped (verified secure) |
| `ai_token_usage_log` | ✅ Has RLS | Organization-scoped (verified secure) |
| `licenses` | ✅ Has RLS | Organization-scoped (verified secure) |

#### Priority 4: Speaker Designer (Lower Risk)
| Table | Current Status | Required Policy |
|-------|----------------|-----------------|
| `speaker_parts` | ⚠️ Allow All | Should be: **PUBLIC READ** + **Auth-only write** |
| `speaker_designs` | ⚠️ Allow All | Should be: **Organization-scoped** |

---

### C. RLS Re-Enablement: SQL Scripts

#### Step 1: Audit Current RLS Status
```sql
-- Run in Supabase SQL Editor
SELECT tablename, rowsecurity FROM pg_tables 
WHERE schemaname = 'public' AND NOT rowsecurity
ORDER BY tablename;
```
*This will show which tables have RLS DISABLED*

#### Step 2: Enable RLS on Critical Tables
```sql
-- Organization-scoped tables (most critical)
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pull_sheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pull_sheet_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quarterly_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- User account data
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
```

#### Step 3: Create Organization-Scoped RLS Policies
```sql
-- Pattern for shared resource tables (jobs, pull_sheets, etc.)
-- All these tables must have organization_id column

-- Example for jobs table:
DROP POLICY IF EXISTS "Users can view jobs in their organization" ON public.jobs;
CREATE POLICY "Users can view jobs in their organization"
  ON public.jobs
  FOR SELECT
  TO authenticated
  USING (
    organization_id = (
      SELECT organization_id FROM user_profiles 
      WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can modify jobs in their organization" ON public.jobs;
CREATE POLICY "Users can modify jobs in their organization"
  ON public.jobs
  FOR UPDATE
  TO authenticated
  USING (
    organization_id = (
      SELECT organization_id FROM user_profiles 
      WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id = (
      SELECT organization_id FROM user_profiles 
      WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert jobs in their organization" ON public.jobs;
CREATE POLICY "Users can insert jobs in their organization"
  ON public.jobs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id = (
      SELECT organization_id FROM user_profiles 
      WHERE id = auth.uid()
    )
  );

-- Apply same pattern to: pull_sheets, pull_sheet_items, financial_goals, quarterly_metrics, clients
```

#### Step 4: Fix Overly-Permissive Policies
```sql
-- speaker_parts: Should allow public read, auth-only write
DROP POLICY IF EXISTS "Allow all access to speaker_parts" ON public.speaker_parts;

CREATE POLICY "Public can view speaker parts"
  ON public.speaker_parts
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated users can modify speaker parts"
  ON public.speaker_parts
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can create speaker parts"
  ON public.speaker_parts
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- speaker_designs: Should be organization-scoped
DROP POLICY IF EXISTS "Allow all access to speaker_designs" ON public.speaker_designs;

CREATE POLICY "Users can view speaker designs in their organization"
  ON public.speaker_designs
  FOR SELECT
  TO authenticated
  USING (
    organization_id = (
      SELECT organization_id FROM user_profiles 
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can modify designs in their organization"
  ON public.speaker_designs
  FOR UPDATE
  TO authenticated
  USING (
    organization_id = (
      SELECT organization_id FROM user_profiles 
      WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id = (
      SELECT organization_id FROM user_profiles 
      WHERE id = auth.uid()
    )
  );
```

---

## II. ENVIRONMENT VARIABLE & KEY PROTECTION

### A. Current Vulnerabilities

**Risk Level: HIGH**

```
Risks detected:
❌ API keys may be in browser bundles
❌ Supabase anon key exposed in .env (necessary but limited by RLS)
❌ SendGrid/Stripe keys in process.env
❌ Database credentials not isolated per environment
❌ No key rotation strategy
❌ No encryption for sensitive API responses
```

### B. Key Protection Strategy

#### 1. Environment Variable Segregation
```
DEVELOPMENT (local.env):
- NEXT_PUBLIC_SUPABASE_URL (published, safe)
- NEXT_PUBLIC_SUPABASE_ANON_KEY (published, protected by RLS)
- STRIPE_PUBLIC_KEY (published)
- Development-only keys

SERVER-ONLY VARIABLES (.env.local - never commit):
- STRIPE_SECRET_KEY (never exposed to browser)
- SUPABASE_SERVICE_ROLE_KEY (admin, server-only)
- SENDGRID_API_KEY (never exposed to browser)
- VONAGE_API_KEY (never exposed to browser)
- DATABASE_PASSWORD (never exposed)
- JWT_SECRET (never exposed)

PRODUCTION DEPLOYMENT (Vercel/Docker Secrets):
- All keys encrypted in provider's secret management
- Rotated every 90 days
- Different keys for staging vs. production
- Audit logging for all secret access
```

#### 2. Server-Side API Proxy Pattern
PROBLEM: Browser has access to ANON keys, needs to call protected features

SOLUTION: Route sensitive operations through Next.js API routes
```typescript
// ❌ DON'T DO THIS in client code:
const stripe = new Stripe(process.env.STRIPE_PUBLIC_KEY); // Oops, not exposed

// ✅ DO THIS instead:
// Client calls:
fetch('/api/stripe/webhook', { method: 'POST', body: data })

// Then in /api/stripe/webhook/route.ts (SERVER-ONLY):
import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!); // Secret safe here
```

#### 3. Sensitive Data Encryption

For fields with customer's personal financial data:
```sql
-- Example: Add pgcrypto extension
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Encrypt financial data at rest
ALTER TABLE public.financial_goals ADD COLUMN 
  quarter_goal_encrypted bytea;

-- Update row with encrypted data:
UPDATE public.financial_goals 
SET quarter_goal_encrypted = pgp_sym_encrypt(
  quarter_goal::text, 
  'encryption_key_from_secret'
)
WHERE id = '...';

-- Retrieve (decrypted):
SELECT 
  id,
  pgp_sym_decrypt(quarter_goal_encrypted, 'encryption_key_from_secret')::numeric as quarter_goal
FROM public.financial_goals;
```

---

## III. CUSTOMER DATA PROTECTION

### A. Data Classification

**TIER 1 - HIGHLY SENSITIVE** (Encrypt + Audit)
- Customer financial data (revenue, costs, margins)
- Personal contact information (emails, phone for non-published leads)
- Contract terms and pricing
- Payment information (only 4 digits visible)
- Subscription status

**TIER 2 - SENSITIVE** (RLS + Audit Log)
- Job details and client information
- Equipment and asset details
- Lead generation queries
- AI analysis scores

**TIER 3 - NORMAL** (RLS only)
- Equipment catalog/speaker parts
- General system logs

### B. Data Retention Policy

```
DELETE POLICY:
- Soft deletes: data marked deleted_at, hidden from queries
- Hard delete only after 90 days + user request
- No manual customer data deletion within first 30 days (recovery window)
- Financial records: Keep for 7 years (legal requirement)
- Usage logs: Keep for 30 days, then anonymize

GDPR COMPLIANCE:
- Data export on demand (all user data as JSON/CSV)
- "Right to forget" deletion after 30-day window
- Backup deletion verification (confirm soft delete in all backups)
```

### C. Audit Logging
```sql
-- Create audit log table
CREATE TABLE public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  user_id UUID NOT NULL,
  action TEXT NOT NULL, -- 'view', 'create', 'update', 'delete'
  table_name TEXT NOT NULL,
  record_id TEXT NOT NULL,
  changes JSONB, -- What changed
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS for audit log (read-only for users, admins can audit)
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org audit log"
  ON public.audit_log
  FOR SELECT
  TO authenticated
  USING (
    organization_id = (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- Create index for audit queries
CREATE INDEX idx_audit_org_date ON audit_log(organization_id, created_at DESC);
```

---

## IV. DESKTOP INSTALLATION & DELIVERY STRATEGY

### A. Current Desktop Setup Status
✅ **Good News**: App already has Electron configured!
- `package.json` has electron scripts
- `main.ts` / `preload.ts` exist
- `desktop/db/schema.sql` exists (SQLite for offline)
- `electron:build` task available

### B. Downloadable/Installable App Architecture

#### Delivery Approach:
```
1. DEVELOPMENT & TESTING
   ├─ npm run dev (Vercel/Next.js in browser)
   └─ npm run electron:dev (Electron with local SQLite)

2. PRODUCTION BUILD
   ├─ Next.js → Static HTML/JS
   ├─ Compile Electron main.ts → TypeScript
   ├─ Bundle SQLite schema
   └─ Generate installer (.exe, .dmg, .AppImage)

3. DISTRIBUTION
   ├─ Host on bright-audio.com/download
   ├─ Auto-updater (electron-updater)
   ├─ Changelog & release notes
   └─ Code signing for security
```

#### Step 1: Configure Electron Packaging
```json
// package.json updates
{
  "build": {
    "appId": "com.bright-audio.warehouse",
    "productName": "Bright Audio Warehouse",
    "files": [
      "dist/desktop/**/*",
      "node_modules",
      "desktop/db/schema.sql"
    ],
    "win": {
      "target": ["nsis", "portable"],
      "certificateFile": "path/to/cert.pfx",
      "certificatePassword": "$SIGN_CERT_PASSWORD"
    },
    "mac": {
      "target": ["dmg"],
      "signingIdentity": "Developer ID Application"
    },
    "linux": {
      "target": ["AppImage"],
      "category": "Business"
    }
  }
}
```

#### Step 2: Authentication for Offline/Desktop Mode
```typescript
// main.ts - Electron main process
const windows = new Map();

ipcMain.handle('auth:login', async (event, credentials) => {
  // 1. Authenticate against Supabase
  const { data, error } = await supabase.auth.signInWithPassword({
    email: credentials.email,
    password: credentials.password
  });
  
  if (error) return { error };
  
  // 2. Cache session locally
  sessionStorage.setItem('supabase_session', JSON.stringify(data)); // ERROR: sessionStorage is browser only
  
  // Actually, in Electron use:
  const store = new Store();
  store.set('auth_session', data.session);
  
  // 3. Download user data for offline access
  const userData = await downloadUserDataForOfflineSync(data.user.id);
  
  return { success: true, user: data.user };
});

// Download data needed for offline
async function downloadUserDataForOfflineSync(userId) {
  const [jobs, sheets, inventory] = await Promise.all([
    supabase.from('jobs').select('*').eq('organization_id', orgId),
    supabase.from('pull_sheets').select('*').eq('organization_id', orgId),
    supabase.from('inventory_items').select('*').eq('organization_id', orgId),
  ]);
  
  // Store in local SQLite
  db.exec(`
    INSERT INTO jobs VALUES (?, ?, ?, ...);
  `);
  
  return true;
}
```

#### Step 3: Offline-First Data Strategy
```sql
-- SQLite local database structure (already in place)
CREATE TABLE IF NOT EXISTS sync_queue (
  id INTEGER PRIMARY KEY,
  table_name TEXT,
  operation TEXT, -- INSERT, UPDATE, DELETE
  record_id TEXT,
  data JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  synced BOOLEAN DEFAULT 0
);

-- When offline:
-- 1. All changes go to sync_queue
-- 2. User sees local data only
-- 3. Can continue working without network

-- When online:
-- 1. Reconcile changes (server-first conflict resolution)
-- 2. Upload all queued changes
-- 3. Refresh local cache from server
```

#### Step 4: Auto-Update Mechanism
```typescript
// In Electron main process
import { autoUpdater } from 'electron-updater';

autoUpdater.checkForUpdatesAndNotify();

autoUpdater.on('update-downloaded', () => {
  dialog.showMessageBox({
    type: 'info',
    title: 'Update Ready',
    message: 'An update is ready to install',
    buttons: ['Install Now', 'Later']
  }).then(result => {
    if (result.response === 0) {
      autoUpdater.quitAndInstall();
    }
  });
});
```

#### Step 5: Code Signing & Security
```bash
# Windows Signing (requires certificate)
electron-builder \
  --win \
  --sign <path/to/cert.pfx> \
  -c.win.certificatePassword=$SIGN_PASSWORD

# macOS Signing
electron-builder \
  --mac \
  --identity "Developer ID Application: ..."

# Host updates at: https://bright-audio.com/releases
```

### C. Installation Package Contents

```
bright-audio-warehouse-1.0.0-setup.exe (Windows) [~150 MB]
├─ Electron runtime
├─ Next.js build (HTML/JS/CSS)
├─ SQLite binary
├─ Desktop database schema
└─ Auto-updater configuration

bright-audio-warehouse-1.0.0.dmg (macOS) [~180 MB]
└─ App bundle + code signature

Bright-Audio-Warehouse-1.0.0.AppImage (Linux) [~120 MB]
└─ Self-contained executable
```

### D. Distribution & Deployment

#### Option 1: Direct Download (Recommended)
```
Website: bright-audio.com/download
├─ Windows Download Link
├─ macOS Download Link
├─ Linux Download Link
└─ Changelog & System Requirements

Update Server:
bright-audio.com/releases/
├─ latest.yml (metadata for auto-updater)
├─ v1.0.0/
│  ├─ Bright-Audio-Warehouse-Setup-1.0.0.exe
│  ├─ Bright-Audio-Warehouse-1.0.0.dmg
│  └─ Bright-Audio-Warehouse-1.0.0.AppImage
```

#### Option 2: App Stores
- Windows: Microsoft Store (optional, requires approval)
- macOS: App Store (optional, requires notarization)
- Linux: Flathub, Snap Store

### E. First-Time User Setup
```
User Downloads → Runs Installer → 
1. Select Installation Location
2. Create Desktop Shortcut?
3. Create Start Menu Folder (Windows)
4. Login Screen (First startup)
   ├─ Email + Password
   ├─ Or: Login with Google/Microsoft
   ├─ Or: Organization invite link
5. Download Organization Data
6. Ready to use (online or offline)
```

---

## V. IMPLEMENTATION ROADMAP

### Phase 1: Security Hardening (This Week)
- [ ] Audit all tables for RLS status (Supabase dashboard)
- [ ] Enable RLS on critical tables
- [ ] Create organization-scoped RLS policies
- [ ] Fix overly-permissive policies
- [ ] Document all RLS policies
- [ ] Environment variable audit
- [ ] Create `.env.example` with all required vars
- [ ] Commit: "Security Hardening: Enable RLS on all critical tables"

### Phase 2: Desktop Delivery Setup (Week 2)
- [ ] Test `npm run electron:dev`
- [ ] Configure `electron-builder` in package.json
- [ ] Set up code signing certificates (Windows/macOS)
- [ ] Create installer build script
- [ ] Test installation on fresh system
- [ ] Set up download server infrastructure
- [ ] Commit: "Desktop: Configure Electron packaging and signing"

### Phase 3: Auto-Update System (Week 3)
- [ ] Implement electron-updater
- [ ] Create update server at bright-audio.com/releases
- [ ] Test incremental updates
- [ ] Create versioning strategy
- [ ] Commit: "Desktop: Configure auto-update mechanism"

### Phase 4: Offline-First Data (Week 4)
- [ ] Implement sync_queue logic
- [ ] Create server reconciliation endpoint
- [ ] Test offline → online transitions
- [ ] Conflict resolution strategy
- [ ] Commit: "Desktop: Implement offline-first data syncing"

### Phase 5: Production Launch (Week 5)
- [ ] Final security audit
- [ ] Performance testing (1000+ items in inventory)
- [ ] Backup/restore testing
- [ ] Create user documentation
- [ ] Create install guide
- [ ] Deploy to production
- [ ] First release: v1.0.0

---

## VI. COMPLIANCE & STANDARDS

### Security Standards
- ✅ OWASP Top 10 protection
- ✅ Row-Level Security (RLS) enforced
- ✅ Server-side API proxy for secrets
- ✅ Environment variable isolation
- ✅ Encryption for sensitive data
- ✅ Audit logging for all data access
- ✅ Code signing for all installers

### Data Protection
- ✅ GDPR compliance (data export, deletion)
- ✅ CCPA compliance (opt-out, data access)
- ✅ PCI DSS (no full card storage, Stripe-only)
- ✅ SOC 2 audit trail

### Version Control
```
Versioning: Semantic (v1.0.0)
Branch Strategy:
├─ main (production, tagged releases)
├─ staging (pre-production testing)
└─ develop (feature branches)

Release Checklist:
- [ ] All tests passing
- [ ] Security audit complete
- [ ] RLS policies verified
- [ ] API endpoints secured
- [ ] Changelog updated
- [ ] Git tag created
- [ ] Installer built & signed
- [ ] Deployed to production
```

---

## VII. SUCCESS METRICS

### Security
- ✅ 0 RLS violations (audit log)
- ✅ 100% environment variable protection
- ✅ 0 exposed API keys in git history
- ✅ All sensitive data encrypted at rest

### Desktop Delivery
- ✅ App installs in < 1 minute
- ✅ App starts in < 3 seconds
- ✅ Auto-update completes in < 30 seconds
- ✅ User can work offline
- ✅ Data syncs automatically when online

### Compliance
- ✅ All RLS policies documented
- ✅ Audit trail for all data changes
- ✅ User can export data in 5 minutes
- ✅ User can request deletion (completes in 24 hours)

---

## NEXT STEPS

1. **This Session**: Create RLS audit script & run it in Supabase
2. **Today**: Enable RLS on all critical tables
3. **Tomorrow**: Create environment variable protection guide & update .env.example
4. **This Week**: Test Electron build and create installer
5. **Next Week**: Set up auto-updater and deployment infrastructure

**Assigned To**: You & Team  
**Priority**: P0 - Production Security Critical  
**Estimated Time**: 5 weeks (parallel tracks: Security hardening + Desktop setup)

---


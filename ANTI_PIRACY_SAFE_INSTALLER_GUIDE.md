# Anti-Piracy & Safe Installer Strategy
**Bright Audio Warehouse** - Desktop Edition  
**Date**: March 1, 2026

---

## I. YES - CREATE THE INSTALLER

### Why It's Safe & Necessary

✅ **Users expect a real .exe installer**, not a zip file  
✅ **Auto-updates only work reliably through installers**  
✅ **Professional distribution = fewer support tickets**  
✅ **Code signing makes tampering obvious**  
✅ **Piracy prevention happens server-side, not in the installer**

---

## II. THREE-LAYER ANTI-PIRACY ARCHITECTURE

### Layer 1: Code Signing (Trust & Tampering Prevention)

**What it does**: Digital signature proves app is from Bright Audio, unmodified

```
Without signing:
❌ Windows SmartScreen warnings (looks like malware)
❌ Users scared to install
❌ More support tickets

With signing:
✅ Clean install experience
✅ Windows trusts the app
✅ Tampering breaks the signature
```

**Implementation**:
```bash
# Windows: Buy certificate (~$300-500/year) from Sectigo / DigiCert
# Then:
electron-builder --win --sign <your_certificate.pfx>

# macOS: Apple Developer ID ($99/year)
electron-builder --mac --sign "Developer ID Application: ..."

# Linux: No signing needed (open source culture)
electron-builder --linux
```

**Cost**: $300-500 for Windows cert (one-time per year)  
**Result**: User sees "Bright Audio Warehouse" verified publisher ✅

---

### Layer 2: License Verification (Your Existing System - Strengthen It)

**Current state**: You have this already! ✅
- License stored in `public.licenses` table
- Grace period logic exists
- Sync gating works

**Enhance it for desktop**:

#### 2A. Offline License Cache
```typescript
// desktop/lib/licenseManager.ts
class LicenseManager {
  private licensePath = `${app.getPath('userData')}/license.json`;
  
  async cacheMineLicense(license: License) {
    // When app starts, fetch latest from server
    // Cache locally with expiry
    const cached = {
      licenseId: license.id,
      plan: license.plan,
      status: license.status,
      expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000), // 7 day cache
      currentPeriodEnd: license.current_period_end,
      deviceId: this.getOrCreateDeviceId(),
      lastVerifiedAt: Date.now(),
    };
    
    fs.writeFileSync(this.licensePath, JSON.stringify(cached, null, 2), { 
      mode: 0o600  // Read-only by owner
    });
  }
  
  async verifyOfflineLicense(): Promise<boolean> {
    // On launch, if offline: use cached license if not expired
    try {
      const cached = JSON.parse(fs.readFileSync(this.licensePath, 'utf-8'));
      
      // Must have verified within 7 days
      if (cached.lastVerifiedAt < Date.now() - (7 * 24 * 60 * 60 * 1000)) {
        return false; // Cache expired, need server verification
      }
      
      // Must still be within subscription period
      if (new Date(cached.currentPeriodEnd) < new Date()) {
        return false; // Subscription ended
      }
      
      return cached.status === 'active'; // ✅ License is valid
    } catch {
      return false; // No cache or invalid cache
    }
  }
  
  async verifyOnlineLicense(): Promise<boolean> {
    // Try to reach server
    try {
      const response = await fetch('/api/license/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId: this.getOrCreateDeviceId() })
      });
      
      if (response.ok) {
        const license = await response.json();
        await this.cacheMineLicense(license);
        return license.status === 'active';
      }
    } catch (e) {
      // Network error - fall back to offline cache
    }
    
    return await this.verifyOfflineLicense();
  }
}
```

#### 2B. Server-Side License Verification API
```typescript
// app/api/license/verify/route.ts
export async function POST(req: Request) {
  const { deviceId } = await req.json();
  const user = await getUser(req); // From your auth
  
  if (!user) return json({ error: 'Unauthorized' }, { status: 401 });
  
  // Get user's license
  const license = await db.from('licenses')
    .select('*')
    .eq('organization_id', user.organization_id)
    .single();
  
  if (!license) return json({ error: 'No license' }, { status: 404 });
  
  // ✅ LAYER 1: License exists and active
  if (license.status !== 'active') {
    return json({ error: 'License inactive', status: license.status });
  }
  
  // ✅ LAYER 2: Within subscription period
  if (new Date(license.current_period_end) < new Date()) {
    return json({ error: 'Subscription expired' });
  }
  
  // ✅ LAYER 3: Check device binding (see Layer 3)
  const deviceOk = await verifyDeviceBinding(license.id, deviceId, license.plan);
  if (!deviceOk) {
    return json({ error: 'Device limit exceeded or unauthorized' });
  }
  
  // ✅ LAYER 4: Check minimum app version
  const minVersion = license.plan === 'starter' ? '1.0.0' : '1.2.0';
  // (version enforcement handled client-side too)
  
  // ✅ Log the verification
  await db.from('license_activities').insert({
    license_id: license.id,
    action: 'desktop_verification',
    device_id: deviceId,
    ip_address: req.headers.get('x-forwarded-for'),
    timestamp: new Date(),
  });
  
  // ✅ Return license info
  return json({
    licenseId: license.id,
    plan: license.plan,
    status: license.status,
    currentPeriodEnd: license.current_period_end,
    featuresEnabled: {
      sync: true,
      leads: license.plan !== 'starter',
      aiGoals: license.plan !== 'starter',
    },
  });
}
```

**Piracy Prevention Here**: 
- Pirated app has valid license initially
- But can't sync without server verification
- After 7 days offline: stops working
- If license is cancelled: app stops working immediately on next online check

---

### Layer 3: Device Binding (Prevent License Sharing)

**Problem**: One license shared across 10 computers  
**Solution**: Track devices per license

#### Schema (add to your database)
```sql
CREATE TABLE IF NOT EXISTS public.license_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  license_id UUID NOT NULL REFERENCES public.licenses(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL,
  device_name TEXT,
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(license_id, device_id)
);

CREATE INDEX idx_license_devices_license ON license_devices(license_id);
```

#### Device Binding Implementation
```typescript
// desktop/lib/deviceBinding.ts
import { machineIdSync } from 'node-machine-id';

export class DeviceManager {
  private deviceIdPath = `${app.getPath('userData')}/device-id.txt`;
  
  getOrCreateDeviceId(): string {
    try {
      // Get machine-unique ID
      // (hashed MAC address + CPU serial + disk serial)
      return machineIdSync({ original: true });
    } catch {
      // Fallback: generate and store locally
      if (fs.existsSync(this.deviceIdPath)) {
        return fs.readFileSync(this.deviceIdPath, 'utf-8');
      }
      const id = randomUUID();
      fs.writeFileSync(this.deviceIdPath, id);
      return id;
    }
  }
  
  async registerDevice(licenseName: string): Promise<boolean> {
    // Called on first login
    const deviceId = this.getOrCreateDeviceId();
    
    const response = await fetch('/api/license/register-device', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deviceId,
        deviceName: os.hostname(),
        licenseName,
      }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      if (error.code === 'DEVICE_LIMIT_EXCEEDED') {
        // User is over device limit
        // Show message: "This license is registered on X devices.
        // Unregister another device or upgrade to Pro."
        return false;
      }
    }
    
    return true;
  }
}
```

#### API to Register & Verify Devices
```typescript
// app/api/license/register-device/route.ts
export async function POST(req: Request) {
  const { deviceId, deviceName } = await req.json();
  const user = await getUser(req);
  
  if (!user) return json({ error: 'Unauthorized' }, { status: 401 });
  
  const license = await db.from('licenses')
    .select('*')
    .eq('organization_id', user.organization_id)
    .single();
  
  // Get plan limits
  const deviceLimits = {
    'starter': 1,
    'pro': 2,
    'enterprise': 10,
  };
  
  const maxDevices = deviceLimits[license.plan];
  
  // Check if device already registered
  const existing = await db.from('license_devices')
    .select('*')
    .eq('license_id', license.id)
    .eq('device_id', deviceId)
    .single();
  
  if (existing) {
    // Update last seen
    await db.from('license_devices')
      .update({ last_seen_at: new Date() })
      .eq('id', existing.id);
    return json({ ok: true });
  }
  
  // Count active devices (seen in last 30 days)
  const activeDevices = await db.from('license_devices')
    .select('*', { count: 'exact' })
    .eq('license_id', license.id)
    .gte('last_seen_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
  
  if (activeDevices.count >= maxDevices) {
    return json(
      { 
        error: 'Device limit exceeded',
        code: 'DEVICE_LIMIT_EXCEEDED',
        current: activeDevices.count,
        limit: maxDevices,
        message: `Your ${license.plan} plan supports ${maxDevices} device(s). Unregister one or upgrade.`
      },
      { status: 403 }
    );
  }
  
  // Register new device
  await db.from('license_devices').insert({
    license_id: license.id,
    device_id: deviceId,
    device_name: deviceName,
  });
  
  return json({ ok: true });
}
```

**Piracy Prevention**: 
- Starter plan: 1 device only
- Pro: 2 devices
- Enterprise: 10 devices
- Prevents "share 1 Pro license with entire team"

---

### Layer 4: Tamper Detection (Detect Modified Builds)

**Problem**: Someone modifies app to remove version checks  
**Solution**: Hash app files on launch

#### Build Manifest (Generated at Build Time)
```typescript
// scripts/generateBuildManifest.js (run during electron-builder)
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

function hashFile(filePath) {
  const content = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(content).digest('hex');
}

const manifest = {
  version: '1.0.0',
  builtAt: new Date().toISOString(),
  files: {
    'main.js': hashFile(path.join(__dirname, '../dist/electron/main.js')),
    'preload.js': hashFile(path.join(__dirname, '../dist/electron/preload.js')),
  },
};

// Sign the manifest
const manifestJson = JSON.stringify(manifest);
const signature = crypto
  .sign('sha256', Buffer.from(manifestJson), {
    key: fs.readFileSync('./signing-key.pem'),
    format: 'pem',
  })
  .toString('hex');

manifest.signature = signature;

fs.writeFileSync(
  path.join(__dirname, '../dist/build-manifest.json'),
  JSON.stringify(manifest, null, 2)
);

console.log('✅ Build manifest generated and signed');
```

#### Tamper Check (Run on App Launch)
```typescript
// desktop/lib/tampering.ts
import crypto from 'crypto';

export async function verifyBuildIntegrity(): Promise<{ ok: boolean; reason?: string }> {
  try {
    const manifestPath = path.join(app.getAppPath(), 'build-manifest.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    
    // ✅ Check each file hash
    for (const [file, expectedHash] of Object.entries(manifest.files)) {
      const filePath = path.join(app.getAppPath(), file);
      const content = fs.readFileSync(filePath);
      const actualHash = crypto.createHash('sha256').update(content).digest('hex');
      
      if (actualHash !== expectedHash) {
        return {
          ok: false,
          reason: `File ${file} was modified or corrupted`,
        };
      }
    }
    
    // ✅ Verify signature (prove manifest hasn't been tampered with)
    const manifestCopy = { ...manifest };
    const signature = delete manifestCopy.signature;
    
    const publicKey = BRIGHT_AUDIO_PUBLIC_KEY; // Embed in app
    const isValid = crypto.verify(
      'sha256',
      Buffer.from(JSON.stringify(manifestCopy)),
      { key: publicKey, format: 'pem' },
      Buffer.from(manifest.signature, 'hex')
    );
    
    if (!isValid) {
      return {
        ok: false,
        reason: 'Build manifest signature invalid',
      };
    }
    
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      reason: `Integrity check failed: ${error.message}`,
    };
  }
}

// Call this in main process on startup
app.on('ready', async () => {
  const integrity = await verifyBuildIntegrity();
  if (!integrity.ok) {
    dialog.showErrorBox(
      'Security Error',
      `${integrity.reason}. Please reinstall Bright Audio.`
    );
    app.exit(1);
  }
  // Continue startup...
});
```

**Piracy Prevention**: 
- Modified app won't start (fails integrity check)
- Casual cracker can't just copy and modify files

---

### Layer 5: Version Enforcement & Gradual Feature Cutoff

**Problem**: User stays on old version to avoid new version limits  
**Solution**: Enforce minimum version, phase out old versions

#### Version Check Response (from API)
```typescript
// app/api/license/version-info/route.ts
export async function GET(req: Request) {
  const user = await getUser(req);
  const license = await db.from('licenses')
    .select('*')
    .eq('organization_id', user.organization_id)
    .single();
  
  return json({
    minimumVersion: {
      starter: '1.0.0',
      pro: '1.2.0',
      enterprise: '1.0.0',
    }[license.plan],
    
    sunsetVersions: {
      '0.9.0': {
        until: '2026-06-01',
        restrictions: ['sync', 'creation'],
        message: 'Version 0.9 support ends June 1, 2026. Please update.',
      },
      '1.0.0': {
        until: '2026-12-01',
        restrictions: [],
        message: null, // Still supported
      },
    },
    
    currentVersion: '1.2.0',
    releaseNotes: 'https://bright-audio.com/releases/1.2.0',
  });
}
```

#### Client-Side Version Check
```typescript
// desktop/lib/versionCheck.ts
export async function checkVersionRestrictions() {
  const currentVersion = app.getVersion(); // "1.0.5"
  
  const response = await fetch('/api/license/version-info');
  const versionInfo = await response.json();
  
  const sunsetVersion = versionInfo.sunsetVersions[currentVersion];
  
  if (sunsetVersion) {
    const sunsetDate = new Date(sunsetVersion.until);
    const daysLeft = Math.floor((sunsetDate - new Date()) / (1000 * 60 * 60 * 24));
    
    if (daysLeft <= 0) {
      // Version sunset - disable app
      dialog.showErrorBox(
        'Version Sunset',
        `This version of Bright Audio is no longer supported. Please update.`
      );
      app.exit(1);
    } else if (daysLeft <= 30) {
      // Version ending soon - disable features
      return {
        syncDisabled: sunsetVersion.restrictions.includes('sync'),
        creationDisabled: sunsetVersion.restrictions.includes('creation'),
        warningMessage: `${sunsetVersion.message} (${daysLeft} days left)`,
      };
    }
  }
  
  // ✅ Version is current
  return { syncDisabled: false, creationDisabled: false };
}
```

**Piracy Prevention**: 
- Can't arbitrarily stay on old version forever
- Old versions forced to upgrade or lose features
- Prevents indefinite "frozen cracked version"

---

## III. INSTALLER BUILD & SIGNING PROCESS

### Step 1: Configuration
```json
// In package.json or electron-builder.json
{
  "build": {
    "appId": "com.bright-audio.warehouse",
    "productName": "Bright Audio Warehouse",
    
    "win": {
      "target": ["nsis", "portable"],
      "certificateFile": "./build/certs/windows-cert.pfx",
      "certificatePassword": "$SIGN_CERT_PASSWORD"
    },
    
    "mac": {
      "target": ["dmg", "zip"],
      "signingIdentity": "Developer ID Application: Bright Audio LLC"
    },
    
    "linux": {
      "target": ["AppImage", "snap"]
    },
    
    "nsis": {
      "oneClick": false,
      "allowToChangeInstallationDirectory": true,
      "createDesktopShortcut": true,
      "createStartMenuShortcut": true,
      "shortcutName": "Bright Audio Warehouse"
    }
  }
}
```

### Step 2: Build & Sign
```bash
# Windows
npm run electron:build -- --win --publish never

# macOS
npm run electron:build -- --mac --publish never

# Linux
npm run electron:build -- --linux --publish never
```

### Step 3: Auto-Update Configuration
```json
{
  "build": {
    "publish": {
      "provider": "github",
      "owner": "BrightAudio",
      "repo": "Bright-Ops",
      "releaseType": "release"
    }
  }
}
```

---

## IV. ANTI-PIRACY SUMMARY TABLE

| Layer | Mechanism | Cost | Effectiveness | When Active |
|-------|-----------|------|---|---|
| **1** | Code signing | $300-500/yr | High (trust) | Install time |
| **2** | License verification | API call | Very high | Every 7 days |
| **3** | Device binding | DB lookup | High (prevents sharing) | Login + sync |
| **4** | Tamper detection | File hashing | Medium (catches casual mods) | App launch |
| **5** | Version enforcement | API call | Medium (old versions deprecated) | Every update check |

---

## V. IMPLEMENTATION TIMELINE

### Week 1: Build & Sign
- [ ] Obtain Windows code signing certificate
- [ ] Configure electron-builder
- [ ] Test installer on clean VM
- [ ] Create GitHub release workflow

### Week 2: License Verification
- [ ] Implement offline cache
- [ ] Create `/api/license/verify` endpoint
- [ ] Test 7-day grace period offline
- [ ] Test grace period enforcement

### Week 3: Device Binding
- [ ] Add `license_devices` table
- [ ] Implement device ID generation
- [ ] Create `/api/license/register-device` endpoint
- [ ] Test device limit enforcement

### Week 4: Tamper Detection
- [ ] Generate build manifest with signing
- [ ] Implement startup integrity check
- [ ] Test modified file detection
- [ ] Test signature verification

### Week 5: Version Enforcement
- [ ] Create `/api/license/version-info` endpoint
- [ ] Implement version sunset schedule
- [ ] Test feature restriction cutoff
- [ ] Document version strategy

---

## VI. DO THIS FIRST (PRACTICAL NEXT STEPS)

1. **This week**: Build unsigned installer, test on clean Windows VM
2. **Next week**: Get code signing cert, sign installer
3. **Week 3**: Implement license verification + caching
4. **Week 4**: Add device binding to database + API
5. **Week 5**: Add tamper detection + version enforcement

**You don't need all 5 layers day 1.** Start with code signing + license verification. Add device binding soon after. Tamper detection + version enforcement are "nice to have."

---

## VII. PIRACY IS INEVITABLE (Just Make It Unprofitable)

The reality:

- ✗ You can't stop someone from copying your .exe
- ✗ Determined pirates will find workarounds
- ✓ You CAN make it obvious when it's pirated
- ✓ You CAN disable sync/creation for unlicensed copies
- ✓ You CAN invalidate old cracked versions with updates

**Your moat is the license server. Protect that, and piracy becomes a support cost, not a business risk.**


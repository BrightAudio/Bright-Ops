# Mobile App Development Guide
## Building the React Native App Without Breaking Web Code

### ✅ Safe Development Strategy

**Web app remains completely untouched** - All mobile development happens in:
1. Separate React Native project folder
2. Uses existing `/api/v1` endpoints
3. No changes to web UI components
4. No database schema changes (already prepared)

---

## Step 1: Database Migration (Do This First)

### Run the crew warehouse association migration:

```sql
-- File: sql/migrations/2025-12-13_crew_warehouse_associations.sql
-- Copy entire contents to Supabase SQL Editor and run
```

**What this does:**
- Adds `warehouse_id` to employees table
- Updates RLS policies to filter crew by warehouse
- Prevents assigning crew from wrong warehouse to jobs
- **Does NOT break existing code** - all changes are additive

---

## Step 2: Initialize React Native Project

### Create separate mobile app folder:

```bash
# Navigate to parent directory (NOT inside bright-audio-app)
cd C:\Users\Brigh

# Create React Native app
npx react-native@latest init BrightOpsMobile
cd BrightOpsMobile
```

### Install dependencies:

```bash
npm install @supabase/supabase-js
npm install @react-navigation/native @react-navigation/native-stack
npm install react-native-screens react-native-safe-area-context
npm install react-native-camera-kit  # For barcode scanning
npm install @react-native-async-storage/async-storage  # Token storage
```

---

## Step 3: Project Structure

```
BrightOpsMobile/
├── src/
│   ├── api/
│   │   ├── client.ts          # API base client
│   │   ├── auth.ts            # Auth endpoints
│   │   ├── inventory.ts       # Inventory endpoints
│   │   └── pullsheets.ts      # Pull sheet endpoints
│   ├── screens/
│   │   ├── LoginScreen.tsx
│   │   ├── DashboardScreen.tsx
│   │   ├── PullSheetsScreen.tsx
│   │   ├── ScannerScreen.tsx
│   │   └── WarehouseSelectScreen.tsx
│   ├── components/
│   │   ├── BarcodeScanner.tsx
│   │   └── PullSheetItem.tsx
│   ├── context/
│   │   ├── AuthContext.tsx
│   │   └── WarehouseContext.tsx
│   └── utils/
│       ├── storage.ts         # AsyncStorage helpers
│       └── offline-sync.ts    # Offline queue manager
├── App.tsx
└── package.json
```

---

## Step 4: API Client Setup

### `src/api/client.ts`

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'https://your-domain.com/api/v1';

export async function apiRequest(
  endpoint: string,
  options: RequestInit = {}
) {
  const token = await AsyncStorage.getItem('access_token');
  
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
    ...options.headers,
  };

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    // Token expired, try refresh
    await refreshToken();
    return apiRequest(endpoint, options); // Retry
  }

  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || 'API request failed');
  }

  return data;
}

async function refreshToken() {
  const refreshToken = await AsyncStorage.getItem('refresh_token');
  
  const response = await fetch(`${API_URL}/auth/refresh`, {
    headers: { 'x-refresh-token': refreshToken! }
  });

  const { access_token, refresh_token, expires_at } = await response.json();
  
  await AsyncStorage.setItem('access_token', access_token);
  await AsyncStorage.setItem('refresh_token', refresh_token);
  await AsyncStorage.setItem('expires_at', expires_at.toString());
}
```

### `src/api/auth.ts`

```typescript
import { apiRequest } from './client';

export async function validateToken(token: string) {
  return apiRequest('/auth', {
    method: 'POST',
    body: JSON.stringify({ token }),
  });
}
```

### `src/api/inventory.ts`

```typescript
import { apiRequest } from './client';

export async function scanBarcode(barcode: string, warehouseId?: string) {
  return apiRequest('/inventory/scan', {
    method: 'POST',
    body: JSON.stringify({ barcode, warehouse_id: warehouseId }),
  });
}

export async function getInventory(params: {
  warehouse_id?: string;
  category?: string;
  search?: string;
  limit?: number;
  offset?: number;
}) {
  const query = new URLSearchParams(params as any).toString();
  return apiRequest(`/inventory?${query}`);
}
```

### `src/api/pullsheets.ts`

```typescript
import { apiRequest } from './client';

export async function getPullSheets(params: {
  warehouse_id?: string;
  status?: string;
}) {
  const query = new URLSearchParams(params as any).toString();
  return apiRequest(`/pullsheets?${query}`);
}

export async function getPullSheetItems(pullsheetId: string) {
  return apiRequest(`/pullsheets/${pullsheetId}/items`);
}

export async function updatePullSheetItem(
  pullsheetId: string,
  itemId: string,
  qtyPulled: number
) {
  return apiRequest(`/pullsheets/${pullsheetId}/items`, {
    method: 'PATCH',
    body: JSON.stringify({ item_id: itemId, qty_pulled: qtyPulled }),
  });
}
```

---

## Step 5: Core Screens

### `src/screens/LoginScreen.tsx`

```typescript
import React, { useState } from 'react';
import { View, TextInput, Button, Text } from 'react-native';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { validateToken } from '../api/auth';

const supabase = createClient(
  'YOUR_SUPABASE_URL',
  'YOUR_SUPABASE_ANON_KEY'
);

export default function LoginScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      const token = data.session!.access_token;
      const refreshToken = data.session!.refresh_token;

      // Validate and get user info
      const { user } = await validateToken(token);

      // Store tokens
      await AsyncStorage.setItem('access_token', token);
      await AsyncStorage.setItem('refresh_token', refreshToken);
      await AsyncStorage.setItem('expires_at', data.session!.expires_at!.toString());
      await AsyncStorage.setItem('user', JSON.stringify(user));

      navigation.replace('Dashboard');
    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={{ flex: 1, justifyContent: 'center', padding: 20 }}>
      <Text style={{ fontSize: 24, marginBottom: 20 }}>Bright Ops Mobile</Text>
      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        style={{ borderWidth: 1, padding: 10, marginBottom: 10 }}
      />
      <TextInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={{ borderWidth: 1, padding: 10, marginBottom: 20 }}
      />
      <Button title="Login" onPress={handleLogin} disabled={loading} />
    </View>
  );
}
```

### `src/screens/ScannerScreen.tsx`

```typescript
import React, { useState } from 'react';
import { View, Text, Button } from 'react-native';
import { Camera } from 'react-native-camera-kit';
import { scanBarcode } from '../api/inventory';

export default function ScannerScreen({ route }: any) {
  const { warehouseId, onScan } = route.params;
  const [scanned, setScanned] = useState(false);

  async function handleBarcodeScan(event: any) {
    if (scanned) return;
    
    setScanned(true);
    const barcode = event.nativeEvent.codeStringValue;

    try {
      const result = await scanBarcode(barcode, warehouseId);
      
      if (result.found) {
        onScan(result.data);
      } else {
        alert('Item not found');
      }
    } catch (error) {
      alert('Scan failed');
    } finally {
      setScanned(false);
    }
  }

  return (
    <View style={{ flex: 1 }}>
      <Camera
        scanBarcode
        onReadCode={handleBarcodeScan}
        style={{ flex: 1 }}
      />
      <Button title="Cancel" onPress={() => navigation.goBack()} />
    </View>
  );
}
```

---

## Step 6: Development Workflow

### 1. Start Metro bundler:
```bash
npm start
```

### 2. Run on Android:
```bash
npm run android
```

### 3. Run on iOS:
```bash
npm run ios
```

### 4. Test API connection:
Update `API_URL` in `client.ts` to:
- Development: `http://localhost:3000/api/v1` (use your computer's IP for physical devices)
- Production: `https://your-domain.com/api/v1`

---

## Step 7: Offline Sync (Optional, Phase 2)

### `src/utils/offline-sync.ts`

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiRequest } from '../api/client';

const QUEUE_KEY = 'offline_queue';

export async function queueUpdate(action: {
  endpoint: string;
  method: string;
  body: any;
}) {
  const queue = await getQueue();
  queue.push({ ...action, timestamp: Date.now(), id: Math.random() });
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export async function syncQueue() {
  const queue = await getQueue();
  
  for (const action of queue) {
    try {
      await apiRequest(action.endpoint, {
        method: action.method,
        body: JSON.stringify(action.body),
      });
      await removeFromQueue(action.id);
    } catch (error) {
      console.error('Sync failed:', error);
      // Keep in queue for retry
    }
  }
}

async function getQueue() {
  const data = await AsyncStorage.getItem(QUEUE_KEY);
  return data ? JSON.parse(data) : [];
}

async function removeFromQueue(id: number) {
  const queue = await getQueue();
  const filtered = queue.filter((item: any) => item.id !== id);
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(filtered));
}
```

---

## ✅ Safety Checklist

- [ ] Run crew warehouse migration in Supabase
- [ ] Create mobile app in **separate folder** (not inside bright-audio-app)
- [ ] Test API endpoints with Postman/curl first
- [ ] Use environment variables for API URL
- [ ] Web app at `http://localhost:3000` continues working
- [ ] Mobile app connects to `/api/v1` endpoints
- [ ] No changes to existing web UI components
- [ ] Git commit web changes before starting mobile dev

---

## Next Steps

1. **Run the migration** - `2025-12-13_crew_warehouse_associations.sql`
2. **Test crew creation** - Verify warehouse_id is assigned
3. **Initialize React Native** - Create separate project
4. **Build login screen** - Connect to Supabase
5. **Test barcode scanning** - Use `/api/v1/inventory/scan`
6. **Iterate safely** - Web and mobile are completely separate

**The web app will not be affected at all** - all mobile code is isolated!

# Mobile API Documentation

## Base URL
`https://your-domain.com/api/v1`

## Authentication
All endpoints require Bearer token authentication:
```
Authorization: Bearer <supabase_jwt_token>
```

---

## Authentication Endpoints

### POST /api/v1/auth
Validate token and get user info

**Request Body:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "profile": {
      "id": "uuid",
      "full_name": "John Doe",
      "email": "user@example.com",
      "organization_id": "uuid",
      "organizations": {
        "name": "Acme Audio"
      }
    },
    "warehouses": [
      {
        "id": "uuid",
        "name": "Main Warehouse",
        "address": "123 Main St"
      }
    ]
  }
}
```

### GET /api/v1/auth/refresh
Refresh access token

**Headers:**
```
x-refresh-token: <refresh_token>
```

**Response:**
```json
{
  "success": true,
  "access_token": "new_token",
  "refresh_token": "new_refresh_token",
  "expires_at": 1234567890
}
```

---

## Inventory Endpoints

### GET /api/v1/inventory
Get inventory items

**Query Parameters:**
- `warehouse_id` (optional): Filter by warehouse
- `category` (optional): Filter by category
- `search` (optional): Search name or barcode
- `limit` (default: 50): Items per page
- `offset` (default: 0): Pagination offset

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "QSC K12.2",
      "barcode": "QSC12345",
      "category": "Speakers",
      "subcategory": "Active",
      "quantity_on_hand": 10,
      "unit_value": 599.99,
      "location": "A1-B2",
      "maintenance_status": "operational",
      "warehouse_id": "uuid"
    }
  ],
  "count": 1,
  "limit": 50,
  "offset": 0
}
```

### POST /api/v1/inventory/scan
Scan barcode and get item

**Request Body:**
```json
{
  "barcode": "QSC12345",
  "warehouse_id": "uuid" // optional
}
```

**Response:**
```json
{
  "success": true,
  "found": true,
  "data": {
    "id": "uuid",
    "name": "QSC K12.2",
    "barcode": "QSC12345",
    "category": "Speakers",
    "quantity_on_hand": 10,
    "location": "A1-B2"
  }
}
```

---

## Pull Sheet Endpoints

### GET /api/v1/pullsheets
Get pull sheets

**Query Parameters:**
- `warehouse_id` (optional): Filter by warehouse
- `status` (optional): draft, picking, finalized
- `limit` (default: 50)
- `offset` (default: 0)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Wedding Setup",
      "code": "PS-001",
      "status": "picking",
      "scheduled_out_at": "2025-12-15T10:00:00Z",
      "expected_return_at": "2025-12-16T18:00:00Z",
      "warehouse_id": "uuid",
      "job_id": "uuid",
      "jobs": {
        "id": "uuid",
        "code": "JOB-001",
        "title": "Smith Wedding",
        "client_name": "John Smith"
      }
    }
  ],
  "count": 1,
  "limit": 50,
  "offset": 0
}
```

### GET /api/v1/pullsheets/[id]/items
Get items for a pull sheet

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "item_name": "QSC K12.2",
      "qty_requested": 4,
      "qty_pulled": 2,
      "qty_fulfilled": 0,
      "category": "Speakers",
      "prep_status": "pending",
      "notes": null,
      "inventory_item_id": "uuid",
      "inventory_items": {
        "id": "uuid",
        "name": "QSC K12.2",
        "barcode": "QSC12345",
        "location": "A1-B2"
      }
    }
  ]
}
```

### PATCH /api/v1/pullsheets/[id]/items
Update pull sheet item (scanning workflow)

**Request Body:**
```json
{
  "item_id": "uuid",
  "qty_pulled": 3,
  "prep_status": "ready" // optional: pending, ready, issue
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "qty_pulled": 3,
    "prep_status": "ready"
  }
}
```

---

## Error Responses

All endpoints return errors in this format:

```json
{
  "error": "Error message description"
}
```

**Common Status Codes:**
- `400` - Bad Request (missing parameters)
- `401` - Unauthorized (invalid/missing token)
- `403` - Forbidden (no warehouse access)
- `404` - Not Found
- `500` - Internal Server Error

---

## Mobile App Workflow

### 1. Login
```typescript
// User logs in with Supabase Auth
const { data, error } = await supabase.auth.signInWithPassword({
  email, password
});

const token = data.session.access_token;
```

### 2. Validate & Get User Info
```typescript
const response = await fetch('https://api.example.com/api/v1/auth', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ token })
});

const { user } = await response.json();
// Store user.warehouses for warehouse selection
```

### 3. Fetch Pull Sheets
```typescript
const response = await fetch(
  `https://api.example.com/api/v1/pullsheets?warehouse_id=${warehouseId}&status=picking`,
  {
    headers: { 'Authorization': `Bearer ${token}` }
  }
);

const { data: pullsheets } = await response.json();
```

### 4. Scan Items
```typescript
// User scans barcode
const response = await fetch('https://api.example.com/api/v1/inventory/scan', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ barcode: scannedCode, warehouse_id: warehouseId })
});

const { found, data: item } = await response.json();
```

### 5. Update Pull Sheet Item
```typescript
// Update quantity pulled
const response = await fetch(
  `https://api.example.com/api/v1/pullsheets/${pullsheetId}/items`,
  {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      item_id: itemId,
      qty_pulled: newQuantity
    })
  }
);
```

---

## Token Refresh Strategy

```typescript
// Check if token expired
if (Date.now() > expiresAt) {
  const response = await fetch('https://api.example.com/api/v1/auth/refresh', {
    headers: { 'x-refresh-token': refreshToken }
  });
  
  const { access_token, refresh_token, expires_at } = await response.json();
  
  // Store new tokens
  await storage.setItem('access_token', access_token);
  await storage.setItem('refresh_token', refresh_token);
  await storage.setItem('expires_at', expires_at);
}
```

---

## Offline Sync Strategy (Future)

### Data to Cache:
1. **Inventory items** - Read-only, sync on app launch
2. **Pull sheets** - Cache active pull sheets with items
3. **Scan updates** - Queue locally, sync when online

### Sync Flow:
```typescript
// On app launch
if (navigator.onLine) {
  await syncOfflineData();
  await fetchLatestData();
}

// Queue offline changes
async function updateItemOffline(itemId, qty) {
  await queueManager.add({
    type: 'UPDATE_ITEM',
    endpoint: `/api/v1/pullsheets/${pullsheetId}/items`,
    data: { item_id: itemId, qty_pulled: qty },
    timestamp: Date.now()
  });
}

// Sync when online
async function syncOfflineData() {
  const queue = await queueManager.getAll();
  
  for (const action of queue) {
    try {
      await fetch(action.endpoint, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(action.data)
      });
      await queueManager.remove(action.id);
    } catch (error) {
      // Keep in queue, retry later
      console.error('Sync failed:', error);
    }
  }
}
```

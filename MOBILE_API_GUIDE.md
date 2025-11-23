# Mobile API Documentation for Glide Integration

This REST API allows Glide (or other mobile apps) to access your lease-to-own financing system.

## Authentication

All endpoints require an API key sent in the `x-api-key` header.

**Setup:**
1. Add to your `.env.local` file:
   ```
   MOBILE_API_KEY=your-secure-random-key-here
   ```
2. Generate a secure key (example):
   ```
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
3. In Glide, configure the REST API connection with this header.

## Base URL

- **Development:** `http://localhost:3000/api/mobile`
- **Production:** `https://your-domain.vercel.app/api/mobile`

---

## Endpoints

### 1. Calculator

**POST** `/api/mobile/calculator`

Calculate lease payment and cost estimate.

**Request Body:**
```json
{
  "purchaseCost": 10000,
  "salesTax": 8.5,
  "termMonths": 36,
  "residualPercentage": 10
}
```

**Response:**
```json
{
  "success": true,
  "calculation": {
    "purchaseCost": 10000,
    "salesTax": 8.5,
    "salesTaxAmount": 850,
    "totalCost": 10850,
    "termMonths": 36,
    "residualPercentage": 10,
    "residualAmount": 1085,
    "financedAmount": 9765,
    "annualInterestRate": 8.9,
    "monthlyPayment": 312.45,
    "totalPayments": 11248.20,
    "totalInterest": 1483.20,
    "totalCostWithInterest": 12333.20
  }
}
```

---

### 2. Applications

**GET** `/api/mobile/applications`

Get financing applications.

**Query Parameters:**
- `client_id` (optional) - Filter by client
- `status` (optional) - Filter by status (pending, approved, active, etc.)
- `limit` (optional) - Max results (default: 50)

**Response:**
```json
{
  "success": true,
  "applications": [
    {
      "id": "uuid",
      "client_id": "uuid",
      "equipment_cost": 10000,
      "sales_tax_rate": 8.5,
      "term_months": 36,
      "monthly_payment": 312.45,
      "status": "pending",
      "created_at": "2025-11-23T...",
      "clients": {
        "id": "uuid",
        "name": "John Doe",
        "email": "john@example.com",
        "phone": "555-1234"
      },
      "equipment_items": [...]
    }
  ],
  "count": 1
}
```

**POST** `/api/mobile/applications`

Create a new financing application.

**Request Body:**
```json
{
  "client_id": "uuid",
  "equipment_cost": 10000,
  "sales_tax_rate": 8.5,
  "term_months": 36,
  "residual_percentage": 10,
  "monthly_payment": 312.45,
  "equipment_items": [
    {
      "name": "Audio Mixer XLR-500",
      "purchase_cost": 5000
    },
    {
      "name": "Speakers (Pair)",
      "purchase_cost": 5000
    }
  ],
  "notes": "Customer requested 36-month term"
}
```

**Response:**
```json
{
  "success": true,
  "application": { ... },
  "message": "Application created successfully"
}
```

---

### 3. Equipment

**GET** `/api/mobile/equipment`

Get equipment items.

**Query Parameters:**
- `application_id` (optional) - Filter by application
- `status` (optional) - Filter by status (active, archived, etc.)
- `limit` (optional) - Max results (default: 100)

**Response:**
```json
{
  "success": true,
  "equipment": [
    {
      "id": "uuid",
      "financing_application_id": "uuid",
      "name": "Audio Mixer XLR-500",
      "purchase_cost": 5000,
      "status": "active",
      "calculated_fmv": 500,
      "created_at": "2025-11-23T...",
      "financing_applications": {
        "id": "uuid",
        "status": "active",
        "term_months": 36,
        "monthly_payment": 312.45,
        "clients": {
          "id": "uuid",
          "name": "John Doe"
        }
      }
    }
  ],
  "count": 1
}
```

---

### 4. Payments

**GET** `/api/mobile/payments`

Get payment history and schedules.

**Query Parameters:**
- `application_id` (optional) - Filter by application
- `client_id` (optional) - Filter by client
- `status` (optional) - Filter by status (paid, pending, overdue)
- `limit` (optional) - Max results (default: 100)

**Response:**
```json
{
  "success": true,
  "payments": [
    {
      "id": "uuid",
      "financing_application_id": "uuid",
      "payment_number": 1,
      "due_date": "2025-12-01",
      "amount": 312.45,
      "status": "pending",
      "amount_paid": null,
      "paid_date": null,
      "financing_applications": {
        "id": "uuid",
        "clients": {
          "name": "John Doe",
          "email": "john@example.com"
        }
      }
    }
  ],
  "summary": {
    "totalPaid": 0,
    "totalPending": 11248.20,
    "overdueCount": 0,
    "count": 36
  }
}
```

---

### 5. Clients

**GET** `/api/mobile/clients`

Get client list.

**Query Parameters:**
- `search` (optional) - Search by name, email, or company
- `limit` (optional) - Max results (default: 100)

**Response:**
```json
{
  "success": true,
  "clients": [
    {
      "id": "uuid",
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "555-1234",
      "company": "ABC Productions"
    }
  ],
  "count": 1
}
```

**POST** `/api/mobile/clients`

Create a new client.

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "555-1234",
  "company": "ABC Productions",
  "address": "123 Main St",
  "city": "Denver",
  "state": "CO",
  "zip": "80202"
}
```

**Response:**
```json
{
  "success": true,
  "client": { ... },
  "message": "Client created successfully"
}
```

---

## Glide Setup Instructions

### Step 1: Create Glide Account
1. Go to https://www.glideapps.com/
2. Sign up for a free account
3. Click "New App"

### Step 2: Configure REST API Connection
1. In Glide, choose "REST API" as your data source
2. Enter your production API URL: `https://your-domain.vercel.app/api/mobile`
3. Add authentication header:
   - Header name: `x-api-key`
   - Header value: Your `MOBILE_API_KEY` from `.env.local`

### Step 3: Add API Endpoints

For each endpoint, click "Add Integration" in Glide:

**Calculator Endpoint:**
- Name: Calculate Payment
- Method: POST
- URL: `/calculator`
- Body: JSON with purchaseCost, salesTax, termMonths, residualPercentage
- Response: Bind to calculated fields

**Applications Endpoint:**
- Name: Get Applications
- Method: GET
- URL: `/applications`
- Query params: status, client_id (optional)
- Response: Bind to applications table

**Create Application:**
- Name: Create Application
- Method: POST
- URL: `/applications`
- Body: JSON with client_id, equipment_cost, etc.

**Clients Endpoint:**
- Name: Get Clients
- Method: GET
- URL: `/clients`
- Response: Use for dropdown/selection lists

**Equipment Endpoint:**
- Name: Get Equipment
- Method: GET
- URL: `/equipment`
- Query params: application_id, status (optional)

**Payments Endpoint:**
- Name: Get Payments
- Method: GET
- URL: `/payments`
- Query params: application_id, client_id (optional)

### Step 4: Build Mobile UI

**Suggested Screens:**

1. **Calculator Screen**
   - Form inputs: Purchase Cost, Sales Tax %, Term (months), Residual %
   - Submit button → Call Calculator API
   - Display results: Monthly Payment, Total Cost, etc.

2. **Create Application Screen**
   - Client selector (from Clients API)
   - Equipment cost input
   - Term selection
   - Calculate button → Call Calculator
   - Submit → Call Create Application API
   - Success → Send SMS option

3. **Applications List**
   - List of applications (from Applications API)
   - Filter by status (pending, approved, active)
   - Tap to view details

4. **Application Detail**
   - Client info
   - Equipment list (from Equipment API)
   - Payment schedule (from Payments API)
   - Status badges

5. **Payment History**
   - List of payments (from Payments API)
   - Filter: Paid, Pending, Overdue
   - Summary stats (total paid, pending)

### Step 5: Test & Deploy

1. Test all API calls in Glide preview
2. Verify authentication works
3. Test on mobile device
4. Publish your Glide app
5. Share link with team

---

## Security Notes

- ✅ API key authentication protects endpoints
- ✅ Use HTTPS in production (automatic with Vercel)
- ✅ Keep `MOBILE_API_KEY` secret - don't commit to Git
- ✅ Consider adding rate limiting for production use
- ✅ Supabase RLS policies still apply for data security

## Next Steps

1. Add `MOBILE_API_KEY` to your environment variables
2. Test endpoints using Postman or curl
3. Configure Glide with your API URL and key
4. Build your mobile UI in Glide
5. Deploy and test!

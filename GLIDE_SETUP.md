# Glide App Setup Guide - Complete Instructions

## Your API Key (Keep This Secure!)
```
d3239dce42db26c7d2095420d34bc04cbac6fdc007263368ce8b1bb3aa250e24
```

## Step 1: Add API Key to Your Environment

1. Open `.env.local` in your project
2. Add this line:
```
MOBILE_API_KEY=d3239dce42db26c7d2095420d34bc04cbac6fdc007263368ce8b1bb3aa250e24
```
3. Save the file
4. Restart your dev server (if running)

---

## Step 2: Import CSV Data to Glide

### Option A: Upload CSVs Directly
1. In Glide, create a new app
2. Choose "CSV" as data source
3. Upload these files from `public/sample-data/`:
   - `clients.csv`
   - `financing_applications.csv`
   - `equipment_items.csv`
   - `financing_payments.csv`

### Option B: Use Google Sheets (Recommended)
1. Create a new Google Sheet
2. Import each CSV as a separate sheet/tab
3. In Glide, choose "Google Sheets" as data source
4. Connect your Google Sheet
5. Glide will auto-detect all 4 tables

---

## Step 3: Add REST API Integration

In Glide, go to **Settings → Integrations → Add Integration**

### Base Configuration
- **Name:** Bright Audio API
- **Type:** REST API
- **Base URL:** 
  - Development: `http://localhost:3000/api/mobile`
  - Production: `https://your-vercel-app.vercel.app/api/mobile`
- **Authentication:** Custom Headers
  - Header Name: `x-api-key`
  - Header Value: `d3239dce42db26c7d2095420d34bc04cbac6fdc007263368ce8b1bb3aa250e24`

---

## Step 4: Configure API Endpoints in Glide

### 1️⃣ Calculator Endpoint (Most Important!)

**Use this to calculate lease payments on mobile**

- **Action Name:** Calculate Payment
- **Method:** POST
- **Endpoint:** `/calculator`
- **Request Body Type:** JSON
- **Request Body:**
```json
{
  "purchaseCost": {{purchase_cost_input}},
  "salesTax": {{sales_tax_input}},
  "termMonths": {{term_months_input}},
  "residualPercentage": {{residual_percentage_input}}
}
```
- **Response Mapping:**
  - Map `calculation.monthlyPayment` → Monthly Payment field
  - Map `calculation.totalCost` → Total Cost field
  - Map `calculation.residualAmount` → FMV field
  - Map `calculation.totalPayments` → Total Payments field

**When to use:** On your calculator screen, bind form inputs and call this API to show payment calculations

---

### 2️⃣ Create Application Endpoint

**Use this to create new lease applications from mobile**

- **Action Name:** Create Application
- **Method:** POST
- **Endpoint:** `/applications`
- **Request Body Type:** JSON
- **Request Body:**
```json
{
  "client_id": {{selected_client_id}},
  "equipment_cost": {{equipment_cost}},
  "sales_tax_rate": {{sales_tax_rate}},
  "term_months": {{term_months}},
  "residual_percentage": {{residual_percentage}},
  "monthly_payment": {{monthly_payment}},
  "equipment_items": {{equipment_items_array}},
  "notes": {{notes_text}}
}
```
- **Response Mapping:**
  - Map `application.id` → Application ID
  - Map `message` → Success message

**When to use:** After calculating payment, submit button creates the application

---

### 3️⃣ Get Applications Endpoint (Optional - if not using CSV)

- **Action Name:** Get Applications
- **Method:** GET
- **Endpoint:** `/applications`
- **Query Parameters:**
  - `status` → {{status_filter}} (optional)
  - `client_id` → {{client_id}} (optional)
  - `limit` → 50

**When to use:** If you want live data instead of CSV import

---

### 4️⃣ Get Clients Endpoint (For Dropdown)

- **Action Name:** Get Clients
- **Method:** GET
- **Endpoint:** `/clients`
- **Query Parameters:**
  - `search` → {{search_text}} (optional)
  - `limit` → 100

**When to use:** Populate client dropdown when creating applications

---

### 5️⃣ Create Client Endpoint

- **Action Name:** Create Client
- **Method:** POST
- **Endpoint:** `/clients`
- **Request Body:**
```json
{
  "name": {{client_name}},
  "email": {{client_email}},
  "phone": {{client_phone}},
  "company": {{client_company}}
}
```

**When to use:** Add new client button in mobile app

---

## Step 5: Build Your Mobile Screens

### Recommended Screen Flow:

#### Screen 1: Calculator
**Purpose:** Generate quick quotes on mobile

**Components:**
1. Number Input → Purchase Cost
2. Number Input → Sales Tax % (default: 8.5)
3. Choice Component → Term Months (24, 36, 48, 60)
4. Number Input → Residual % (default: 10)
5. Button → "Calculate Payment"
   - Action: Call API → Calculate Payment
   - Pass: All input values
6. Display Results:
   - Text → Monthly Payment: ${{monthly_payment}}
   - Text → Total Cost: ${{total_cost}}
   - Text → FMV: ${{residual_amount}}
7. Button → "Create Application" (navigate to next screen)

---

#### Screen 2: Create Application
**Purpose:** Turn quote into actual application

**Components:**
1. Choice Component → Select Client (from CSV or API)
2. Display → Calculated Payment Details (from previous screen)
3. Text Area → Equipment Items
4. Text Area → Notes
5. Button → "Submit Application"
   - Action: Call API → Create Application
   - Pass: client_id, calculated values, equipment, notes
   - Success: Show success message, navigate to applications list

---

#### Screen 3: Applications List
**Purpose:** View all applications

**Components:**
1. List (from CSV/Sheets: financing_applications)
2. Filter by status: pending, approved, active
3. Each item shows:
   - Client name
   - Total cost
   - Monthly payment
   - Status badge
4. Tap item → Navigate to Application Detail

---

#### Screen 4: Application Detail
**Purpose:** View full application info

**Components:**
1. Client info (name, email, phone)
2. Financial details (cost, payment, term)
3. Equipment list (from equipment_items CSV)
4. Payment schedule (from financing_payments CSV)
5. Status badge

---

#### Screen 5: Payments View (Optional)
**Purpose:** Track payment history

**Components:**
1. List (from financing_payments CSV)
2. Filter: Paid, Pending, Overdue
3. Summary cards:
   - Total Paid
   - Total Pending
   - Overdue Count

---

## Step 6: Testing Your Setup

### Test Calculator:
1. Open calculator screen
2. Enter: Purchase Cost = 10000, Tax = 8.5, Term = 36, Residual = 10
3. Click Calculate
4. Should show: Monthly Payment ≈ $312.45

### Test Create Application:
1. Complete calculator
2. Go to create application screen
3. Select a client
4. Enter equipment details
5. Submit
6. Check your Supabase database - new application should appear

### Test CSV Data:
1. Navigate to applications list
2. Should see 5 sample applications
3. Tap one to view details
4. Should see equipment and payments

---

## Step 7: Deploy to Production

1. **Push code to GitHub** (already done ✅)
2. **Vercel will auto-deploy** your API endpoints
3. **Update Glide Base URL** to production:
   - Change from `http://localhost:3000/api/mobile`
   - To: `https://your-app.vercel.app/api/mobile`
4. **Test all API calls** on production URL
5. **Publish Glide app**

---

## Important Notes

### Security:
- ✅ API key protects all endpoints
- ✅ Never commit API key to Git (it's in .env.local which is gitignored)
- ✅ Only share Glide app with authorized users
- ✅ Supabase RLS policies still apply

### CSV vs Live Data:
- **CSV/Sheets:** Great for viewing existing data, easy setup
- **REST API:** Required for calculator, creating applications, adding clients
- **Hybrid approach:** Best of both worlds

### Data Sync:
- CSV data is **static** - won't update automatically
- To update: Export new CSV from Supabase and re-upload
- Or use Google Sheets with automated sync (more complex setup)

### What Each Endpoint Does:
| Endpoint | Use Case | Required? |
|----------|----------|-----------|
| `/calculator` | Generate quotes | ✅ YES |
| `/applications` POST | Create applications | ✅ YES |
| `/applications` GET | View applications | ⚠️ Optional (use CSV) |
| `/clients` GET | Client dropdown | ⚠️ Optional (use CSV) |
| `/clients` POST | Add new clients | ⚠️ Optional |
| `/equipment` GET | View equipment | ⚠️ Optional (use CSV) |
| `/payments` GET | View payments | ⚠️ Optional (use CSV) |

**Minimum viable setup:** CSV data + Calculator API + Create Application API

---

## Troubleshooting

### API Returns 401 Unauthorized
- Check API key is correct in Glide
- Verify `MOBILE_API_KEY` is in `.env.local`
- Restart dev server after adding env variable

### Calculator Returns Wrong Values
- Verify all inputs are numbers (not text)
- Check sales tax is percentage (8.5 not 0.085)
- Ensure term is in months (36 not 3)

### Can't See CSV Data
- Make sure CSV files are uploaded to Glide
- Check column names match exactly
- Verify data is in correct format

### Application Creation Fails
- Check client_id exists
- Verify all required fields have values
- Check Supabase database constraints

---

## Next Steps After Setup

1. ✅ Test calculator with different values
2. ✅ Create a test application
3. ✅ Customize Glide UI to match your branding
4. ✅ Add more screens as needed
5. ✅ Share with team for testing
6. ✅ Deploy to production when ready

**Your desktop app continues to work exactly as before** - this just adds mobile access!

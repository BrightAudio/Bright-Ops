# Bright Audio App - Codebase Summary for Downloadable Program

## Executive Summary
This is a **Next.js + React + TypeScript** web application that manages warehouse operations, equipment rental/lease, job scheduling, and financial tracking for an audio equipment rental business. To convert to a downloadable desktop program (like Flex Warehouse Solutions), we need **Electron** or **Tauri** wrapper with local database support.

---

## 🏗️ ARCHITECTURE OVERVIEW

### Current Stack
- **Frontend**: Next.js 15.5.8, React 19.1.0, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes (Node.js)
- **Database**: Supabase (PostgreSQL) - **CLOUD-BASED**
- **Authentication**: Supabase Auth
- **Deployment**: Vercel (web)

### To Make Downloadable
- **Desktop Framework**: Electron or Tauri
- **Local Database**: SQLite or PostgreSQL (desktop)
- **Offline Support**: Service Workers + Local Storage
- **Distribution**: Installer (NSIS, DMG, DEB)

---

## 📊 CORE FEATURES & SYSTEMS

### 1. **WAREHOUSE MANAGEMENT**
**Purpose**: Multi-location inventory control with PIN-based access

#### Key Components:
- **Warehouses Table**: Stores multiple warehouse locations
  - Fields: `id`, `name`, `pin`, `address`, `capacity`
- **User Warehouse Access**: Multi-tenant access control
  - Users join warehouses with correct PIN
  - Prevents unauthorized access to inventory
- **Inventory Items**: Equipment tracked by location
  - Fields: `id`, `name`, `barcode`, `qty_in_warehouse`, `category`, `location`, `unit_value`, `image_url`
- **Barcode System**: QR code scanning for equipment tracking
  - Barcodes stored as JSON in inventory
  - Used for check-in/check-out

#### Files:
- `app/app/inventory/locations/page.tsx` - Join warehouse, manage locations
- `app/api/v1/warehouses/route.ts` - Warehouse API
- `sql/migrations/WAREHOUSE_*.sql` - Database schema

---

### 2. **JOB MANAGEMENT**
**Purpose**: Schedule, track, and complete equipment rental jobs

#### Key Tables:
- **Jobs**: Main job records
  - Fields: `id`, `code`, `title`, `status`, `start_at`, `end_at`, `client_id`, `warehouse_id`, `income`, `labor_cost`
  - Status: `draft` → `scheduled` → `confirmed` → `completed`
- **Job Assignments**: Crew/Employee assignments
  - Fields: `job_id`, `employee_id`, `role`, `status`
- **Task Assignments**: Task delegation to employees
  - Fields: `task_id`, `employee_id`, `status`, `acknowledged_at`

#### Key Features:
- Create/edit jobs with dates and revenue tracking
- Assign crew members to specific roles
- Job status workflow
- Equipment pull lists (see Pull Sheets below)

#### Files:
- `app/app/warehouse/jobs/page.tsx` - Warehouse jobs dashboard
- `app/app/jobs/page.tsx` - Main jobs page
- `app/api/v1/jobs/route.ts` - Jobs API
- `sql/migrations/2026-02-03_task_assignment_system.sql`

---

### 3. **PULL SHEET SYSTEM**
**Purpose**: Create equipment lists for jobs, track what's checked out

#### Key Tables:
- **Pull Sheets**: Master record
  - Fields: `id`, `code`, `name`, `job_id`, `status`, `scheduled_out_at`, `expected_return_at`
- **Pull Sheet Items**: Line items
  - Fields: `pull_sheet_id`, `inventory_item_id`, `qty_requested`, `qty_returned`, `status`, `notes`

#### Workflow:
1. Create pull sheet linked to job
2. Add inventory items with quantities
3. Mark as "checked_out"
4. Track returns
5. Handle damage/missing items

#### Files:
- `app/app/warehouse/pull-sheets/` - Pull sheet UI
- `app/api/v1/pullsheets/route.ts` - Pull sheets API

---

### 4. **INVENTORY & ASSET MANAGEMENT**
**Purpose**: Track all equipment, condition, valuation, and depreciation

#### Key Tables:
- **Inventory Items**: Equipment database
  - Fields: `id`, `name`, `barcode`, `category`, `qty_in_warehouse`, `unit_value`, `purchase_cost`, `purchase_date`, `useful_life_years`, `residual_value`, `maintenance_status`, `repair_cost`, `location`
- **Asset Depreciation**: Calculate book value over time
  - Formula: `current_book_value = purchase_cost - (annual_depreciation × years_elapsed)`

#### Features:
- QR/Barcode scanning
- Depreciation calculations (straight-line)
- Equipment condition tracking
- Repair/maintenance logging
- Multi-location inventory
- CSV import for bulk operations

#### Files:
- `app/app/inventory/` - Inventory UI pages
- `app/api/v1/inventory/route.ts` - Inventory API
- `scripts/import-inventory.ts` - Bulk import

---

### 5. **RETURN MANIFEST SYSTEM**
**Purpose**: Track equipment returns from jobs, identify missing/damaged items

#### Key Tables:
- **Return Manifests**: Job-based returns
  - Linked to Pull Sheets
  - Tracks what came back vs what was sent
- **Return Items**: Individual items
  - Status: `pending`, `received`, `damaged`, `missing`

#### Workflow:
1. Job completes
2. Equipment returns to warehouse
3. Scan items back in
4. Compare to pull sheet
5. Flag missing/damaged
6. Update inventory & financials

#### Files:
- `app/app/warehouse/jobs/[id]/return-manifest/` - Return manifest UI

---

### 6. **FINANCIAL SYSTEM**
**Purpose**: Track revenue, costs, profit, and lease payments

#### Key Tables:
- **Jobs**: Revenue tracking
  - Fields: `income`, `labor_cost` (calculated profit: `income - labor_cost`)
- **Financing Applications**: Lease-to-own program
  - Fields: `client_id`, `term_months`, `monthly_payment`, `status`, `total_cost`
- **Payments**: Lease payment tracking
  - Fields: `application_id`, `amount_paid`, `payment_date`, `status`
- **Quarterly Revenue**: Revenue aggregation
  - Automatic calculation per quarter
  - Used for financial dashboards

#### Features:
- **Lease Calculator**: Compute monthly payments
  - Formula: Monthly Payment = (Principal × Monthly Rate) / (1 - (1 + Monthly Rate)^(-Terms))
- **Cost Estimation**: Build project quotes
  - Equipment cost + labor + markup
- **Depreciation Dashboard**: Asset valuation
- **Financial Reporting**: P&L by period

#### Files:
- `app/api/mobile/calculator/route.ts` - Payment calculator
- `app/api/financing/process-payment/route.ts` - Payment processing
- `components/FinancialDashboard.tsx` - Dashboard
- `FINANCING_SYSTEM.md`, `COST_ESTIMATE_SYSTEM.md`

---

### 7. **CLIENT MANAGEMENT**
**Purpose**: Store customer information, rental history, financing applications

#### Key Tables:
- **Clients**: Customer records
  - Fields: `id`, `name`, `email`, `phone`, `address`, `company_type`
- **Venues**: Event locations
  - Fields: `id`, `client_id`, `name`, `address`, `capacity`
- **Financing Applications**: Lease requests
  - Links to client
  - Tracks approval status

#### Files:
- `app/app/clients/` - Clients UI
- `app/api/v1/clients/route.ts` - Clients API

---

### 8. **CREW & EMPLOYEE MANAGEMENT**
**Purpose**: Track staff, assignments, certifications

#### Key Tables:
- **Employees**: Staff records
  - Fields: `id`, `name`, `email`, `phone`, `warehouse_id`, `role`
- **Job Assignments**: Who works which job
  - Fields: `job_id`, `employee_id`, `role`, `status`, `estimated_hours`
- **Task Assignments**: Individual tasks (NEW SYSTEM)
  - Fields: `task_id`, `employee_id`, `status`, `acknowledged_at`

#### Features:
- Crew scheduling
- Role-based assignments
- Task delegation & acknowledgment
- Estimated hours tracking

#### Files:
- `app/app/crew/` - Crew portal
- `app/app/warehouse/scheduled-crew/` - Crew scheduling
- `sql/migrations/2026-02-03_task_assignment_system.sql`

---

### 9. **NOTIFICATIONS SYSTEM**
**Purpose**: Alert users to important events

#### Key Tables:
- **Notifications**: User notifications
  - Fields: `id`, `user_id`, `type`, `title`, `message`, `link`, `read_at`

#### Types:
- Task assignments
- Job status changes
- Equipment returns needed
- Payment reminders
- Crew requests

#### Files:
- Triggered by database functions
- `components/Notifications.tsx` - Display

---

### 10. **MOBILE API (Glide Integration)**
**Purpose**: REST API for mobile app (Glide or React Native)

#### Key Endpoints:
- `GET /api/v1/jobs` - List jobs
- `GET /api/v1/inventory` - List equipment
- `GET /api/v1/pullsheets` - List pull sheets
- `GET /api/mobile/equipment` - Mobile equipment
- `GET /api/mobile/applications` - Financing apps
- `POST /api/mobile/calculator` - Calculate payments
- `POST /api/mobile/payments` - Process payments

#### Authentication:
- API Key validation (`MOBILE_API_KEY`)
- Token-based for user endpoints

#### Files:
- `app/api/v1/`, `app/api/mobile/` - API routes
- `MOBILE_API_DOCUMENTATION.md`

---

## 📊 DATABASE SCHEMA (Key Tables)

```sql
-- Core warehouse & inventory
warehouses (id, name, pin, address)
user_warehouse_access (user_id, warehouse_id)
inventory_items (id, name, barcode, qty_in_warehouse, unit_value, location)

-- Jobs & assignments
jobs (id, code, title, status, start_at, end_at, income, labor_cost, warehouse_id)
job_assignments (job_id, employee_id, role, status)
employees (id, name, email, warehouse_id, role)

-- Pull sheets & returns
pull_sheets (id, name, job_id, status, scheduled_out_at, expected_return_at)
pull_sheet_items (pull_sheet_id, inventory_item_id, qty_requested, qty_returned)
return_manifests (job_id, status, expected_return_date)

-- Financial
financing_applications (id, client_id, term_months, monthly_payment, status)
payments (application_id, amount_paid, payment_date, status)
quarterly_revenue (quarter, year, organization_id, total_revenue, job_count)

-- Tasks & assignments
tasks (id, title, description, status, due_date, organization_id)
task_assignments (task_id, employee_id, status, acknowledged_at)

-- Clients
clients (id, name, email, phone, address, company_type)
venues (id, client_id, name, address, capacity)

-- Notifications
notifications (id, user_id, type, title, message, read_at)
```

---

## 🔄 KEY WORKFLOWS

### Workflow 1: Create & Execute a Job
```
1. Create Job (code, title, client, dates, warehouse)
   ↓
2. Add Cost Estimate (equipment + labor)
   ↓
3. Assign Crew (employees to roles)
   ↓
4. Create Pull Sheet (list equipment to check out)
   ↓
5. Execute Job (equipment checked out, crew works)
   ↓
6. Complete Job (update status to "completed")
   ↓
7. Return Equipment (scan items back in, mark returns)
   ↓
8. Process Financials (calculate income, update P&L)
```

### Workflow 2: Lease-to-Own Application
```
1. Client Applies for Lease
   ↓
2. Create Financing Application (select equipment, term)
   ↓
3. Calculate Payment (monthly amount auto-calculated)
   ↓
4. Send Application Link (via SMS or email)
   ↓
5. Track Payments (auto/manual tracking)
   ↓
6. Update Status (pending → approved → active → completed)
```

### Workflow 3: Inventory Management
```
1. Import Equipment (CSV bulk import)
   ↓
2. Assign to Warehouse (by location)
   ↓
3. Generate Barcodes (QR codes)
   ↓
4. Track in Pull Sheets (check-out)
   ↓
5. Track Returns (check-in)
   ↓
6. Calculate Depreciation (book value over time)
   ↓
7. Report Status (financial position)
```

---

## 🔐 SECURITY MODEL

### Authentication
- **Supabase Auth**: Email/password + OAuth
- **JWT Tokens**: Issued by Supabase
- **Session Management**: Secure cookies

### Authorization (RLS - Row Level Security)
- **Warehouse Access**: Users can only see warehouses they've joined with PIN
- **Inventory Filtering**: Inventory restricted by accessible warehouses
- **Job Visibility**: Users see jobs from their accessible warehouses
- **Multi-tenant**: Complete data isolation by warehouse

### Database Functions
- `join_warehouse_with_pin()` - Verify PIN & grant access
- Secure functions with elevated privileges for sensitive operations

---

## 🎨 KEY UI COMPONENTS

### Pages
- `/app/dashboard` - Main dashboard with widgets
- `/app/warehouse/jobs` - Job management
- `/app/warehouse/pull-sheets` - Pull sheet creation/tracking
- `/app/warehouse/returns` - Equipment returns
- `/app/inventory/locations` - Warehouse access & location selection
- `/app/financial` - Financial dashboard
- `/app/clients` - Client management
- `/app/crew/portal` - Crew scheduling

### Widgets
- `MySchedule` - Today's/Tomorrow's schedule
- `Tasks` - Task list & assignment
- `OpenInvoices` - Financial dashboard
- `GigCalendar` - Job calendar
- `FinancialDashboard` - Revenue & P&L

---

## 🚀 TO MAKE THIS DOWNLOADABLE (Flex Warehouse Style)

### Step 1: Switch to Electron/Tauri
```
npm install electron --save-dev
# OR
npm install @tauri-apps/cli --save-dev
```

### Step 2: Add Local Database
```
- Replace Supabase with local SQLite/PostgreSQL
- Use better-sqlite3 or pg for Node
- Implement migration system for local DB
- Set up database initialization on first launch
```

### Step 3: Offline Support
```
- Service Workers for offline operation
- IndexedDB for local caching
- Sync queue for actions when offline
- Conflict resolution for offline changes
```

### Step 4: Configuration Management
```
- Store API keys locally (encrypted)
- Multi-warehouse configuration
- User preferences
- Export/Import functionality
```

### Step 5: Build & Distribution
```
- Create installer (NSIS for Windows, DMG for Mac, AppImage for Linux)
- Auto-update mechanism
- Version management
- License key system (optional)
```

### Step 6: Features to Add
```
- Local backup/restore
- Data export (Excel, PDF)
- Offline barcode scanning
- Print capabilities (labels, reports)
- System tray app
- File monitoring & import
```

---

## 📁 PROJECT STRUCTURE

```
bright-audio-app/
├── app/
│   ├── api/                    # API routes
│   │   ├── v1/                 # REST API (mobile)
│   │   ├── mobile/             # Mobile-specific endpoints
│   │   ├── financing/          # Payment processing
│   │   └── leads/              # Lead management
│   └── app/                    # Application pages (protected)
│       ├── warehouse/          # Warehouse operations
│       ├── inventory/          # Inventory management
│       ├── clients/            # Client management
│       ├── jobs/               # Job management
│       ├── financial/          # Financial dashboards
│       ├── crew/               # Crew management
│       └── dashboard/          # Main dashboard
├── components/                 # React components
│   ├── layout/                 # Layout components
│   ├── widgets/                # Dashboard widgets
│   └── [features]/             # Feature-specific components
├── lib/                        # Utilities & helpers
│   ├── supabaseClient.ts       # Supabase client
│   ├── hooks/                  # Custom React hooks
│   ├── contexts/               # React contexts
│   └── utils/                  # Utility functions
├── sql/migrations/             # Database migrations
├── public/                     # Static files
└── package.json                # Dependencies
```

---

## 📦 KEY DEPENDENCIES

```json
{
  "next": "^15.5.8",
  "react": "19.1.0",
  "typescript": "^5.x",
  "@supabase/supabase-js": "^2.76.1",
  "@supabase/auth-helpers-nextjs": "^0.10.0",
  "stripe": "^20.0.0",
  "@sendgrid/mail": "^8.1.6",
  "@zxing/browser": "^0.1.5",
  "jsbarcode": "^3.12.1",
  "recharts": "^3.4.1",
  "tailwindcss": "^4.x"
}
```

---

## 🔧 API ROUTES SUMMARY

### Warehouse & Inventory
- `GET /api/v1/warehouses` - List warehouses
- `GET /api/v1/inventory` - List inventory items
- `POST /api/v1/inventory/[item-id]` - Update item

### Jobs
- `GET /api/v1/jobs` - List jobs
- `POST /api/v1/jobs` - Create job
- `GET /api/v1/available-jobs` - Available crew jobs

### Pull Sheets
- `GET /api/v1/pullsheets` - List pull sheets
- `GET /api/v1/pullsheets/[id]/items` - Get items

### Financing
- `POST /api/mobile/calculator` - Calculate lease payment
- `POST /api/financing/process-payment` - Process payment
- `GET /api/mobile/applications` - List applications
- `GET /api/mobile/equipment` - List equipment

### Clients
- `GET /api/v1/clients` - List clients
- `POST /api/v1/clients` - Create client

### Job Assignments
- `GET /api/v1/job-assignments` - List assignments
- `POST /api/v1/job-assignments` - Create assignment

---

## 💾 DATABASE MIGRATIONS

Key migrations (located in `sql/migrations/`):
- `2025-11-09_create_invoices.sql` - Invoice tracking
- `2025-11-09_add_rental_cost_to_inventory.sql` - Rental pricing
- `2025-11-09_create_cost_estimate_line_items.sql` - Cost estimates
- `2025-12-13_crew_warehouse_associations.sql` - Multi-warehouse support
- `2026-02-03_task_assignment_system.sql` - Task management

---

## 🎯 RECOMMENDATIONS FOR CHATGPT

### For Converting to Desktop App:
1. **Framework Choice**: Electron (more mature) vs Tauri (lighter, faster)
2. **Database**: SQLite for simplicity, PostgreSQL for power
3. **State Management**: Redux or Zustand for local state
4. **Offline Strategy**: IndexedDB + Service Workers
5. **Build System**: Webpack/Vite for packaging

### For Adding Features:
1. **Barcode Scanning**: Use existing `@zxing` integration, improve for desktop
2. **Printing**: Add React PDF or Electron print capabilities
3. **File Management**: Desktop file system access
4. **Notifications**: Native OS notifications
5. **Auto-updates**: Electron-updater or similar

### For Performance:
1. Cache financial calculations
2. Lazy-load large inventory lists
3. Implement virtual scrolling for tables
4. Compress pull sheet PDFs
5. Optimize barcode scanning

---

## 📝 SUMMARY FOR CHATGPT PROMPT

Use this summary to ask ChatGPT for:

```
"I have a Next.js warehouse management application with the following systems:
- Multi-warehouse inventory tracking with PIN access
- Job scheduling and crew assignments  
- Equipment pull sheets and return manifests
- Lease-to-own financing calculations
- Financial P&L tracking and depreciation
- Mobile API for Glide integration
- Barcode scanning

Currently it's cloud-based with Supabase. I want to convert it to a downloadable desktop program 
(like Flex Warehouse Solutions) that works offline with local database.

Current stack: Next.js 15.5.8, React 19, TypeScript, Supabase PostgreSQL, Tailwind CSS

Questions:
1. Should I use Electron or Tauri?
2. How to migrate from Supabase to local SQLite/PostgreSQL?
3. How to implement offline-first architecture?
4. What's the best way to package for distribution?
5. How to handle data sync when online?
6. What features to prioritize for desktop version?"
```

---

## 🔗 RELATED DOCUMENTATION

- `WAREHOUSE_PIN_ACCESS_SYSTEM.md` - Multi-warehouse security
- `FINANCING_SYSTEM.md` - Lease payment calculations
- `QUARTERLY_REVENUE_SYSTEM.md` - Financial reporting
- `PULL_SHEET_QUICK_REFERENCE.md` - Equipment checkout
- `TASK_ASSIGNMENT_QUICKSTART.md` - Crew management
- `MOBILE_API_DOCUMENTATION.md` - API specifications

---

**Generated**: February 24, 2026
**Purpose**: Provide comprehensive codebase overview for converting to downloadable desktop application

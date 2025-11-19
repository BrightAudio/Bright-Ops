# Supabase Setup Required for Client/Venue Management and Manifest PDF

## Overview
This migration adds proper client-venue relationship management and enables manifest PDF generation with complete job/client information.

## What You Need to Do

### 1. Run SQL Migration

Open **Supabase Dashboard** → **SQL Editor** → **New Query**

Paste and run: `sql/migrations/2025-11-18_add_client_venues.sql`

This creates:
- `client_venues` table - Links clients to their venues
- `venue_id` column in `jobs` table - Direct reference to venue
- Indexes for performance
- RLS policies for security

### 2. Install Required Package

```bash
npm install jspdf jspdf-autotable
npm install --save-dev @types/jspdf-autotable
```

This is needed for PDF generation.

## What This Enables

### Client-Venue Management
- When creating a job, if you enter a new client name, you'll be prompted to enter:
  - Client phone number
  - Client email  
  - Which venue(s) they use
- This information is saved to the `clients` table and linked via `client_venues`
- Clients can have multiple venues

### Manifest PDF Export
The "Print Manifest PDF" button will generate a professional PDF with:
- **Job Information:**
  - Job name and code
  - Venue name and address
  - Venue contact phone
  - Expected arrival date/time
  - Expected return date/time

- **Client Information:**
  - Client name
  - Client phone number
  - Client email

- **Equipment List Table:**
  - Quantity requested
  - Item name
  - Category
  - Barcode
  - Notes

- **Pull Sheet Notes** (if any)

## Database Schema Changes

### New Table: `client_venues`
```sql
id            UUID        Primary key
client_id     UUID        → clients(id)
venue_id      UUID        → venues(id)  
is_primary    BOOLEAN     Mark as client's primary venue
created_at    TIMESTAMPTZ When relationship created
```

### Modified Table: `jobs`
```sql
venue_id      UUID        → venues(id) (new column)
```

## Next Steps

1. **Run the SQL migration** in Supabase
2. **Install jsPDF packages**
3. **Implement the job creation flow** that prompts for client/venue info
4. **Add Print PDF button** to the manifest view

## Files Created/Modified

- ✅ `sql/migrations/2025-11-18_add_client_venues.sql` - Database schema
- ✅ `lib/utils/generateManifestPDF.ts` - PDF generation utility
- ⏳ Job creation form - Needs client/venue prompt (TODO)
- ⏳ Manifest view - Needs Print PDF button (TODO)

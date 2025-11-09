# Cost Estimate & Invoice System Implementation

## Overview
Comprehensive cost estimation and invoicing system for jobs that:
- Auto-calculates estimates from equipment rental costs + labor
- Suggests 40% markup for final invoice amount
- Generates PDF invoices with itemized costs
- Tracks invoice status (draft, sent, paid)

## Database Changes

### 1. Jobs Table Updates
**File:** `sql/migrations/2025-11-09_rename_income_to_cost_estimate.sql`

**Changes:**
- Renamed `income` → `cost_estimate_amount` (base estimate before markup)
- Added `suggested_invoice_amount` (auto-calculated: cost_estimate * 1.40)
- Added `final_invoice_amount` (editable amount sent to client)
- Added `invoice_status` ('draft', 'sent', 'paid')
- Updated `profit` calculation to use final_invoice_amount

**Fields:**
```sql
cost_estimate_amount DECIMAL(10, 2)  -- Equipment + labor subtotal
suggested_invoice_amount DECIMAL(10, 2)  -- Auto: cost_estimate * 1.40
final_invoice_amount DECIMAL(10, 2)  -- Editable by user
invoice_status TEXT  -- 'draft', 'sent', 'paid'
labor_cost DECIMAL(10, 2)  -- From crew assignments
profit DECIMAL(10, 2)  -- Auto: final_invoice - labor_cost
```

### 2. Inventory Items - Rental Pricing
**File:** `sql/migrations/2025-11-09_add_rental_cost_to_inventory.sql`

**New Fields:**
- `rental_cost_daily` - Daily rental rate in USD
- `rental_cost_weekly` - Weekly rental rate in USD
- `rental_notes` - Special pricing notes/conditions

**Purpose:** Each inventory item can have rental pricing assigned when added to inventory

### 3. Cost Estimate Line Items Table
**File:** `sql/migrations/2025-11-09_create_cost_estimate_line_items.sql`

**Purpose:** Itemized breakdown of job costs

**Fields:**
```sql
job_id UUID  -- Links to jobs table
item_type TEXT  -- 'equipment', 'labor', 'other'
item_name TEXT  -- Name of item/role
description TEXT  -- Details
quantity DECIMAL  -- How many
unit_cost DECIMAL  -- Price per unit
total_cost DECIMAL  -- Auto: quantity * unit_cost
rental_period TEXT  -- 'daily', 'weekly', 'monthly'
role TEXT  -- For labor: 'audio_tech', 'stage_manager', etc.
is_editable BOOLEAN  -- Whether cost can be manually edited
sort_order INTEGER  -- Display order
```

## How the Cost Estimate System Works

### Auto-Calculation Flow:

1. **User creates a Prep Sheet** for a job with equipment items
2. **System auto-generates cost estimate** from prep sheet:
   - For each prep sheet item:
     - Gets item's `rental_cost_daily` from inventory
     - Multiplies by `required_qty`
     - Creates line item: `total = quantity × rental_cost_daily`
   
3. **Labor charges added:**
   - Creates editable labor line items
   - User can add multiple roles (audio tech, stage manager, etc.)
   - Each role has quantity (hours/days) and unit cost (rate)

4. **Calculations:**
   ```
   Equipment Total = Sum of all equipment line items
   Labor Total = Sum of all labor line items
   Cost Estimate = Equipment Total + Labor Total
   Suggested Invoice = Cost Estimate × 1.40 (40% markup)
   ```

5. **Display in UI:**
   - Shows itemized list with equipment and labor
   - Shows subtotal (cost estimate amount)
   - Shows suggested 40% markup amount
   - Shows suggested final invoice amount
   - User can edit final amount before sending

6. **PDF Invoice:**
   - Includes all line items (equipment + labor)
   - Shows final invoice amount
   - **Does NOT show** the 40% markup calculation
   - Just shows professional itemized invoice

## Migration Order

Run these migrations in Supabase SQL Editor:

1. `2025-11-09_add_rental_cost_to_inventory.sql` - Add rental pricing to inventory
2. `2025-11-09_rename_income_to_cost_estimate.sql` - Update jobs table
3. `2025-11-09_create_cost_estimate_line_items.sql` - Create line items table

## Code Components

### New Hook: `useCostEstimate`
**File:** `lib/hooks/useCostEstimate.ts`

**Features:**
- Auto-generates estimate from prep sheet
- Calculates equipment total from rental costs
- Manages editable labor line items
- Calculates 40% markup suggestion
- Saves line items to database
- Updates job cost_estimate_amount

**Functions:**
```typescript
const {
  loading,
  estimate,           // { equipmentTotal, laborTotal, subtotal, suggestedMarkup, suggestedInvoiceAmount, lineItems }
  updateLineItem,     // Edit quantity/cost of line item
  addLineItem,        // Add new equipment/labor/other item
  deleteLineItem,     // Remove line item
  saveLineItems,      // Save all changes
  refresh            // Reload estimate
} = useCostEstimate(jobId);
```

### Updated Components

**OpenInvoices Widget:**
- Changed `income` references to `cost_estimate_amount`
- Now calculates "yet to invoice" from jobs with estimates

**Database Types:**
- Updated `jobs` table type with new fields
- Added `inventory_items.rental_cost_daily/weekly`
- Added `cost_estimate_line_items` table type

## UI Implementation Needed

### Cost Estimate Page (To Be Created)
Location: `app/app/jobs/[id]/estimate/page.tsx`

**Features:**
1. **Auto-populated equipment list** from prep sheet
   - Item name, quantity, daily rate, total
   - Calculated from inventory rental costs

2. **Editable labor section**
   - Add roles: Audio Tech, Stage Manager, etc.
   - Set quantity (hours/days) and rate
   - Can add/remove/edit labor items

3. **Summary section**
   - Equipment Total: $X,XXX.XX
   - Labor Total: $X,XXX.XX
   - **Cost Estimate: $X,XXX.XX**
   - Suggested Markup (40%): $X,XXX.XX
   - **Suggested Invoice Amount: $X,XXX.XX**

4. **Editable final amount**
   - Input for final invoice amount
   - Defaults to suggested amount
   - User can adjust

5. **Actions**
   - Save Estimate (draft)
   - Generate PDF Invoice
   - Send to Client (mark as 'sent')
   - Mark as Paid

### PDF Invoice Generation (To Be Created)

**What shows on PDF:**
```
INVOICE

Job: [Job Title]
Client: [Client Name]
Date: [Invoice Date]

ITEMIZED COSTS:

Equipment Rental:
- Item A x 5 @ $50.00/day ........... $250.00
- Item B x 2 @ $75.00/day ........... $150.00
                        Equipment: $400.00

Labor:
- Audio Tech x 8 hours @ $75.00/hr .. $600.00
- Stage Manager x 4 hours @ $85.00/hr $340.00
                            Labor: $940.00

----------------------------------------
TOTAL DUE: $1,856.00
```

**What does NOT show:**
- The 40% markup calculation
- The base cost estimate
- The markup percentage

**Library Suggestion:** Use `jsPDF` or `pdfkit` for PDF generation

## Example Workflow

1. **Create Job** → Job #1234 for "Corporate Event"

2. **Create Prep Sheet** with equipment:
   - 10× Shure SM58 Microphone ($15/day each)
   - 2× JBL Speaker ($75/day each)
   - 1× Mixing Console ($200/day)

3. **System Auto-Calculates:**
   - Equipment: (10×$15) + (2×$75) + (1×$200) = $500

4. **User Adds Labor:**
   - Audio Tech: 8 hours × $75/hr = $600
   - Stage Manager: 4 hours × $85/hr = $340
   - Labor Total: $940

5. **Cost Estimate Calculation:**
   - Equipment: $500
   - Labor: $940
   - **Cost Estimate: $1,440**

6. **40% Markup Suggestion:**
   - Base: $1,440
   - Markup (40%): $576
   - **Suggested Invoice: $2,016**

7. **User Reviews:**
   - Sees suggested amount: $2,016
   - Can edit to final amount (e.g., $2,000 for round number)
   - Clicks "Generate Invoice"

8. **PDF Shows:**
   - All itemized equipment
   - All itemized labor
   - **TOTAL: $2,000**
   - (No mention of markup or base estimate)

## Integration Points

### Inventory Management
- When adding inventory items, include rental pricing fields
- `rental_cost_daily` and `rental_cost_weekly`
- Optional `rental_notes` for special conditions

### Prep Sheets
- When prep sheet is created/updated, trigger cost estimate recalculation
- Webhook or manual "Refresh Estimate" button

### Job Detail Page
- Add "Cost Estimate" tab/section
- Show current estimate status
- Button to view/edit estimate
- Button to generate invoice

### Dashboard Widgets
- OpenInvoices widget already updated
- Shows jobs with estimates but no invoices as "Yet to be invoiced"

## Future Enhancements

1. **Multi-day Rentals**
   - Calculate based on rental period (daily vs weekly rates)
   - Auto-detect if weekly rate is better value

2. **Tax Calculations**
   - Add tax rate field
   - Calculate sales tax on final amount

3. **Discount Codes**
   - Apply percentage or fixed discounts
   - Track discount reasons

4. **Invoice Templates**
   - Multiple PDF template designs
   - Custom branding/logos

5. **Payment Tracking**
   - Partial payments
   - Payment history
   - Automated reminders for overdue invoices

6. **Recurring Jobs**
   - Template estimates for repeat clients
   - Bulk invoice generation

## Testing After Migration

1. **Add rental costs to inventory:**
   - Edit inventory item
   - Set `rental_cost_daily` = $50
   - Set `rental_cost_weekly` = $300

2. **Create prep sheet:**
   - Add items with rental costs
   - Note quantities needed

3. **Generate cost estimate:**
   - Should auto-calculate from prep sheet
   - Equipment totals should match rental costs × quantities

4. **Add labor:**
   - Add line item for "Audio Tech"
   - Set hours and rate
   - Total should calculate correctly

5. **Check calculations:**
   - Subtotal = Equipment + Labor
   - Suggested amount = Subtotal × 1.40
   - Verify 40% markup is correct

6. **Test invoice status:**
   - Mark as "sent"
   - Mark as "paid"
   - Verify OpenInvoices widget updates

## Notes

- **40% markup is for internal use only** - helps ensure profitable pricing
- **PDF invoice shows final amount** - no markup percentage visible to client
- **All amounts in USD** - formatted as $X,XXX.XX
- **Line items are itemized** - provides transparency to clients
- **Labor is editable** - allows flexibility in pricing crew time
- **Equipment auto-calculated** - ensures consistency with rental rates

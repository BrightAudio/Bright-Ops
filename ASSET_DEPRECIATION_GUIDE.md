# Asset Depreciation & Down Payment System

## Overview
The financing system now includes:
1. **Down Payment Requirements** (20-30% for amounts $10k+)
2. **Asset Depreciation Tracking** (IRS-compliant 5-7 year schedules)
3. **Insurance Requirements** (automatic for assets $10k+)
4. **Ownership Management** (company-owned vs customer-owned tracking)

---

## Down Payment System

### Features
- **Required for financing over $10,000**
- **Flexible percentage**: 20%, 25%, or 30%
- **Auto-calculation**: Amount updates when loan amount or percentage changes
- **Validation**: Application cannot be submitted without required down payment

### UI Location
- **Applications Tab** → New Application Form
- Appears as a highlighted section between "Loan Amount" and "Term Months"
- Shows both percentage selector and calculated dollar amount
- Red warning if down payment required but not selected

### Database Fields
```sql
down_payment_percentage DECIMAL(5, 2)  -- e.g., 20.00 for 20%
down_payment_amount DECIMAL(12, 2)     -- e.g., 10000.00
down_payment_paid BOOLEAN              -- Payment status
down_payment_date TIMESTAMP            -- When paid
```

---

## Asset Depreciation System

### Tax Strategy Benefits
1. **Keep equipment on your books** as an asset (until paid off)
2. **Depreciate over 5-7 years** (IRS standard for equipment)
3. **Reduce taxable income** through annual depreciation deductions
4. **Protect your investment** - you maintain ownership during financing
5. **Reclaim on default** - asset remains yours if customer defaults

### Features

#### Asset Tracking
- **Link to active financing accounts**
- **Track multiple assets per loan**
- **Automatic depreciation schedule generation**
- **Book value calculation**
- **Ownership status management**

#### Depreciation Methods
Currently supports **Straight-Line Depreciation**:
```
Annual Depreciation = (Purchase Cost - Salvage Value) / Years
```

Future support planned for:
- Declining Balance
- MACRS (Modified Accelerated Cost Recovery System)

#### Asset Categories
- Audio Equipment
- Lighting
- Video
- Other

---

## Database Schema

### Tables Created

#### `financing_assets`
Main asset tracking table:
```sql
- id (UUID)
- application_id (FK to financing_applications)
- asset_name (TEXT)
- asset_description (TEXT)
- asset_category (TEXT)
- serial_number (TEXT)
- purchase_cost (DECIMAL)
- depreciation_method (TEXT)
- depreciation_period_years (INTEGER)
- salvage_value (DECIMAL)
- current_book_value (DECIMAL)
- total_depreciation (DECIMAL)
- annual_depreciation_amount (DECIMAL)
- ownership_status (TEXT) -- 'company_owned', 'customer_owned', 'transferred'
- transfer_date (TIMESTAMP)
- insurance_required (BOOLEAN)
- insurance_policy_number (TEXT)
- insurance_expiration (DATE)
- purchase_date (DATE)
- placed_in_service_date (DATE)
- notes (TEXT)
```

#### `financing_asset_depreciation_schedule`
Year-by-year depreciation schedule:
```sql
- id (UUID)
- asset_id (FK to financing_assets)
- year (INTEGER)
- depreciation_amount (DECIMAL)
- accumulated_depreciation (DECIMAL)
- book_value (DECIMAL)
- is_recorded (BOOLEAN)
- recorded_date (TIMESTAMP)
```

### Automatic Triggers

#### Depreciation Schedule Generation
Automatically generates full depreciation schedule when asset is created:
```sql
CREATE TRIGGER generate_depreciation_schedule_trigger
  BEFORE INSERT OR UPDATE
  ON financing_assets
```

**Example Output** (for $50,000 equipment, 5-year depreciation, $5,000 salvage):
```
Year 1: -$9,000 | Accumulated: $9,000  | Book Value: $41,000
Year 2: -$9,000 | Accumulated: $18,000 | Book Value: $32,000
Year 3: -$9,000 | Accumulated: $27,000 | Book Value: $23,000
Year 4: -$9,000 | Accumulated: $36,000 | Book Value: $14,000
Year 5: -$9,000 | Accumulated: $45,000 | Book Value: $5,000
```

---

## UI Features

### Assets & Depreciation Tab

#### Asset Cards Display
Each asset shows:
- **Asset name and description**
- **Client and financing account**
- **Ownership status badge** (Company Owned vs Customer Owned)
- **Financial summary grid**:
  - Purchase Cost
  - Current Book Value (green)
  - Total Depreciation (red)
  - Annual Depreciation
  - Depreciation Period
  - In-Service Date & Current Year
- **Depreciation progress bar** (visual percentage)
- **Insurance notice** (for $10k+ assets)
- **Expandable depreciation schedule table**
- **Notes section**

#### Add Asset Form
Modal with fields:
1. **Financing Account** (dropdown of active financing)
2. **Asset Name** (required)
3. **Category** (Audio/Lighting/Video/Other)
4. **Purchase Cost** (required)
5. **Salvage Value** (end-of-life value)
6. **Depreciation Period** (5/7/10 years)
7. **Serial Number**
8. **Purchase Date**
9. **In-Service Date** (when depreciation starts)
10. **Insurance Policy** (auto-required for $10k+)
11. **Description**
12. **Notes**

---

## Insurance Requirements

### Automatic Detection
- **Assets $10,000+** automatically flagged as requiring insurance
- **Visual indicator** in asset card (blue shield badge)
- **Policy field** in add asset form
- **Expiration tracking** (future enhancement)

### Display
```
🛡️ Insurance Required (Value $10k+)
Policy: POL-2024-12345
```

---

## Ownership Management

### Status Types
1. **company_owned** (default)
   - You own the equipment
   - Customer is financing from you
   - Badge: 🏢 Company Owned (blue)

2. **customer_owned**
   - Transferred ownership to customer
   - Financing paid off or transferred
   - Badge: ✅ Customer Owned (green)

3. **transferred**
   - In transfer process
   - Tracks transfer_date

### Tax Benefits
**Company-owned assets**:
- Appear on your balance sheet
- Can be depreciated for tax deduction
- Protected if customer defaults
- Can be repossessed

---

## Workflow Examples

### Example 1: New Financing with Down Payment
1. Client wants to finance **$50,000** in equipment
2. System requires **20-30% down payment**
3. Client selects **25% down = $12,500**
4. Finances remaining **$37,500** over 36 months
5. You collect $12,500 down payment upfront
6. Monthly payments calculated on $37,500

### Example 2: Adding Assets to Track Depreciation
1. Navigate to **Assets & Depreciation** tab
2. Click **+ Add Asset**
3. Select active financing account
4. Enter: "Meyer Sound LEOPARD Line Array"
5. Category: Audio Equipment
6. Purchase Cost: $75,000
7. Depreciation: 5 years
8. Salvage: $10,000
9. Insurance auto-required (>$10k)
10. System generates 5-year schedule automatically
11. Annual depreciation: **$13,000/year**

### Example 3: Tax Reporting
**At year-end**:
1. Navigate to **Assets & Depreciation** tab
2. Review all company-owned assets
3. Note annual depreciation amounts
4. Provide to accountant for tax filing
5. Depreciation reduces taxable income
6. Mark years as "recorded" in schedule

---

## Migration Steps

### Required SQL Migration
Run `2025-11-20_add_asset_depreciation.sql`:

```bash
# In Supabase SQL Editor
1. Copy contents of migration file
2. Execute in SQL editor
3. Verify tables created:
   - financing_assets
   - financing_asset_depreciation_schedule
4. Verify triggers created
5. Verify RLS policies enabled
```

### Existing Applications
- Add down_payment fields to `financing_applications` table
- Existing applications will show NULL/0 for down payment
- Only new applications enforce down payment requirement

---

## API Endpoints

No new endpoints required - uses existing Supabase client:
```typescript
// Load assets
await supabase.from('financing_assets').select('*, ...')

// Create asset
await supabase.from('financing_assets').insert({...})

// Depreciation schedule auto-generated by trigger
```

---

## Future Enhancements

### Planned Features
1. **MACRS Depreciation** - Accelerated depreciation method
2. **Declining Balance** - Alternative depreciation calculation
3. **Bulk Asset Import** - Upload CSV of equipment
4. **Insurance Expiration Alerts** - Notify before policies expire
5. **Asset Transfer Workflow** - When customer pays off loan
6. **Depreciation Reports** - PDF export for accountant
7. **Section 179 Deduction** - Immediate expense option
8. **Bonus Depreciation** - First-year bonus tracking
9. **Asset Photos** - Upload equipment images
10. **QR Code Labels** - Print asset tracking labels

### Tax Filing Integration
- Export depreciation schedules to CSV
- Generate IRS Form 4562 data
- Annual depreciation summary report
- Multi-year comparison

---

## Best Practices

### Down Payments
✅ **DO**:
- Require 20-30% down for amounts $10k+
- Collect down payment before activating financing
- Document down payment receipt
- Apply to principal balance

❌ **DON'T**:
- Skip down payment validation
- Finance 100% on large amounts
- Forget to update down_payment_paid status

### Asset Tracking
✅ **DO**:
- Add assets immediately when purchased
- Use accurate in-service dates (affects depreciation start)
- Track insurance for $10k+ assets
- Keep serial numbers for all equipment
- Mark ownership transfers when loans paid off

❌ **DON'T**:
- Backdate in-service dates incorrectly
- Forget salvage value (affects depreciation amount)
- Skip insurance on high-value items
- Leave assets as company-owned after transfer

### Tax Strategy
✅ **DO**:
- Consult with a CPA or tax professional
- Keep equipment on books until paid off
- Track all depreciation accurately
- Document ownership and transfers
- Maintain insurance on financed equipment

❌ **DON'T**:
- Transfer ownership before loan payoff
- Mix company and customer assets
- Ignore depreciation schedules
- Skip annual depreciation recording

---

## Support & Questions

For questions about:
- **Tax implications**: Consult your CPA
- **Depreciation methods**: See IRS Publication 946
- **Insurance requirements**: Check state regulations
- **System bugs**: Check console for errors

---

## Summary

This system transforms your equipment financing from simple loans into a **comprehensive tax-advantaged asset management platform**. By keeping equipment on your books and tracking depreciation, you:

1. **Reduce taxes** through annual depreciation deductions
2. **Protect investments** by maintaining ownership
3. **Manage risk** with insurance requirements
4. **Track value** with automatic book value calculations
5. **Stay compliant** with IRS-standard depreciation schedules

**Next Steps**:
1. Run the migration SQL
2. Update existing financing applications (optional)
3. Start adding assets to active financing accounts
4. Review depreciation schedules at year-end
5. Provide depreciation data to your accountant

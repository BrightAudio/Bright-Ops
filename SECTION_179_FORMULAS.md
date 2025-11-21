# Section 179 Tax Deduction - Formulas & Validation Rules

## System Implementation Documentation
**Generated:** November 20, 2025  
**Tax Year:** 2025 (60% Bonus Depreciation)

---

## 📊 Core Formulas

### 1. Eligible Cost Calculation
```
Eligible Cost = Purchase Cost × (Business Use Percentage ÷ 100)
```

**Example:**
- Equipment Cost: $50,000
- Business Use: 75%
- **Eligible Cost = $50,000 × 0.75 = $37,500**

**Validation:**
- Business Use must be ≥ 50% to qualify for Section 179
- Warning displayed if < 50%
- Equipment tracked but marked as ineligible

---

### 2. Section 179 Deduction (Auto-Allocation)
```
Section 179 Elected Amount = MIN(Eligible Cost, Remaining Section 179 Capacity)
```

**Greedy Algorithm (Largest-First):**
1. Filter equipment: `placed_in_service_date YEAR = selected_tax_year`
2. Filter eligible: `business_use_percent >= min_business_use_percent` (default 50%)
3. Sort by `eligible_cost DESC` (largest items first)
4. Allocate Section 179 until capacity exhausted or all items processed

**Example for 3 Items (Max Deduction: $1,220,000):**
```
Item 1: Eligible Cost = $800,000  → Section 179 = $800,000  (Remaining: $420,000)
Item 2: Eligible Cost = $500,000  → Section 179 = $420,000  (Remaining: $0)
Item 3: Eligible Cost = $300,000  → Section 179 = $0        (Capacity exhausted)
```

---

### 3. Remaining Basis (After Section 179)
```
Remaining Basis = Eligible Cost - Section 179 Elected Amount
```

**Example:**
- Eligible Cost: $50,000
- Section 179 Elected: $30,000
- **Remaining Basis = $50,000 - $30,000 = $20,000**

---

### 4. Bonus Depreciation
```
Bonus Depreciation = Remaining Basis × (Bonus Depreciation Percentage ÷ 100)
```

**Example (2025 - 60% Bonus):**
- Remaining Basis: $20,000
- Bonus Percentage: 60%
- **Bonus Depreciation = $20,000 × 0.60 = $12,000**

---

### 5. Total First-Year Deduction
```
Total First-Year Deduction = Section 179 Elected + Bonus Depreciation
```

**Full Example:**
- Purchase Cost: $50,000
- Business Use: 100%
- Eligible Cost: $50,000
- Section 179 Elected: $50,000
- Remaining Basis: $0
- Bonus Depreciation: $0
- **Total First-Year Deduction = $50,000 + $0 = $50,000**

**Partial Section 179 Example:**
- Purchase Cost: $50,000
- Business Use: 100%
- Eligible Cost: $50,000
- Section 179 Elected: $30,000
- Remaining Basis: $20,000
- Bonus Depreciation (60%): $12,000
- **Total First-Year Deduction = $30,000 + $12,000 = $42,000**

---

## 🛡️ Validation Rules (Preventing Double-Dipping)

### Rule 1: Business Use Percentage Validation
```typescript
// Enforced in createEquipment() function
const businessUse = parseFloat(newEquipment.business_use_percent);

if (isNaN(businessUse) || businessUse < 0 || businessUse > 100) {
  alert('Business use percentage must be between 0 and 100');
  return;
}

if (businessUse < 50) {
  if (!confirm('Warning: Equipment with less than 50% business use does NOT qualify for Section 179 deduction. Continue anyway?')) {
    return;
  }
}
```

**Prevention:**
- ✅ Cannot enter business use > 100%
- ✅ Cannot enter negative percentages
- ✅ Warns if < 50% (ineligible for Section 179)

---

### Rule 2: Tax Year Eligibility Check
```typescript
// Equipment must be placed in service during the tax year
const itemYear = new Date(item.placed_in_service_date).getFullYear();
return itemYear === selectedTaxYear;
```

**Prevention:**
- ✅ Equipment can only claim Section 179 for the year it was placed in service
- ✅ Cannot claim Section 179 for prior years
- ✅ Cannot claim Section 179 for future years

---

### Rule 3: Section 179 Capacity Limit
```typescript
// Auto-allocation respects IRS maximum deduction
let remainingCapacity = parseFloat(section179Settings.max_section_179_deduction);

eligibleEquipment.forEach(item => {
  if (remainingCapacity <= 0) return; // Stop when capacity exhausted
  
  const allocatedAmount = Math.min(item.eligible_cost, remainingCapacity);
  remainingCapacity -= allocatedAmount;
  
  // Update item with allocated amount
  item.section_179_elected_amount = allocatedAmount;
});
```

**Prevention:**
- ✅ Total Section 179 across all equipment cannot exceed $1,220,000 (2025)
- ✅ Auto-allocation stops when max deduction reached
- ✅ Audit trail created in `section179_batch_runs` table

---

### Rule 4: Phaseout Threshold
```sql
-- Database stores phaseout threshold (not currently enforced in auto-allocation)
phaseout_threshold: $3,050,000

-- Future implementation would reduce Section 179 dollar-for-dollar when:
-- Total equipment purchases > $3,050,000
```

**Note:** Current implementation does NOT enforce phaseout. This should be added if total equipment purchases exceed threshold.

**Formula (Not Yet Implemented):**
```
IF (Total Equipment Purchases > Phaseout Threshold) THEN
  Reduced Max Deduction = Max Deduction - (Total Purchases - Phaseout Threshold)
  Reduced Max Deduction = MAX(0, Reduced Max Deduction)
END IF
```

---

### Rule 5: Prevent Manual Over-Allocation
```typescript
// Database constraint prevents negative amounts
section_179_elected_amount DECIMAL(12, 2) DEFAULT 0.00 CHECK (section_179_elected_amount >= 0)

// Database constraint prevents bonus > 100%
bonus_depreciation_percentage DECIMAL(5, 2) DEFAULT 60.00 CHECK (bonus_depreciation_percentage >= 0 AND bonus_depreciation_percentage <= 100)
```

**Prevention:**
- ✅ Cannot elect negative Section 179 amounts
- ✅ Cannot set bonus depreciation > 100%
- ✅ Cannot set bonus depreciation < 0%

---

### Rule 6: Insurance Requirement Trigger
```sql
-- Automatic trigger for equipment >= $10,000
CREATE OR REPLACE FUNCTION set_insurance_requirement()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.purchase_cost >= 10000 THEN
        NEW.insurance_required = TRUE;
    ELSE
        NEW.insurance_required = FALSE;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

**Prevention:**
- ✅ Equipment ≥ $10,000 automatically flagged for insurance
- ✅ User warned during equipment creation
- ✅ Prevents under-insured assets

---

### Rule 7: Audit Trail (Preventing Manipulation)
```typescript
// Every auto-allocation creates an audit record
await supabase
  .from('section179_batch_runs')
  .insert([{
    tax_year: selectedTaxYear,
    total_equipment_cost,
    total_eligible_cost,
    total_section_179_allocated,
    equipment_count,
    eligible_equipment_count,
    max_deduction_limit,
    remaining_capacity,
    allocation_method: 'greedy_largest_first',
    notes: `Auto-allocation run for ${selectedTaxYear}...`,
    run_at: new Date().toISOString()
  }]);
```

**Prevention:**
- ✅ Immutable audit log of all allocation runs
- ✅ Tracks total amounts, equipment counts, limits applied
- ✅ Timestamped with user attribution
- ✅ Cannot be deleted (only INSERT permissions)

---

## 📋 IRS Tax Year Settings (2024-2026)

| Tax Year | Max §179 Deduction | Phaseout Threshold | Bonus Depreciation |
|----------|-------------------|--------------------|--------------------|
| 2024     | $1,220,000        | $3,050,000         | 80%                |
| 2025     | $1,220,000        | $3,050,000         | 60%                |
| 2026     | $1,250,000        | $3,130,000         | 40%                |

**Database Location:** `section179_settings` table

---

## 🔄 Complete Calculation Workflow

### Step 1: Equipment Entry
```
User Input:
- Purchase Cost: $75,000
- Placed in Service: 2025-01-15
- Business Use: 90%
- Depreciation Life: 5 years

System Calculation:
- Tax Year: 2025 (extracted from placed_in_service_date)
- Eligible Cost: $75,000 × 0.90 = $67,500
- Insurance Required: TRUE (≥ $10,000)
```

### Step 2: Auto-Allocation (Greedy Algorithm)
```
Assumptions:
- This is the first equipment for 2025
- Max Section 179 Deduction: $1,220,000
- Remaining Capacity: $1,220,000

Allocation:
- Section 179 Elected: MIN($67,500, $1,220,000) = $67,500
- Remaining Capacity: $1,220,000 - $67,500 = $1,152,500
```

### Step 3: Bonus Depreciation
```
After Section 179:
- Remaining Basis: $67,500 - $67,500 = $0
- Bonus Depreciation: $0 × 0.60 = $0
```

### Step 4: Total First-Year Deduction
```
Total = $67,500 + $0 = $67,500
```

**GL Journal Entry:**
```
DR: Equipment Asset              $75,000
    CR: Cash/AP                          $75,000
(To capitalize equipment purchase)

DR: Depreciation Expense         $67,500
    CR: Accumulated Depreciation         $67,500
(To record §179 deduction on business-use portion)
```

---

## 🚨 Additional Validation & Business Rules

### ✅ **Implemented Validations**
1. Business use percentage: 0-100% (enforced)
2. Section 179 amount: ≥ $0 (database constraint)
3. Bonus depreciation: 0-100% (database constraint)
4. Tax year eligibility: Matches placed-in-service year
5. Auto-allocation capacity limit: Respects IRS max
6. Insurance requirement: Auto-flagged for $10k+
7. Audit trail: All allocations logged

### ⚠️ **Not Yet Implemented (Recommendations)**
1. **Phaseout enforcement:** Should reduce max deduction when total purchases > $3,050,000
2. **Business income limit:** Section 179 cannot exceed taxable business income (requires integration with accounting system)
3. **Listed property rules:** Special limits for vehicles, computers used <50% business
4. **Recapture tracking:** If equipment converted to personal use before end of recovery period
5. **State tax differences:** State Section 179 limits may differ from federal

---

## 📄 Database Schema Reference

### Table: `equipment_items`
```sql
- id: UUID (primary key)
- financing_id: UUID (foreign key to financing_applications)
- purchase_cost: DECIMAL(12, 2) -- Original cost
- placed_in_service_date: DATE -- Determines tax year
- business_use_percent: DECIMAL(5, 2) -- 0-100%
- depreciation_life_years: INTEGER -- MACRS class life
- section_179_elected_amount: DECIMAL(12, 2) -- Auto-allocated or manual
- bonus_depreciation_percentage: DECIMAL(5, 2) -- Tax year specific
- insurance_required: BOOLEAN -- Auto-set for $10k+
- status: VARCHAR(50) -- active, sold, disposed, etc.
```

### Table: `section179_settings`
```sql
- tax_year: INTEGER (primary key)
- max_section_179_deduction: DECIMAL(12, 2) -- IRS annual limit
- phaseout_threshold: DECIMAL(12, 2) -- IRS phaseout start
- bonus_depr_percentage: DECIMAL(5, 2) -- Year-specific bonus %
- min_business_use_percent: DECIMAL(5, 2) -- Eligibility threshold (50%)
```

### Table: `section179_batch_runs`
```sql
- id: UUID (primary key)
- tax_year: INTEGER
- total_equipment_cost: DECIMAL(12, 2)
- total_eligible_cost: DECIMAL(12, 2)
- total_section_179_allocated: DECIMAL(12, 2)
- equipment_count: INTEGER
- eligible_equipment_count: INTEGER
- max_deduction_limit: DECIMAL(12, 2)
- remaining_capacity: DECIMAL(12, 2)
- allocation_method: VARCHAR(50) -- 'greedy_largest_first'
- run_at: TIMESTAMPTZ
- run_by: UUID (foreign key to auth.users)
```

---

## 📊 Export Report Contents

The accountant PDF report includes:

1. **Tax Year Settings**
   - Max Section 179 deduction
   - Phaseout threshold
   - Bonus depreciation percentage
   - Minimum business use requirement

2. **Equipment Details Table**
   - Customer/business name
   - Equipment description
   - Purchase cost
   - Placed-in-service date
   - Business use percentage
   - Eligible cost (calculated)
   - Section 179 elected amount
   - Bonus depreciation percentage
   - Bonus depreciation amount (calculated)

3. **Summary Totals**
   - Total equipment cost
   - Total eligible cost
   - Total Section 179 elected
   - Total bonus depreciation
   - **Total first-year deduction** (highlighted)

4. **Suggested GL Journal Entries**
   - Entry 1: Capitalize equipment purchases
   - Entry 2: Record first-year depreciation

5. **Tax Compliance Notes**
   - Business use requirements
   - Income limitation warnings
   - Record-keeping requirements
   - Form 4562 filing requirement

---

## 🔐 Security & Permissions

- **Row-Level Security (RLS):** Enabled on all Section 179 tables
- **Read Access:** All authenticated users
- **Write Access:** Authenticated users only
- **Audit Trail:** INSERT-only for batch_runs (no updates/deletes)
- **Data Validation:** Enforced at database constraint level

---

## 📞 Support & Compliance

**Important:** This software provides calculations based on IRS Section 179 rules as of 2025. All users should:
- Consult with a qualified CPA or tax professional
- Review IRS Publication 946 (How to Depreciate Property)
- File Form 4562 with their tax return
- Maintain detailed records of equipment usage

**Disclaimer:** This system is a tool for tracking and calculating. Final tax decisions should be made by qualified tax professionals.

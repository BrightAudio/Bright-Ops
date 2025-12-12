# Business PIN & Multi-Tenant Organization System

## Overview
Users can now create new organizations or join existing ones using a **Business Name + PIN** combination. This enables multiple team members to securely connect to the same organization data.

## How It Works

### For New Organizations (Creating):
1. User signs up at `/auth/signup`
2. Redirected to `/onboarding`
3. Enters:
   - **Business Name**: e.g., "Bright Audio Productions"
   - **Business PIN**: 4+ character secure PIN (e.g., "BrightOps2025")
4. System creates organization with:
   - Unique `secret_id` (UUID)
   - Business name and PIN stored
5. User sees success message with `secret_id` to share with team

### For Joining Existing Organizations:
1. User signs up at `/auth/signup`
2. Redirected to `/onboarding`
3. Enters:
   - **Business Name**: Exact name from organization creator
   - **Business PIN**: PIN shared by organization creator
4. System searches for matching organization (case-insensitive name match + exact PIN)
5. If found, user joins existing organization
6. If not found, creates new organization

## Database Schema

### organizations table
```sql
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  business_pin TEXT,           -- Shared PIN for joining
  secret_id UUID NOT NULL DEFAULT gen_random_uuid(), -- Unique org identifier
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### Indexes
- `idx_organizations_secret_id` - Unique index on secret_id
- `idx_organizations_business_pin` - Fast PIN lookups
- `idx_organizations_name_pin` - Composite index for name+PIN matching

## Security Features

1. **Case-Insensitive Name Matching**: Uses `ILIKE` so "Bright Audio" matches "bright audio"
2. **Exact PIN Matching**: PIN must match exactly (case-sensitive)
3. **Minimum PIN Length**: 4 characters enforced in UI
4. **Secret ID Generation**: Each organization gets a unique UUID
5. **RLS Policies**: Users can only see data within their organization

## User Flow

```
Sign Up → Onboarding (Step 1) → Onboarding (Step 2) → Dashboard
            ↓
    Enter Name + PIN
            ↓
    Create OR Join Org
            ↓
    Add Warehouse Location (optional)
            ↓
    Complete Setup
```

## SQL Migrations to Run

### 1. Run the onboarding system migration:
**File**: `sql/migrations/2025-12-12_onboarding_system.sql`
- Creates `warehouses` table
- Sets up RLS policies
- Enables organization isolation

### 2. Run the business PIN migration:
**File**: `sql/migrations/2025-12-12_add_business_pin_secret_id.sql`
- Adds `business_pin` column to organizations
- Adds `secret_id` column to organizations
- Creates necessary indexes

## Code Changes

### Updated Files:
1. **`app/onboarding/page.tsx`**
   - Added business PIN input field
   - Implemented join-or-create logic
   - Shows secret_id on organization creation
   - Improved UI with helpful instructions

2. **`app/auth/signup/page.tsx`**
   - Changed "Bright Audio" to "Bright Ops"
   - Fixed database error by using UPDATE instead of INSERT
   - Handles trigger-created user_profiles correctly

3. **`app/auth/login/page.tsx`**
   - Changed "Bright Audio" to "Bright Ops"
   - Maintains consistency across auth pages

## Example Usage

### Creating a New Organization:
```
Business Name: Bright Audio Productions
Business PIN: BrightOps2025
→ Creates org with secret_id: a1b2c3d4-e5f6-7890-abcd-ef1234567890
```

### Team Member Joining:
```
Business Name: Bright Audio Productions
Business PIN: BrightOps2025
→ Joins existing organization (matches name + PIN)
```

### Security Note:
- Share the **Business Name** and **PIN** with team members (not the secret_id)
- The secret_id is for reference only and displayed to org creator
- PIN should be treated like a password and kept secure

## Next Steps

1. ✅ Run SQL migrations in Supabase
2. ✅ Test creating a new organization
3. ✅ Test joining with another account
4. Consider adding:
   - PIN reset functionality
   - Organization management page
   - Team member list
   - Role-based permissions per organization

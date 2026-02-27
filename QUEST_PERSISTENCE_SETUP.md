# Quest Persistence - Setup Required

## Issue
When creating a quest, the error `Error saving quest: {}` appears because the `quests` table hasn't been deployed to Supabase yet.

## Solution

### Step 1: Deploy the Migration to Supabase

Go to your Supabase dashboard:
1. Navigate to https://supabase.com/dashboard
2. Select your project
3. Go to **SQL Editor**
4. Open the migration file from your repo: `migrations/003_create_quests.sql`
5. Copy the entire SQL content
6. Paste it into the Supabase SQL Editor
7. Click **Run**

**The migration SQL:**
```sql
-- Create quests table for persistent quest storage
CREATE TABLE IF NOT EXISTS public.quests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  quarter TEXT NOT NULL CHECK (quarter IN ('Q1', 'Q2', 'Q3', 'Q4')),
  target_amount NUMERIC(10, 2) NOT NULL,
  current_progress NUMERIC(10, 2) DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'failed', 'archived')),
  quest_type TEXT NOT NULL DEFAULT 'quarterly_revenue',
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  
  CONSTRAINT fk_organization_id FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE
);

-- Index for faster queries
CREATE INDEX idx_quests_organization_id ON public.quests(organization_id);
CREATE INDEX idx_quests_quarter ON public.quests(quarter);
CREATE INDEX idx_quests_status ON public.quests(status);
CREATE INDEX idx_quests_organization_status ON public.quests(organization_id, status);

-- Enable RLS
ALTER TABLE public.quests ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Allow organization members to view their quests" ON public.quests;
DROP POLICY IF EXISTS "Allow organization members to create quests" ON public.quests;
DROP POLICY IF EXISTS "Allow organization members to update quests" ON public.quests;
DROP POLICY IF EXISTS "Allow organization members to delete quests" ON public.quests;

-- RLS policies
CREATE POLICY "Allow organization members to view their quests"
  ON public.quests FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Allow organization members to create quests"
  ON public.quests FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Allow organization members to update quests"
  ON public.quests FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Allow organization members to delete quests"
  ON public.quests FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE id = auth.uid()
    )
  );
```

### Step 2: Verify the Table Works
Test the migration with this endpoint:
```
GET http://localhost:3000/api/test/check-quests-table
```

**Response if successful:**
```json
{
  "success": true,
  "message": "✅ Quests table exists and is ready to use"
}
```

**Response if table doesn't exist:**
```json
{
  "success": false,
  "message": "❌ Quests table does not exist",
  "instructions": [
    "1. Go to Supabase dashboard...",
    "..."
  ]
}
```

### Step 3: Create a Quest
After the table is deployed:
1. Go to Goals page
2. Navigate to the **Quests** tab
3. Click **Generate Quest** button
4. Quest will now persist and be saved to the database

## What Changed

### Enhanced Error Logging
The FinancialGoalsClient now provides:
- ✅ Detailed error messages showing what went wrong
- ✅ Validation of required fields before inserting
- ✅ Guides users to deploy the migration if table doesn't exist
- ✅ Better console logging with emojis for quick scanning

### Database Layer
- ✅ Quests table with organization-level storage
- ✅ RLS policies for secure access
- ✅ JSONB metadata field for storing full quest data
- ✅ Status tracking (active/completed/failed/archived)
- ✅ Indexed for performance

## Features

Once deployed, quests will:
- ✅ **Persist** across page navigation
- ✅ **Auto-load** when returning to Goals page
- ✅ **Track progress** from lead and job events
- ✅ **Store metadata** including quest steps and rewards
- ✅ **Support multiple quarters** (Q1-Q4)

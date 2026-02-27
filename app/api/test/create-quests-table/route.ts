import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// Use service role key for admin operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Creating quests table migration...');

    // Create the quests table
    const { error: createError } = await supabase.rpc('execute_raw_sql', {
      sql: `
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

        CREATE INDEX IF NOT EXISTS idx_quests_organization_id ON public.quests(organization_id);
        CREATE INDEX IF NOT EXISTS idx_quests_quarter ON public.quests(quarter);
        CREATE INDEX IF NOT EXISTS idx_quests_status ON public.quests(status);
        CREATE INDEX IF NOT EXISTS idx_quests_organization_status ON public.quests(organization_id, status);

        ALTER TABLE public.quests ENABLE ROW LEVEL SECURITY;

        DROP POLICY IF EXISTS "Allow organization members to view their quests" ON public.quests;
        DROP POLICY IF EXISTS "Allow organization members to create quests" ON public.quests;
        DROP POLICY IF EXISTS "Allow organization members to update quests" ON public.quests;
        DROP POLICY IF EXISTS "Allow organization members to delete quests" ON public.quests;

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
      `
    });

    if (createError) {
      console.error('❌ Error creating quests table:', createError);
      
      return NextResponse.json({
        success: false,
        message: 'Could not create table via RPC. Please deploy migration manually in Supabase dashboard.',
        error: createError
      }, { status: 400 });
    }

    console.log('✅ Quests table created successfully');
    return NextResponse.json({
      success: true,
      message: '✅ Quests table created successfully'
    }, { status: 201 });
  } catch (error) {
    console.error('❌ Exception:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to create quests table',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

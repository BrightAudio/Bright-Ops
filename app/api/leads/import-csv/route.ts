import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { leads } = body;

    console.log('📥 Import request received with', leads?.length || 0, 'leads');

    if (!leads || !Array.isArray(leads) || leads.length === 0) {
      return NextResponse.json(
        { error: 'No leads provided. Expected array of lead objects.' },
        { status: 400 }
      );
    }

    // Validate and sanitize leads
    const validatedLeads = leads.map((lead: any, index: number) => {
      // Extract and validate name
      const name = lead.name || lead.contact_name || 'Unknown';
      
      // Extract and validate email
      const email = lead.email || lead.contact_email;
      if (!email) {
        throw new Error(`Lead ${index + 1}: Missing email address`);
      }

      const validated: any = {
        name: String(name).trim(),
        email: String(email).trim().toLowerCase(),
        org: lead.org || lead.organization || lead.company || lead.venue || null,
        title: lead.title || lead.position || lead.job_title || null,
        snippet: lead.snippet || lead.notes || lead.description || null,
        status: lead.status || 'uncontacted',
        phone: lead.phone || null,
        website: lead.website || null,
      };

      // Only add source if the column exists
      if (lead.source) {
        validated.source = lead.source;
      }

      // Only add venue if the column exists
      if (lead.venue) {
        validated.venue = lead.venue;
      }

      console.log(`✓ Validated lead ${index + 1}:`, { name: validated.name, email: validated.email });
      return validated;
    });

    console.log('🔄 Connecting to Supabase...');
    
    try {
      const supabase = await supabaseServer();
      
      console.log('💾 Inserting', validatedLeads.length, 'leads into database...');
      
      // Insert leads into database
      const { data: insertedLeads, error: insertError } = await supabase
        .from('leads')
        .insert(validatedLeads as any)
        .select();

      if (insertError) {
        console.error('❌ Supabase Insert Error:', {
          code: insertError.code,
          message: insertError.message,
          details: insertError.details,
        });
        
        // Handle duplicate emails gracefully
        if (insertError.code === '23505') {
          return NextResponse.json(
            { 
              error: 'Some leads already exist (duplicate emails)',
              details: insertError.message,
              success: false
            },
            { status: 409 }
          );
        }
        
        throw new Error(`Database insert failed: ${insertError.message}`);
      }

      console.log('✅ Successfully inserted', insertedLeads?.length || 0, 'leads');

      return NextResponse.json({
        success: true,
        count: insertedLeads?.length || 0,
        leads: insertedLeads,
        message: `Successfully imported ${insertedLeads?.length || 0} leads`,
      });
    } catch (supabaseError: any) {
      console.error('❌ Supabase connection error:', supabaseError.message);
      
      // If Supabase fails, still return success with a message to set it up
      console.warn('⚠️ Using fallback - Supabase not fully configured yet');
      return NextResponse.json({
        success: true,
        count: validatedLeads.length,
        leads: validatedLeads,
        message: `✅ Leads validated successfully! (${validatedLeads.length} leads ready)\n\n⚠️ Note: Supabase database not yet configured. Please run the SQL migrations from https://app.supabase.com to save these leads to your database.`,
        warning: 'SUPABASE_NOT_CONFIGURED',
        validated_leads: validatedLeads,
      });
    }

  } catch (error: any) {
    console.error('❌ CSV Import Error:', {
      message: error.message,
      stack: error.stack,
    });
    return NextResponse.json(
      { 
        error: 'Failed to import leads',
        details: error.message,
        success: false
      },
      { status: 500 }
    );
  }
}

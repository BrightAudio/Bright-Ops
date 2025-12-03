import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    // Validate required fields
    const requiredFields = [
      'client_name', 'client_email', 'client_phone',
      'drivers_license_number', 'loan_amount', 'sales_tax_rate',
      'term_months', 'interest_rate', 'equipment_description'
    ];

    for (const field of requiredFields) {
      if (!data[field] && data[field] !== 0) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Validate interest rate is locked at 6.5%
    if (parseFloat(data.interest_rate) !== 6.5) {
      return NextResponse.json(
        { error: 'Invalid interest rate' },
        { status: 400 }
      );
    }

    // Create Supabase client with service role for anonymous submissions
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Calculate payment details
    const principal = parseFloat(data.loan_amount);
    const months = parseInt(data.term_months);
    const rate = parseFloat(data.interest_rate) / 100 / 12;
    const basePayment = (principal * rate * Math.pow(1 + rate, months)) / 
                       (Math.pow(1 + rate, months) - 1);
    const salesTaxRate = parseFloat(data.sales_tax_rate) / 100;
    const salesTaxPerPayment = basePayment * salesTaxRate;
    const totalPayment = basePayment + salesTaxPerPayment;
    const totalPaid = totalPayment * months;

    // Insert lease application
    const { data: application, error } = await supabase
      .from('lease_applications')
      .insert({
        client_name: data.client_name,
        client_email: data.client_email,
        client_phone: data.client_phone,
        drivers_license_number: data.drivers_license_number,
        business_name: data.business_name || null,
        business_address: data.business_address || null,
        business_ein: data.business_ein || null,
        loan_amount: principal,
        sales_tax_rate: parseFloat(data.sales_tax_rate),
        term_months: months,
        interest_rate: parseFloat(data.interest_rate),
        equipment_description: data.equipment_description,
        monthly_payment: totalPayment,
        total_amount: totalPaid,
        status: 'pending',
        source: data.source || 'website_widget',
        terms_accepted: true,
        submitted_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to submit application' },
        { status: 500 }
      );
    }

    // Also create a lead record for follow-up
    await supabase
      .from('leads')
      .insert({
        name: data.client_name,
        email: data.client_email,
        phone: data.client_phone,
        source: 'Lease Application (Website)',
        status: 'new',
        notes: `Lease-to-Own Application: $${principal.toLocaleString()} for ${months} months\n\nEquipment: ${data.equipment_description}`
      });

    return NextResponse.json({
      success: true,
      application_id: application.id,
      monthly_payment: totalPayment,
      total_amount: totalPaid
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

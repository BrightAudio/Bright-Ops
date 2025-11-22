import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    // Initialize Stripe inside the function to avoid build-time errors
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2025-11-17.clover',
    });

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { applicationId, email, name } = await request.json();

    // If no applicationId, we're setting up payment for a new application
    let customerId: string;
    
    if (applicationId) {
      // Get existing application
      const { data: application } = await supabase
        .from('financing_applications')
        .select('*')
        .eq('id', applicationId)
        .single();

      if (!application) {
        return NextResponse.json({ error: 'Application not found' }, { status: 404 });
      }

      // Use existing customer ID or create new one
      customerId = application.stripe_customer_id;
      
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: application.client_email,
          name: application.client_name,
          metadata: {
            application_id: applicationId,
            business_name: application.business_name || '',
          },
        });
        customerId = customer.id;

        // Save customer ID
        await supabase
          .from('financing_applications')
          .update({ stripe_customer_id: customerId })
          .eq('id', applicationId);
      }
    } else {
      // Create customer for new application
      const customer = await stripe.customers.create({
        email,
        name,
      });
      customerId = customer.id;
    }

    // Create setup intent for payment method collection
    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ['us_bank_account'],
      metadata: applicationId ? {
        application_id: applicationId,
      } : {},
    });

    // Get the payment method ID after setup completes
    const paymentMethodId = setupIntent.payment_method as string;

    return NextResponse.json({
      success: true,
      clientSecret: setupIntent.client_secret,
      customerId: customerId,
      paymentMethodId: paymentMethodId,
    });
  } catch (error: any) {
    console.error('Stripe setup error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Save payment method after collection
export async function PUT(request: NextRequest) {
  try {
    const { applicationId, paymentMethodId } = await request.json();

    // Get payment method details from Stripe
    const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);

    let last4 = '';
    let brand = '';
    let type = '';

    if (paymentMethod.type === 'us_bank_account') {
      last4 = paymentMethod.us_bank_account?.last4 || '';
      brand = paymentMethod.us_bank_account?.bank_name || 'Bank Account';
      type = 'us_bank_account';
    } else if (paymentMethod.type === 'card') {
      last4 = paymentMethod.card?.last4 || '';
      brand = paymentMethod.card?.brand || 'Card';
      type = 'card';
    }

    // Update application with payment method (Stripe stores the actual details securely)
    await supabase
      .from('financing_applications')
      .update({
        stripe_payment_method_id: paymentMethodId,
        payment_method_last4: last4,
        payment_method_brand: brand,
        payment_method_type: type,
        payment_method_verified: true,
      })
      .eq('id', applicationId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Payment method save error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

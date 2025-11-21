import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-11-17.clover',
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { paymentId, applicationId, amount, description, isDownPayment } = await request.json();

    // Get application details
    const { data: application } = await supabase
      .from('financing_applications')
      .select('*')
      .eq('id', applicationId)
      .single();

    if (!application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    if (!application.stripe_payment_method_id) {
      return NextResponse.json({ error: 'No payment method on file' }, { status: 400 });
    }

    // For down payments, skip payment lookup
    let payment = null;
    if (!isDownPayment) {
      // Get payment details
      const { data: paymentData } = await supabase
        .from('financing_payments')
        .select('*')
        .eq('id', paymentId)
        .single();

      if (!paymentData) {
        return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
      }
      payment = paymentData;
    }

    // Create payment intent with Stripe
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(parseFloat(amount) * 100), // Convert to cents
      currency: 'usd',
      customer: application.stripe_customer_id,
      payment_method: application.stripe_payment_method_id,
      off_session: true,
      confirm: true,
      description: description || `Payment for ${application.client_name} - ${application.business_name || ''}`,
      metadata: {
        application_id: applicationId,
        payment_id: paymentId || 'down_payment',
        client_email: application.client_email,
        is_down_payment: isDownPayment ? 'true' : 'false',
      },
    });

    // Create transaction record
    const { data: transaction } = await supabase
      .from('payment_transactions')
      .insert({
        application_id: applicationId,
        payment_id: paymentId || null,
        transaction_type: 'debit',
        amount: amount,
        status: paymentIntent.status === 'succeeded' ? 'completed' : 'failed',
        payment_method: application.payment_method_type,
        account_last4: application.payment_method_last4,
        processor_transaction_id: paymentIntent.id,
        error_message: paymentIntent.status !== 'succeeded' ? paymentIntent.last_payment_error?.message : null,
        receipt_email: application.client_email,
      })
      .select()
      .single();

    if (paymentIntent.status === 'succeeded') {
      // Update payment status (only if not down payment)
      if (!isDownPayment && payment) {
        await supabase
          .from('financing_payments')
          .update({
            status: 'paid',
            paid_date: new Date().toISOString(),
            payment_method: application.payment_method_type,
            transaction_id: paymentIntent.id,
            confirmation_number: `CONF-${Date.now()}`,
          })
          .eq('id', paymentId);
      }

      // Update application balance (for regular payments, not down payments - those are handled separately)
      if (!isDownPayment) {
        const newBalance = parseFloat(application.remaining_balance) - parseFloat(amount);
        const newTotalPaid = parseFloat(application.total_paid || 0) + parseFloat(amount);

        await supabase
          .from('financing_applications')
          .update({
            remaining_balance: newBalance,
            total_paid: newTotalPaid,
            last_payment_date: new Date().toISOString(),
        })
        .eq('id', applicationId);

      // Send receipt email
      await sendReceiptEmail({
        email: application.client_email,
        clientName: application.client_name,
        amount: amount,
        paymentDate: new Date().toISOString(),
        confirmationNumber: `CONF-${Date.now()}`,
        paymentMethod: application.payment_method_type === 'us_bank_account' ? 'Bank Account' : 'Card',
        paymentLast4: application.payment_method_last4,
        remainingBalance: newBalance,
        application: application,
        payment: payment,
      });

      // Mark receipt as sent
      await supabase
        .from('payment_transactions')
        .update({
          receipt_sent: true,
          receipt_sent_at: new Date().toISOString(),
        })
        .eq('id', transaction.id);

      return NextResponse.json({
        success: true,
        transaction: transaction,
        newBalance: newBalance,
        message: 'Payment processed successfully and receipt sent',
      });
    } else {
      return NextResponse.json({
        success: false,
        error: paymentIntent.last_payment_error?.message || 'Payment failed',
        transaction: transaction,
      }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Payment processing error:', error);
    
    // Log failed transaction
    try {
      await supabase
        .from('payment_transactions')
        .insert({
          application_id: request.json().then(d => d.applicationId),
          payment_id: request.json().then(d => d.paymentId),
          transaction_type: 'debit',
          amount: request.json().then(d => d.amount),
          status: 'failed',
          error_message: error.message,
        });
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }

    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Send receipt email via SendGrid
async function sendReceiptEmail(params: any) {
  try {
    const {
      email,
      clientName,
      amount,
      paymentDate,
      confirmationNumber,
      paymentMethod,
      paymentLast4,
      remainingBalance,
      application,
      payment,
    } = params;

    const sendGridApiKey = process.env.SENDGRID_API_KEY;
    if (!sendGridApiKey) {
      console.error('SendGrid API key not configured');
      return;
    }

    const emailContent = {
      to: email,
      from: process.env.SENDGRID_FROM_EMAIL || 'noreply@brightaudio.com',
      subject: `Payment Receipt - Confirmation #${confirmationNumber}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #4F46E5; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9fafb; }
            .receipt-box { background-color: white; border: 1px solid #e5e7eb; padding: 20px; margin: 20px 0; }
            .row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
            .label { font-weight: bold; }
            .total { font-size: 20px; font-weight: bold; color: #4F46E5; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
            .secure-badge { background-color: #10b981; color: white; padding: 8px 16px; border-radius: 20px; display: inline-block; margin: 10px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Payment Receipt</h1>
              <div class="secure-badge">🔒 Secure Payment Processed</div>
            </div>
            
            <div class="content">
              <p>Dear ${clientName},</p>
              <p>We have successfully processed your payment. Below are the details of your transaction:</p>
              
              <div class="receipt-box">
                <div class="row">
                  <span class="label">Confirmation Number:</span>
                  <span>${confirmationNumber}</span>
                </div>
                <div class="row">
                  <span class="label">Payment Date:</span>
                  <span>${new Date(paymentDate).toLocaleDateString()}</span>
                </div>
                <div class="row">
                  <span class="label">Payment Method:</span>
                  <span>${paymentMethod} ending in ${paymentLast4}</span>
                </div>
                <div class="row">
                  <span class="label">Amount Paid:</span>
                  <span class="total">$${parseFloat(amount).toFixed(2)}</span>
                </div>
                <div class="row">
                  <span class="label">Remaining Balance:</span>
                  <span>$${parseFloat(remainingBalance).toFixed(2)}</span>
                </div>
              </div>
              
              <h3>Loan Details</h3>
              <div class="receipt-box">
                <div class="row">
                  <span class="label">Loan Amount:</span>
                  <span>$${parseFloat(application.loan_amount).toFixed(2)}</span>
                </div>
                <div class="row">
                  <span class="label">Term:</span>
                  <span>${application.term_months} months</span>
                </div>
                <div class="row">
                  <span class="label">Monthly Payment:</span>
                  <span>$${parseFloat(application.monthly_payment).toFixed(2)}</span>
                </div>
                <div class="row">
                  <span class="label">Next Payment Due:</span>
                  <span>${application.next_payment_due ? new Date(application.next_payment_due).toLocaleDateString() : 'N/A'}</span>
                </div>
              </div>
              
              <p><strong>Security Note:</strong> Your payment information is securely stored and encrypted. We never store your full account details.</p>
              <p>If you have any questions about this payment, please contact us.</p>
              <p>Thank you for your business!</p>
            </div>
            
            <div class="footer">
              <p>This is an automated receipt. Please do not reply to this email.</p>
              <p>Payment processed securely through Stripe</p>
              <p>&copy; ${new Date().getFullYear()} Bright Audio. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sendGridApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailContent),
    });

    if (!response.ok) {
      console.error('Failed to send receipt email:', await response.text());
    }
  } catch (error) {
    console.error('Error sending receipt email:', error);
  }
}

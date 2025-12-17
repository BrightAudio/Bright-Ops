import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { paymentId, applicationId, amount, paymentMethod } = await request.json();

    // Get application details
    const { data: application } = await supabase
      .from('financing_applications')
      .select('*')
      .eq('id', applicationId)
      .single();

    if (!application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    // Get payment details
    const { data: payment } = await supabase
      .from('financing_payments')
      .select('*')
      .eq('id', paymentId)
      .single();

    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    // Get company bank account settings
    const { data: bankSettings } = await supabase
      .from('company_settings')
      .select('setting_value')
      .eq('setting_key', 'bank_account')
      .single();

    if (!bankSettings) {
      return NextResponse.json({ error: 'Company bank account not configured' }, { status: 400 });
    }

    // Simulate payment processing (in production, integrate with Stripe, Plaid, or payment processor)
    const processingResult = await processPayment({
      fromAccount: {
        accountNumber: application.bank_account_last4,
        routingNumber: application.bank_routing_number,
        accountType: application.bank_account_type,
      },
      toAccount: bankSettings.setting_value,
      amount: amount,
      paymentMethod: paymentMethod,
    });

    // Create transaction record
    const { data: transaction } = await supabase
      .from('payment_transactions')
      .insert({
        application_id: applicationId,
        payment_id: paymentId,
        transaction_type: 'debit',
        amount: amount,
        status: processingResult.success ? 'completed' : 'failed',
        payment_method: paymentMethod,
        account_last4: application.bank_account_last4 || application.card_last4,
        processor_transaction_id: processingResult.transactionId,
        error_message: processingResult.error,
        receipt_email: application.client_email,
      })
      .select()
      .single();

    if (processingResult.success) {
      // Update payment status
      await supabase
        .from('financing_payments')
        .update({
          status: 'paid',
          paid_date: new Date().toISOString(),
          payment_method: paymentMethod,
          transaction_id: processingResult.transactionId,
          confirmation_number: `CONF-${Date.now()}`,
        })
        .eq('id', paymentId);

      // Update application balance
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
        paymentMethod: paymentMethod,
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
        error: processingResult.error,
        transaction: transaction,
      }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Payment processing error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Simulate payment processing (replace with actual payment processor integration)
async function processPayment(params: any) {
  try {
    // In production, integrate with:
    // - Stripe for card payments and ACH
    // - Plaid for bank account verification
    // - Dwolla for ACH transfers
    // - Authorize.net for payment processing
    
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Simulate success (90% success rate)
    const success = Math.random() > 0.1;

    if (success) {
      return {
        success: true,
        transactionId: `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        error: null,
      };
    } else {
      return {
        success: false,
        transactionId: null,
        error: 'Insufficient funds or payment declined',
      };
    }
  } catch (error: any) {
    return {
      success: false,
      transactionId: null,
      error: error.message,
    };
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
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Payment Receipt</h1>
              <p>Thank you for your payment!</p>
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
                  <span>${paymentMethod === 'ach' ? 'Bank Account (ACH)' : 'Credit/Debit Card'}</span>
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
              
              <p>If you have any questions about this payment, please contact us.</p>
              <p>Thank you for your business!</p>
            </div>
            
            <div class="footer">
              <p>This is an automated receipt. Please do not reply to this email.</p>

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

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { applicationId, reminderType } = await request.json();

    // Get application and upcoming payment
    const { data: application } = await supabase
      .from('financing_applications')
      .select('*')
      .eq('id', applicationId)
      .single();

    if (!application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    // Get next pending payment
    const { data: payment } = await supabase
      .from('financing_payments')
      .select('*')
      .eq('application_id', applicationId)
      .eq('status', 'pending')
      .order('due_date', { ascending: true })
      .limit(1)
      .single();

    if (!payment) {
      return NextResponse.json({ error: 'No pending payments found' }, { status: 404 });
    }

    // Send reminder email
    await sendPaymentReminder({
      email: application.client_email,
      clientName: application.client_name,
      dueDate: payment.due_date,
      amount: payment.payment_amount,
      reminderType: reminderType,
      application: application,
    });

    // Create reminder record
    await supabase
      .from('payment_reminders')
      .insert({
        application_id: applicationId,
        payment_id: payment.id,
        reminder_type: reminderType,
        scheduled_date: new Date().toISOString(),
        sent_date: new Date().toISOString(),
        email_sent: true,
        status: 'sent',
      });

    return NextResponse.json({ success: true, message: 'Reminder sent successfully' });
  } catch (error: any) {
    console.error('Payment reminder error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function sendPaymentReminder(params: any) {
  try {
    const { email, clientName, dueDate, amount, reminderType, application } = params;

    const sendGridApiKey = process.env.SENDGRID_API_KEY;
    if (!sendGridApiKey) {
      console.error('SendGrid API key not configured');
      return;
    }

    const daysUntilDue = Math.ceil((new Date(dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    
    let subject = '';
    let urgency = '';
    
    switch (reminderType) {
      case 'upcoming':
        subject = `Payment Reminder - Due in ${daysUntilDue} days`;
        urgency = 'Upcoming Payment';
        break;
      case 'due_today':
        subject = 'Payment Due Today';
        urgency = 'Payment Due Today';
        break;
      case 'overdue':
        subject = 'Overdue Payment Notice';
        urgency = 'Payment Overdue';
        break;
      case 'final_notice':
        subject = 'Final Notice - Payment Required';
        urgency = 'FINAL NOTICE';
        break;
    }

    const emailContent = {
      to: email,
      from: process.env.SENDGRID_FROM_EMAIL || 'noreply@brightaudio.com',
      subject: subject,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: ${reminderType === 'overdue' || reminderType === 'final_notice' ? '#DC2626' : '#4F46E5'}; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9fafb; }
            .reminder-box { background-color: white; border: 2px solid ${reminderType === 'overdue' || reminderType === 'final_notice' ? '#DC2626' : '#4F46E5'}; padding: 20px; margin: 20px 0; }
            .amount { font-size: 32px; font-weight: bold; color: #4F46E5; text-align: center; margin: 20px 0; }
            .due-date { font-size: 18px; text-align: center; color: ${daysUntilDue < 0 ? '#DC2626' : '#059669'}; }
            .button { display: inline-block; background-color: #4F46E5; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
            .warning { background-color: #FEF2F2; border-left: 4px solid #DC2626; padding: 15px; margin: 15px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${urgency}</h1>
            </div>
            
            <div class="content">
              <p>Dear ${clientName},</p>
              
              ${reminderType === 'upcoming' ? `
                <p>This is a friendly reminder that your equipment financing payment is coming up soon.</p>
              ` : reminderType === 'due_today' ? `
                <p>Your equipment financing payment is <strong>due today</strong>.</p>
              ` : reminderType === 'overdue' ? `
                <div class="warning">
                  <strong>⚠️ Your payment is now overdue.</strong> Please submit your payment as soon as possible to avoid late fees and potential service interruption.
                </div>
              ` : `
                <div class="warning">
                  <strong>⚠️ FINAL NOTICE:</strong> Your account is seriously past due. Immediate payment is required to avoid collection proceedings.
                </div>
              `}
              
              <div class="reminder-box">
                <h3 style="margin-top: 0;">Payment Details</h3>
                <div class="amount">$${parseFloat(amount).toFixed(2)}</div>
                <div class="due-date">
                  ${daysUntilDue > 0 ? `Due in ${daysUntilDue} days` : daysUntilDue === 0 ? 'Due Today' : `${Math.abs(daysUntilDue)} days overdue`}
                </div>
                <p style="text-align: center; margin-top: 10px;">
                  <strong>Due Date:</strong> ${new Date(dueDate).toLocaleDateString()}
                </p>
              </div>
              
              <h3>Loan Information</h3>
              <ul>
                <li><strong>Loan Amount:</strong> $${parseFloat(application.loan_amount).toFixed(2)}</li>
                <li><strong>Monthly Payment:</strong> $${parseFloat(application.monthly_payment).toFixed(2)}</li>
                <li><strong>Remaining Balance:</strong> $${parseFloat(application.remaining_balance).toFixed(2)}</li>
              </ul>
              
              ${application.auto_pay_enabled ? `
                <p><strong>Note:</strong> This payment will be automatically processed from your payment method on file on the due date.</p>
              ` : `
                <div style="text-align: center;">
                  <a href="${process.env.NEXT_PUBLIC_APP_URL}/app/dashboard/leads/financing" class="button">
                    Make Payment Now
                  </a>
                </div>
              `}
              
              <p>If you have already made this payment, please disregard this notice.</p>
              <p>For questions or to update your payment method, please contact us.</p>
            </div>
            
            <div class="footer">
              <p>This is an automated reminder. Please do not reply to this email.</p>

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
      console.error('Failed to send reminder email:', await response.text());
    }
  } catch (error) {
    console.error('Error sending reminder email:', error);
  }
}

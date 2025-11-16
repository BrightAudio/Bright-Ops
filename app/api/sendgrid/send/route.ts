import { NextRequest, NextResponse } from 'next/server';
import sgMail from '@sendgrid/mail';
import { supabaseServer } from '@/lib/supabaseServer';

export async function POST(request: NextRequest) {
  try {
    const supabase = await supabaseServer();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get request body
    const { to, subject, htmlContent, leadId } = await request.json();

    // Validate required fields
    if (!to || !subject || !htmlContent) {
      return NextResponse.json(
        { error: 'Missing required fields: to, subject, htmlContent' },
        { status: 400 }
      );
    }

    // Get SendGrid configuration from settings table
    const { data: settings, error: settingsError } = await supabase
      .from('leads_settings')
      .select('sendgrid_api_key, email_from_name, email_from_address, email_reply_to')
      .single();

    if (settingsError || !settings?.sendgrid_api_key) {
      return NextResponse.json(
        { error: 'SendGrid API key not configured. Please add it in Settings.' },
        { status: 400 }
      );
    }

    // Set SendGrid API key
    sgMail.setApiKey(settings.sendgrid_api_key);

    // Prepare email message
    const msg = {
      to,
      from: {
        email: settings.email_from_address || 'noreply@brightops.com',
        name: settings.email_from_name || 'Bright Ops'
      },
      replyTo: settings.email_reply_to || settings.email_from_address,
      subject,
      html: htmlContent,
    };

    // Send email via SendGrid
    const [response] = await sgMail.send(msg);

    // Log the sent email to database
    const { error: logError } = await supabase
      .from('leads_emails')
      .insert({
        lead_id: leadId || null,
        recipient_email: to,
        subject,
        html_content: htmlContent,
        status: 'sent',
        sent_at: new Date().toISOString(),
        sent_by: user.id,
        sendgrid_message_id: response.headers['x-message-id'] || null,
      });

    if (logError) {
      console.error('Failed to log email:', logError);
      // Don't fail the request if logging fails
    }

    return NextResponse.json({
      success: true,
      messageId: response.headers['x-message-id'],
      statusCode: response.statusCode,
    });

  } catch (error: any) {
    console.error('SendGrid API Error:', error);

    // Handle SendGrid-specific errors
    if (error.response) {
      const { statusCode, body } = error.response;
      return NextResponse.json(
        {
          error: 'Failed to send email',
          details: body?.errors?.[0]?.message || 'Unknown SendGrid error',
          statusCode,
        },
        { status: statusCode }
      );
    }

    return NextResponse.json(
      { error: 'Failed to send email', details: error.message },
      { status: 500 }
    );
  }
}

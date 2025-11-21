import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(request: NextRequest) {
  try {
    const { phoneNumber, clientName, applicationUrl } = await request.json();

    if (!phoneNumber) {
      return NextResponse.json(
        { success: false, error: 'Phone number is required' },
        { status: 400 }
      );
    }

    // Get Twilio credentials from settings
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: settings, error: settingsError } = await supabase
      .from('leads_settings')
      .select('twilio_account_sid, twilio_auth_token, twilio_messaging_service_sid')
      .single();

    if (settingsError || !settings) {
      return NextResponse.json(
        { success: false, error: 'Twilio settings not configured' },
        { status: 500 }
      );
    }

    const { twilio_account_sid, twilio_auth_token, twilio_messaging_service_sid } = settings;

    if (!twilio_account_sid || !twilio_auth_token || !twilio_messaging_service_sid) {
      return NextResponse.json(
        { success: false, error: 'Twilio credentials incomplete. Please configure in settings.' },
        { status: 500 }
      );
    }

    // Format phone number to E.164 if needed
    let formattedPhone = phoneNumber.replace(/\D/g, '');
    if (!formattedPhone.startsWith('1') && formattedPhone.length === 10) {
      formattedPhone = '1' + formattedPhone;
    }
    formattedPhone = '+' + formattedPhone;

    // Prepare message
    const message = `Hi ${clientName || 'there'}! 👋\n\nYou've been invited to apply for a lease-to-own program with Bright Audio.\n\nComplete your application here:\n${applicationUrl}\n\nQuestions? Reply to this message.`;

    // Send SMS via Twilio
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilio_account_sid}/Messages.json`;
    const authHeader = 'Basic ' + Buffer.from(`${twilio_account_sid}:${twilio_auth_token}`).toString('base64');

    const formData = new URLSearchParams();
    formData.append('To', formattedPhone);
    formData.append('MessagingServiceSid', twilio_messaging_service_sid);
    formData.append('Body', message);

    const twilioResponse = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    const twilioData = await twilioResponse.json();

    if (!twilioResponse.ok) {
      console.error('Twilio error:', twilioData);
      return NextResponse.json(
        { success: false, error: twilioData.message || 'Failed to send SMS' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      messageSid: twilioData.sid,
      to: formattedPhone
    });

  } catch (error: any) {
    console.error('Error sending SMS:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

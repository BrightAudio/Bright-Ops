import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Vonage } from '@vonage/server-sdk';

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

    // Get Vonage credentials from settings
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: settings, error: settingsError } = await supabase
      .from('leads_settings')
      .select('vonage_api_key, vonage_api_secret, vonage_from_number')
      .single();

    if (settingsError || !settings) {
      return NextResponse.json(
        { success: false, error: 'Vonage settings not configured' },
        { status: 500 }
      );
    }

    const { vonage_api_key, vonage_api_secret, vonage_from_number } = settings;

    if (!vonage_api_key || !vonage_api_secret || !vonage_from_number) {
      return NextResponse.json(
        { success: false, error: 'Vonage credentials incomplete. Please configure in settings.' },
        { status: 500 }
      );
    }

    // Initialize Vonage client
    const vonage = new Vonage({
      apiKey: vonage_api_key,
      apiSecret: vonage_api_secret
    });

    // Format phone number to E.164 if needed
    let formattedPhone = phoneNumber.replace(/\D/g, '');
    if (!formattedPhone.startsWith('1') && formattedPhone.length === 10) {
      formattedPhone = '1' + formattedPhone;
    }

    console.log('Phone formatting:', { original: phoneNumber, formatted: formattedPhone });

    // Prepare message
    const text = `Hi ${clientName || 'there'}! 👋\n\nYou've been invited to apply for a lease-to-own program with Bright Audio.\n\nComplete your application here:\n${applicationUrl}\n\nQuestions? Reply to this message.`;

    // Send SMS via Vonage SDK
    const from = vonage_from_number.replace(/\D/g, '');
    const to = formattedPhone;

    console.log('📱 Attempting SMS send:', { from, to, textLength: text.length });

    try {
      const response = await vonage.sms.send({ to, from, text });
      
      console.log('✅ Vonage SMS Response:', JSON.stringify(response, null, 2));
      
      // Check if the message was accepted
      const message = response.messages[0];
      if (message.status !== '0') {
        console.error('❌ Vonage returned error status:', message);
        return NextResponse.json({
          success: false,
          error: `Vonage error: ${(message as any).errorText || 'Status ' + message.status}`
        }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        messageId: message.messageId || message['message-id'],
        to: formattedPhone,
        status: message.status
      });

    } catch (vonageError: any) {
      console.error('❌ Vonage SDK Error:', vonageError);
      const errorMsg = vonageError?.message || vonageError?.error || JSON.stringify(vonageError) || 'Unknown Vonage error';
      return NextResponse.json({
        success: false,
        error: `Vonage API error: ${errorMsg}`,
        details: vonageError
      }, { status: 500 });
    }

  } catch (error: any) {
    console.error('❌ General Error in SMS API:', error);
    const errorMsg = error?.message || error?.error || JSON.stringify(error) || 'Internal server error';
    return NextResponse.json(
      { 
        success: false, 
        error: errorMsg,
        details: error.toString(),
        stack: error.stack
      },
      { status: 500 }
    );
  }
}

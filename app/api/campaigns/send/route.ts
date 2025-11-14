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

    const body = await request.json();
    const { campaignId } = body;

    if (!campaignId) {
      return NextResponse.json(
        { error: 'Campaign ID is required' },
        { status: 400 }
      );
    }

    // Get campaign details
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', campaignId)
      .single();

    if (campaignError || !campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    // Get SendGrid settings
    const { data: settings, error: settingsError } = await supabase
      .from('leads_settings')
      .select('sendgrid_api_key, email_from_name, email_from_address, email_reply_to')
      .single();

    if (settingsError || !(settings as any)?.sendgrid_api_key) {
      return NextResponse.json(
        { error: 'SendGrid API key not configured. Please add it in Settings.' },
        { status: 400 }
      );
    }

    sgMail.setApiKey((settings as any).sendgrid_api_key);

    // Get pending recipients for this campaign
    const { data: recipients, error: recipientsError } = await supabase
      .from('campaign_recipients')
      .select(`
        id,
        lead_id,
        leads (
          id,
          name,
          email,
          org,
          title
        )
      `)
      .eq('campaign_id', campaignId)
      .eq('status', 'pending')
      .limit(100); // Send max 100 at a time to avoid rate limits

    if (recipientsError) {
      throw recipientsError;
    }

    if (!recipients || recipients.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No pending recipients to send to',
        sent: 0,
      });
    }

    // Update campaign status to 'sending'
    await supabase
      .from('campaigns')
      .update({ 
        status: 'sending',
        started_at: new Date().toISOString(),
      } as any)
      .eq('id', campaignId);

    let sentCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    // Send emails to each recipient
    for (const recipient of recipients as any[]) {
      const lead = recipient.leads;
      if (!lead) continue;

      try {
        // Replace merge fields in template
        const personalizedBody = (campaign as any).body_template
          .replace(/\{\{name\}\}/g, lead.name || '')
          .replace(/\{\{email\}\}/g, lead.email || '')
          .replace(/\{\{org\}\}/g, lead.org || '')
          .replace(/\{\{title\}\}/g, lead.title || '');

        const personalizedSubject = (campaign as any).subject
          .replace(/\{\{name\}\}/g, lead.name || '')
          .replace(/\{\{org\}\}/g, lead.org || '');

        // Send via SendGrid
        const msg = {
          to: lead.email,
          from: {
            email: (settings as any).email_from_address || 'noreply@brightops.com',
            name: (settings as any).email_from_name || 'Bright Ops'
          },
          replyTo: (settings as any).email_reply_to || (settings as any).email_from_address,
          subject: personalizedSubject,
          html: personalizedBody.replace(/\n/g, '<br>'),
        };

        const [response] = await sgMail.send(msg);

        // Log the email
        const { data: emailLog } = await supabase
          .from('leads_emails')
          .insert({
            lead_id: lead.id,
            recipient_email: lead.email,
            subject: personalizedSubject,
            html_content: personalizedBody,
            status: 'sent',
            sent_at: new Date().toISOString(),
            sent_by: user.id,
            sendgrid_message_id: response.headers['x-message-id'] || null,
          } as any)
          .select()
          .single();

        // Update recipient status
        await supabase
          .from('campaign_recipients')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString(),
            email_id: (emailLog as any)?.id || null,
          } as any)
          .eq('id', recipient.id);

        // Update lead status
        await supabase
          .from('leads')
          .update({
            status: 'contacted',
            last_contacted: new Date().toISOString(),
          } as any)
          .eq('id', lead.id);

        sentCount++;

        // Rate limiting: wait 100ms between sends
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error: any) {
        console.error(`Failed to send to ${lead.email}:`, error);
        failedCount++;
        errors.push(`${lead.email}: ${error.message}`);

        // Update recipient with error
        await supabase
          .from('campaign_recipients')
          .update({
            status: 'failed',
            error_message: error.message,
          } as any)
          .eq('id', recipient.id);
      }
    }

    // Update campaign stats
    const { data: stats } = await supabase
      .from('campaign_recipients')
      .select('status')
      .eq('campaign_id', campaignId);

    const statusCounts = (stats || []).reduce((acc: any, r: any) => {
      acc[r.status] = (acc[r.status] || 0) + 1;
      return acc;
    }, {});

    // Check if campaign is complete
    const pendingCount = statusCounts.pending || 0;
    const isCampaignComplete = pendingCount === 0;

    await supabase
      .from('campaigns')
      .update({
        status: isCampaignComplete ? 'sent' : 'sending',
        completed_at: isCampaignComplete ? new Date().toISOString() : null,
        sent_count: statusCounts.sent || 0,
        failed_count: statusCounts.failed || 0,
        total_recipients: recipients.length,
      } as any)
      .eq('id', campaignId);

    return NextResponse.json({
      success: true,
      sent: sentCount,
      failed: failedCount,
      remaining: pendingCount,
      isComplete: isCampaignComplete,
      errors: errors.length > 0 ? errors : undefined,
      message: `Sent ${sentCount} emails${failedCount > 0 ? `, ${failedCount} failed` : ''}`,
    });

  } catch (error: any) {
    console.error('Campaign Send Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to send campaign',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

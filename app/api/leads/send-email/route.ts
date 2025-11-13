import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/leads/send-email
 * 
 * Sends email to a lead and updates their status in database.
 * Currently a placeholder - actual email sending implementation pending.
 * 
 * Request body:
 * {
 *   leadId: string,
 *   to: string,
 *   subject: string,
 *   body: string
 * }
 * 
 * Response:
 * {
 *   success: boolean,
 *   message: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const { leadId, to, subject, body } = await request.json();

    if (!leadId || !to || !subject || !body) {
      return NextResponse.json(
        { error: "leadId, to, subject, and body are required" },
        { status: 400 }
      );
    }

    // PLACEHOLDER: In production, this would:
    // 1. Use SendGrid/Gmail API to send the email
    // 2. Update lead status in Supabase to "contacted"
    // 3. Set last_contacted timestamp
    // 4. Log the email in an outreach_log table

    // Check for email service configuration
    const sendgridKey = process.env.SENDGRID_API_KEY;
    const gmailUser = process.env.GMAIL_USER;
    
    if (!sendgridKey && !gmailUser) {
      return NextResponse.json({
        success: false,
        message: "Email service not configured. Please add SENDGRID_API_KEY or GMAIL_USER to environment variables.",
      }, { status: 503 });
    }

    // For now, return success without actually sending
    return NextResponse.json({
      success: true,
      message: `Email sending functionality coming soon. Would send to: ${to}`,
      leadId,
      preview: {
        to,
        subject,
        bodyLength: body.length,
      },
    });

  } catch (error) {
    console.error("Error in send-email API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

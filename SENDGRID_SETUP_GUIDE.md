# SendGrid Email Integration - Setup Guide

## ✅ What's Been Implemented

### 1. **SendGrid Email Sending API** (`/api/sendgrid/send`)
- Full SendGrid integration with error handling
- Email logging to database (`leads_emails` table)
- Retrieves settings from Supabase (`leads_settings` table)
- Returns SendGrid message ID for tracking

### 2. **Settings Page** (`/app/dashboard/leads/settings`)
- Form inputs for all configuration
- Saves to Supabase automatically
- Dark theme matching Leads portal
- Real-time loading/saving states

### 3. **Email Sending** (`/app/dashboard/leads/[id]`)
- "Send Email" button now uses SendGrid API
- Shows loading state during send
- Updates lead status to "contacted" after successful send
- Displays success/error messages with details

### 4. **Database Tables**
- `leads_settings` - Stores API keys and email configuration
- `leads_emails` - Logs all sent emails with tracking data

---

## 🚀 Setup Steps

### Step 1: Run the Database Migration

You need to create the tables in Supabase:

```sql
-- Run this in your Supabase SQL Editor
-- File location: sql/migrations/2025-11-13_leads_email_integration.sql
```

**Option A:** Copy/paste the SQL file into Supabase SQL Editor  
**Option B:** Run from command line if you have Supabase CLI:
```bash
supabase db push
```

### Step 2: Get Your SendGrid API Key

1. **Sign up/Login to SendGrid**
   - Go to https://sendgrid.com/
   - Create a free account (100 emails/day free forever)

2. **Create API Key**
   - Navigate to: Settings → API Keys
   - Click "Create API Key"
   - Name it: "Bright Ops Leads"
   - Select "Full Access" (or "Restricted Access" with Mail Send permissions)
   - **Copy the key immediately** (you won't see it again!)
   - Format: `SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

3. **Verify Sender Email**
   - Navigate to: Settings → Sender Authentication
   - Click "Verify a Single Sender"
   - Enter your email (the one you'll send FROM)
   - Check your email for verification link
   - **This is REQUIRED** - SendGrid won't send without it

### Step 3: Configure Settings in the App

1. **Navigate to Leads Portal**
   - Go to: http://localhost:3000/app/dashboard/leads
   - Enter password: `brightleads2025`

2. **Go to Settings**
   - Click "SETTINGS" in the Leads navigation

3. **Enter Your Credentials**
   - **SendGrid API Key**: Paste the `SG.xxx...` key from Step 2
   - **From Email**: Enter the verified email from Step 2 (e.g., `you@example.com`)
   - **From Name**: Your name or company (e.g., "Bright Audio")
   - **Reply-To Email**: (Optional) Where replies should go

4. **Optional: Add OpenAI API Key**
   - If you want AI email generation
   - Get from: https://platform.openai.com/api-keys
   - Format: `sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxx`

5. **Click "Save Settings"**
   - Should see green success message
   - Settings are now stored in Supabase

### Step 4: Test Email Sending

1. **Add or Open a Test Lead**
   - Create a test lead with YOUR email (so you can verify receipt)
   - Or open an existing lead

2. **Generate Email**
   - Click "Generate Email with AI" (if you added OpenAI key)
   - Or manually type subject and body

3. **Send Test Email**
   - Click "Send Email"
   - Confirm in the dialog
   - Should see: "✅ Email sent successfully!"
   - Check your inbox (may take 30-60 seconds)

4. **Verify in Database**
   - Go to Supabase → Table Editor → `leads_emails`
   - You should see the logged email with:
     - `recipient_email`: Your test email
     - `status`: "sent"
     - `sendgrid_message_id`: The tracking ID
     - `sent_at`: Timestamp

---

## 🔍 What Information You Need from SendGrid

### Required:
1. ✅ **SendGrid API Key** - For authentication (`SG.xxx...`)
2. ✅ **Verified Sender Email** - The "from" address (must be verified in SendGrid)

### Optional (Nice to Have):
3. **Domain Authentication** - For better deliverability (prevents spam)
4. **Webhook URL** - For tracking opens, clicks, bounces (future enhancement)
5. **Template IDs** - If you want to use SendGrid templates (future enhancement)

---

## 🎯 Testing Checklist

- [ ] Database migration ran successfully
- [ ] SendGrid API key obtained and saved
- [ ] Sender email verified in SendGrid
- [ ] Settings saved in app without errors
- [ ] Test email sent successfully
- [ ] Test email received in inbox
- [ ] Email logged in `leads_emails` table
- [ ] Lead status updated to "contacted"
- [ ] Lead `last_contacted` timestamp updated

---

## 📊 Database Schema

### `leads_settings` Table
```sql
- id: UUID (primary key)
- openai_api_key: TEXT (nullable, encrypted recommended)
- sendgrid_api_key: TEXT (nullable, encrypted recommended)
- email_from_name: TEXT (default: "Bright Ops")
- email_from_address: TEXT (nullable, must be verified in SendGrid)
- email_reply_to: TEXT (nullable)
- ai_tone: TEXT (default: "professional")
- ai_template: TEXT (nullable)
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
- updated_by: UUID (references auth.users)
```

### `leads_emails` Table
```sql
- id: UUID (primary key)
- lead_id: UUID (references leads, nullable)
- recipient_email: TEXT (not null)
- subject: TEXT (not null)
- html_content: TEXT (not null)
- sendgrid_message_id: TEXT (nullable)
- status: TEXT (sent|delivered|opened|clicked|bounced|failed)
- sent_at: TIMESTAMPTZ
- delivered_at: TIMESTAMPTZ (nullable)
- opened_at: TIMESTAMPTZ (nullable)
- clicked_at: TIMESTAMPTZ (nullable)
- sent_by: UUID (references auth.users)
- created_at: TIMESTAMPTZ
```

---

## 🚨 Troubleshooting

### Error: "SendGrid API key not configured"
→ Go to Settings and save your SendGrid API key

### Error: "Sender email not verified"
→ Check SendGrid dashboard → Sender Authentication → Verify your email

### Error: "Unauthorized"
→ Make sure you're logged in to the app

### Email sent but not received
→ Check spam folder
→ Wait 2-3 minutes (SendGrid can be slow on free tier)
→ Check SendGrid dashboard → Activity to see delivery status

### Database error when saving settings
→ Make sure you ran the migration SQL
→ Check Supabase logs for RLS policy issues

---

## 🎨 Next Steps (Optional Enhancements)

1. **Encrypt API Keys** - Store encrypted in database
2. **Email Templates** - Use SendGrid's template system
3. **Tracking Dashboard** - Show open rates, click rates
4. **Webhooks** - Real-time email status updates
5. **Rate Limiting** - Prevent API abuse
6. **Bulk Sending** - Send to multiple leads at once
7. **A/B Testing** - Test different subject lines
8. **Scheduling** - Send emails at optimal times

---

## 📝 Quick Reference

**SendGrid Dashboard**: https://app.sendgrid.com/  
**API Keys**: https://app.sendgrid.com/settings/api_keys  
**Sender Auth**: https://app.sendgrid.com/settings/sender_auth  
**Activity**: https://app.sendgrid.com/email_activity  

**Free Tier Limits**:
- 100 emails/day forever
- No credit card required
- All features included

**Pricing** (if you need more):
- 40k emails/month: $19.95/mo
- 100k emails/month: $89.95/mo
- Custom enterprise plans available

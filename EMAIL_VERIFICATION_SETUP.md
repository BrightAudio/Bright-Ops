# Email Verification Setup Guide

## Overview
Email verification has been implemented in the code. To fully enable it, you need to configure it in your Supabase dashboard.

## Current Status
✅ **Code Implementation**: Complete - the app handles both verified and unverified signup flows
⚠️ **Supabase Configuration**: Needs to be enabled in dashboard

## How to Enable Email Verification

### Step 1: Access Supabase Dashboard
1. Go to https://supabase.com/dashboard
2. Select your project
3. Navigate to **Authentication** → **Providers**

### Step 2: Enable Email Confirmation
1. Click on **Email** provider
2. Scroll to **Email Confirmation** section
3. Toggle **Enable email confirmations** to ON
4. Click **Save**

### Step 3: Configure Email Templates (Optional but Recommended)
1. Navigate to **Authentication** → **Email Templates**
2. Customize the **Confirm signup** template:
   - Subject: "Verify your Bright Ops account"
   - Body: Include your branding and the confirmation link
   - The default template works but can be improved

### Step 4: Test the Flow
1. Go to your signup page: http://localhost:3000/auth/signup
2. Create a new account
3. Check your email for the verification link
4. Click the link to verify
5. Log in with your verified account

## How It Works

### Without Email Verification (Current State)
1. User signs up
2. Account created and immediately logged in
3. Redirected to `/onboarding`

### With Email Verification (After Enabling)
1. User signs up
2. Account created but NOT logged in
3. User sees message: "Account created! Check your email for a verification link."
4. User receives email with verification link
5. User clicks link → redirected to `/auth/callback`
6. User can now log in
7. After login → redirected to `/onboarding`

## Code Changes Made

### `app/actions/auth.ts`
- Enhanced `signupAction` to properly detect email verification requirement
- Added `requiresVerification` flag to response
- Improved success messages

### `components/home/HomeAuth.tsx`
- Already handles success messages from server actions
- Shows clear instructions when email verification is required

## Email Provider Configuration

### Using Supabase's Built-in Email (Default)
- No additional setup required
- Limited to Supabase's email rate limits
- Good for development and small-scale production

### Using Custom SMTP (Recommended for Production)
1. Navigate to **Project Settings** → **Auth**
2. Scroll to **SMTP Settings**
3. Enable custom SMTP
4. Configure your email provider (SendGrid, Mailgun, AWS SES, etc.)
5. Test the configuration

### Using SendGrid (Example)
You already have SendGrid setup (see `SENDGRID_SETUP_GUIDE.md`)
1. Get your SMTP credentials from SendGrid
2. In Supabase → **Project Settings** → **Auth** → **SMTP Settings**:
   - SMTP Host: `smtp.sendgrid.net`
   - SMTP Port: `587`
   - SMTP Username: `apikey`
   - SMTP Password: Your SendGrid API key
   - Sender Email: Your verified sender email
   - Sender Name: `Bright Ops`

## Environment Variables

No additional environment variables needed. The app uses:
- `NEXT_PUBLIC_SITE_URL` for redirect URLs (already configured)
- Supabase handles email sending through their service

## Troubleshooting

### Users Not Receiving Emails
1. Check Supabase logs: **Authentication** → **Logs**
2. Verify email isn't in spam folder
3. Check SMTP configuration if using custom provider
4. Ensure sender email is verified (for custom SMTP)

### Verification Link Not Working
1. Check `NEXT_PUBLIC_SITE_URL` is set correctly in `.env.local`
2. Verify callback route exists at `/auth/callback`
3. Check browser console for errors

### Users Can't Log In After Verification
1. Ensure they clicked the verification link
2. Check user status in Supabase dashboard: **Authentication** → **Users**
3. Look for `email_confirmed_at` field - should have a timestamp

## Testing

### Test Without Email Verification (Current)
```bash
# Sign up a user
# Should auto-login and redirect to /onboarding
```

### Test With Email Verification (After Enabling)
```bash
# Sign up a user
# Should show success message
# Check email
# Click verification link
# Log in manually
# Should redirect to /onboarding
```

## Security Benefits

✅ Prevents spam accounts
✅ Confirms user owns the email address
✅ Reduces fake signups
✅ Improves data quality
✅ Industry best practice

## User Experience

The implementation provides a smooth experience:
- Clear success messages
- Helpful instructions
- No confusion about next steps
- Professional email templates (when customized)

## Next Steps

1. **Enable in Supabase**: Follow Step 2 above
2. **Customize email template**: Make it match your brand
3. **Test thoroughly**: Create test accounts
4. **Monitor**: Check logs for any issues
5. **Consider custom SMTP**: For production reliability

## Related Documentation

- `SENDGRID_SETUP_GUIDE.md` - Email provider setup
- `SECURE_PAYMENTS_GUIDE.md` - Security best practices
- Supabase Auth Docs: https://supabase.com/docs/guides/auth

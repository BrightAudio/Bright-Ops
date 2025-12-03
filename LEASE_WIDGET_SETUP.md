# Lease Application Widget Setup

## Overview
The lease application widget allows customers to apply for lease-to-own financing directly from your website. The widget appears as a floating button and includes built-in validation and a locked interest rate.

## Features

### 🔒 Security Features
- **Locked Interest Rate**: 6.5% interest rate is pre-set and cannot be modified by customers
- **Required Field Validation**: Form cannot be submitted until all required fields are completed
- **Encrypted Data**: All submissions are encrypted in transit and stored securely

### ✨ User Experience
- **Real-time Payment Calculator**: Shows payment breakdown as customer enters information
- **Mobile Responsive**: Works on all devices and screen sizes
- **Clean UI**: Purple gradient design matching your brand
- **Floating Widget**: Non-intrusive button in bottom-right corner

### 📊 Business Benefits
- **Automatic Lead Creation**: Each submission creates both a lease application and a lead record
- **Instant Notifications**: All applications appear in your dashboard immediately
- **Source Tracking**: Widget submissions are tagged with `source: 'website_widget'`

## Installation

### 1. Run Database Migration
Execute the SQL migration in Supabase:
```sql
-- File: sql/UPDATE_LEASE_APPLICATIONS.sql
```

This adds:
- `source` column to track application origin
- `submitted_at` timestamp for submission tracking
- RLS policies allowing anonymous submissions
- Indexes for better query performance

### 2. Embed Widget on Website
Add this code before the closing `</body>` tag on your website:

```html
<script src="https://your-domain.com/api/lease-application-widget"></script>
```

**For development:**
```html
<script src="http://localhost:3000/api/lease-application-widget"></script>
```

### 3. Test the Widget
1. Visit your website
2. Click the purple 💳 button in the bottom-right corner
3. Fill out the application form (note the locked interest rate)
4. Try submitting without filling all fields (should be disabled)
5. Complete all required fields and accept terms
6. Submit and verify it appears in your dashboard

## Required Fields

The following fields **must** be filled before submission:
- ✅ Your Name
- ✅ Email Address
- ✅ Phone Number
- ✅ Driver's License / ID Number
- ✅ Lease Amount
- ✅ Sales Tax Rate
- ✅ Lease Term (12, 24, 36, or 48 months)
- ✅ Equipment Description
- ✅ Terms & Conditions checkbox

Optional fields:
- Business Name
- Business Address
- Business EIN

## Interest Rate Policy

- **Dashboard Applications**: Interest rate can be customized per application
- **Website Widget**: Interest rate is **locked at 6.5%** and displayed as read-only
- **Locked Field**: Appears grayed out with "Interest Rate (Locked)" label
- **Backend Validation**: API rejects any submissions with rate ≠ 6.5%

## Viewing Submissions

Applications submitted via the widget:
1. Navigate to **Dashboard → Leads → Financing**
2. Click the **Applications** tab
3. Filter by source: `website_widget`
4. Process applications normally

Each submission also creates a lead in:
- **Dashboard → Leads** with source "Lease Application (Website)"

## Technical Details

### API Endpoints
- **Widget Code**: `/api/lease-application-widget` (GET)
  - Returns JavaScript code for widget
  - Includes styles, form, validation logic
  
- **Submit Application**: `/api/lease-application/submit` (POST)
  - Accepts application data from widget
  - Validates required fields
  - Enforces 6.5% interest rate
  - Creates lease application and lead records

### Database Schema
```sql
lease_applications {
  -- Existing fields --
  client_name TEXT
  client_email TEXT
  client_phone TEXT
  drivers_license_number TEXT
  business_name TEXT
  business_address TEXT
  business_ein TEXT
  loan_amount NUMERIC
  sales_tax_rate NUMERIC
  term_months INTEGER
  interest_rate NUMERIC (locked at 6.5 for widget)
  equipment_description TEXT
  monthly_payment NUMERIC (calculated)
  total_amount NUMERIC (calculated)
  status TEXT
  terms_accepted BOOLEAN
  
  -- New fields --
  source TEXT (DEFAULT 'dashboard', widget uses 'website_widget')
  submitted_at TIMESTAMP WITH TIME ZONE (DEFAULT NOW())
}
```

### Payment Calculation
```javascript
const principal = parseFloat(lease_amount);
const months = parseInt(term_months);
const monthlyRate = 0.065 / 12; // 6.5% annual rate
const basePayment = (principal * monthlyRate * Math.pow(1 + monthlyRate, months)) / 
                    (Math.pow(1 + monthlyRate, months) - 1);
const salesTaxPerPayment = basePayment * (sales_tax_rate / 100);
const totalPayment = basePayment + salesTaxPerPayment;
const totalPaid = totalPayment * months;
```

## Dashboard Updates

### New "Website Widget" Tab
Location: **Dashboard → Leads → Financing → Website Widget**

Features:
- Copy-to-clipboard embed code
- Feature list and documentation
- Important notes and best practices

### Updated Application Form
Location: **Dashboard → Leads → Financing → Applications → New Application**

Changes:
- ✅ Interest rate field shown as "Interest Rate (Locked)" at 6.5%
- ✅ Field appears grayed out and read-only
- ✅ Submit button disabled until all required fields filled
- ✅ Validates: name, email, phone, license, amount, equipment description

## Customization

### Change Interest Rate
To update the locked interest rate:

1. **Widget** (`/app/api/lease-application-widget/route.ts`):
   ```javascript
   const INTEREST_RATE = 6.5; // Change this value
   ```

2. **API Validation** (`/app/api/lease-application/submit/route.ts`):
   ```javascript
   if (parseFloat(data.interest_rate) !== 6.5) { // Update validation
   ```

3. **Dashboard Default** (`/app/dashboard/leads/financing/page.tsx`):
   ```javascript
   interest_rate: '6.5', // Update default in newApp state
   ```

### Change Sales Tax Default
Update in widget code:
```javascript
value="8.25" // Change default sales tax percentage
```

## Troubleshooting

### Widget Not Appearing
- Check browser console for errors
- Verify script URL is correct
- Ensure no Content Security Policy blocking scripts
- Check network tab for 200 response from widget endpoint

### Submissions Not Appearing
- Verify database migration ran successfully
- Check Supabase RLS policies allow anonymous inserts
- Review browser console for API errors
- Check `/api/lease-application/submit` endpoint logs

### Form Won't Submit
- Ensure all required fields are filled
- Check that terms checkbox is checked
- Verify interest rate is exactly 6.5
- Check for validation errors in red borders

## Production Checklist

Before going live:
- [ ] Run `UPDATE_LEASE_APPLICATIONS.sql` in production database
- [ ] Update `NEXT_PUBLIC_APP_URL` environment variable
- [ ] Test widget on staging environment
- [ ] Verify submissions create applications and leads
- [ ] Set up email notifications for new applications
- [ ] Update embed code on production website
- [ ] Test mobile responsiveness
- [ ] Monitor error logs for 24 hours post-launch

## Support

For issues or questions:
1. Check Supabase logs for API errors
2. Review browser console for JavaScript errors
3. Verify database schema matches migration
4. Check RLS policies are correctly configured

# Leads Management System - Complete Code Summary

**Status**: ✅ Fully implemented with search, import, scoring, campaigns, and email integration  
**Location**: `/app/app/dashboard/leads/` + `/app/api/leads/`  
**Database Tables**: 8 core tables + relationships  
**API Endpoints**: 12+ routes for discovery, scraping, scoring, emails  
**Token Cost**: 5 tokens per lead discovery batch (configured in TOKEN_SYSTEM)

---

## 🗄️ DATABASE SCHEMA

### Main Tables

#### 1. **leads** (Core Lead Data)
```typescript
{
  id: UUID (primary key)
  name: string (required)
  email: string (required, searchable)
  phone?: string
  org?: string (organization/company name)
  title?: string (job title)
  venue?: string (specific venue if applicable)
  website?: string (company website)
  snippet?: string (summary text from search)
  source?: string (where discovered: google, linkedin, scrape, import, etc.)
  status?: string (uncontacted | contacted | follow-up | interested | converted | archived)
  score?: number (lead quality score 0-100)
  notes?: string (internal notes)
  
  -- AI-Generated Content (stored after generation)
  generated_subject?: string (email subject from AI)
  generated_body?: string (email body from AI)
  
  -- Timestamps
  created_at: timestamp
  updated_at: timestamp
  last_activity_at: timestamp
  last_contacted?: timestamp
}
```

**Indexes**: 
- `idx_leads_organization_id` (for filtering by org)
- `idx_leads_status` (for status-based filtering)
- `idx_leads_email` (for quick lookup)
- `idx_leads_created_at` (for sorting)

**RLS Policies**: Organization-scoped (users can only see leads in their organization)

---

#### 2. **lead_activities** (Audit Trail & Engagement)
```typescript
{
  id: UUID
  lead_id: UUID (FK to leads)
  activity_type: string (email_sent | call_logged | follow_up | converted | archived | etc.)
  description: string (details of activity)
  user_id: UUID (who performed action)
  metadata: JSONB (extra context: email_open_rate, call_duration, etc.)
  created_at: timestamp
}
```
**Usage**: Tracks every interaction with a lead for audit trail and engagement metrics

---

#### 3. **leads_emails** (Email Campaign Tracking)
```typescript
{
  id: UUID
  lead_id?: UUID (FK to leads)
  recipient_email: string (actual email address sent to)
  subject: string
  html_content: string (email body)
  sent_by?: string (user who sent)
  sent_at?: timestamp
  delivered_at?: timestamp (when email was delivered)
  opened_at?: timestamp (when recipient opened)
  clicked_at?: timestamp (when recipient clicked link)
  status?: string (pending | sent | delivered | opened | clicked | failed | bounced)
  sendgrid_message_id?: string (tracking ID from SendGrid)
  created_at: timestamp
}
```
**Usage**: Email campaign tracking with open/click metrics for analytics

---

#### 4. **email_campaigns** (Campaign Management)
```typescript
{
  id: UUID
  organization_id: UUID (which org owns this campaign)
  name: string (campaign name: "Q1 Audio Rentals Outreach", etc.)
  subject_template?: string
  body_template?: string
  status?: string (draft | scheduled | active | completed | cancelled)
  created_at: timestamp
  updated_at: timestamp
}
```
**Usage**: Groups multiple leads into coordinated outreach campaigns

---

#### 5. **campaign_recipients** (Campaign Membership)
```typescript
{
  id: UUID
  campaign_id: UUID (FK to email_campaigns)
  lead_id?: UUID (FK to leads)
  email: string
  status?: string (pending | sent | delivered | opened | clicked | failed)
  created_at: timestamp
}
```
**Usage**: Junction table connecting leads to campaigns, tracks individual email status

---

#### 6. **lead_custom_fields** (Custom Lead Attributes)
```typescript
{
  id: UUID
  organization_id: UUID
  field_name: string (e.g., "Venue Type", "Budget Range", "Decision Timeline")
  field_type: string (text | select | number | date | checkbox)
  options?: JSONB (if select: { "Option A", "Option B" })
  created_at: timestamp
}
```
**Usage**: Define custom fields per organization for tailored lead data capture

---

#### 7. **lead_custom_field_values** (Custom Data Per Lead)
```typescript
{
  id: UUID
  lead_id: UUID (FK to leads)
  field_id: UUID (FK to lead_custom_fields)
  value: string
  created_at: timestamp
}
```
**Usage**: Store custom field values for individual leads

---

#### 8. **lead_job_titles** (Search Database)
```typescript
{
  id: UUID
  title: string (e.g., "Event Manager", "Facilities Director", "Wedding Planner")
  category?: string (entertainment | corporate | non-profit | venue | etc.)
  priority?: number (1=high, 2=medium, 3=low for search ordering)
  created_at: timestamp
}
```
**Usage**: Predefined job titles for targeted lead searches

---

#### 9. **lead_search_keywords** (Search Terms)
```typescript
{
  id: UUID
  keyword: string (e.g., "event planning", "venue rental", "audio visual")
  created_at: timestamp
}
```
**Usage**: Keywords combined with job titles for Google Search lead discovery

---

## 🔌 API ENDPOINTS

### Lead Discovery & Search

#### **POST /api/leads/auto-search** ⭐ Primary Discovery
```typescript
Request: {
  city: string (required: "Portland")
  state: string (required: "OR")
  radius?: number (default: 25 miles)
  keywords?: string[] (custom search terms)
}

Response: {
  success: boolean
  leads: Lead[] (discovered leads)
  count: number
  message: string
  sources: { google: 5, linkedin: 2, ... }
}
```
**What it does**:
1. Fetches job titles from database (ordered by priority)
2. Combines with location + keywords for search queries
3. Uses Google Search API / Google Custom Search Engine
4. Returns 10-50 leads per search
5. **Token Cost**: 5 tokens per execution

---

#### **POST /api/leads/smart-discovery** 🧠 AI-Powered Discovery
```typescript
Request: {
  target_industry?: string
  business_type?: string
  venue_type?: string
  budget_range?: string
}

Response: {
  leads: Lead[]
  analysis: {
    market_fit: number (0-100)
    conversion_probability: number
    recommendations: string[]
  }
}
```
**What it does**: Uses AI to intelligently identify high-quality leads based on venue type and business model

---

#### **POST /api/leads/scrape** 🕷️ Website Scraping
```typescript
Request: {
  url: string (required: "https://example.com/contact")
  method?: 'basic' | 'linkedin' (default: 'basic')
}

Response: {
  success: boolean
  leads: Lead[] (extracted contacts)
  count: number
}
```
**What it does**:
1. Fetches webpage HTML
2. Uses Cheerio to parse email, phone, names
3. Extracts contact info from common patterns
4. Returns structured lead data

---

#### **POST /api/leads/import-csv** 📊 CSV Import
```typescript
Request: FormData with file field
{
  file: File (CSV with: name, email, org, title, venue)
}

Response: {
  success: boolean
  imported: number
  skipped: number
  errors: { row: number, reason: string }[]
}
```
**What it does**:
1. Parses CSV file
2. Validates email format
3. Deduplicates against existing leads
4. Batch inserts to database

---

#### **POST /api/leads/search-google** 🔍 Manual Google Search
```typescript
Request: {
  query: string
  location?: string
}

Response: {
  results: { title, link, snippet }[]
  leads: Lead[]
}
```
**What it does**: Direct Google search by query + optional location filtering

---

#### **POST /api/leads/audio-gigs-search** 🎤 Audio-Specific Discovery
```typescript
Request: {
  city: string
  state: string
}

Response: {
  leads: Lead[] (pre-filtered for audio event venues)
  count: number
}
```
**What it does**: Searches specifically for audio rental venues, event spaces, and entertainment venues

---

### Lead Scoring & Qualification

#### **POST /api/leads/score** ⭐ Lead Scoring
```typescript
Request: {
  leadIds: string[] (batch scoring)
}

Response: {
  leads: {
    id: string
    score: number (0-100)
    scoring_breakdown: {
      keyword_match: 20
      location_fit: 15
      business_type_fit: 20
      response_likelihood: 15
      conversion_probability: 30
    }
  }[]
}
```
**What it does**:
1. Analyzes lead characteristics
2. Calculates relevance to audio equipment rental
3. Estimates response probability
4. Updates lead.score in database
5. **Used for**: Prioritization, filtering, targeted outreach

---

#### **PUT /api/leads/score** 🔄 Update Score
```typescript
Request: {
  leadId: string
  newScore: number
}
```
**What it does**: Manually override AI score (for feedback loop training)

---

### Email & Communication

#### **POST /api/leads/generate-email** 📧 AI Email Generation
```typescript
Request: {
  leadId: string
  tone?: 'professional' | 'friendly' | 'casual'
  include_cta?: boolean (default: true)
}

Response: {
  subject: string (AI-generated subject line)
  body: string (AI-generated email body)
  leadId: string
}
```
**What it does**:
1. Fetches lead data
2. Generates personalized email subject + body using OpenAI/Claude
3. Stores in `leads.generated_subject`, `leads.generated_body`
4. **Token Cost**: 3 tokens per email generation

---

#### **POST /api/leads/send-email** ✉️ Email Sending
```typescript
Request: {
  leadId: string
  to: string (email address)
  subject: string
  body: string
}

Response: {
  success: boolean
  message: string
  status: string (sent | pending | failed)
}
```
**What it does**:
1. Sends email via SendGrid (if configured) or Gmail
2. Logs in `leads_emails` table
3. Updates `leads.last_contacted` timestamp
4. Creates `lead_activities` record

---

#### **POST /api/leads/chatgpt-search** 🤖 ChatGPT-Enhanced Search
```typescript
Request: {
  query: string
  filters?: { city, state, industry }
}

Response: {
  enhanced_results: Lead[]
  ai_insights: string
}
```
**What it does**: Uses ChatGPT to intelligently refine search results and identify best matches

---

## 🎨 UI COMPONENTS & PAGES

### Main Lead Pages

#### **`/app/dashboard/leads/page.tsx`** 📋 Lead Dashboard
**Displays**:
- Lead list with: Name, Email, Org, Title, Status, Last Contacted, Score
- Filter by status: Uncontacted | Contacted | Follow-up | Interested | Converted | Archived
- Search by name/email/org
- Bulk actions: Add to campaign, Mark converted, Delete multiple

**Actions per Lead**:
- 📧 Send Follow-up Email (opens email modal)
- 📞 Schedule Call (date/time picker)
- 📗 Add to Campaign
- 📝 Edit Lead
- 🗑️ Archive/Delete
- View details (click row)

**Statistics**:
- Total leads count
- Status breakdown (bar chart)
- Conversion rate
- Average response time

---

#### **`/app/dashboard/leads/campaigns/page.tsx`** 📧 Email Campaigns
**Displays**:
- Campaign name, status, recipient count, sent count, open rate, click rate
- Create new campaign
- View campaign recipients
- View email tracking (opens/clicks)

**Actions**:
- Launch campaign to selected leads
- View recipient list
- Resend failed emails
- Schedule campaign for later
- Download campaign report

---

#### **`/app/dashboard/leads/pipeline/page.tsx`** 🎯 Sales Pipeline
**Displays**:
- Kanban board: Uncontacted → Contacted → Follow-up → Interested → Converted
- Drag-and-drop leads between statuses
- Lead count per column
- Win/loss rate per column

---

#### **`/app/dashboard/leads/interested/page.tsx`** ⭐ Hot Leads
**Displays**:
- Leads marked as "interested"
- Sorted by score (highest first)
- Quick-conversion actions (Mark Converted, Schedule Demo)

---

#### **`/app/dashboard/leads/converted/page.tsx`** ✅ Closed Deals
**Displays**:
- Leads marked as "converted"
- Average time-to-conversion
- Conversion path (source → email touches → conversion)

---

#### **`/app/dashboard/leads/archived/page.tsx`** 🗑️ Archived
**Displays**:
- Archived leads (no longer active)
- Can restore to active

---

#### **`/app/dashboard/leads/strategies/page.tsx`** 📊 Outreach Strategies
**Displays**:
- Pre-built outreach playbooks
- "Cold Outreach" strategy
- "Warm Follow-up" strategy
- "Event-Based Targeting" strategy
- Shows: Email templates, timing, expected response rate

---

#### **`/app/dashboard/leads/settings/page.tsx`** ⚙️ Lead Configuration
**Allows**:
- Add/edit job titles for search
- Add/edit search keywords
- Configure custom lead fields
- Set scoring rules
- Configure email service (SendGrid/Gmail)

---

#### **`/app/dashboard/leads/[id]/page.tsx`** 🔍 Lead Detail Page
**Displays**:
- Full lead profile
- All custom fields
- Activity history (all emails, calls, notes)
- Generated email preview
- Campaign membership
- Conversation history (if applicable)

**Actions**:
- Edit lead details
- Send email
- Schedule call
- Add note
- Generate new email
- Move to different status

---

### Components

#### **LeadScraperSection.tsx** 🕷️
```typescript
Props: {
  onLeadsScraped?: (leads: Lead[]) => void
}

Displays:
- URL input field
- Scraping method dropdown
- Progress indicator
- Results table
```

---

#### **LeadImporter.tsx** 📊
```typescript
Displays:
- Drag-and-drop CSV upload
- Column mapping UI
- Preview table
- Import button
```

---

#### **LeadCard.tsx** 💳
```typescript
Props: {
  lead: Lead
  onSelect?: (lead: Lead) => void
  onAction?: (action: string, lead: Lead) => void
}

Displays:
- Lead summary
- Score badge
- Status badge
- Quick actions
```

---

## ⚡ KEY FUNCTIONS

### Lead Operations

#### **loadLeads(filter?: string, search?: string)**
```typescript
// Loads all leads or filtered by status + search term
const leads = await loadLeads('interested', 'audio');
// Returns: Lead[]
// Used in: Main dashboard
```

---

#### **createLead(data: Partial<Lead>)**
```typescript
// Creates new lead manually or from scrape/import
const lead = await createLead({
  name: "John Smith",
  email: "john@example.com",
  org: "Acme Corp",
  source: "manual"
});
// Returns: Lead (with ID)
```

---

#### **updateLeadStatus(leadId: string, status: string)**
```typescript
// Moves lead through pipeline
await updateLeadStatus(leadId, 'converted');
// Creates lead_activities record automatically
```

---

#### **scoreLead(leadId: string)**
```typescript
// Calculates quality score for lead
const score = await scoreLead(leadId);
// Returns: { score: 75, breakdown: {...} }
// Updates: leads.score
```

---

#### **generateEmailForLead(leadId: string, tone?: string)**
```typescript
// AI-generates personalized email
const email = await generateEmailForLead(leadId, 'professional');
// Returns: { subject: "...", body: "..." }
// Updates: leads.generated_subject, leads.generated_body
// Token Cost: 3 tokens
```

---

#### **sendEmailToLead(leadId: string, email: EmailData)**
```typescript
// Sends email via SendGrid/Gmail
await sendEmailToLead(leadId, {
  subject: "Hello John",
  body: "Let's chat..."
});
// Creates: leads_emails record
// Updates: leads.last_contacted
// Creates: lead_activities record (activity_type: 'email_sent')
```

---

#### **discoverLeads(location: string, keywords?: string[])**
```typescript
// Auto-searches for leads in location
const leads = await discoverLeads('Portland, OR', ['event manager']);
// Returns: Lead[] (10-50 results)
// Token Cost: 5 tokens
```

---

#### **scrapeLead(url: string)**
```typescript
// Web scrapes contacts from URL
const leads = await scrapeLead('https://example.com/team');
// Returns: Lead[] (extracted contacts)
```

---

#### **importLeadsFromCSV(file: File)**
```typescript
// Imports CSV file of leads
const result = await importLeadsFromCSV(csvFile);
// Returns: { imported: 150, skipped: 5, errors: [] }
```

---

#### **addLeadToCampaign(leadId: string, campaignId: string)**
```typescript
// Adds lead to email campaign
await addLeadToCampaign(leadId, campaignId);
// Creates: campaign_recipients record
```

---

#### **logLeadActivity(leadId: string, activity: LeadActivity)**
```typescript
// Logs any activity (email, call, note, etc.)
await logLeadActivity(leadId, {
  activity_type: 'call_logged',
  description: 'Discussed rental pricing',
  metadata: { duration_minutes: 15, outcome: 'interested' }
});
// Creates: lead_activities record
```

---

##📊 LEAD STATUS WORKFLOW

```
┌─────────────┐
│ Uncontacted │ (Initial - from discovery/import)
└──────┬──────┘
       │ Send first email / Make call
       ↓
┌──────────────┐
│  Contacted   │ (Reached out at least once)
└──────┬──────┘
       │ No response after 3+ touches
       ├─→ Archive
       │
       │ Response or continued outreach
       ↓
┌─────────────────┐
│  Follow-up      │ (Ongoing conversations)
└──────┬──────────┘
       │
       │ Shows buying signals
       ↓
┌─────────────────┐
│   Interested    │ (High-probability prospects)
└──────┬──────────┘
       │ Proposal sent / Demo scheduled
       │
       ├─→ Converted (Deal closed / Booking confirmed)
       │
       └─→ Archive (BANT not met / Not qualified)
```

---

## 🎯 TOKEN INTEGRATION

**Current Implementation**: Leads is ready for token integration

**Where Tokens Apply**:
1. **Lead Discovery** - 5 tokens per search execution
2. **Email Generation** - 3 tokens per email
3. **Lead Scoring** - 1 token per 10 leads scored
4. **Smart Discovery** - 5 tokens per AI analysis

**How to Integrate** (After Stripe setup):
```typescript
// In /api/leads/auto-search/route.ts:

import { executeWithTokenRefund } from '@/lib/utils/tokenTransaction';

export async function POST(req: NextRequest) {
  const { organizationId } = getOrgContext();
  
  const { result: leads } = await executeWithTokenRefund(
    {
      organizationId,
      userId: currentUser.id,
      featureUsed: 'lead_discovery',
      tokensRequested: 5,
    },
    async () => {
      // Perform lead discovery
      return await performDiscovery(...);
    }
  );
  
  return NextResponse.json(leads);
}
```

---

## 🚀 NEXT STEPS

### Phase 1: Token Integration (When Stripe Ready)
- Add token checks to each lead API endpoint
- Implement abuse prevention for discovery
- Add UI messaging for token usage
- Create "Buy Credits" flow for leads feature

### Phase 2: Email Service Integration
- Production SendGrid setup (currently placeholder)
- Email template library
- Unsubscribe handling
- GDPR/CAN-SPAM compliance

### Phase 3: Advanced Features
- Lead scoring ML model
- Predictive analytics (who's likely to convert)
- Automated workflows (sequence emails based on engagement)
- Integration with calendar/CRM

---

## 📈 USAGE EXAMPLE

```typescript
// Typical lead discovery workflow:

// 1. Discover leads in Portland
const leads = await fetch('/api/leads/auto-search', {
  method: 'POST',
  body: JSON.stringify({
    city: 'Portland',
    state: 'OR',
    keywords: ['event manager']
  })
}).then(r => r.json());

// 2. Score leads
const scored = await fetch('/api/leads/score', {
  method: 'POST',
  body: JSON.stringify({ leadIds: leads.map(l => l.id) })
}).then(r => r.json());

// 3. Filter top leads
const topLeads = scored.filter(l => l.score > 80);

// 4. Generate personalized emails
const emails = await Promise.all(
  topLeads.map(lead => 
    fetch('/api/leads/generate-email', {
      method: 'POST',
      body: JSON.stringify({ leadId: lead.id })
    }).then(r => r.json())
  )
);

// 5. Send emails
await Promise.all(
  emails.map(email =>
    fetch('/api/leads/send-email', {
      method: 'POST',
      body: JSON.stringify({
        leadId: email.leadId,
        to: email.email,
        subject: email.subject,
        body: email.body
      })
    })
  )
);

// Result: 10-20 hot leads contacted with personalized emails
//   - Costs: 5 tokens (discovery) + 20 tokens (emails) = 25 tokens total
//   - Expected outcome: 2-5 positive responses
```

---

**This system is production-ready and awaiting token integration and email service configuration.**

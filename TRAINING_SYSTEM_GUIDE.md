# Training System Implementation Guide

## Overview
A comprehensive role-based training assignment and tracking system for Bright Audio with:
- Manager and Associate roles
- Training video assignments
- Progress tracking with checkboxes
- Tests/quizzes for training validation
- Separate training for Warehouse and Leads departments

## Database Migration

**IMPORTANT**: Run this migration first in your Supabase SQL Editor:
`sql/migrations/2025-12-01_training_system.sql`

This creates:
- `user_profiles` - User roles (manager/associate) and departments
- `training_modules` - Video training content
- `training_assignments` - Manager-assigned training
- `training_progress` - User completion tracking
- `training_tests` - Quiz/test definitions
- `test_questions` - Test questions and answers
- `test_submissions` - User test results

## Features Implemented

### 1. **Signup with Role Selection** (`/auth/signup`)
- Choose role: Manager or Associate
- Select department: Warehouse, Leads, or Both
- Creates user_profile automatically on signup

### 2. **Profile Page** (`/app/settings/profile`)
- View all assigned training videos
- Progress stats (total, completed, in-progress)
- Completion progress bar
- Watch videos inline or on YouTube
- Mark videos as complete with checkbox
- Filter: All, Assigned, In Progress, Completed

### 3. **Training Manager Dashboard** (`/app/training/manage`)
**Manager-only access**
- View all associates
- Assign training modules to specific associates
- Set due dates and add notes
- Track completion rates across team
- View recent assignments table
- Filter modules by department

### 4. **Leads Training Page** (`/app/dashboard/leads/training`)
Updated with 23 training videos:
- Administrative Skills (5 videos)
- Customer Service (4 videos)
- Sales Training (6 videos)
- Lead Generation (8 videos)

## Pages Created/Modified

### New Pages:
1. `/app/app/settings/profile/page.tsx` - Associate training view
2. `/app/app/training/manage/page.tsx` - Manager dashboard
3. `/sql/migrations/2025-12-01_training_system.sql` - Database schema

### Modified Pages:
1. `/app/auth/signup/page.tsx` - Added role/department selection
2. `/app/app/dashboard/leads/training/page.tsx` - Added all training videos

## How to Use

### For Managers:
1. Login and navigate to `/app/training/manage`
2. Click "Assign Training" button
3. Select an associate from dropdown
4. Check training modules to assign
5. Optionally set due date and notes
6. Click "Assign Training"
7. View progress in dashboard table

### For Associates:
1. Login and go to "My Profile" (from profile menu)
2. View all assigned training videos
3. Click video to watch inline or open in YouTube
4. Check the checkbox to mark as complete
5. Filter by status to see progress

## Warehouse Training (Next Step)

To add warehouse training:
1. Create `/app/app/warehouse/training/page.tsx` (copy from leads/training)
2. Add warehouse-specific videos to database:
```sql
INSERT INTO training_modules (title, description, youtube_id, category, department, ...) VALUES
('Warehouse Safety Training', '...', 'VIDEO_ID', 'Safety', 'warehouse', ...);
```

## Tests/Quizzes (Future Enhancement)

Database tables are ready for tests. To implement:
1. Create `/app/app/training/tests/[testId]/page.tsx`
2. Display questions from `test_questions` table
3. Submit answers to `test_submissions` table
4. Calculate score and passing status
5. Link tests to training modules

## Access Control

**Managers can:**
- Assign training to associates
- View all assignments and progress
- Access `/app/training/manage`

**Associates can:**
- View only their assigned training
- Mark training as complete
- Take tests (when implemented)
- Access `/app/settings/profile`

## RLS Policies

All tables have Row Level Security enabled:
- Associates see only their own data
- Managers see all data
- Authentication required for all operations

## Navigation Updates Needed

Add to ProfileMenu or Sidebar:
```tsx
{profile?.role === 'manager' && (
  <Link href="/app/training/manage">Training Manager</Link>
)}
<Link href="/app/settings/profile">My Training</Link>
```

## Testing Checklist

- [ ] Run migration in Supabase
- [ ] Signup with manager role
- [ ] Signup with associate role
- [ ] Manager: Assign training to associate
- [ ] Associate: View assigned training
- [ ] Associate: Mark training complete
- [ ] Manager: See completion in dashboard
- [ ] Verify RLS policies (associates can't see others' data)

## Video IDs in Database

All 23 training videos from leads page are seeded in migration with:
- Correct YouTube IDs
- Categories: Administrative, Customer Service, Sales, Lead Generation
- Difficulty levels: beginner, intermediate, advanced
- Departments: leads, both, warehouse

## Customization

To add more videos:
```sql
INSERT INTO training_modules (
  title, description, youtube_id, duration, 
  difficulty, category, department, order_index
) VALUES (
  'Your Video Title',
  'Description here',
  'YOUTUBE_VIDEO_ID',
  '25:30',
  'beginner',
  'Category Name',
  'leads', -- or 'warehouse' or 'both'
  100
);
```

## Important Notes

1. **Migration must be run first** - All features depend on database tables
2. **Manager role required** - Access to `/app/training/manage` is restricted
3. **Profile creation on signup** - Uses Supabase insert to create user_profile
4. **RLS Security** - All data access controlled by Supabase policies
5. **YouTube embeds** - Videos play inline with iframe, can also open in YouTube

## Support

If you encounter issues:
1. Check Supabase logs for RLS policy errors
2. Verify migration was run successfully
3. Confirm user_profile exists for logged-in user
4. Check browser console for JavaScript errors

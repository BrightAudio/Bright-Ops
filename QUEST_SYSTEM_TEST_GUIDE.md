# Quest System - End-to-End Test Guide

## ✅ What's Been Built

Your quest system is now **fully actionable and persistent**:

1. ✅ **Persistent Storage** - Quests saved to Supabase `quests` table
2. ✅ **Auto-Loading** - Quests load automatically when page loads  
3. ✅ **Interactive UI** - Claim reward buttons for completed quests
4. ✅ **Progress Tracking** - Real-time updates based on user metrics
5. ✅ **Notifications** - Toast notifications for quest creation and reward claims
6. ✅ **Refresh Button** - Manual refresh to recalculate progress

---

## 🧪 Test Flow (Step-by-Step)

### Step 1: Navigate to Financial Goals
1. Go to: `http://localhost:3000/app/warehouse/financial/goals`
2. You should see the dashboard with tabs: **Analysis**, **Dashboard**, **Quests**, **Templates**, **Benchmarks**

### Step 2: Generate Quest
1. Click the **Quests** tab
2. Click **🎮 Generate Quest Line** button
3. Watch for notification: `⚡ New Quest Generated!`
4. See quest appears with steps and progress bars

**Expected:**
- ✅ Toast shows quest created
- ✅ Quest title appears: "Quarterly Revenue Goal"
- ✅ Multiple quest steps visible

### Step 3: Verify Persistence
1. **Refresh the page** (F5)
2. Click **Quests** tab again

**Expected:**
- ✅ Same quest reappears (loaded from database)
- ✅ Progress is preserved
- ✅ No "Generate Quest" button if quest already exists

### Step 4: Update Progress
1. Go to **Jobs** or **Leads** module
2. Complete some actions (add job, mark job complete, etc.)
3. Return to **Financial Goals** → **Quests** tab
4. Click **🔄 Refresh Progress** button

**Expected:**
- ✅ Quest progress updates based on new jobs/revenue
- ✅ Progress bars fill up
- ✅ Current focus shows active quest

### Step 5: Complete a Quest  
1. Keep creating jobs/actions until a quest reaches 100% progress
2. You should see the quest card turn green with checkmark

**Expected:**
- ✅ Quest status shows "✅ Complete"
- ✅ 🏆 **Claim Reward** button appears
- ✅ Next locked quest becomes available

### Step 6: Claim Reward
1. Click **🏆 Claim Reward** button
2. Watch for success notification

**Expected:**
- ✅ Toast notification: `🎉 Quest Complete! Earned [badge] [reward name]`
- ✅ Achievement added to tracker
- ✅ Button disappears/quest stays marked complete

### Step 7: Verify Database
1. Go to Supabase dashboard
2. Navigate to: **SQL Editor** or **Tables**
3. Check the `quests` table

**Expected:**
- ✅ Row exists with your quest
- ✅ `organization_id` matches your org
- ✅ `status` is 'active' or 'completed'
- ✅ `metadata` contains quest steps as JSONB
- ✅ `current_progress` shows your progress
- ✅ `completed_at` timestamp if claimed

---

## 🐛 Troubleshooting

### Issue: "No Active Quest Line" message

**Cause:** Quests table doesn't exist in Supabase

**Fix:**
1. Go to Supabase → SQL Editor
2. Copy entire content from: `migrations/003_create_quests.sql`
3. Paste into SQL Editor
4. Click **Run**
5. Refresh the page

### Issue: Can't create quest - error appears

**Error:** `Error saving quest: {}`

**Fix:**
1. Check that quests table migration was deployed
2. Check console for error details
3. Verify organization_id is set (check user_profiles)

### Issue: Progress not updating after completing jobs

**Fix:**
1. Click **🔄 Refresh Progress** button manually
2. Check if jobs are showing in Jobs module
3. Verify metrics are calculating properly

### Issue: Notification appears but no sound

**Note:** Notifications are visual only. This is intentional to avoid distraction.

---

## 📊 Database Structure

```sql
CREATE TABLE public.quests (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  quarter TEXT NOT NULL, -- Q1, Q2, Q3, Q4
  target_amount NUMERIC(10, 2),
  current_progress NUMERIC(10, 2),
  status TEXT, -- 'active', 'completed', 'failed', 'archived'
  quest_type TEXT, -- 'quarterly_revenue'
  metadata JSONB, -- Contains full QuestLine with steps
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  completed_at TIMESTAMP
);
```

---

## 🚀 Next Steps After Testing

### Immediate (This Session)
- [ ] Verify quests persist after refresh
- [ ] Test claiming rewards
- [ ] Check database entries

### Short Term (Next Session)
- [ ] Add modal/dialog for quest details
- [ ] Email notifications for quest milestones
- [ ] Export quest progress report

### Medium Term
- [ ] Team leaderboard (who completed most quests)
- [ ] Quest templates (pre-built quest chains)
- [ ] Custom quest creation by users
- [ ] Mobile app quest viewer

### Long Term
- [ ] AI-generated dynamic quests based on behavior
- [ ] Cross-organization quest challenges
- [ ] Seasonal quest campaigns
- [ ] Gamified team competitions

---

## 📝 Key Files

| File | Purpose |
|------|---------|
| `migrations/003_create_quests.sql` | Database schema |
| `lib/utils/questSystem.ts` | Quest generation & progress |
| `lib/utils/questEvents.ts` | Event logging system |
| `lib/utils/questRewards.ts` | Achievement & reward tracking |
| `components/QuestChain.tsx` | Quest display UI |
| `components/QuestNotification.tsx` | Toast notifications |
| `app/.../FinancialGoalsClient.tsx` | Main integration point |

---

## 💡 Tips

- **Real-time testing**: Create jobs in Jobs module → Refresh progress → See quest advance
- **Force complete**: Manually update `current_progress` in Supabase to test completion
- **Test rewards**: Each reward type unlocks different badges and perks
- **Check console**: Open DevTools (F12) to see quest calculation logs

---

## ✨ You're All Set!

Your quest system is now:
- ✅ Persistent (saves to database)
- ✅ Actionable (users can interact)
- ✅ Rewarding (claims show notifications)
- ✅ Integrated (tied to real business metrics)

**Go generate a quest and claim reward!** 🎮

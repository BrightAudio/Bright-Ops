# 📋 Task Assignment System - Implementation Guide

**Date:** February 3, 2026  
**Feature:** Employee Task Assignment with Notifications  
**Status:** ✅ Ready for Implementation

---

## 🎯 Overview

The task assignment system allows managers to:
- Create tasks on the dashboard
- Assign tasks to specific employees from a dropdown list
- Get automatic notifications when tasks are assigned to them
- Track assignment status (pending, acknowledged, in_progress, completed)

---

## 📋 What's Included

### 1. Database Migration
**File:** `sql/migrations/2026-02-03_task_assignment_system.sql`

**New Tables:**
- `task_assignments` - Junction table for task-to-employee assignments
  - Tracks who assigned the task, when, and status
  - Supports multiple employees assigned to one task

**New Columns Added to `tasks` table:**
- `assigned_to` (UUID) - Direct assignment to employee
- `assigned_by` (UUID) - Who assigned the task
- `assigned_at` (TIMESTAMPTZ) - When task was assigned
- `organization_id` (UUID) - Organization context

**New Database Functions:**
- `assign_task_to_employee()` - Creates task assignment
- `get_employee_tasks()` - Retrieves tasks for an employee
- `get_task_assignments()` - Retrieves all assignments for a task
- `acknowledge_task_assignment()` - Employee acknowledges task
- `notify_task_assignment()` - Trigger function for notifications

### 2. Enhanced Tasks Component
**File:** [components/Tasks.tsx](components/Tasks.tsx)

**New Features:**
- Employee list dropdown loaded from `employees` table
- "Assign" button on each task
- Shows assigned employee name on task
- Automatic notification creation when task is assigned
- Fetches all employees on component load
- Integrates with existing task creation

**UI Changes:**
- Each task now shows "Assigned to [Employee Name]" badge when assigned
- Unassigned tasks show "Assign" button
- Click "Assign" to open employee dropdown selector
- Confirm assignment with checkmark button

---

## 🚀 Implementation Steps

### Step 1: Run SQL Migration (CRITICAL)
```sql
-- In Supabase SQL Editor, copy and execute:
sql/migrations/2026-02-03_task_assignment_system.sql
```

**Verify:**
```sql
-- Check new tables exist
SELECT * FROM information_schema.tables 
WHERE table_name IN ('task_assignments');

-- Check new columns on tasks
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'tasks' 
AND column_name IN ('assigned_to', 'assigned_by', 'assigned_at');
```

### Step 2: Regenerate TypeScript Types
```bash
npx supabase gen types typescript --project-id qifhpsazsnmqnbnazrct > types/database.ts
```

### Step 3: Test in Dev Environment
```bash
npm run dev
```

Navigate to `/app/dashboard` and test:
1. ✅ Tasks section loads
2. ✅ Create a new task
3. ✅ Click "Assign" button on task
4. ✅ Select employee from dropdown
5. ✅ Confirm assignment (checkmark)
6. ✅ Task shows "Assigned to [Name]"
7. ✅ Assigned employee receives notification

---

## 📊 Data Flow

### Creating & Assigning a Task

```
┌─────────────────────────────────────────────────┐
│ User creates task on Dashboard                  │
│ → Task inserted into `tasks` table              │
│ → user_id = current user                        │
└──────────────────┬──────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────┐
│ User clicks "Assign" button on task             │
│ → Opens employee dropdown                       │
│ → Shows list from `employees` table             │
└──────────────────┬──────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────┐
│ User selects employee and confirms              │
│ → Insert into `task_assignments` table          │
│ → assigned_by = current user                    │
│ → employee_id = selected employee               │
│ → status = 'pending'                            │
└──────────────────┬──────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────┐
│ Database Trigger Fires:                         │
│ `notify_task_assignment()`                      │
│ → Creates notification entry                    │
│ → type = 'task_assignment'                      │
│ → user_id = assigned employee                   │
└──────────────────┬──────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────┐
│ Notification System:                            │
│ → Employee sees notification in app             │
│ → Can view assigned task details                │
│ → Can acknowledge assignment                    │
└─────────────────────────────────────────────────┘
```

---

## 🔧 Component Props & Functions

### Updated Tasks Component

```typescript
// State Management
const [tasks, setTasks] = useState<Task[]>([]);
const [employees, setEmployees] = useState<Employee[]>([]);
const [selectedTaskForAssignment, setSelectedTaskForAssignment] = useState<string | null>(null);
const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");

// Functions
async function fetchEmployees() {
  // Loads employee list from employees table
}

async function assignTaskToEmployee(taskId: string, employeeId: string) {
  // Creates task_assignments record
  // Updates tasks table with assigned_to/assigned_by/assigned_at
  // Triggers notification creation
}

function getAssignedEmployeeName(employeeId: string): string {
  // Helper to display employee name from ID
}
```

---

## 📱 User Interface

### Task Item (Assigned)
```
┌────────────────────────────────────────────────┐
│ ☑ Monthly Report Review                        │
│ Assigned to John Smith    │  in 2 days │ ✕    │
└────────────────────────────────────────────────┘
```

### Task Item (Unassigned)
```
┌────────────────────────────────────────────────┐
│ ☐ Quarterly Planning                           │
│ [Assign] [👤+]           │ due today  │ ✕     │
└────────────────────────────────────────────────┘
```

### Assignment Dropdown (Open)
```
┌────────────────────────────────────────────────┐
│ ☐ Quarterly Planning                           │
│ [John Smith      ▼] [✓] [✕]  │ due today │ ✕  │
│ [Sarah Johnson         ]               
│ [Mike Davis            ]
│ [Emily Brown           ]
└────────────────────────────────────────────────┘
```

---

## 🔔 Notification System

### Notification Fields
```typescript
{
  id: UUID,
  user_id: UUID,           // Employee receiving notification
  type: 'task_assignment', // Notification type
  title: 'New Task Assigned: [Task Name]',
  message: 'You have been assigned task: [Task Name]',
  link: '/app/dashboard?tab=tasks',
  read: false,
  created_at: TIMESTAMP
}
```

### Notification Trigger
- Automatically created when task is inserted into `task_assignments` table
- Sent to the assigned employee
- Contains link to dashboard tasks section

---

## 🗄️ Database Schema

### task_assignments Table
```sql
id UUID PRIMARY KEY
task_id UUID FOREIGN KEY → tasks.id
employee_id UUID FOREIGN KEY → employees.id
assigned_by UUID FOREIGN KEY → auth.users.id
assigned_at TIMESTAMPTZ
acknowledged_at TIMESTAMPTZ (nullable)
status TEXT ('pending' | 'acknowledged' | 'in_progress' | 'completed')
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
UNIQUE(task_id, employee_id)
```

### tasks Table (New Columns)
```sql
assigned_to UUID FOREIGN KEY → employees.id
assigned_by UUID FOREIGN KEY → auth.users.id
assigned_at TIMESTAMPTZ
organization_id UUID FOREIGN KEY → organizations.id
```

---

## 🧪 Testing Checklist

### Database Tests
- [ ] Migration runs without errors
- [ ] `task_assignments` table created
- [ ] New columns added to `tasks` table
- [ ] Indexes created for performance
- [ ] RLS policies active

### Component Tests
- [ ] Tasks load on dashboard
- [ ] Employee dropdown populates from database
- [ ] Can create new task
- [ ] Can assign task to employee
- [ ] Assigned employee name displays on task
- [ ] Can reassign task to different employee
- [ ] Assigned tasks no longer show "Assign" button

### Notification Tests
- [ ] Notification created when task assigned
- [ ] Employee receives notification
- [ ] Notification contains task name
- [ ] Notification link works
- [ ] Multiple assignments to different employees create separate notifications

---

## 🔐 Security

### RLS Policies
- Users can only view tasks they created
- Users can only create assignments for their organization
- Employees can acknowledge assignments for themselves
- Managers can view all assignments in their organization

### Data Validation
- `assigned_to` must reference valid employee
- `assigned_by` must reference authenticated user
- Cannot assign same task to same employee twice
- Organization context enforced via `organization_id`

---

## 🚨 Common Issues & Solutions

### Issue: "Employee dropdown is empty"
**Solution:**
1. Verify `employees` table has records
2. Check that employees have `id` and `name` columns
3. Query: `SELECT id, name FROM employees;`

### Issue: "Assignment doesn't save"
**Solution:**
1. Check browser console for errors
2. Verify Supabase connection
3. Ensure user has permission to insert `task_assignments`
4. Check RLS policies are not blocking

### Issue: "Notification not appearing"
**Solution:**
1. Verify `notifications` table exists
2. Check trigger function `notify_task_assignment()` is active
3. Verify employee_id in `task_assignments` exists in `employees`
4. Check notifications panel implementation

### Issue: "Types error after migration"
**Solution:**
```bash
npx supabase gen types typescript --project-id qifhpsazsnmqnbnazrct > types/database.ts
```

---

## 📈 Future Enhancements

Optional features to add later:

1. **Task Comments** - Add discussion to assigned tasks
2. **Task Reminders** - Send reminders for upcoming due dates
3. **Bulk Assignment** - Assign multiple tasks at once
4. **Assignment Templates** - Save common task sets
5. **Task Tracking** - Progress percentage for tasks
6. **Email Notifications** - Send email when task assigned
7. **Mobile App Support** - App notifications for assigned tasks
8. **Team Tasks** - Assign tasks to teams/groups instead of individuals

---

## 📝 SQL Functions Reference

### assign_task_to_employee()
```sql
SELECT * FROM assign_task_to_employee(
  p_task_id := 'task-uuid',
  p_employee_id := 'employee-uuid',
  p_assigned_by := 'user-uuid'
);
```
Returns: assignment_id, task_id, employee_id, status

### get_employee_tasks()
```sql
SELECT * FROM get_employee_tasks('employee-uuid');
```
Returns: All tasks assigned to employee with details

### get_task_assignments()
```sql
SELECT * FROM get_task_assignments('task-uuid');
```
Returns: All employees assigned to task

### acknowledge_task_assignment()
```sql
SELECT * FROM acknowledge_task_assignment('assignment-uuid');
```
Marks assignment as acknowledged by employee

---

## 🎓 Code Examples

### Assigning a Task (Frontend)
```typescript
async function assignTaskToEmployee(taskId: string, employeeId: string) {
  const { error } = await supabase
    .from("task_assignments")
    .insert({
      task_id: taskId,
      employee_id: employeeId,
      assigned_by: currentUserId,
      status: "pending"
    });

  if (error) {
    console.error("Failed to assign task");
    return;
  }

  // Notification automatically created by trigger
  fetchTasks(); // Refresh UI
}
```

### Getting Assigned Tasks (Backend)
```sql
-- Get all tasks assigned to an employee
SELECT * FROM get_employee_tasks('employee-id-here');

-- Result includes task details, assignment status, and who assigned it
```

---

## ✅ Success Criteria

You'll know the system is working when:

1. ✅ Can create tasks on dashboard
2. ✅ "Assign" button appears on unassigned tasks
3. ✅ Employee dropdown shows all employees
4. ✅ Can assign task to employee
5. ✅ Task shows "Assigned to [Name]" badge
6. ✅ Assigned employee name displayed on task
7. ✅ Can reassign to different employee
8. ✅ Notification created when task assigned
9. ✅ Employee can see notification in notification panel
10. ✅ Can delete assigned tasks

---

## 📞 Support

For implementation help:
- Check database migration for SQL syntax
- Review component code for TypeScript issues
- Test database functions in SQL Editor
- Check RLS policies if access errors occur

---

**Status:** Ready for Implementation  
**Last Updated:** February 3, 2026

# Task Assignment System - Visual Architecture

## 🎯 The Complete System

```
┌────────────────────────────────────────────────────────────────┐
│                      MANAGER DASHBOARD                         │
│                                                                 │
│  TASKS WIDGET                                                  │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ ✓ Monthly Report Review                                   │ │
│  │ Assigned to: John Smith       │  Due: 2 days │  [X]       │ │
│  │                                                             │ │
│  │ ○ Quarterly Financial Report                              │ │
│  │ [Assign ▼] [👤+]             │  Due: 5 days │  [X]       │ │
│  │   ├─ John Smith                                            │ │
│  │   ├─ Sarah Johnson                                         │ │
│  │   ├─ Mike Davis                                            │ │
│  │   └─ Emily Brown                                           │ │
│  │                                                             │ │
│  │ ○ Team Meeting Prep                                       │ │
│  │ [Assign ▼]                   │  Due: Today │  [X]        │ │
│  └───────────────────────────────────────────────────────────┘ │
│                          │                                      │
│                          │ Assign task to employee             │
│                          │ Click dropdown, select, confirm     │
│                          ▼                                      │
└────────────────────────────────────────────────────────────────┘
                          │
                          │ INSERT INTO task_assignments
                          │ (task_id, employee_id, assigned_by, status)
                          ▼
        ┌─────────────────────────────────────────┐
        │    SUPABASE DATABASE                    │
        │                                         │
        │  ┌─────────────────────────────────┐   │
        │  │  task_assignments TABLE         │   │
        │  ├─────────────────────────────────┤   │
        │  │ id: uuid                        │   │
        │  │ task_id: uuid                   │   │
        │  │ employee_id: uuid               │   │
        │  │ assigned_by: uuid               │   │
        │  │ assigned_at: timestamp          │   │
        │  │ status: 'pending'               │   │
        │  └──────────────────┬──────────────┘   │
        │                     │                  │
        │          TRIGGER FIRES (ON INSERT)    │
        │                     │                  │
        │  ┌──────────────────▼──────────────┐   │
        │  │ notify_task_assignment()        │   │
        │  │                                 │   │
        │  │ INSERT INTO notifications       │   │
        │  │ - user_id: employee_id          │   │
        │  │ - type: 'task_assignment'       │   │
        │  │ - title: 'New Task Assigned'    │   │
        │  │ - message: task title           │   │
        │  │ - link: /app/dashboard?tab=tasks│   │
        │  └──────────────────┬──────────────┘   │
        │                     │                  │
        └─────────────────────┼──────────────────┘
                              │
                              │ NOTIFICATION CREATED
                              ▼
        ┌─────────────────────────────────────────┐
        │         EMPLOYEE DASHBOARD              │
        │                                         │
        │  NOTIFICATION CENTER                   │
        │  ┌─────────────────────────────────┐   │
        │  │ 🔔 New Task Assigned            │   │
        │  │ You have been assigned:          │   │
        │  │ "Quarterly Financial Report"    │   │
        │  │                                 │   │
        │  │ [View] [Dismiss]                │   │
        │  └─────────────────────────────────┘   │
        │           │                            │
        │           │ Click View                 │
        │           ▼                            │
        │  TASKS WIDGET                          │
        │  ┌─────────────────────────────────┐   │
        │  │ ○ Quarterly Financial Report    │   │
        │  │ Assigned to: You                │   │
        │  │ Due: 5 days                     │   │
        │  │ Status: [Pending] [☐] Mark     │   │
        │  │                                 │   │
        │  │ [Acknowledge] [Start] [Done]   │   │
        │  └─────────────────────────────────┘   │
        └─────────────────────────────────────────┘
```

---

## 📊 Data Structure

### Task Assignment Flow

```
MANAGER                          DATABASE                    EMPLOYEE
─────────────────────────────────────────────────────────────────────

Create Task
   │
   ├─ Title: "Report Review"
   ├─ Due: 2024-02-10
   ├─ Status: pending
   ├─ user_id: manager_uuid
   └─ Saved to tasks table

Click "Assign"
   │
   ├─ Dropdown shows employees
   ├─ Select: "John Smith"
   └─ Click Confirm

   │                           │
   │  INSERT into              │
   │  task_assignments         │
   │  ───────────────────────→ │
   │  task_id: ...             │
   │  employee_id: ...         │
   │  assigned_by: ...         │  Database Trigger Fires ✨
   │  assigned_at: now()       │
   │  status: pending          │
   │                           │
   │  ←─ TRIGGER EVENT ───────→ │ INSERT into notifications
   │                           │ user_id: john_smith_id
   │                           │ type: 'task_assignment'
   │                           │ message: "Report Review"
   │                           │
   │                           ├─ Real-time Update ──────→ John sees
   │                           │                         notification
   │                           │                         badge
   │                           │
Task shows "Assigned to:                                  │
John Smith"                                          John views task
   │                                                      │
Manager sees confirmation                           Acknowledges
   └──────────────────────────────────────────────────────┘
```

---

## 🔄 State Machine

### Task Assignment States

```
                   ┌─────────────────────────┐
                   │     UNASSIGNED          │
                   │   (No assignment)       │
                   └────────┬────────────────┘
                            │
                   Manager clicks "Assign"
                   Selects employee
                            │
                            ▼
                   ┌─────────────────────────┐
                   │      PENDING            │
                   │ (Assigned, awaiting     │
                   │  acknowledgement)       │
                   └────────┬────────────────┘
                            │
                   Employee acknowledges
                            │
                            ▼
                   ┌─────────────────────────┐
                   │    ACKNOWLEDGED         │
                   │ (Employee confirmed     │
                   │  receipt)               │
                   └────────┬────────────────┘
                            │
                   Employee starts work
                            │
                            ▼
                   ┌─────────────────────────┐
                   │   IN_PROGRESS           │
                   │ (Work underway)         │
                   └────────┬────────────────┘
                            │
                   Employee marks complete
                            │
                            ▼
                   ┌─────────────────────────┐
                   │     COMPLETED           │
                   │ (Task finished)         │
                   └─────────────────────────┘
```

---

## 🏗️ System Components

### Frontend (React)
```
┌─ Tasks.tsx
│
├─ State Management
│  ├─ tasks[]
│  ├─ employees[]
│  ├─ selectedTaskForAssignment
│  └─ selectedEmployeeId
│
├─ Effects
│  ├─ fetchTasks() - Load from database
│  └─ fetchEmployees() - Load employee list
│
├─ Functions
│  ├─ addTask() - Create new task
│  ├─ toggleTask() - Mark complete/pending
│  ├─ assignTaskToEmployee() - Send assignment to DB
│  ├─ deleteTask() - Remove task
│  └─ getAssignedEmployeeName() - Display helper
│
└─ UI Elements
   ├─ Task list
   ├─ Add task form
   ├─ Assign button
   ├─ Employee dropdown
   ├─ Confirmation button
   └─ Status badges
```

### Database (PostgreSQL)
```
┌─ tasks table
│  ├─ id, title, description
│  ├─ status (pending/completed)
│  ├─ user_id (creator)
│  ├─ assigned_to (employee_id)
│  ├─ assigned_by (user_id)
│  ├─ assigned_at (timestamp)
│  ├─ due_date
│  └─ created_at, updated_at
│
├─ task_assignments table
│  ├─ id (unique assignment record)
│  ├─ task_id (FK)
│  ├─ employee_id (FK)
│  ├─ assigned_by (FK)
│  ├─ status (pending/acknowledged/etc.)
│  ├─ assigned_at, acknowledged_at
│  └─ created_at, updated_at
│
├─ employees table
│  ├─ id, name, email
│  ├─ phone, role
│  └─ hourly_rate
│
├─ notifications table
│  ├─ id
│  ├─ user_id (employee who gets it)
│  ├─ type: 'task_assignment'
│  ├─ title, message, link
│  ├─ read (boolean)
│  └─ created_at
│
└─ Database Functions
   ├─ assign_task_to_employee()
   ├─ get_employee_tasks()
   ├─ get_task_assignments()
   ├─ acknowledge_task_assignment()
   └─ notify_task_assignment() [TRIGGER]
```

---

## 🔐 Security Architecture

```
┌────────────────────────────────────────────────────────┐
│               ROW LEVEL SECURITY (RLS)                │
│                                                        │
│  TASK_ASSIGNMENTS TABLE                              │
│  ┌──────────────────────────────────────────────────┐ │
│  │ Only users in same organization can:             │ │
│  │ ✓ SELECT - View assignments                     │ │
│  │ ✓ INSERT - Create new assignments              │ │
│  │ ✓ UPDATE - Modify assignments they created     │ │
│  │ ✗ DELETE - Cannot delete (audit trail)         │ │
│  └──────────────────────────────────────────────────┘ │
│                                                        │
│  NOTIFICATIONS TABLE                                  │
│  ┌──────────────────────────────────────────────────┐ │
│  │ Each employee sees only their notifications:    │ │
│  │ ✓ SELECT - View own notifications              │ │
│  │ ✓ UPDATE - Mark as read                        │ │
│  │ ✓ DELETE - Dismiss notification                │ │
│  │ ✗ INSERT - Only system can insert via trigger  │ │
│  └──────────────────────────────────────────────────┘ │
│                                                        │
│  FOREIGN KEY CONSTRAINTS                             │
│  ┌──────────────────────────────────────────────────┐ │
│  │ ✓ task_id must exist in tasks table            │ │
│  │ ✓ employee_id must exist in employees table   │ │
│  │ ✓ assigned_by must be authenticated user      │ │
│  │ ✓ Prevents orphaned references                │ │
│  └──────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────┘
```

---

## 📈 Notification Trigger

```
DATABASE EVENT:
  INSERT into task_assignments

                    │
                    │ PostgreSQL Trigger
                    │ (on_task_assignment)
                    ▼

TRIGGER FUNCTION:
  notify_task_assignment()

  1. Get task title from tasks table
  2. Get employee name from employees table
  3. Get assigner email from auth.users table
  4. Prepare notification message
  
                    │
                    │ Creates notification
                    ▼

NEW NOTIFICATION RECORD:
  {
    user_id: john_smith_employee_id,
    type: 'task_assignment',
    title: 'New Task Assigned: Report Review',
    message: 'You have been assigned task: Report Review',
    link: '/app/dashboard?tab=tasks',
    read: false,
    created_at: now()
  }

                    │
                    │ Real-time subscription
                    │ (if enabled)
                    ▼

EMPLOYEE SEES:
  🔔 New Task Assigned
  Report Review
  [View] [Dismiss]
```

---

## 🎯 Assignment Workflow Sequence

```
┌─────────────┐                                    ┌──────────────┐
│   Manager   │                                    │   Employee   │
└──────┬──────┘                                    └──────┬───────┘
       │                                                    │
       │  1. Open Dashboard                                │
       │  2. Click "+" to add task                        │
       │  3. Enter title: "Code Review"                   │
       │  4. Click "Add Task"                             │
       │                                                    │
       │─────── Create Task ──────→  DB: tasks table      │
       │                             insert new task       │
       │                             status: pending      │
       │                                                    │
       │  5. Click "Assign"                               │
       │  6. Dropdown appears                             │
       │  7. Select "John"                                │
       │  8. Click checkmark                              │
       │                                                    │
       │──── Insert Assignment ────→  DB: task_assignments
       │                             insert:
       │                             task_id: ...
       │                             employee_id: ...
       │                             assigned_by: ...
       │                             status: pending
       │                                                    │
       │  ✓ Confirmation shows                             │
       │  Task: "Assigned to John"                        │
       │                                                    │
       │                           Trigger fires ──────┐   │
       │                                               │   │
       │                                               ▼   │
       │                          Create Notification  │   │
       │                          user_id: john_id    │   │
       │                          type: task_assign   │   │
       │                          message: Code...    │   │
       │                                               │   │
       │                    ◄──── Real-time Update ───┘   │
       │                                                    │
       │                                             9. See notification
       │                                             🔔 Code Review
       │                                             
       │                                             10. Click View
       │                                             11. Goes to Tasks
       │                                             12. Sees: "Assigned to You"
       │                                             13. Acknowledges task
       │                                             
       │  ◄──────── Updates reflected ──────────────
       │  14. Sees John acknowledged
```

---

## 📦 Deployment Architecture

```
┌──────────────────────────────────────────────────────┐
│          DEPLOYMENT CHECKLIST                        │
├──────────────────────────────────────────────────────┤
│                                                      │
│  1. SQL MIGRATION                                  │
│     ├─ Run in Supabase SQL Editor                 │
│     ├─ Creates tables & triggers                  │
│     └─ Establishes RLS policies                   │
│                                                      │
│  2. TYPE GENERATION                               │
│     └─ npx supabase gen types typescript ...      │
│                                                      │
│  3. COMPONENT UPDATE                              │
│     ├─ Tasks.tsx already updated ✓               │
│     ├─ No breaking changes                        │
│     └─ Backward compatible                        │
│                                                      │
│  4. TESTING                                        │
│     ├─ Create task                                │
│     ├─ Assign to employee                         │
│     ├─ Verify notification                        │
│     └─ Check database records                     │
│                                                      │
│  5. PRODUCTION                                     │
│     ├─ Deploy component changes                   │
│     ├─ Monitor notifications                      │
│     ├─ Check error logs                           │
│     └─ Gather user feedback                       │
│                                                      │
└──────────────────────────────────────────────────────┘
```

---

## 🎬 Quick Animation

```
BEFORE:                          AFTER:
┌──────────────────┐            ┌──────────────────────┐
│ Task List        │            │ Task List (Enhanced) │
├──────────────────┤            ├──────────────────────┤
│ ○ Code Review    │   TIME     │ ○ Code Review        │
│ ○ Write Docs     │  ─────→    │ [Assign to...] ▼     │
│ ○ Test Feature   │   2 min    │                      │
│ ○ Deploy         │            │ ○ Write Docs         │
└──────────────────┘            │ Assigned to Sarah    │
   Static list                   │                      │
                                │ ○ Test Feature      │
                                │ [Assign to...] ▼    │
                                │                     │
                                │ + Auto Notifications │
                                │ + Employee Tracking │
                                │ + Status Updates    │
                                └──────────────────────┘
                                   Dynamic, Interactive
```

---

This complete system provides a professional task management and assignment experience with automatic notifications! 🚀

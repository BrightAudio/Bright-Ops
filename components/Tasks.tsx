"use client";

import WidgetCard from "./WidgetCard";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

// @ts-ignore - tasks table may not be in generated types
type Task = any;

type Employee = {
  id: string;
  name: string;
  email: string | null;
};

export default function Tasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDueDate, setNewTaskDueDate] = useState("");
  const [showAddTask, setShowAddTask] = useState(false);
  const [selectedTaskForAssignment, setSelectedTaskForAssignment] = useState<string | null>(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [assigningTask, setAssigningTask] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>("");

  useEffect(() => {
    fetchCurrentUser();
    fetchTasks();
    fetchEmployees();
  }, []);

  async function fetchCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setCurrentUserId(user.id);
    }
  }

  async function fetchTasks() {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      setLoading(false);
      return;
    }

    // Fetch tasks created by the user
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setTasks(data);
    }
    setLoading(false);
  }

  async function fetchEmployees() {
    try {
      const { data, error } = await (supabase as any)
        .from("employees")
        .select("id, name, email")
        .order("name");

      if (error) throw error;
      setEmployees(data || []);
    } catch (err) {
      console.error("Error loading employees:", err);
    }
  }

  async function toggleTask(taskId: string, currentStatus: string) {
    const newStatus = currentStatus === "completed" ? "pending" : "completed";
    const completedAt = newStatus === "completed" ? new Date().toISOString() : null;

    const { error } = await (supabase as any)
      .from("tasks")
      .update({ 
        status: newStatus,
        completed_at: completedAt
      })
      .eq("id", taskId);

    if (!error) {
      fetchTasks();
    }
  }

  async function addTask() {
    if (!newTaskTitle.trim()) return;

    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return;

    const { error } = await (supabase as any)
      .from("tasks")
      .insert({
        user_id: user.id,
        title: newTaskTitle,
        status: "pending",
        due_date: newTaskDueDate || null
      });

    if (!error) {
      setNewTaskTitle("");
      setNewTaskDueDate("");
      setShowAddTask(false);
      fetchTasks();
    }
  }

  async function assignTaskToEmployee(taskId: string, employeeId: string) {
    if (!employeeId) return;
    
    setAssigningTask(true);
    try {
      const { error } = await (supabase as any)
        .from("task_assignments")
        .insert({
          task_id: taskId,
          employee_id: employeeId,
          assigned_by: currentUserId,
          status: "pending"
        });

      if (error) {
        console.error("Error assigning task:", error);
        alert("Failed to assign task");
        return;
      }

      // Update the task to mark it as assigned
      await (supabase as any)
        .from("tasks")
        .update({
          assigned_to: employeeId,
          assigned_by: currentUserId,
          assigned_at: new Date().toISOString()
        })
        .eq("id", taskId);

      setSelectedTaskForAssignment(null);
      setSelectedEmployeeId("");
      fetchTasks();
    } catch (err) {
      console.error("Error:", err);
      alert("Failed to assign task");
    } finally {
      setAssigningTask(false);
    }
  }

  async function deleteTask(taskId: string) {
    const { error } = await supabase
      .from("tasks")
      .delete()
      .eq("id", taskId);

    if (!error) {
      fetchTasks();
    }
  }

  function getDueLabel(task: Task): string {
    if (task.status === "completed") {
      return "completed";
    }
    
    if (!task.due_date) {
      return "no due date";
    }

    const dueDate = new Date(task.due_date);
    const today = new Date();
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return "overdue";
    } else if (diffDays === 0) {
      return "due today";
    } else if (diffDays === 1) {
      return "due tomorrow";
    } else if (diffDays <= 7) {
      return `in ${diffDays} days`;
    } else if (diffDays <= 30) {
      return "in a few weeks";
    } else {
      return "in a month";
    }
  }

  function getDueStatus(task: Task): "overdue" | "soon" | "later" {
    if (!task.due_date || task.status === "completed") {
      return "later";
    }

    const dueDate = new Date(task.due_date);
    const today = new Date();
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return "overdue";
    } else if (diffDays <= 7) {
      return "soon";
    } else {
      return "later";
    }
  }

  function getAssignedEmployeeName(employeeId: string): string {
    const employee = employees.find(e => e.id === employeeId);
    return employee ? employee.name : "Unknown";
  }

  return (
    <WidgetCard
      title="Tasks"
      icon="fas fa-tasks"
      actions={
        <button
          onClick={() => setShowAddTask(!showAddTask)}
          className="text-blue-600 hover:text-blue-700"
          aria-label="Add new task"
        >
          <i className={showAddTask ? "fas fa-times" : "fas fa-plus"}></i>
        </button>
      }
      contentClassName="task-scroll"
    >
      {showAddTask && (
        <div className="mb-3 p-3 bg-gray-50 rounded border border-gray-200">
          <input
            type="text"
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                addTask();
              } else if (e.key === "Escape") {
                setShowAddTask(false);
                setNewTaskTitle("");
                setNewTaskDueDate("");
              }
            }}
            placeholder="Enter task title..."
            className="w-full px-3 py-2 border border-gray-300 rounded mb-2"
            autoFocus
          />
          <input
            type="date"
            value={newTaskDueDate}
            onChange={(e) => setNewTaskDueDate(e.target.value)}
            placeholder="Due date (optional)"
            className="w-full px-3 py-2 border border-gray-300 rounded mb-2"
          />
          <div className="flex gap-2">
            <button
              onClick={addTask}
              className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
            >
              Add Task
            </button>
            <button
              onClick={() => {
                setShowAddTask(false);
                setNewTaskTitle("");
                setNewTaskDueDate("");
              }}
              className="px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-4 text-gray-500">Loading tasks...</div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-4 text-gray-500">
          No tasks yet. Click the + button to add one!
        </div>
      ) : (
        <div className="task-list">
          {tasks.map((task) => (
            <div key={task.id} className="task-item group">
              <input
                type="checkbox"
                checked={task.status === "completed"}
                onChange={() => toggleTask(task.id, task.status)}
                aria-label={`Mark task "${task.title}" complete`}
              />
              <div className="task-info flex-1">
                <div className={`task-title${task.status === "completed" ? " completed" : ""}`}>
                  {task.title}
                </div>
                <div className="task-meta flex items-center gap-2">
                  {task.assigned_to ? (
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                      Assigned to {getAssignedEmployeeName(task.assigned_to)}
                    </span>
                  ) : (
                    <>
                      {selectedTaskForAssignment === task.id ? (
                        <div className="flex gap-1 items-center">
                          <select
                            value={selectedEmployeeId}
                            onChange={(e) => setSelectedEmployeeId(e.target.value)}
                            className="text-xs px-2 py-1 border border-gray-300 rounded"
                          >
                            <option value="">Select employee...</option>
                            {employees.map((emp) => (
                              <option key={emp.id} value={emp.id}>
                                {emp.name}
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={() => assignTaskToEmployee(task.id, selectedEmployeeId)}
                            disabled={!selectedEmployeeId || assigningTask}
                            className="text-xs px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-300"
                          >
                            {assigningTask ? "..." : "✓"}
                          </button>
                          <button
                            onClick={() => {
                              setSelectedTaskForAssignment(null);
                              setSelectedEmployeeId("");
                            }}
                            className="text-xs px-2 py-1 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setSelectedTaskForAssignment(task.id)}
                          className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded hover:bg-gray-200"
                        >
                          <i className="fas fa-user-plus mr-1"></i> Assign
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
              <div className={`task-due ${getDueStatus(task)}`}>{getDueLabel(task)}</div>
              <button
                onClick={() => deleteTask(task.id)}
                className="opacity-0 group-hover:opacity-100 transition-opacity ml-2 text-red-500 hover:text-red-700"
                aria-label="Delete task"
              >
                <i className="fas fa-trash text-sm"></i>
              </button>
            </div>
          ))}
        </div>
      )}
    </WidgetCard>
  );
}

"use client";

import WidgetCard from "./WidgetCard";
import { useState, useEffect } from "react";
import { supabaseBrowser } from "@/lib/supabaseClient";
import type { Database } from "@/types/database";

type Task = Database["public"]["Tables"]["tasks"]["Row"];

export default function Tasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDueDate, setNewTaskDueDate] = useState("");
  const [showAddTask, setShowAddTask] = useState(false);

  useEffect(() => {
    fetchTasks();
  }, []);

  async function fetchTasks() {
    const supabase = supabaseBrowser();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      setLoading(false);
      return;
    }

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

  async function toggleTask(taskId: string, currentStatus: string) {
    const supabase = supabaseBrowser();
    const newStatus = currentStatus === "completed" ? "pending" : "completed";
    const completedAt = newStatus === "completed" ? new Date().toISOString() : null;

    // @ts-expect-error - tasks table added in migration
    const { error } = await supabase
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

    const supabase = supabaseBrowser();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return;

    // @ts-expect-error - tasks table added in migration
    const { error } = await supabase
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

  async function deleteTask(taskId: string) {
    const supabase = supabaseBrowser();
    
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
                <div className="task-meta">{task.assignees || "Assigned to you"}</div>
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

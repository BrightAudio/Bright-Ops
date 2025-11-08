"use client";

import WidgetCard from "./WidgetCard";
import Link from "next/link";
import { useState } from "react";

type Task = {
  task: string;
  assignees: string;
  completed: boolean;
  dueLabel: string;
  dueStatus: "overdue" | "soon" | "later";
};

export default function Tasks() {
  const [tasks, setTasks] = useState<Task[]>([
    {
      task: "Remind John about time registration",
      assignees: "Assigned to John Doe",
      completed: false,
      dueLabel: "in 15 days",
      dueStatus: "soon",
    },
    {
      task: "Review prep sheet for Show #4521",
      assignees: "Leon, Lode, Mike",
      completed: false,
      dueLabel: "overdue",
      dueStatus: "overdue",
    },
    {
      task: "Update inventory counts",
      assignees: "Warehouse Team",
      completed: false,
      dueLabel: "in a month",
      dueStatus: "later",
    },
    {
      task: "Schedule crew for next week",
      assignees: "You",
      completed: true,
      dueLabel: "completed",
      dueStatus: "later",
    },
  ]);

  function toggleTask(index: number) {
    setTasks((prev) =>
      prev.map((item, idx) =>
        idx === index ? { ...item, completed: !item.completed } : item
      )
    );
  }

  return (
    <WidgetCard
      title="Tasks"
      icon="fas fa-tasks"
      actions={
        <Link href="/tasks" aria-label="Open tasks module">
          <i className="fas fa-external-link-alt" aria-hidden="true"></i>
        </Link>
      }
      contentClassName="task-scroll"
    >
      <div className="task-list">
        {tasks.map((item, idx) => (
          <div key={`${item.task}-${idx}`} className="task-item">
            <input
              type="checkbox"
              checked={item.completed}
              onChange={() => toggleTask(idx)}
              aria-label={`Mark task "${item.task}" complete`}
            />
            <div className="task-info">
              <div className={`task-title${item.completed ? " completed" : ""}`}>{item.task}</div>
              <div className="task-meta">{item.assignees}</div>
            </div>
            <div className={`task-due ${item.dueStatus}`}>{item.dueLabel}</div>
          </div>
        ))}
      </div>
    </WidgetCard>
  );
}

"use client";

import WidgetCard from "./WidgetCard";

export default function Tasks() {
  const tasks = [
    { task: "Review prep sheet for Show #4521", priority: "high", completed: false },
    { task: "Update inventory counts", priority: "medium", completed: false },
    { task: "Follow up with vendor on missing items", priority: "high", completed: false },
    { task: "Schedule crew for next week", priority: "low", completed: true },
  ];

  return (
    <WidgetCard title="Tasks" icon="fas fa-tasks">
      <div className="space-y-2">
        {tasks.map((item, idx) => (
          <div key={idx} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <input 
              type="checkbox" 
              checked={item.completed}
              className="w-4 h-4 text-blue-600 rounded"
              readOnly
            />
            <div className="flex-1">
              <div className={`text-sm ${item.completed ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                {item.task}
              </div>
            </div>
            <span className={`text-xs px-2 py-1 rounded-full ${
              item.priority === 'high' ? 'bg-red-100 text-red-700' :
              item.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
              'bg-green-100 text-green-700'
            }`}>
              {item.priority}
            </span>
          </div>
        ))}
      </div>
    </WidgetCard>
  );
}

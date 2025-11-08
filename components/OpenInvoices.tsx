"use client";

import WidgetCard from "./WidgetCard";

export default function OpenInvoices() {
  const invoices = [
    { client: "ABC Productions", amount: 12500, dueDate: "2025-11-15", status: "pending" },
    { client: "XYZ Events", amount: 8750, dueDate: "2025-11-10", status: "overdue" },
    { client: "Festival Inc", amount: 15000, dueDate: "2025-11-20", status: "pending" },
  ];

  const totalPending = invoices.reduce((sum, inv) => sum + inv.amount, 0);

  return (
    <WidgetCard title="Open Invoices" icon="fas fa-file-invoice-dollar">
      <div className="space-y-3">
        {invoices.map((invoice, idx) => (
          <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex-1">
              <div className="font-medium text-gray-800">{invoice.client}</div>
              <div className="text-xs text-gray-500">Due: {invoice.dueDate}</div>
            </div>
            <div className="text-right">
              <div className="font-semibold text-gray-800">
                ${invoice.amount.toLocaleString()}
              </div>
              <span className={`text-xs px-2 py-1 rounded-full ${
                invoice.status === 'overdue' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
              }`}>
                {invoice.status}
              </span>
            </div>
          </div>
        ))}
        <div className="pt-3 border-t border-gray-200 flex justify-between items-center">
          <span className="font-semibold text-gray-700">Total Pending:</span>
          <span className="text-lg font-bold text-blue-600">
            ${totalPending.toLocaleString()}
          </span>
        </div>
      </div>
    </WidgetCard>
  );
}

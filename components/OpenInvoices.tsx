"use client";

import WidgetCard from "./WidgetCard";

export default function OpenInvoices() {
  const summaries = [
    { label: "Open", amount: 9474.52, status: "open" as const, percent: 6 },
    { label: "Overdue", amount: 87100.29, status: "overdue" as const, percent: 59 },
    { label: "To be invoiced", amount: 50794.34, status: "tobe" as const, percent: 35 },
  ];

  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const totalAmount = summaries.reduce((sum, entry) => sum + entry.amount, 0);

  return (
    <WidgetCard title="Open Invoices" icon="fas fa-file-invoice-dollar" contentClassName="invoice-content">
      <div className="invoice-overview">
        <div className="invoice-subtitle">Outstanding invoice amount</div>
        <div className="invoice-total">{formatter.format(totalAmount)}</div>
        <div className="invoice-breakdown">
          {summaries.map((summary) => (
            <div key={summary.status} className="invoice-breakdown-row">
              <div className="label-info">
                <span className={`label-dot label-${summary.status}`}></span>
                <span className="label-text">{summary.label}</span>
              </div>
              <span className="label-amount">{formatter.format(summary.amount)}</span>
            </div>
          ))}
        </div>
        <div className="invoice-bar" role="presentation" aria-hidden="true">
          {summaries.map((summary) => (
            <div
              key={`${summary.status}-seg`}
              className={`${summary.status}-seg`}
              style={{ flex: `0 0 ${summary.percent}%` }}
            ></div>
          ))}
        </div>
      </div>
    </WidgetCard>
  );
}

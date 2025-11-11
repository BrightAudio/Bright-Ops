"use client";

import WidgetCard from "./WidgetCard";
import { useState, useEffect } from "react";
import { supabaseBrowser } from "@/lib/supabaseClient";
import type { Database } from "@/types/database";

type Job = Database["public"]["Tables"]["jobs"]["Row"];
type Invoice = Database["public"]["Tables"]["invoices"]["Row"];

type InvoiceSummary = {
  label: string;
  amount: number;
  status: "open" | "overdue" | "tobe" | "outstanding";
  percent: number;
};

export default function OpenInvoices() {
  const [summaries, setSummaries] = useState<InvoiceSummary[]>([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchInvoiceData() {
      const supabase = supabaseBrowser();

      // Fetch all jobs with cost estimate
      const { data: jobsData } = await supabase
        .from("jobs")
        .select("*")
        .gt("cost_estimate_amount", 0);

      // Fetch all invoices
      const { data: invoicesData } = await supabase
        .from("invoices")
        .select("*");

      const jobs: Job[] = jobsData || [];
      const invoices: Invoice[] = invoicesData || [];

      // Calculate amounts for each category
      let outstanding = 0; // Invoices sent but not paid
      let overdue = 0; // Invoices past due date
      let yetToInvoice = 0; // Jobs with income but no invoice

      const today = new Date();

      // Process invoices
      invoices.forEach(invoice => {
        if (invoice.status === "sent" || invoice.status === "draft") {
          outstanding += invoice.amount;
          
          // Check if overdue
          if (invoice.due_date) {
            const dueDate = new Date(invoice.due_date);
            if (dueDate < today) {
              overdue += invoice.amount;
            }
          }
        }
      });

      // Process jobs without invoices
      const jobsWithInvoices = new Set(invoices.map(inv => inv.job_id));
      jobs.forEach(job => {
        if (!jobsWithInvoices.has(job.id) && job.cost_estimate_amount) {
          yetToInvoice += job.cost_estimate_amount;
        }
      });

      const total = outstanding + yetToInvoice;
      
      // Calculate percentages
      const outstandingPercent = total > 0 ? Math.round((outstanding / total) * 100) : 0;
      const overduePercent = total > 0 ? Math.round((overdue / total) * 100) : 0;
      const yetToInvoicePercent = total > 0 ? Math.round((yetToInvoice / total) * 100) : 0;

      // Ensure percentages add up to 100
      const percentTotal = outstandingPercent + overduePercent + yetToInvoicePercent;
      let adjustedYetToInvoice = yetToInvoicePercent;
      if (percentTotal !== 100 && total > 0) {
        adjustedYetToInvoice += (100 - percentTotal);
      }

      const newSummaries: InvoiceSummary[] = [];
      
      if (outstanding > 0) {
        newSummaries.push({
          label: "Outstanding",
          amount: outstanding,
          status: "outstanding",
          percent: outstandingPercent
        });
      }

      if (overdue > 0) {
        newSummaries.push({
          label: "Overdue",
          amount: overdue,
          status: "overdue",
          percent: overduePercent
        });
      }

      if (yetToInvoice > 0) {
        newSummaries.push({
          label: "Yet to be invoiced",
          amount: yetToInvoice,
          status: "tobe",
          percent: adjustedYetToInvoice
        });
      }

      setSummaries(newSummaries);
      setTotalAmount(total);
      setLoading(false);
    }

    fetchInvoiceData();
  }, []);

  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <WidgetCard title="Open Invoices" icon="fas fa-file-invoice-dollar" contentClassName="invoice-content">
      {loading ? (
        <div className="text-center py-4 text-gray-500">Loading invoice data...</div>
      ) : (
        <div className="invoice-overview">
          <div className="invoice-subtitle">Outstanding invoice amount</div>
          <div className="invoice-total">{formatter.format(totalAmount)}</div>
          {summaries.length === 0 ? (
            <div className="text-center py-4 text-gray-500">No outstanding invoices</div>
          ) : (
            <>
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
            </>
          )}
        </div>
      )}
    </WidgetCard>
  );
}

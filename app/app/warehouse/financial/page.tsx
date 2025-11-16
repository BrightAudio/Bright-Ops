"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { supabase } from "@/lib/supabaseClient";

interface FinancialData {
  totalInventoryValue: number;
  totalRepairCosts: number;
  itemsNeedingRepair: number;
  shortageValue: number;
  jobsIncome: number;
  jobsLaborCost: number;
  jobsProfit: number;
  completedJobs: number;
  activeJobs: number;
  campaignsSent: number;
  campaignsCost: number;
}

export default function FinancialPage() {
  const [financial, setFinancial] = useState<FinancialData>({
    totalInventoryValue: 0,
    totalRepairCosts: 0,
    itemsNeedingRepair: 0,
    shortageValue: 0,
    jobsIncome: 0,
    jobsLaborCost: 0,
    jobsProfit: 0,
    completedJobs: 0,
    activeJobs: 0,
    campaignsSent: 0,
    campaignsCost: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFinancialData = async () => {
      try {
        // Fetch inventory data
        const { data: inventoryData } = await (supabase as any)
          .from("inventory_items")
          .select("qty_in_warehouse, unit_value, repair_cost, maintenance_status");

        // Fetch jobs data
        const { data: jobsData } = await (supabase as any)
          .from("jobs")
          .select("income, labor_cost, status, created_at");

        // Fetch campaigns data
        const { data: campaignsData } = await (supabase as any)
          .from("email_campaigns")
          .select("*");

        let totalInventoryValue = 0;
        let totalRepairCosts = 0;
        let itemsNeedingRepair = 0;
        let shortageValue = 0;

        if (inventoryData) {
          inventoryData.forEach((item: any) => {
            // Total inventory value (positive stock only)
            if (item.qty_in_warehouse > 0) {
              totalInventoryValue += item.qty_in_warehouse * (item.unit_value || 0);
            }
            // Shortage value (negative stock)
            if (item.qty_in_warehouse < 0) {
              shortageValue += Math.abs(item.qty_in_warehouse) * (item.unit_value || 0);
            }
            // Repair costs
            totalRepairCosts += item.repair_cost || 0;
            // Items needing repair
            if (
              item.maintenance_status === "needs_repair" ||
              item.maintenance_status === "in_repair"
            ) {
              itemsNeedingRepair++;
            }
          });
        }

        let jobsIncome = 0;
        let jobsLaborCost = 0;
        let completedJobs = 0;
        let activeJobs = 0;

        if (jobsData) {
          jobsData.forEach((job: any) => {
            jobsIncome += job.income || 0;
            jobsLaborCost += job.labor_cost || 0;
            
            if (job.status === "completed") {
              completedJobs++;
            } else if (job.status && ["in-process", "on-the-road"].includes(job.status)) {
              activeJobs++;
            }
          });
        }

        const jobsProfit = jobsIncome - jobsLaborCost;

        let campaignsSent = 0;
        let campaignsCost = 0;

        if (campaignsData) {
          campaignsSent = campaignsData.reduce((sum: number, c: any) => sum + (c.recipient_count || 0), 0);
          // Estimate cost at $0.10 per email
          campaignsCost = campaignsSent * 0.1;
        }

        setFinancial({
          totalInventoryValue,
          totalRepairCosts,
          itemsNeedingRepair,
          shortageValue,
          jobsIncome,
          jobsLaborCost,
          jobsProfit,
          completedJobs,
          activeJobs,
          campaignsSent,
          campaignsCost,
        });
      } catch (error) {
        console.error("Error fetching financial data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchFinancialData();
  }, []);

  const netProfit = financial.jobsProfit - financial.totalRepairCosts - financial.campaignsCost;
  const totalAssets = financial.totalInventoryValue + financial.jobsIncome;
  const profitMargin = financial.jobsIncome > 0 
    ? ((financial.jobsProfit / financial.jobsIncome) * 100).toFixed(1)
    : "0";

  return (
    <DashboardLayout>
      <div style={{ padding: "1.5rem" }}>
        <div style={{ marginBottom: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1
              style={{
                fontSize: "1.75rem",
                fontWeight: 600,
                color: "var(--color-text-main)",
                marginBottom: "0.5rem",
              }}
            >
              💰 Financial Dashboard
            </h1>
            <p
              style={{
                fontSize: "0.875rem",
                color: "#999999",
              }}
            >
              Comprehensive financial overview across all operations
            </p>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Net Profit */}
          <div
            style={{
              backgroundColor: "#2a2a2a",
              border: `1px solid ${netProfit >= 0 ? "#4ade80" : "#ff6b6b"}`,
              borderRadius: "0.5rem",
              padding: "1.5rem",
            }}
          >
            <p
              style={{
                fontSize: "0.875rem",
                color: "#999999",
                marginBottom: "0.5rem",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Net Profit
            </p>
            <p
              style={{
                fontSize: "2rem",
                fontWeight: 700,
                color: netProfit >= 0 ? "#4ade80" : "#ff6b6b",
              }}
            >
              {loading ? "..." : `$${netProfit.toFixed(2)}`}
            </p>
          </div>

          {/* Jobs Income */}
          <div
            style={{
              backgroundColor: "#2a2a2a",
              border: "1px solid #3b82f6",
              borderRadius: "0.5rem",
              padding: "1.5rem",
            }}
          >
            <p
              style={{
                fontSize: "0.875rem",
                color: "#999999",
                marginBottom: "0.5rem",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Jobs Income
            </p>
            <p
              style={{
                fontSize: "2rem",
                fontWeight: 700,
                color: "#3b82f6",
              }}
            >
              {loading ? "..." : `$${financial.jobsIncome.toFixed(2)}`}
            </p>
            <p
              style={{
                fontSize: "0.75rem",
                color: "#666666",
                marginTop: "0.25rem",
              }}
            >
              {financial.completedJobs} completed, {financial.activeJobs} active
            </p>
          </div>

          {/* Inventory Value */}
          <div
            style={{
              backgroundColor: "#2a2a2a",
              border: "1px solid #8b5cf6",
              borderRadius: "0.5rem",
              padding: "1.5rem",
            }}
          >
            <p
              style={{
                fontSize: "0.875rem",
                color: "#999999",
                marginBottom: "0.5rem",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Inventory Value
            </p>
            <p
              style={{
                fontSize: "2rem",
                fontWeight: 700,
                color: "#8b5cf6",
              }}
            >
              {loading ? "..." : `$${financial.totalInventoryValue.toFixed(2)}`}
            </p>
          </div>

          {/* Profit Margin */}
          <div
            style={{
              backgroundColor: "#2a2a2a",
              border: "1px solid #fbbf24",
              borderRadius: "0.5rem",
              padding: "1.5rem",
            }}
          >
            <p
              style={{
                fontSize: "0.875rem",
                color: "#999999",
                marginBottom: "0.5rem",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Profit Margin
            </p>
            <p
              style={{
                fontSize: "2rem",
                fontWeight: 700,
                color: "#fbbf24",
              }}
            >
              {loading ? "..." : `${profitMargin}%`}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Jobs & Operations */}
          <div
            style={{
              backgroundColor: "#2a2a2a",
              border: "1px solid #333333",
              borderRadius: "0.5rem",
              padding: "1.5rem",
            }}
          >
            <h2
              style={{
                fontSize: "1rem",
                fontWeight: 600,
                color: "#3b82f6",
                marginBottom: "1rem",
              }}
            >
              Jobs & Operations
            </h2>
            <div className="space-y-4">
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  paddingBottom: "1rem",
                  borderBottom: "1px solid #333333",
                }}
              >
                <span style={{ color: "#999999", fontSize: "0.875rem" }}>Total Income</span>
                <span style={{ color: "#3b82f6", fontWeight: 600 }}>
                  {loading ? "..." : `$${financial.jobsIncome.toFixed(2)}`}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  paddingBottom: "1rem",
                  borderBottom: "1px solid #333333",
                }}
              >
                <span style={{ color: "#999999", fontSize: "0.875rem" }}>Labor Costs</span>
                <span style={{ color: "#ff6b6b", fontWeight: 600 }}>
                  {loading ? "..." : `$${financial.jobsLaborCost.toFixed(2)}`}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  paddingBottom: "1rem",
                  borderBottom: "1px solid #333333",
                }}
              >
                <span style={{ color: "#999999", fontSize: "0.875rem" }}>Gross Profit</span>
                <span
                  style={{
                    color: financial.jobsProfit >= 0 ? "#4ade80" : "#ff6b6b",
                    fontWeight: 600,
                  }}
                >
                  {loading ? "..." : `$${financial.jobsProfit.toFixed(2)}`}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span style={{ color: "#999999", fontSize: "0.875rem" }}>Completed Jobs</span>
                <span style={{ color: "#4ade80", fontWeight: 600 }}>
                  {loading ? "..." : financial.completedJobs}
                </span>
              </div>
            </div>
          </div>

          {/* Inventory & Assets */}
          <div
            style={{
              backgroundColor: "#2a2a2a",
              border: "1px solid #333333",
              borderRadius: "0.5rem",
              padding: "1.5rem",
            }}
          >
            <h2
              style={{
                fontSize: "1rem",
                fontWeight: 600,
                color: "#8b5cf6",
                marginBottom: "1rem",
              }}
            >
              Inventory & Assets
            </h2>
            <div className="space-y-4">
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  paddingBottom: "1rem",
                  borderBottom: "1px solid #333333",
                }}
              >
                <span style={{ color: "#999999", fontSize: "0.875rem" }}>
                  Inventory Value
                </span>
                <span style={{ color: "#8b5cf6", fontWeight: 600 }}>
                  {loading ? "..." : `$${financial.totalInventoryValue.toFixed(2)}`}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  paddingBottom: "1rem",
                  borderBottom: "1px solid #333333",
                }}
              >
                <span style={{ color: "#999999", fontSize: "0.875rem" }}>Shortage Value</span>
                <span style={{ color: "#ff6b6b", fontWeight: 600 }}>
                  {loading ? "..." : `$${financial.shortageValue.toFixed(2)}`}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  paddingBottom: "1rem",
                  borderBottom: "1px solid #333333",
                }}
              >
                <span style={{ color: "#999999", fontSize: "0.875rem" }}>Repair Costs</span>
                <span style={{ color: "#fbbf24", fontWeight: 600 }}>
                  {loading ? "..." : `$${financial.totalRepairCosts.toFixed(2)}`}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span style={{ color: "#999999", fontSize: "0.875rem" }}>
                  Items Needing Repair
                </span>
                <span style={{ color: "#fbbf24", fontWeight: 600 }}>
                  {loading ? "..." : financial.itemsNeedingRepair}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Marketing & Costs */}
        <div
          style={{
            backgroundColor: "#2a2a2a",
            border: "1px solid #333333",
            borderRadius: "0.5rem",
            padding: "1.5rem",
            marginTop: "1.5rem",
          }}
        >
          <h2
            style={{
              fontSize: "1rem",
              fontWeight: 600,
              color: "#ec4899",
              marginBottom: "1rem",
            }}
          >
            Marketing & Operations Costs
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p
                style={{
                  fontSize: "0.875rem",
                  color: "#999999",
                  marginBottom: "0.5rem",
                }}
              >
                Campaigns Sent
              </p>
              <p
                style={{
                  fontSize: "1.5rem",
                  fontWeight: 700,
                  color: "#ec4899",
                }}
              >
                {loading ? "..." : financial.campaignsSent}
              </p>
            </div>
            <div>
              <p
                style={{
                  fontSize: "0.875rem",
                  color: "#999999",
                  marginBottom: "0.5rem",
                }}
              >
                Campaign Cost
              </p>
              <p
                style={{
                  fontSize: "1.5rem",
                  fontWeight: 700,
                  color: "#ec4899",
                }}
              >
                {loading ? "..." : `$${financial.campaignsCost.toFixed(2)}`}
              </p>
              <p
                style={{
                  fontSize: "0.75rem",
                  color: "#666666",
                  marginTop: "0.25rem",
                }}
              >
                (~$0.10 per email)
              </p>
            </div>
            <div>
              <p
                style={{
                  fontSize: "0.875rem",
                  color: "#999999",
                  marginBottom: "0.5rem",
                }}
              >
                Total Operating Costs
              </p>
              <p
                style={{
                  fontSize: "1.5rem",
                  fontWeight: 700,
                  color: "#ff6b6b",
                }}
              >
                {loading
                  ? "..."
                  : `$${(financial.totalRepairCosts + financial.campaignsCost).toFixed(2)}`}
              </p>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div
          style={{
            backgroundColor: "#2a2a2a",
            border: `1px solid ${netProfit >= 0 ? "#4ade80" : "#ff6b6b"}`,
            borderRadius: "0.5rem",
            padding: "1.5rem",
            marginTop: "1.5rem",
          }}
        >
          <h2
            style={{
              fontSize: "1rem",
              fontWeight: 600,
              color: netProfit >= 0 ? "#4ade80" : "#ff6b6b",
              marginBottom: "1rem",
            }}
          >
            Financial Summary
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p
                style={{
                  fontSize: "0.875rem",
                  color: "#999999",
                  marginBottom: "0.5rem",
                }}
              >
                Total Assets
              </p>
              <p
                style={{
                  fontSize: "1.5rem",
                  fontWeight: 700,
                  color: "#3b82f6",
                }}
              >
                {loading ? "..." : `$${totalAssets.toFixed(2)}`}
              </p>
            </div>
            <div>
              <p
                style={{
                  fontSize: "0.875rem",
                  color: "#999999",
                  marginBottom: "0.5rem",
                }}
              >
                Net Profit/Loss
              </p>
              <p
                style={{
                  fontSize: "1.5rem",
                  fontWeight: 700,
                  color: netProfit >= 0 ? "#4ade80" : "#ff6b6b",
                }}
              >
                {loading ? "..." : `${netProfit >= 0 ? "+" : ""}$${netProfit.toFixed(2)}`}
              </p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

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

interface InventoryDepreciation {
  id: string;
  name: string;
  purchase_cost: number;
  purchase_date: string;
  useful_life_years: number;
  residual_value: number;
  current_book_value: number;
  annual_depreciation: number;
  total_depreciation: number;
  category: string;
  location: string;
}

export default function FinancialPage() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'depreciation'>('dashboard');
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
  const [depreciationItems, setDepreciationItems] = useState<InventoryDepreciation[]>([]);

  useEffect(() => {
    const fetchFinancialData = async () => {
      try {
        // Fetch inventory data
        const { data: inventoryData } = await (supabase as any)
          .from("inventory_items")
          .select("id, name, qty_in_warehouse, unit_value, repair_cost, maintenance_status, purchase_cost, purchase_date, useful_life_years, residual_value, category, location");

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
        const depreciation: InventoryDepreciation[] = [];

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

            // Calculate depreciation for items with purchase info
            if (item.purchase_cost && item.purchase_date && item.useful_life_years) {
              const purchaseCost = parseFloat(item.purchase_cost) || 0;
              const residualValue = parseFloat(item.residual_value) || 0;
              const usefulLifeYears = parseFloat(item.useful_life_years) || 5;
              const depreciableAmount = purchaseCost - residualValue;
              const annualDepreciation = depreciableAmount / usefulLifeYears;
              
              const purchaseDate = new Date(item.purchase_date);
              const now = new Date();
              const yearsElapsed = (now.getTime() - purchaseDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
              const totalDepreciation = Math.min(annualDepreciation * yearsElapsed, depreciableAmount);
              const currentBookValue = Math.max(purchaseCost - totalDepreciation, residualValue);

              depreciation.push({
                id: item.id,
                name: item.name,
                purchase_cost: purchaseCost,
                purchase_date: item.purchase_date,
                useful_life_years: usefulLifeYears,
                residual_value: residualValue,
                current_book_value: currentBookValue,
                annual_depreciation: annualDepreciation,
                total_depreciation: totalDepreciation,
                category: item.category || 'Uncategorized',
                location: item.location || 'Unknown'
              });
            }
          });
        }

        setDepreciationItems(depreciation);

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
            {/* Navigation to Goals */}
            <div style={{ marginTop: "1rem", display: "flex", gap: "1rem" }}>
              <a
                onClick={() => setActiveTab('dashboard')}
                style={{
                  fontSize: "0.875rem",
                  fontWeight: 600,
                  color: activeTab === 'dashboard' ? "#4ade80" : "#999999",
                  textDecoration: "none",
                  borderBottom: activeTab === 'dashboard' ? "2px solid #4ade80" : "none",
                  paddingBottom: "0.25rem",
                  cursor: "pointer",
                }}
              >
                Dashboard
              </a>
              <a
                onClick={() => setActiveTab('depreciation')}
                style={{
                  fontSize: "0.875rem",
                  fontWeight: 600,
                  color: activeTab === 'depreciation' ? "#4ade80" : "#999999",
                  textDecoration: "none",
                  borderBottom: activeTab === 'depreciation' ? "2px solid #4ade80" : "none",
                  paddingBottom: "0.25rem",
                  cursor: "pointer",
                }}
              >
                Depreciation
              </a>
              <a
                href="/app/warehouse/financial/goals"
                style={{
                  fontSize: "0.875rem",
                  fontWeight: 600,
                  color: "#999999",
                  textDecoration: "none",
                  paddingBottom: "0.25rem",
                  transition: "all 0.3s ease",
                }}
                onMouseEnter={(e) => {
                  (e.target as HTMLElement).style.color = "#fbbf24";
                  (e.target as HTMLElement).style.borderBottom = "2px solid #fbbf24";
                }}
                onMouseLeave={(e) => {
                  (e.target as HTMLElement).style.color = "#999999";
                  (e.target as HTMLElement).style.borderBottom = "none";
                }}
              >
                Goals
              </a>
            </div>
          </div>
        </div>

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <>
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
          </>
        )}

        {/* Depreciation Tab */}
        {activeTab === 'depreciation' && (
          <div>
            <div style={{ marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.5rem', color: '#e5e5e5' }}>
                Equipment Depreciation Tracking
              </h2>
              <p style={{ color: '#9ca3af', fontSize: '14px' }}>
                Track asset depreciation for tax reporting and financial planning
              </p>
            </div>

            {/* Depreciation Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div style={{
                backgroundColor: '#2a2a2a',
                border: '1px solid #8b5cf6',
                borderRadius: '0.5rem',
                padding: '1.5rem'
              }}>
                <p style={{ fontSize: '0.875rem', color: '#999999', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Total Purchase Cost
                </p>
                <p style={{ fontSize: '2rem', fontWeight: 700, color: '#8b5cf6' }}>
                  {loading ? "..." : `$${depreciationItems.reduce((sum, item) => sum + item.purchase_cost, 0).toFixed(2)}`}
                </p>
              </div>

              <div style={{
                backgroundColor: '#2a2a2a',
                border: '1px solid #ef4444',
                borderRadius: '0.5rem',
                padding: '1.5rem'
              }}>
                <p style={{ fontSize: '0.875rem', color: '#999999', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Total Depreciation
                </p>
                <p style={{ fontSize: '2rem', fontWeight: 700, color: '#ef4444' }}>
                  {loading ? "..." : `$${depreciationItems.reduce((sum, item) => sum + item.total_depreciation, 0).toFixed(2)}`}
                </p>
              </div>

              <div style={{
                backgroundColor: '#2a2a2a',
                border: '1px solid #4ade80',
                borderRadius: '0.5rem',
                padding: '1.5rem'
              }}>
                <p style={{ fontSize: '0.875rem', color: '#999999', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Current Book Value
                </p>
                <p style={{ fontSize: '2rem', fontWeight: 700, color: '#4ade80' }}>
                  {loading ? "..." : `$${depreciationItems.reduce((sum, item) => sum + item.current_book_value, 0).toFixed(2)}`}
                </p>
              </div>
            </div>

            {/* Depreciation Items Table */}
            {loading ? (
              <p style={{ color: '#9ca3af', textAlign: 'center', padding: '3rem' }}>Loading depreciation data...</p>
            ) : depreciationItems.length === 0 ? (
              <div style={{
                background: '#2a2a2a',
                border: '1px solid #3a3a3a',
                borderRadius: '12px',
                padding: '3rem',
                textAlign: 'center'
              }}>
                <p style={{ color: '#9ca3af', fontSize: '18px' }}>No depreciation data available</p>
                <p style={{ color: '#6b7280', fontSize: '14px', marginTop: '0.5rem' }}>
                  Items need purchase cost, purchase date, and useful life years to calculate depreciation
                </p>
              </div>
            ) : (
              <div style={{
                background: '#2a2a2a',
                border: '1px solid #3a3a3a',
                borderRadius: '12px',
                overflow: 'hidden'
              }}>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', fontSize: '14px' }}>
                    <thead>
                      <tr style={{ background: '#1a1a1a', borderBottom: '2px solid #3a3a3a' }}>
                        <th style={{ textAlign: 'left', padding: '1rem', color: '#9ca3af', fontWeight: 600 }}>Item Name</th>
                        <th style={{ textAlign: 'left', padding: '1rem', color: '#9ca3af', fontWeight: 600 }}>Category</th>
                        <th style={{ textAlign: 'left', padding: '1rem', color: '#9ca3af', fontWeight: 600 }}>Location</th>
                        <th style={{ textAlign: 'right', padding: '1rem', color: '#9ca3af', fontWeight: 600 }}>Purchase Cost</th>
                        <th style={{ textAlign: 'right', padding: '1rem', color: '#9ca3af', fontWeight: 600 }}>Book Value</th>
                        <th style={{ textAlign: 'right', padding: '1rem', color: '#9ca3af', fontWeight: 600 }}>Annual Depreciation</th>
                        <th style={{ textAlign: 'right', padding: '1rem', color: '#9ca3af', fontWeight: 600 }}>Total Depreciation</th>
                        <th style={{ textAlign: 'center', padding: '1rem', color: '#9ca3af', fontWeight: 600 }}>Life (Years)</th>
                        <th style={{ textAlign: 'center', padding: '1rem', color: '#9ca3af', fontWeight: 600 }}>Purchase Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {depreciationItems.map((item) => {
                        const depreciationPercent = ((item.total_depreciation / (item.purchase_cost - item.residual_value)) * 100).toFixed(1);
                        return (
                          <tr key={item.id} style={{ borderBottom: '1px solid #2a2a2a' }}>
                            <td style={{ padding: '1rem', color: '#e5e5e5', fontWeight: 500 }}>
                              <a href={`/app/inventory/${item.id}`} style={{ color: '#667eea', textDecoration: 'none' }}>
                                {item.name}
                              </a>
                            </td>
                            <td style={{ padding: '1rem', color: '#9ca3af' }}>{item.category}</td>
                            <td style={{ padding: '1rem', color: '#9ca3af' }}>{item.location}</td>
                            <td style={{ textAlign: 'right', padding: '1rem', color: '#8b5cf6', fontWeight: 600 }}>
                              ${item.purchase_cost.toLocaleString()}
                            </td>
                            <td style={{ textAlign: 'right', padding: '1rem', color: '#4ade80', fontWeight: 600 }}>
                              ${item.current_book_value.toLocaleString()}
                            </td>
                            <td style={{ textAlign: 'right', padding: '1rem', color: '#fbbf24' }}>
                              ${item.annual_depreciation.toLocaleString()}
                            </td>
                            <td style={{ textAlign: 'right', padding: '1rem', color: '#ef4444', fontWeight: 600 }}>
                              ${item.total_depreciation.toLocaleString()}
                              <span style={{ fontSize: '12px', color: '#9ca3af', marginLeft: '0.5rem' }}>
                                ({depreciationPercent}%)
                              </span>
                            </td>
                            <td style={{ textAlign: 'center', padding: '1rem', color: '#9ca3af' }}>
                              {item.useful_life_years}
                            </td>
                            <td style={{ textAlign: 'center', padding: '1rem', color: '#9ca3af' }}>
                              {new Date(item.purchase_date).toLocaleDateString()}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Summary Row */}
                <div style={{
                  background: '#1a1a1a',
                  borderTop: '2px solid #3a3a3a',
                  padding: '1rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div style={{ fontWeight: 600, color: '#e5e5e5' }}>
                    Total ({depreciationItems.length} items)
                  </div>
                  <div style={{ display: 'flex', gap: '2rem', fontSize: '14px' }}>
                    <div>
                      <span style={{ color: '#9ca3af' }}>Purchase: </span>
                      <span style={{ color: '#8b5cf6', fontWeight: 600 }}>
                        ${depreciationItems.reduce((sum, item) => sum + item.purchase_cost, 0).toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span style={{ color: '#9ca3af' }}>Book Value: </span>
                      <span style={{ color: '#4ade80', fontWeight: 600 }}>
                        ${depreciationItems.reduce((sum, item) => sum + item.current_book_value, 0).toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span style={{ color: '#9ca3af' }}>Total Depreciation: </span>
                      <span style={{ color: '#ef4444', fontWeight: 600 }}>
                        ${depreciationItems.reduce((sum, item) => sum + item.total_depreciation, 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Annual Depreciation by Category */}
            {depreciationItems.length > 0 && (
              <div style={{
                marginTop: '1.5rem',
                background: '#2a2a2a',
                border: '1px solid #3a3a3a',
                borderRadius: '12px',
                padding: '1.5rem'
              }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem', color: '#e5e5e5' }}>
                  Annual Depreciation by Category
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(
                    depreciationItems.reduce((acc, item) => {
                      const category = item.category || 'Uncategorized';
                      if (!acc[category]) {
                        acc[category] = { annual: 0, total: 0, count: 0 };
                      }
                      acc[category].annual += item.annual_depreciation;
                      acc[category].total += item.total_depreciation;
                      acc[category].count += 1;
                      return acc;
                    }, {} as Record<string, { annual: number; total: number; count: number }>)
                  ).map(([category, data]) => (
                    <div key={category} style={{
                      background: '#1a1a1a',
                      borderRadius: '8px',
                      padding: '1rem',
                      border: '1px solid #3a3a3a'
                    }}>
                      <div style={{ fontSize: '14px', color: '#9ca3af', marginBottom: '0.5rem' }}>
                        {category} ({data.count} items)
                      </div>
                      <div style={{ fontSize: '20px', fontWeight: 600, color: '#fbbf24', marginBottom: '0.25rem' }}>
                        ${data.annual.toLocaleString()}/yr
                      </div>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>
                        Total: ${data.total.toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}


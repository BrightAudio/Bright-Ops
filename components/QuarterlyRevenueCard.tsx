'use client';

import React from 'react';
import { TrendingUp } from 'lucide-react';
import {
  formatCurrency,
  getCurrentQuarter,
  getQuarterLabel,
  calculateProfitMargin,
  formatProfitMargin,
} from '@/lib/quarterlyRevenue';

interface QuarterlyRevenueCardProps {
  organizationId: string;
  currentQuarterRevenue?: number;
  currentQuarterJobs?: number;
  currentQuarterProfit?: number;
}

export function QuarterlyRevenueCard({
  organizationId,
  currentQuarterRevenue = 0,
  currentQuarterJobs = 0,
  currentQuarterProfit = 0,
}: QuarterlyRevenueCardProps) {
  const currentQuarter = getCurrentQuarter();
  const profitMargin = calculateProfitMargin(currentQuarterRevenue, currentQuarterProfit);

  return (
    <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg p-6 text-white">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold opacity-90">
            {getQuarterLabel(currentQuarter.quarter, currentQuarter.year)}
          </h3>
          <p className="text-sm opacity-75">Current Quarter</p>
        </div>
        <TrendingUp className="w-10 h-10 opacity-30" />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <p className="text-xs opacity-75 font-medium mb-1">Revenue</p>
          <p className="text-2xl font-bold">{formatCurrency(currentQuarterRevenue)}</p>
        </div>
        <div>
          <p className="text-xs opacity-75 font-medium mb-1">Profit</p>
          <p className="text-2xl font-bold text-green-200">{formatCurrency(currentQuarterProfit)}</p>
        </div>
        <div>
          <p className="text-xs opacity-75 font-medium mb-1">Jobs</p>
          <p className="text-2xl font-bold">{currentQuarterJobs}</p>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-blue-400 border-opacity-50">
        <p className="text-xs font-medium opacity-75">
          Profit Margin: <span className="text-green-200 font-bold">{formatProfitMargin(profitMargin)}</span>
        </p>
      </div>
    </div>
  );
}

interface QuarterlyRevenueTableProps {
  jobsData: Array<{
    id: string;
    title: string;
    eventDate: string;
    income: number;
    profit: number;
  }>;
}

export function QuarterlyRevenueTable({ jobsData }: QuarterlyRevenueTableProps) {
  // Group jobs by quarter
  const jobsByQuarter = jobsData.reduce(
    (acc, job) => {
      const date = new Date(job.eventDate);
      const quarter = Math.ceil((date.getMonth() + 1) / 3);
      const year = date.getFullYear();
      const key = `${year}-Q${quarter}`;

      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(job);
      return acc;
    },
    {} as Record<string, typeof jobsData>
  );

  // Calculate quarterly totals
  const quarterlyTotals = Object.entries(jobsByQuarter).map(([key, jobs]) => {
    const [year, quarter] = key.split('-Q');
    const totalRevenue = jobs.reduce((sum, job) => sum + (job.income || 0), 0);
    const totalProfit = jobs.reduce((sum, job) => sum + (job.profit || 0), 0);

    return {
      key,
      quarter: parseInt(quarter),
      year: parseInt(year),
      jobCount: jobs.length,
      totalRevenue,
      totalProfit,
      profitMargin: calculateProfitMargin(totalRevenue, totalProfit),
    };
  });

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
        <h3 className="font-semibold text-gray-900">Revenue by Quarter</h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Quarter
              </th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Jobs
              </th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Revenue
              </th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Profit
              </th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Margin
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {quarterlyTotals.map((quarter) => (
              <tr key={quarter.key} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm font-medium text-gray-900">
                  Q{quarter.quarter} {quarter.year}
                </td>
                <td className="px-6 py-4 text-sm text-right font-semibold text-gray-900">
                  {quarter.jobCount}
                </td>
                <td className="px-6 py-4 text-sm text-right font-semibold text-blue-600">
                  {formatCurrency(quarter.totalRevenue)}
                </td>
                <td className="px-6 py-4 text-sm text-right font-semibold text-green-600">
                  {formatCurrency(quarter.totalProfit)}
                </td>
                <td className="px-6 py-4 text-sm text-right font-semibold text-gray-900">
                  {formatProfitMargin(quarter.profitMargin)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

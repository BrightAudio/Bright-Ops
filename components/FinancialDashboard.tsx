'use client';

import React, { useState, useEffect } from 'react';
import { TrendingUp, Calendar, DollarSign } from 'lucide-react';
import {
  getQuarter,
  getCurrentQuarter,
  formatCurrency,
  getQuarterLabel,
  calculateProfitMargin,
  formatProfitMargin,
  formatGrowth,
  calculateQoQGrowth,
  getQuarterColor,
  getPreviousQuarters,
} from '@/lib/quarterlyRevenue';

interface QuarterlyRevenueData {
  quarter: number;
  year: number;
  totalRevenue: number;
  totalExpenses: number;
  totalProfit: number;
  jobCount: number;
}

interface CompletedJob {
  id: string;
  title: string;
  eventDate: string;
  completedAt: string;
  income: number;
  profit: number;
  marginPercent: number;
}

interface FinancialDashboardProps {
  organizationId: string;
  currentQuarterData?: QuarterlyRevenueData | null;
  previousQuartersData?: QuarterlyRevenueData[];
  yearlyData?: Record<number, QuarterlyRevenueData[]>;
  completedJobs?: CompletedJob[];
}

export function FinancialDashboard({
  organizationId,
  currentQuarterData,
  previousQuartersData = [],
  yearlyData = {},
  completedJobs = [],
}: FinancialDashboardProps) {
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedQuarter, setSelectedQuarter] = useState<number>(getCurrentQuarter().quarter);
  const [showCompletedJobs, setShowCompletedJobs] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const currentQuarter = getCurrentQuarter();

  // Calculate year-to-date totals
  const getYearTotal = (year: number) => {
    const yearQuarters = yearlyData[year] || [];
    return {
      revenue: yearQuarters.reduce((sum, q) => sum + (q.totalRevenue || 0), 0),
      expenses: yearQuarters.reduce((sum, q) => sum + (q.totalExpenses || 0), 0),
      profit: yearQuarters.reduce((sum, q) => sum + (q.totalProfit || 0), 0),
      jobs: yearQuarters.reduce((sum, q) => sum + (q.jobCount || 0), 0),
    };
  };

  const yearTotal = getYearTotal(selectedYear);

  // Get quarter-over-quarter growth
  const getQoQGrowthRate = (current: QuarterlyRevenueData | undefined) => {
    if (!current || previousQuartersData.length === 0) return 0;
    const previous = previousQuartersData[0];
    return calculateQoQGrowth(current.totalRevenue || 0, previous.totalRevenue || 0);
  };

  const qoqGrowth = getQoQGrowthRate(currentQuarterData || undefined);

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Financial Dashboard</h1>
          <p className="text-gray-600 mt-1">Quarterly revenue tracking and yearly overview</p>
        </div>
      </div>

      {/* Current Quarter Overview Card */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Current Quarter Revenue */}
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Current Quarter Revenue</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">
                {formatCurrency(currentQuarterData?.totalRevenue || 0)}
              </p>
              <p className="text-xs text-gray-500 mt-2">
                {getQuarterLabel(currentQuarter.quarter, currentQuarter.year)}
              </p>
            </div>
            <DollarSign className="w-12 h-12 text-blue-500 opacity-20" />
          </div>
        </div>

        {/* Current Quarter Profit */}
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Quarter Profit</p>
              <p className="text-2xl font-bold text-green-600 mt-2">
                {formatCurrency(currentQuarterData?.totalProfit || 0)}
              </p>
              <p className="text-xs text-gray-500 mt-2">
                {formatProfitMargin(
                  calculateProfitMargin(
                    currentQuarterData?.totalRevenue || 0,
                    currentQuarterData?.totalProfit || 0
                  )
                )}{' '}
                margin
              </p>
            </div>
            <TrendingUp className="w-12 h-12 text-green-500 opacity-20" />
          </div>
        </div>

        {/* QoQ Growth */}
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">QoQ Growth</p>
              <p
                className={`text-2xl font-bold mt-2 ${qoqGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}
              >
                {formatGrowth(qoqGrowth)}
              </p>
              <p className="text-xs text-gray-500 mt-2">vs previous quarter</p>
            </div>
            <TrendingUp className="w-12 h-12 text-purple-500 opacity-20" />
          </div>
        </div>

        {/* Job Count */}
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-orange-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Jobs This Quarter</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">
                {currentQuarterData?.jobCount || 0}
              </p>
              <p className="text-xs text-gray-500 mt-2">
                Avg:{' '}
                {formatCurrency(
                  (currentQuarterData?.totalRevenue || 0) / Math.max(currentQuarterData?.jobCount || 1, 1)
                )}
              </p>
            </div>
            <Calendar className="w-12 h-12 text-orange-500 opacity-20" />
          </div>
        </div>
      </div>

      {/* Quarterly Breakdown for Selected Year */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">Quarterly Breakdown</h2>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {[selectedYear, selectedYear - 1, selectedYear - 2].map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((q) => {
            const quarterData = yearlyData[selectedYear]?.find((d) => d.quarter === q);
            const isCurrentQuarter = selectedYear === currentQuarter.year && q === currentQuarter.quarter;

            return (
              <div
                key={`q${q}`}
                className={`rounded-lg p-4 border-2 ${
                  isCurrentQuarter ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-900">Q{q}</h3>
                  {isCurrentQuarter && (
                    <span className="text-xs px-2 py-1 bg-blue-500 text-white rounded-full">
                      Current
                    </span>
                  )}
                </div>

                <div className="space-y-2 text-sm">
                  <div>
                    <p className="text-gray-600">Revenue</p>
                    <p className="text-lg font-bold text-gray-900">
                      {formatCurrency(quarterData?.totalRevenue || 0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">Expenses</p>
                    <p className="text-lg font-bold text-gray-900">
                      {formatCurrency(quarterData?.totalExpenses || 0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">Profit</p>
                    <p className="text-lg font-bold text-green-600">
                      {formatCurrency(quarterData?.totalProfit || 0)}
                    </p>
                  </div>
                  <div className="pt-2 border-t border-gray-300">
                    <p className="text-gray-600">Jobs</p>
                    <p className="text-sm font-semibold text-gray-900">{quarterData?.jobCount || 0}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Year-to-Date Summary */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Year-to-Date Summary</h2>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-gray-600 font-medium">YTD Revenue</p>
            <p className="text-2xl font-bold text-gray-900 mt-2">{formatCurrency(yearTotal.revenue)}</p>
          </div>

          <div className="p-4 bg-red-50 rounded-lg border border-red-200">
            <p className="text-sm text-gray-600 font-medium">YTD Expenses</p>
            <p className="text-2xl font-bold text-gray-900 mt-2">{formatCurrency(yearTotal.expenses)}</p>
          </div>

          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <p className="text-sm text-gray-600 font-medium">YTD Profit</p>
            <p className="text-2xl font-bold text-green-600 mt-2">{formatCurrency(yearTotal.profit)}</p>
          </div>

          <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
            <p className="text-sm text-gray-600 font-medium">Total Jobs</p>
            <p className="text-2xl font-bold text-gray-900 mt-2">{yearTotal.jobs}</p>
          </div>
        </div>
      </div>

      {/* Previous Quarters Comparison */}
      {previousQuartersData.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Previous Quarters</h2>

          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Quarter</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">Revenue</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">Profit</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">Margin</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">Jobs</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {previousQuartersData.map((quarter) => (
                  <tr key={`${quarter.year}-q${quarter.quarter}`} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {getQuarterLabel(quarter.quarter, quarter.year)}
                    </td>
                    <td className="px-6 py-4 text-sm text-right font-semibold text-gray-900">
                      {formatCurrency(quarter.totalRevenue || 0)}
                    </td>
                    <td className="px-6 py-4 text-sm text-right font-semibold text-green-600">
                      {formatCurrency(quarter.totalProfit || 0)}
                    </td>
                    <td className="px-6 py-4 text-sm text-right font-semibold text-gray-900">
                      {formatProfitMargin(
                        calculateProfitMargin(quarter.totalRevenue || 0, quarter.totalProfit || 0)
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-right font-semibold text-gray-900">
                      {quarter.jobCount || 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Completed Jobs Section */}
      {completedJobs.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Completed Jobs This Quarter</h2>
            <button
              onClick={() => setShowCompletedJobs(!showCompletedJobs)}
              className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-sm font-medium transition"
            >
              {showCompletedJobs ? 'Hide Details' : 'Show Details'}
            </button>
          </div>

          {showCompletedJobs && (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Job Title</th>
                    <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900">Event Date</th>
                    <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900">Completed</th>
                    <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">Revenue</th>
                    <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">Profit</th>
                    <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">Margin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {completedJobs.map((job) => (
                    <tr key={job.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{job.title}</td>
                      <td className="px-6 py-4 text-sm text-center text-gray-600">
                        {new Date(job.eventDate).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-sm text-center text-gray-600">
                        {new Date(job.completedAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-sm text-right font-semibold text-blue-600">
                        {formatCurrency(job.income)}
                      </td>
                      <td className="px-6 py-4 text-sm text-right font-semibold text-green-600">
                        {formatCurrency(job.profit)}
                      </td>
                      <td className="px-6 py-4 text-sm text-right font-semibold text-gray-900">
                        {formatProfitMargin(job.marginPercent)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-600">Total Completed</p>
                <p className="text-lg font-bold text-gray-900">{completedJobs.length} jobs</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Completed Revenue</p>
                <p className="text-lg font-bold text-blue-600">
                  {formatCurrency(completedJobs.reduce((sum, job) => sum + job.income, 0))}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Completed Profit</p>
                <p className="text-lg font-bold text-green-600">
                  {formatCurrency(completedJobs.reduce((sum, job) => sum + job.profit, 0))}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Info Section */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-semibold text-blue-900 mb-2">How Quarterly Revenue Works</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Revenue is tracked based on job event dates</li>
          <li>• Each quarter shows Q1-Q4 automatically (Jan-Mar, Apr-Jun, Jul-Sep, Oct-Dec)</li>
          <li>• When a new quarter starts, your current quarterly total resets to zero</li>
          <li>• Previous quarter data is preserved in the historical records</li>
          <li>• Year-to-date shows combined totals from all quarters in the current year</li>
          <li>• Completed jobs automatically update the quarterly revenue totals</li>
        </ul>
      </div>
    </div>
  );
}

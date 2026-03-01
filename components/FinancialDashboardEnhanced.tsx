'use client';

import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Calendar, DollarSign, Eye, EyeOff, Download, Share2 } from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
} from 'recharts';
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

// Animated Counter Component
function AnimatedCounter({ value, prefix = '', suffix = '', duration = 1000 }: { value: number; prefix?: string; suffix?: string; duration?: number }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const increment = value / (duration / 16);
    const interval = setInterval(() => {
      start += increment;
      if (start >= value) {
        setCount(value);
        clearInterval(interval);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);

    return () => clearInterval(interval);
  }, [value, duration]);

  return (
    <span>
      {prefix}
      {count.toLocaleString()}
      {suffix}
    </span>
  );
}

// Metric Card with Hover Effects
function MetricCard({
  title,
  value,
  icon: Icon,
  color,
  trend,
  trendValue,
  details,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  details?: string;
}) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`rounded-lg p-6 border-l-4 transition-all duration-300 cursor-pointer transform hover:scale-105 hover:shadow-lg ${
        color === 'blue'
          ? 'bg-white border-blue-500 hover:bg-blue-50'
          : color === 'green'
            ? 'bg-white border-green-500 hover:bg-green-50'
            : color === 'purple'
              ? 'bg-white border-purple-500 hover:bg-purple-50'
              : 'bg-white border-orange-500 hover:bg-orange-50'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-gray-600 text-sm font-medium">{title}</p>
          <p className={`text-3xl font-bold mt-2 ${color === 'green' ? 'text-green-600' : 'text-gray-900'}`}>{value}</p>
          {details && (
            <p className={`text-xs mt-2 transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-60'}`}>
              {details}
            </p>
          )}
          {trend && trendValue && (
            <div className={`flex items-center gap-1 mt-2 text-xs font-semibold ${trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-gray-600'}`}>
              {trend === 'up' && <TrendingUp className="w-3 h-3" />}
              {trend === 'down' && <TrendingDown className="w-3 h-3" />}
              {trendValue}
            </div>
          )}
        </div>
        <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-transform duration-300 ${isHovered ? 'scale-110 rotate-12' : ''} ${color === 'blue' ? 'bg-blue-100 text-blue-500' : color === 'green' ? 'bg-green-100 text-green-500' : color === 'purple' ? 'bg-purple-100 text-purple-500' : 'bg-orange-100 text-orange-500'}`}>
          {Icon}
        </div>
      </div>
    </div>
  );
}

export function FinancialDashboardEnhanced({
  organizationId,
  currentQuarterData,
  previousQuartersData = [],
  yearlyData = {},
  completedJobs = [],
}: FinancialDashboardProps) {
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedQuarters, setSelectedQuarters] = useState<number[]>([1, 2, 3, 4]);
  const [showJobs, setShowJobs] = useState(true);
  const [compareMode, setCompareMode] = useState(false);

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

  // Prepare chart data
  const chartData = (yearlyData[selectedYear] || []).filter((q) => selectedQuarters.includes(q.quarter)).map((q) => ({
    name: `Q${q.quarter}`,
    revenue: q.totalRevenue,
    profit: q.totalProfit,
    expenses: q.totalExpenses,
    jobs: q.jobCount,
  }));

  // Prepare trend data (last 4 quarters)
  const trendData = Object.entries(yearlyData)
    .flatMap(([year, quarters]) =>
      quarters.map((q) => ({
        name: getQuarterLabel(q.quarter, q.year),
        revenue: q.totalRevenue,
        profit: q.totalProfit,
      }))
    )
    .slice(-4);

  // Profit margin data
  const profitMarginData = chartData.map((d) => ({
    name: d.name,
    margin: d.revenue > 0 ? ((d.profit / d.revenue) * 100).toFixed(1) : 0,
  }));

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  const getQoQGrowth = () => {
    if (!currentQuarterData || previousQuartersData.length === 0) return 0;
    return calculateQoQGrowth(currentQuarterData.totalRevenue || 0, previousQuartersData[0].totalRevenue || 0);
  };

  const qoqGrowth = getQoQGrowth();

  return (
    <div className="space-y-6 p-6">
      {/* Header with Controls */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-gray-900">Financial Dashboard</h1>
          <p className="text-gray-600 mt-1">Interactive quarterly analytics & revenue tracking</p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 text-sm font-medium transition flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export
          </button>
          <button className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition flex items-center gap-2">
            <Share2 className="w-4 h-4" />
            Share
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard
          title="Current Quarter Revenue"
          value={formatCurrency(currentQuarterData?.totalRevenue || 0)}
          icon={<DollarSign className="w-6 h-6" />}
          color="blue"
          trend={qoqGrowth >= 0 ? 'up' : 'down'}
          trendValue={formatGrowth(qoqGrowth)}
          details={getQuarterLabel(currentQuarter.quarter, currentQuarter.year)}
        />
        <MetricCard
          title="Quarter Profit"
          value={formatCurrency(currentQuarterData?.totalProfit || 0)}
          icon={<TrendingUp className="w-6 h-6" />}
          color="green"
          trend="up"
          trendValue={formatProfitMargin(
            calculateProfitMargin(currentQuarterData?.totalRevenue || 0, currentQuarterData?.totalProfit || 0)
          )}
          details="Profit margin"
        />
        <MetricCard
          title="QoQ Growth"
          value={formatGrowth(qoqGrowth)}
          icon={<TrendingUp className="w-6 h-6" />}
          color="purple"
          trend={qoqGrowth >= 0 ? 'up' : 'down'}
          details="vs previous quarter"
        />
        <MetricCard
          title="Jobs This Quarter"
          value={currentQuarterData?.jobCount || 0}
          icon={<Calendar className="w-6 h-6" />}
          color="orange"
          details={`Avg: ${formatCurrency((currentQuarterData?.totalRevenue || 0) / Math.max(currentQuarterData?.jobCount || 1, 1))}`}
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue & Profit Trend */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Revenue & Profit Trend</h2>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                }}
                formatter={(value) => formatCurrency(value as number)}
              />
              <Legend />
              <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6', r: 4 }} activeDot={{ r: 6 }} />
              <Bar dataKey="profit" fill="#10b981" opacity={0.6} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Quarterly Comparison */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Quarterly Breakdown</h2>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            >
              {[selectedYear, selectedYear - 1, selectedYear - 2].map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                }}
                formatter={(value) => formatCurrency(value as number)}
              />
              <Legend />
              <Bar dataKey="revenue" fill="#3b82f6" radius={[8, 8, 0, 0]} />
              <Bar dataKey="profit" fill="#10b981" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* YTD Summary & Profit Margin */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Year-to-Date Summary */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Year-to-Date Summary</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200">
              <p className="text-xs text-blue-700 font-medium uppercase">YTD Revenue</p>
              <p className="text-2xl font-bold text-blue-900 mt-2">{formatCurrency(yearTotal.revenue)}</p>
              <div className="mt-2 w-full bg-blue-200 rounded-full h-2">
                <div className="bg-blue-500 h-2 rounded-full" style={{ width: '75%' }} />
              </div>
            </div>

            <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg border border-green-200">
              <p className="text-xs text-green-700 font-medium uppercase">YTD Profit</p>
              <p className="text-2xl font-bold text-green-900 mt-2">{formatCurrency(yearTotal.profit)}</p>
              <div className="mt-2 w-full bg-green-200 rounded-full h-2">
                <div className="bg-green-500 h-2 rounded-full" style={{ width: '60%' }} />
              </div>
            </div>

            <div className="p-4 bg-gradient-to-br from-red-50 to-red-100 rounded-lg border border-red-200">
              <p className="text-xs text-red-700 font-medium uppercase">YTD Expenses</p>
              <p className="text-2xl font-bold text-red-900 mt-2">{formatCurrency(yearTotal.expenses)}</p>
              <div className="mt-2 w-full bg-red-200 rounded-full h-2">
                <div className="bg-red-500 h-2 rounded-full" style={{ width: '50%' }} />
              </div>
            </div>

            <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg border border-purple-200">
              <p className="text-xs text-purple-700 font-medium uppercase">Total Jobs</p>
              <p className="text-2xl font-bold text-purple-900 mt-2">{yearTotal.jobs}</p>
              <p className="text-xs text-purple-600 mt-2">Avg job value: {formatCurrency(yearTotal.revenue / Math.max(yearTotal.jobs, 1))}</p>
            </div>
          </div>
        </div>

        {/* Profit Margin Trend */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Profit Margin by Quarter</h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={profitMarginData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="name" />
              <YAxis label={{ value: 'Margin %', angle: -90, position: 'insideLeft' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                }}
                formatter={(value) => `${value}%`}
              />
              <Bar dataKey="margin" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Completed Jobs Section */}
      {completedJobs.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Completed Jobs This Quarter ({completedJobs.length})</h2>
            <button
              onClick={() => setShowJobs(!showJobs)}
              className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-sm font-medium transition flex items-center gap-2"
            >
              {showJobs ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              {showJobs ? 'Hide' : 'Show'}
            </button>
          </div>

          {showJobs && (
            <>
              <div className="overflow-x-auto mb-6">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left font-semibold text-gray-900">Job Title</th>
                      <th className="px-6 py-3 text-center font-semibold text-gray-900">Event Date</th>
                      <th className="px-6 py-3 text-right font-semibold text-gray-900">Revenue</th>
                      <th className="px-6 py-3 text-right font-semibold text-gray-900">Profit</th>
                      <th className="px-6 py-3 text-right font-semibold text-gray-900">Margin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {completedJobs.slice(0, 5).map((job) => (
                      <tr key={job.id} className="hover:bg-blue-50 transition">
                        <td className="px-6 py-4 font-medium text-gray-900">{job.title}</td>
                        <td className="px-6 py-4 text-center text-gray-600">{new Date(job.eventDate).toLocaleDateString()}</td>
                        <td className="px-6 py-4 text-right font-semibold text-blue-600">{formatCurrency(job.income)}</td>
                        <td className="px-6 py-4 text-right font-semibold text-green-600">{formatCurrency(job.profit)}</td>
                        <td className="px-6 py-4 text-right font-semibold text-gray-900">{formatProfitMargin(job.marginPercent)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {completedJobs.length > 5 && <p className="text-sm text-gray-600 text-center">+{completedJobs.length - 5} more jobs</p>}

              <div className="mt-6 pt-6 border-t border-gray-200 grid grid-cols-3 gap-4">
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <p className="text-xs text-blue-700 font-medium">Total Completed</p>
                  <p className="text-2xl font-bold text-blue-900 mt-1">{completedJobs.length} jobs</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                  <p className="text-xs text-green-700 font-medium">Total Revenue</p>
                  <p className="text-2xl font-bold text-green-900 mt-1">{formatCurrency(completedJobs.reduce((sum, job) => sum + job.income, 0))}</p>
                </div>
                <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                  <p className="text-xs text-purple-700 font-medium">Total Profit</p>
                  <p className="text-2xl font-bold text-purple-900 mt-1">{formatCurrency(completedJobs.reduce((sum, job) => sum + job.profit, 0))}</p>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Info Section */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-semibold text-blue-900 mb-3">📊 Dashboard Features</h3>
        <ul className="text-sm text-blue-800 space-y-2 grid grid-cols-2">
          <li className="flex items-start gap-2">
            <span>✓</span>
            <span>Interactive charts with hover details</span>
          </li>
          <li className="flex items-start gap-2">
            <span>✓</span>
            <span>Real-time trend analysis</span>
          </li>
          <li className="flex items-start gap-2">
            <span>✓</span>
            <span>Profit margin tracking</span>
          </li>
          <li className="flex items-start gap-2">
            <span>✓</span>
            <span>Year-over-year comparisons</span>
          </li>
          <li className="flex items-start gap-2">
            <span>✓</span>
            <span>Completed jobs visibility</span>
          </li>
          <li className="flex items-start gap-2">
            <span>✓</span>
            <span>Export & share functionality</span>
          </li>
        </ul>
      </div>
    </div>
  );
}

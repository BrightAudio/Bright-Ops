/**
 * Quarterly Revenue Utilities
 * Handles calculations and formatting for quarterly financial tracking
 */

export interface QuarterlyData {
  quarter: number;
  year: number;
  totalRevenue: number;
  totalExpenses: number;
  totalProfit: number;
  jobCount: number;
}

export interface YearlyData {
  year: number;
  q1: QuarterlyData;
  q2: QuarterlyData;
  q3: QuarterlyData;
  q4: QuarterlyData;
  totalRevenue: number;
  totalExpenses: number;
  totalProfit: number;
}

/**
 * Get quarter number (1-4) from a date
 */
export function getQuarter(date: Date): number {
  const month = date.getMonth() + 1; // 0-indexed to 1-indexed
  return Math.ceil(month / 3);
}

/**
 * Get current quarter and year
 */
export function getCurrentQuarter(): { quarter: number; year: number } {
  const now = new Date();
  return {
    quarter: getQuarter(now),
    year: now.getFullYear(),
  };
}

/**
 * Get quarter date range
 */
export function getQuarterDateRange(
  quarter: number,
  year: number
): { start: Date; end: Date } {
  const monthStart = (quarter - 1) * 3 + 1;
  const monthEnd = quarter * 3 + 1;

  const start = new Date(year, monthStart - 1, 1);
  const end = new Date(year, monthEnd - 1, 0, 23, 59, 59, 999);

  return { start, end };
}

/**
 * Format currency
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Get quarter name
 */
export function getQuarterName(quarter: number): string {
  const names = ["Q1", "Q2", "Q3", "Q4"];
  return names[quarter - 1] || "Invalid";
}

/**
 * Get quarter label with year
 */
export function getQuarterLabel(quarter: number, year: number): string {
  return `${getQuarterName(quarter)} ${year}`;
}

/**
 * Calculate profit from revenue and expenses
 */
export function calculateProfit(revenue: number, expenses: number): number {
  return revenue - expenses;
}

/**
 * Calculate profit margin percentage
 */
export function calculateProfitMargin(revenue: number, profit: number): number {
  if (revenue === 0) return 0;
  return (profit / revenue) * 100;
}

/**
 * Format profit margin
 */
export function formatProfitMargin(margin: number): string {
  return `${margin.toFixed(1)}%`;
}

/**
 * Check if a date falls within a quarter
 */
export function isDateInQuarter(date: Date, quarter: number, year: number): boolean {
  const dateYear = date.getFullYear();
  const dateQuarter = getQuarter(date);
  return dateYear === year && dateQuarter === quarter;
}

/**
 * Get all quarters for comparison
 */
export function getQuartersForYear(year: number): Array<{ quarter: number; year: number }> {
  return [
    { quarter: 1, year },
    { quarter: 2, year },
    { quarter: 3, year },
    { quarter: 4, year },
  ];
}

/**
 * Get previous quarters for comparison
 */
export function getPreviousQuarters(
  count: number = 4
): Array<{ quarter: number; year: number }> {
  const quarters: Array<{ quarter: number; year: number }> = [];
  let { quarter, year } = getCurrentQuarter();

  for (let i = 0; i < count; i++) {
    quarters.unshift({ quarter, year });

    // Move to previous quarter
    quarter--;
    if (quarter === 0) {
      quarter = 4;
      year--;
    }
  }

  return quarters;
}

/**
 * Calculate quarter-over-quarter growth
 */
export function calculateQoQGrowth(current: number, previous: number): number {
  if (previous === 0) return 0;
  return ((current - previous) / Math.abs(previous)) * 100;
}

/**
 * Format growth percentage
 */
export function formatGrowth(growth: number): string {
  const sign = growth >= 0 ? "+" : "";
  return `${sign}${growth.toFixed(1)}%`;
}

/**
 * Get quarter color for charts
 */
export function getQuarterColor(quarter: number): string {
  const colors = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444"];
  return colors[quarter - 1] || "#6b7280";
}

/**
 * Calculate average job value for quarter
 */
export function calculateAverageJobValue(totalRevenue: number, jobCount: number): number {
  if (jobCount === 0) return 0;
  return totalRevenue / jobCount;
}

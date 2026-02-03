import { useEffect, useState } from 'react';
import { getCurrentQuarter, getQuarter } from '@/lib/quarterlyRevenue';

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

interface UseQuarterlyRevenueReturn {
  currentQuarterData: QuarterlyRevenueData | null;
  previousQuartersData: QuarterlyRevenueData[];
  yearlyData: Record<number, QuarterlyRevenueData[]>;
  completedJobs: CompletedJob[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch and manage quarterly revenue data for an organization
 * Uses quarterly revenue calculations until quarterly_revenue table is synced
 */
export function useQuarterlyRevenue(organizationId: string | null): UseQuarterlyRevenueReturn {
  const [currentQuarterData, setCurrentQuarterData] = useState<QuarterlyRevenueData | null>(null);
  const [previousQuartersData, setPreviousQuartersData] = useState<QuarterlyRevenueData[]>([]);
  const [yearlyData, setYearlyData] = useState<Record<number, QuarterlyRevenueData[]>>({});
  const [completedJobs, setCompletedJobs] = useState<CompletedJob[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchQuarterlyData = async () => {
    // Placeholder implementation - will calculate from jobs when passed
    setIsLoading(false);
  };

  useEffect(() => {
    fetchQuarterlyData();
  }, [organizationId]);

  return {
    currentQuarterData,
    previousQuartersData,
    yearlyData,
    completedJobs,
    isLoading,
    error,
    refetch: fetchQuarterlyData,
  };
}

/**
 * Hook to calculate quarterly totals from job data
 */
export function useQuarterlyJobRevenue(jobs: Array<{ event_date?: string; income_amount?: number; estimated_cost?: number }>) {
  const [quarterlyTotals, setQuarterlyTotals] = useState<Record<string, QuarterlyRevenueData>>({});

  useEffect(() => {
    const totals: Record<string, QuarterlyRevenueData> = {};

    if (!jobs || jobs.length === 0) {
      setQuarterlyTotals(totals);
      return;
    }

    jobs.forEach((job) => {
      if (!job.event_date) return;

      const date = new Date(job.event_date);
      const quarter = getQuarter(date);
      const year = date.getFullYear();
      const key = `${year}-Q${quarter}`;

      if (!totals[key]) {
        totals[key] = {
          quarter,
          year,
          totalRevenue: 0,
          totalExpenses: 0,
          totalProfit: 0,
          jobCount: 0,
        };
      }

      const income = parseFloat(String(job.income_amount || 0));
      const expenses = parseFloat(String(job.estimated_cost || 0));
      const profit = income - expenses;

      totals[key].totalRevenue += income;
      totals[key].totalExpenses += expenses;
      totals[key].totalProfit += profit;
      totals[key].jobCount += 1;
    });

    setQuarterlyTotals(totals);
  }, [jobs]);

  return quarterlyTotals;
}

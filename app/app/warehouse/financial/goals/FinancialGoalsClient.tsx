'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { supabaseBrowser } from '@/lib/supabaseClient';
import { ArrowLeft, Zap, TrendingUp, Target, Calendar, CheckCircle2, BarChart3 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useLicense } from '@/lib/hooks/useLicense';
import { FinancialDashboard } from '@/components/FinancialDashboard';
import { useQuarterlyRevenue } from '@/lib/hooks/useQuarterlyRevenue';
import GoalScenarios from '@/components/GoalScenarios';
import QuarterDateEditor from '@/components/QuarterDateEditor';
import QuestChain from '@/components/QuestChain';
import GoalTemplates from '@/components/GoalTemplates';
import IndustryBenchmarksComponent from '@/components/IndustryBenchmarks';
import {
  calculateForecast,
  generateScenarios,
  calculatePaceMetrics,
  ForecastResult,
  GoalScenario,
  PaceMetrics,
} from '@/lib/utils/goalForecasting';
import { generateQuestLine, QuestLine } from '@/lib/utils/questSystem';
import { createRewardTracker, RewardTracker } from '@/lib/utils/questRewards';
import { calculateAllRealMetrics } from '@/lib/utils/calculateRealMetrics';

type Quarter = 'Q1' | 'Q2' | 'Q3' | 'Q4';

interface FinancialMetrics {
  totalInventoryValue: number;
  jobsIncome: number;
  jobsLaborCost: number;
  jobsProfit: number;
  completedJobs: number;
  activeJobs: number;
  avgJobValue: number;
  profitMargin: number;
  monthlyTrend: number[];
  costPercentage: number;
  equipmentUtilization: number;
  onTimeDeliveryRate: number;
  jobProfitabilityRate: number;
}

interface GoalsAnalysis {
  quarter: Quarter;
  quarterTarget: number;
  dailyGoal: number;
  weeklyGoal: number;
  analysis: string;
  recommendations: string[];
  projectedOutcome: string;
}

interface LoadingState {
  metrics: boolean;
  analysis: boolean;
}

interface Task {
  id: string;
  title: string;
  status: 'pending' | 'completed';
  due_date?: string;
}

interface CalendarEvent {
  id: string;
  title: string;
  start_at: string;
  income?: number;
}

interface QuarterDates {
  Q1: { startDate: string; endDate: string };
  Q2: { startDate: string; endDate: string };
  Q3: { startDate: string; endDate: string };
  Q4: { startDate: string; endDate: string };
}

export default function FinancialGoalsClient() {
  const router = useRouter();
  const { license, loading: licenseLoading } = useLicense();
  const [currentQuarter, setCurrentQuarter] = useState<Quarter>('Q1');
  const [activeTab, setActiveTab] = useState<'analysis' | 'dashboard' | 'quests' | 'templates' | 'benchmarks'>('analysis');
  const [selectedScenario, setSelectedScenario] = useState<'optimistic' | 'realistic' | 'pessimistic'>('realistic');
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<FinancialMetrics | null>(null);
  const [forecast, setForecast] = useState<ForecastResult | null>(null);
  const [scenarios, setScenarios] = useState<GoalScenario[]>([]);
  const [paceMetrics, setPaceMetrics] = useState<PaceMetrics | null>(null);
  const [goals, setGoals] = useState<Record<Quarter, GoalsAnalysis | null>>({
    Q1: null,
    Q2: null,
    Q3: null,
    Q4: null,
  });
  const [loading, setLoading] = useState<LoadingState>({ metrics: true, analysis: false });
  const [error, setError] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [upcomingJobs, setUpcomingJobs] = useState<CalendarEvent[]>([]);
  const [editingQuarter, setEditingQuarter] = useState<Quarter | null>(null);
  const [showDateEditor, setShowDateEditor] = useState(false);
  const [quarterDates, setQuarterDates] = useState<QuarterDates>({
    Q1: { startDate: '2026-01-01', endDate: '2026-03-31' },
    Q2: { startDate: '2026-04-01', endDate: '2026-06-30' },
    Q3: { startDate: '2026-07-01', endDate: '2026-09-30' },
    Q4: { startDate: '2026-10-01', endDate: '2026-12-31' },
  });

  // Phase 2: Quest System with AI-powered goal progression
  const [questLine, setQuestLine] = useState<QuestLine | null>(null);
  const [rewardTracker, setRewardTracker] = useState<RewardTracker>(createRewardTracker());
  const [templateGoals, setTemplateGoals] = useState<any[]>([]);

  // DEBUG
  console.log('FinancialGoalsClient rendering - license:', license, 'licenseLoading:', licenseLoading, 'organizationId:', organizationId);

  // Get user's organization
  const loadOrganization = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single();

      if (profile?.organization_id) {
        setOrganizationId(profile.organization_id);
      }
    } catch (error) {
      console.error('Error fetching organization:', error);
    }
  };

  const loadTasksAndEvents = async () => {
    try {
      const supabaseBrowserInstance = supabaseBrowser();
      const { data: { user } } = await supabaseBrowserInstance.auth.getUser();

      if (!user) return;

      // Load tasks
      const { data: tasksData } = await (supabaseBrowserInstance as any)
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .order('due_date', { ascending: true })
        .limit(5);

      if (tasksData) setTasks(tasksData);

      // Load upcoming jobs
      const { data: jobsData } = await (supabaseBrowserInstance as any)
        .from('jobs')
        .select('id, title, start_at, income')
        .gte('start_at', new Date().toISOString())
        .order('start_at', { ascending: true })
        .limit(5);

      if (jobsData) setUpcomingJobs(jobsData);
    } catch (err) {
      console.error('Error loading tasks/events:', err);
    }
  };

  // Load quarter dates from localStorage
  const loadQuarterDates = () => {
    try {
      const year = new Date().getFullYear();
      const stored = localStorage.getItem(`quarter-dates-${year}`);
      if (stored) {
        setQuarterDates(JSON.parse(stored));
      }
    } catch (err) {
      console.error('Error loading quarter dates:', err);
    }
  };

  // Save quarter dates to localStorage
  const saveQuarterDates = async (quarter: Quarter, dates: { startDate: string; endDate: string }) => {
    try {
      const updated = {
        ...quarterDates,
        [quarter]: dates,
      };
      const year = new Date().getFullYear();
      localStorage.setItem(`quarter-dates-${year}`, JSON.stringify(updated));
      setQuarterDates(updated);
    } catch (err) {
      console.error('Error saving quarter dates:', err);
      throw new Error('Failed to save quarter dates');
    }
  };

  useEffect(() => {
    loadFinancialMetrics();
    loadTasksAndEvents();
    loadSavedReports();
    loadOrganization();
    loadQuarterDates();
  }, []);

  // Hook for quarterly revenue data
  const { 
    currentQuarterData, 
    previousQuartersData, 
    yearlyData,
    completedJobs,
  } = useQuarterlyRevenue(organizationId || '');

  // Calculate forecast and pace metrics when quarterly data changes
  useEffect(() => {
    try {
      // If we have real metrics, use them to determine realistic targets
      if (metrics && metrics.jobsIncome > 0) {
        // Use average monthly income to set realistic quarterly target
        const monthlyAvg = metrics.monthlyTrend.length > 0 
          ? metrics.monthlyTrend.reduce((a, b) => a + b, 0) / metrics.monthlyTrend.length 
          : metrics.jobsIncome / 3;
        
        const realisticQuarterlyTarget = monthlyAvg * 3;

        // Get quarterly data
        const forecastResult = calculateForecast(0, 0, 0, 0);
        setForecast(forecastResult);

        // Generate scenarios based on actual metrics
        const scenariosList = generateScenarios(
          realisticQuarterlyTarget,
          forecastResult,
          metrics.completedJobs > 0 ? metrics.jobsIncome / metrics.completedJobs : 0,
          metrics.completedJobs > 0 ? metrics.jobsIncome / metrics.completedJobs : 0
        );
        setScenarios(scenariosList);

        // Calculate pace metrics
        const curr = quarterDates[currentQuarter];
        const paceResult = calculatePaceMetrics(
          realisticQuarterlyTarget,
          currentQuarterData?.totalRevenue || 0,
          currentQuarter,
          new Date(),
          new Date(curr.startDate),
          new Date(curr.endDate)
        );
        setPaceMetrics(paceResult);
      } else {
        // Fallback to default values if no metrics yet
        const forecastResult = calculateForecast(0, 0, 0, 0);
        setForecast(forecastResult);

        const scenariosList = generateScenarios(25000, forecastResult, 0, 0);
        setScenarios(scenariosList);

        const curr = quarterDates[currentQuarter];
        const paceResult = calculatePaceMetrics(
          25000,
          0,
          currentQuarter,
          new Date(),
          new Date(curr.startDate),
          new Date(curr.endDate)
        );
        setPaceMetrics(paceResult);
      }

      // Now if we have quarterly history, update with more accurate forecast
      if (yearlyData && Object.keys(yearlyData).length > 0) {
        const year = new Date().getFullYear();
        const yearData = yearlyData[year] || [];
        
        const q1Data = yearData?.find((q: any) => q.quarter === 1);
        const q2Data = yearData?.find((q: any) => q.quarter === 2);
        const q3Data = yearData?.find((q: any) => q.quarter === 3);
        const q4Data = yearData?.find((q: any) => q.quarter === 4);

        const q1Revenue = q1Data?.totalRevenue || 0;
        const q2Revenue = q2Data?.totalRevenue || 0;
        const q3Revenue = q3Data?.totalRevenue || 0;
        const q4Revenue = q4Data?.totalRevenue || 0;

        // Recalculate with real quarterly data
        const forecastWithData = calculateForecast(q1Revenue, q2Revenue, q3Revenue, q4Revenue);
        setForecast(forecastWithData);

        // Use historical performance + current metrics for target
        const avgHistorical = [q1Revenue, q2Revenue, q3Revenue, q4Revenue].filter(q => q > 0).length > 0
          ? [q1Revenue, q2Revenue, q3Revenue, q4Revenue].filter(q => q > 0).reduce((a, b) => a + b, 0) / [q1Revenue, q2Revenue, q3Revenue, q4Revenue].filter(q => q > 0).length
          : 25000;

        const targetRevenue = currentQuarterData?.totalRevenue || avgHistorical || 25000;
        
        const scenariosWithData = generateScenarios(
          targetRevenue,
          forecastWithData,
          q1Revenue,
          q2Revenue
        );
        setScenarios(scenariosWithData);

        const curr = quarterDates[currentQuarter];
        const paceWithData = calculatePaceMetrics(
          targetRevenue,
          currentQuarterData?.totalRevenue || 0,
          currentQuarter,
          new Date(),
          new Date(curr.startDate),
          new Date(curr.endDate)
        );
        setPaceMetrics(paceWithData);
      }
    } catch (err) {
      console.error('Error calculating forecast:', err);
    }
  }, [currentQuarterData, yearlyData, currentQuarter]);

  // Check license tier - Goals is Pro/Enterprise only
  useEffect(() => {
    if (!licenseLoading && license && license.plan !== 'pro' && license.plan !== 'enterprise') {
      router.push('/app');
    }
  }, [license, licenseLoading]);

  const addGoalTask = async (goalText: string, quarterNum: string) => {
    try {
      const supabaseBrowserInstance = supabaseBrowser();
      const { data: { user } } = await supabaseBrowserInstance.auth.getUser();

      if (!user) return;

      const dueDate = new Date();
      const quarterMonths = { Q1: 3, Q2: 6, Q3: 9, Q4: 12 };
      dueDate.setMonth(quarterMonths[quarterNum as Quarter] - 1);
      dueDate.setDate(dueDate.getDate() - 1); // End of quarter

      await (supabaseBrowserInstance as any)
        .from('tasks')
        .insert([
          {
            user_id: user.id,
            title: `[${quarterNum}] ${goalText}`,
            status: 'pending',
            due_date: dueDate.toISOString().split('T')[0],
          },
        ]);

      await loadTasksAndEvents();
    } catch (err) {
      console.error('Error adding task:', err);
    }
  };

  const loadFinancialMetrics = async () => {
    try {
      setLoading(prev => ({ ...prev, metrics: true }));

      const { data: inventoryData } = await (supabase as any)
        .from('inventory_items')
        .select('qty_in_warehouse, unit_value');

      const { data: jobsData } = await (supabase as any)
        .from('jobs')
        .select('income, labor_cost, status, created_at');

      let totalInventoryValue = 0;
      if (inventoryData) {
        totalInventoryValue = inventoryData.reduce((sum: number, item: any) => {
          return sum + ((item.qty_in_warehouse || 0) * (item.unit_value || 0));
        }, 0);
      }

      let jobsIncome = 0;
      let jobsLaborCost = 0;
      let completedJobs = 0;
      let activeJobs = 0;
      const monthlyData: Record<string, number> = {};

      if (jobsData) {
        jobsData.forEach((job: any) => {
          jobsIncome += job.income || 0;
          jobsLaborCost += job.labor_cost || 0;
          if (job.status === 'completed') completedJobs++;
          else if (['in-process', 'on-the-road'].includes(job.status)) activeJobs++;

          // Track monthly trend
          if (job.created_at) {
            const month = new Date(job.created_at).toISOString().slice(0, 7);
            monthlyData[month] = (monthlyData[month] || 0) + (job.income || 0);
          }
        });
      }

      const monthlyTrend = Object.values(monthlyData).slice(-12); // Last 12 months
      const avgJobValue = completedJobs > 0 ? jobsIncome / completedJobs : 0;
      const jobsProfit = jobsIncome - jobsLaborCost;
      const profitMargin = jobsIncome > 0 ? (jobsProfit / jobsIncome) * 100 : 0;
      const costPercentage = jobsIncome > 0 ? (jobsLaborCost / jobsIncome) * 100 : 0;

      //🆕 Calculate real metrics from database data
      const realMetrics = await calculateAllRealMetrics(undefined, 90);

      const newMetrics: FinancialMetrics = {
        totalInventoryValue,
        jobsIncome,
        jobsLaborCost,
        jobsProfit,
        completedJobs,
        activeJobs,
        avgJobValue,
        profitMargin,
        monthlyTrend,
        costPercentage,
        equipmentUtilization: realMetrics.equipmentUtilization,
        onTimeDeliveryRate: realMetrics.onTimeDeliveryRate,
        jobProfitabilityRate: realMetrics.jobProfitabilityRate,
      };

      setMetrics(newMetrics);
      setError(null);
    } catch (err) {
      console.error('Error loading metrics:', err);
      setError('Failed to load financial metrics');
    } finally {
      setLoading(prev => ({ ...prev, metrics: false }));
    }
  };

  const analyzeQuarterGoals = async (quarter: Quarter) => {
    if (!metrics) return;

    try {
      setLoading(prev => ({ ...prev, analysis: true }));

      const avgMonthlyIncome = metrics.monthlyTrend.length > 0 
        ? metrics.monthlyTrend.reduce((a, b) => a + b, 0) / metrics.monthlyTrend.length 
        : 0;

      const prompt = `You are a professional financial advisor for a professional audio equipment rental company called Bright Ops. Analyze our comprehensive financial metrics and create strategic quarterly planning for ${quarter} 2025.

=== AGGREGATE FINANCIAL ANALYSIS ===

Business Performance Metrics:
- Total Inventory Asset Value: $${metrics.totalInventoryValue.toLocaleString('en-US', { maximumFractionDigits: 2 })}
- YTD Total Job Income: $${metrics.jobsIncome.toLocaleString('en-US', { maximumFractionDigits: 2 })}
- YTD Total Labor Costs: $${metrics.jobsLaborCost.toLocaleString('en-US', { maximumFractionDigits: 2 })}
- YTD Net Profit: $${metrics.jobsProfit.toLocaleString('en-US', { maximumFractionDigits: 2 })}
- Profit Margin: ${metrics.profitMargin.toFixed(2)}%
- Labor Cost Ratio: ${metrics.costPercentage.toFixed(2)}%
- Average Job Value: $${metrics.avgJobValue.toLocaleString('en-US', { maximumFractionDigits: 2 })}
- Completed Jobs: ${metrics.completedJobs}
- Active/In-Progress Jobs: ${metrics.activeJobs}
- Average Monthly Revenue: $${avgMonthlyIncome.toLocaleString('en-US', { maximumFractionDigits: 2 })}
- Monthly Trend Data: [${metrics.monthlyTrend.map(m => Math.round(m)).join(', ')}]

Strategic Insights to Consider:
1. Asset Utilization: ${metrics.completedJobs > 0 ? 'High' : 'Moderate'} job completion rate suggests ${metrics.completedJobs > 50 ? 'strong market presence' : 'growth opportunity'}
2. Profitability: ${metrics.profitMargin > 40 ? 'Healthy profit margins' : metrics.profitMargin > 20 ? 'Adequate margins with optimization potential' : 'Margin improvement needed'}
3. Cost Efficiency: Labor costs at ${metrics.costPercentage.toFixed(1)}% of revenue are ${metrics.costPercentage > 60 ? 'high - focus on efficiency' : metrics.costPercentage > 40 ? 'moderate - optimize staffing' : 'well-controlled'}
4. Growth Trajectory: Average job value of $${metrics.avgJobValue.toLocaleString('en-US', { maximumFractionDigits: 0 })} suggests ${metrics.avgJobValue > 5000 ? 'premium service positioning' : 'potential for upselling'}

=== YOUR TASK ===
Based on this comprehensive financial data, create strategic quarterly goals for ${quarter} that:
1. Build on current strengths while addressing weaknesses
2. Consider seasonal trends and historical performance
3. Account for current inventory asset value and utilization
4. Balance growth with sustainable profit margins
5. Address labor cost optimization if needed

Provide a JSON response with this exact structure:
{
  "quarterTarget": <quarterly revenue goal based on monthly trend and growth potential>,
  "dailyGoal": <daily revenue target>,
  "weeklyGoal": <weekly revenue target>,
  "analysis": "<2-3 sentence analysis of financial position and why these targets are strategic>",
  "recommendations": [
    "<strategic recommendation 1: specific action based on aggregate data>",
    "<strategic recommendation 2: addressing cost structure or growth>",
    "<strategic recommendation 3: inventory or asset utilization>",
    "<strategic recommendation 4: market opportunity or competitive positioning>"
  ],
  "projectedOutcome": "<realistic projection of Q${quarter.slice(1)} outcomes based on historical trends and current trajectory>"
}

Be data-driven and specific. Use the aggregate metrics to justify your targets.`;

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: prompt }),
      });

      if (!response.ok) throw new Error('Failed to get AI analysis');

      const data = await response.json();
      let jsonString = data.reply;
      
      // Extract JSON from markdown code blocks if present
      const jsonMatch = jsonString.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonString = jsonMatch[1].trim();
      }
      
      const analysis = JSON.parse(jsonString);

      const goalData = {
        quarter,
        quarterTarget: analysis.quarterTarget,
        dailyGoal: analysis.dailyGoal,
        weeklyGoal: analysis.weeklyGoal,
        analysis: analysis.analysis,
        recommendations: analysis.recommendations,
        projectedOutcome: analysis.projectedOutcome,
      };

      setGoals(prev => ({
        ...prev,
        [quarter]: goalData,
      }));

      // Save report to database
      await saveReport(quarter, goalData);
    } catch (err) {
      console.error('Error analyzing goals:', err);
      setError('Failed to analyze quarterly goals');
    } finally {
      setLoading(prev => ({ ...prev, analysis: false }));
    }
  };

  const saveReport = async (quarter: Quarter, goalData: any) => {
    try {
      const supabaseBrowserInstance = supabaseBrowser();
      const { data: { user } } = await supabaseBrowserInstance.auth.getUser();

      if (!user) return;

      const currentYear = new Date().getFullYear();

      await (supabaseBrowserInstance as any)
        .from('financial_goals_reports')
        .upsert(
          {
            user_id: user.id,
            quarter,
            year: currentYear,
            quarter_target: goalData.quarterTarget,
            daily_goal: goalData.dailyGoal,
            weekly_goal: goalData.weeklyGoal,
            analysis: goalData.analysis,
            recommendations: goalData.recommendations,
            projected_outcome: goalData.projectedOutcome,
            metrics_snapshot: metrics,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,quarter,year' }
        );
    } catch (err) {
      console.error('Error saving report:', err);
    }
  };

  const loadSavedReports = async () => {
    try {
      const supabaseBrowserInstance = supabaseBrowser();
      const { data: { user } } = await supabaseBrowserInstance.auth.getUser();

      if (!user) return;

      const { data: reports } = await (supabaseBrowserInstance as any)
        .from('financial_goals_reports')
        .select('*')
        .eq('user_id', user.id)
        .order('year', { ascending: false })
        .order('quarter', { ascending: false });

      if (reports) {
        // Load current year's reports
        const currentYear = new Date().getFullYear();
        const currentYearReports = reports.filter((r: any) => r.year === currentYear);
        
        currentYearReports.forEach((report: any) => {
          setGoals(prev => ({
            ...prev,
            [report.quarter]: {
              quarter: report.quarter,
              quarterTarget: report.quarter_target,
              dailyGoal: report.daily_goal,
              weeklyGoal: report.weekly_goal,
              analysis: report.analysis,
              recommendations: report.recommendations,
              projectedOutcome: report.projected_outcome,
            },
          }));
        });
      }
    } catch (err) {
      console.error('Error loading saved reports:', err);
    }
  };

  const currentGoal = goals[currentQuarter];

  const quarterColors = {
    Q1: '#FCD34D', // Amber
    Q2: '#FBBF24', // Gold
    Q3: '#F59E0B', // Orange
    Q4: '#D97706', // Deep Gold
  };

  const getQuarterProgress = (quarter: Quarter): number => {
    const now = new Date();
    const dates = quarterDates[quarter];
    
    if (!dates) return 0;
    
    const startDate = new Date(dates.startDate);
    const endDate = new Date(dates.endDate);
    
    if (now < startDate) return 0;
    if (now > endDate) return 100;
    
    const totalMs = endDate.getTime() - startDate.getTime();
    const elapsedMs = now.getTime() - startDate.getTime();
    
    return Math.max(0, Math.min(100, (elapsedMs / totalMs) * 100));
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f3f0' }}>
      {/* Header */}
      <div
        style={{ backgroundColor: '#fff8f0', borderBottom: '2px solid #fcd34d' }}
        className="sticky top-0 z-10"
      >
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-start justify-between">
            <div>
              <button
                onClick={() => router.push('/app/warehouse')}
                className="flex items-center gap-2 mb-4"
                style={{ color: '#d97706' }}
              >
                <ArrowLeft size={20} />
                <span className="font-medium">Back to Warehouse</span>
              </button>
              <h1 style={{ color: '#b45309' }} className="text-4xl font-bold">
                Financial Goals
              </h1>
              <p style={{ color: '#a16207' }} className="mt-2 font-medium">
                AI-Powered Strategic Planning • Professional Financial Analysis
              </p>
              {/* Navigation Links */}
              <div style={{ marginTop: '1rem', display: 'flex', gap: '2rem' }}>
                <button
                  onClick={() => setActiveTab('analysis')}
                  style={{
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    color: activeTab === 'analysis' ? '#fbbf24' : '#999999',
                    textDecoration: 'none',
                    paddingBottom: '0.25rem',
                    borderBottom: activeTab === 'analysis' ? '2px solid #fbbf24' : 'none',
                    background: 'none',
                    borderTop: 'none',
                    borderRight: 'none',
                    borderLeft: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (activeTab !== 'analysis') {
                      (e.currentTarget as HTMLElement).style.color = '#d97706';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (activeTab !== 'analysis') {
                      (e.currentTarget as HTMLElement).style.color = '#999999';
                    }
                  }}
                >
                  Analysis
                </button>
                <button
                  onClick={() => setActiveTab('dashboard')}
                  style={{
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    color: activeTab === 'dashboard' ? '#fbbf24' : '#999999',
                    textDecoration: 'none',
                    paddingBottom: '0.25rem',
                    borderBottom: activeTab === 'dashboard' ? '2px solid #fbbf24' : 'none',
                    background: 'none',
                    borderTop: 'none',
                    borderRight: 'none',
                    borderLeft: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (activeTab !== 'dashboard') {
                      (e.currentTarget as HTMLElement).style.color = '#d97706';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (activeTab !== 'dashboard') {
                      (e.currentTarget as HTMLElement).style.color = '#999999';
                    }
                  }}
                >
                  Financial Dashboard
                </button>
                <button
                  onClick={() => setActiveTab('quests')}
                  style={{
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    color: activeTab === 'quests' ? '#fbbf24' : '#999999',
                    textDecoration: 'none',
                    paddingBottom: '0.25rem',
                    borderBottom: activeTab === 'quests' ? '2px solid #fbbf24' : 'none',
                    background: 'none',
                    borderTop: 'none',
                    borderRight: 'none',
                    borderLeft: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (activeTab !== 'quests') {
                      (e.currentTarget as HTMLElement).style.color = '#d97706';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (activeTab !== 'quests') {
                      (e.currentTarget as HTMLElement).style.color = '#999999';
                    }
                  }}
                >
                  Quests 🎮
                </button>
                <button
                  onClick={() => setActiveTab('templates')}
                  style={{
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    color: activeTab === 'templates' ? '#fbbf24' : '#999999',
                    textDecoration: 'none',
                    paddingBottom: '0.25rem',
                    borderBottom: activeTab === 'templates' ? '2px solid #fbbf24' : 'none',
                    background: 'none',
                    borderTop: 'none',
                    borderRight: 'none',
                    borderLeft: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (activeTab !== 'templates') {
                      (e.currentTarget as HTMLElement).style.color = '#d97706';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (activeTab !== 'templates') {
                      (e.currentTarget as HTMLElement).style.color = '#999999';
                    }
                  }}
                >
                  Templates
                </button>
                <button
                  onClick={() => setActiveTab('benchmarks')}
                  style={{
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    color: activeTab === 'benchmarks' ? '#fbbf24' : '#999999',
                    textDecoration: 'none',
                    paddingBottom: '0.25rem',
                    borderBottom: activeTab === 'benchmarks' ? '2px solid #fbbf24' : 'none',
                    background: 'none',
                    borderTop: 'none',
                    borderRight: 'none',
                    borderLeft: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (activeTab !== 'benchmarks') {
                      (e.currentTarget as HTMLElement).style.color = '#d97706';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (activeTab !== 'benchmarks') {
                      (e.currentTarget as HTMLElement).style.color = '#999999';
                    }
                  }}
                >
                  Benchmarks
                </button>
                <a
                  href="/app/warehouse/financial/goals/saved"
                  style={{
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    color: '#999999',
                    textDecoration: 'none',
                    paddingBottom: '0.25rem',
                    transition: 'all 0.3s ease',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.color = '#d97706';
                    (e.currentTarget as HTMLElement).style.borderBottom = '2px solid #d97706';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.color = '#999999';
                    (e.currentTarget as HTMLElement).style.borderBottom = 'none';
                  }}
                >
                  Saved Reports
                </a>
              </div>
            </div>
            <div className="text-right">
              <div style={{ fontSize: '2.5rem' }}>💎</div>
              <div style={{ color: '#b45309' }} className="text-sm font-semibold mt-1">
                Strategic Planning
              </div>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div
          style={{ backgroundColor: '#fee2e2', borderLeft: '4px solid #dc2626' }}
          className="mx-6 mt-6 p-4 rounded-lg text-red-700"
        >
          {error}
        </div>
      )}

      <div className="max-w-7xl mx-auto p-6">
        {/* Analysis View */}
        {activeTab === 'analysis' && (
          <>
            {/* Quarter Tabs with Visual Progress */}
            <div
              style={{ backgroundColor: 'white', borderBottom: '3px solid #fcd34d' }}
              className="rounded-t-lg overflow-hidden mb-6"
            >
              <div className="flex">
                {(['Q1', 'Q2', 'Q3', 'Q4'] as Quarter[]).map(quarter => (
                  <button
                    key={quarter}
                    onClick={() => setCurrentQuarter(quarter)}
                    onDoubleClick={() => {
                      console.log('Double-clicked quarter:', quarter);
                      setEditingQuarter(quarter);
                      setShowDateEditor(true);
                      console.log('State set - editingQuarter:', quarter, 'showDateEditor: true');
                    }}
                    title="Double-click to edit dates"
                    className="flex-1 px-4 py-4 font-bold transition relative group hover:bg-gray-50"
                    style={{
                      backgroundColor: currentQuarter === quarter ? '#fef3c7' : 'transparent',
                      color: currentQuarter === quarter ? '#b45309' : '#78716c',
                      borderBottom: currentQuarter === quarter ? '3px solid #fcd34d' : '0',
                    }}
                  >
                    <div className="text-lg mb-2">{quarter}</div>
                    <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                      <div
                        suppressHydrationWarning
                        style={{
                          width: `${getQuarterProgress(quarter)}%`,
                          backgroundColor: '#fcd34d',
                          transition: 'width 0.3s ease',
                        }}
                        className="h-full"
                      />
                    </div>
                    <div style={{ color: '#a16207' }} className="text-xs mt-1">
                      {Math.round(getQuarterProgress(quarter))}% complete
                    </div>
                    <div style={{ color: '#a16207' }} className="text-xs mt-2 opacity-75">
                      {new Date(quarterDates[quarter].startDate).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}{' '}
                      -{' '}
                      {new Date(quarterDates[quarter].endDate).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </div>
                  </button>
                ))}
              </div>
            </div>

        {/* Loading State */}
        {loading.metrics && (
          <div
            style={{ backgroundColor: 'white', borderLeft: '4px solid #fcd34d' }}
            className="rounded-lg shadow-lg p-12 text-center"
          >
            <div className="animate-pulse">
              <div style={{ color: '#b45309' }} className="text-lg font-semibold">
                Loading financial data...
              </div>
            </div>
          </div>
        )}

        {/* AI Forecast & Scenarios - Always Show */}
        {forecast && scenarios && paceMetrics && (
          <div className="mb-6">
            <GoalScenarios
              forecast={forecast}
              scenarios={scenarios}
              selectedScenario={selectedScenario}
              onSelectScenario={setSelectedScenario}
              paceMetrics={paceMetrics}
            />
          </div>
        )}

        {/* Main Content - Inside Analysis Tab */}
        {!loading.metrics && metrics && (
          <>
            {/* Generate Analysis Button or Goals Display */}
            {!currentGoal ? (
              <div
                style={{ backgroundColor: '#fef3c7', borderLeft: '4px solid #fbbf24' }}
                className="rounded-lg p-8"
              >
                <h3 style={{ color: '#b45309' }} className="text-2xl font-bold mb-3">
                  {currentQuarter} Goals Not Yet Generated
                </h3>
                <p style={{ color: '#a16207' }} className="mb-6 text-base">
                  Let our professional financial advisor analyze your metrics and create strategic goals for this
                  quarter.
                </p>
                <button
                  onClick={() => analyzeQuarterGoals(currentQuarter)}
                  disabled={loading.analysis}
                  style={{
                    backgroundColor: loading.analysis ? '#d1d5db' : '#f59e0b',
                    color: 'white',
                  }}
                  className="inline-flex items-center gap-2 font-bold py-3 px-8 rounded-lg transition hover:shadow-lg"
                >
                  <Zap size={22} />
                  {loading.analysis ? 'Analyzing...' : `Generate ${currentQuarter} Goals`}
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Key Financial Targets */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Quarterly Target */}
                  <div
                    style={{
                      backgroundColor: 'white',
                      borderTop: `4px solid ${quarterColors[currentQuarter]}`,
                      boxShadow: '0 4px 15px rgba(245, 158, 11, 0.1)',
                    }}
                    className="rounded-lg p-6"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <Target size={20} style={{ color: '#d97706' }} />
                      <label style={{ color: '#8b5cf6' }} className="text-sm font-bold">
                        QUARTERLY TARGET
                      </label>
                    </div>
                    <div style={{ color: '#b45309' }} className="text-4xl font-black">
                      ${currentGoal.quarterTarget.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                    </div>
                    <div
                      style={{ color: '#a16207' }}
                      className="text-xs mt-3 font-medium flex items-center gap-1"
                    >
                      <span>↑</span> Revenue Goal
                    </div>
                  </div>

                  {/* Weekly Goal */}
                  <div
                    style={{
                      backgroundColor: 'white',
                      borderTop: `4px solid ${quarterColors[currentQuarter]}`,
                      boxShadow: '0 4px 15px rgba(245, 158, 11, 0.1)',
                    }}
                    className="rounded-lg p-6"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <Calendar size={20} style={{ color: '#d97706' }} />
                      <label style={{ color: '#0891b2' }} className="text-sm font-bold">
                        WEEKLY TARGET
                      </label>
                    </div>
                    <div style={{ color: '#0891b2' }} className="text-4xl font-black">
                      ${currentGoal.weeklyGoal.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                    </div>
                    <div
                      style={{ color: '#0e7490' }}
                      className="text-xs mt-3 font-medium flex items-center gap-1"
                    >
                      <span>📊</span> Per Week
                    </div>
                  </div>

                  {/* Daily Goal */}
                  <div
                    style={{
                      backgroundColor: 'white',
                      borderTop: `4px solid ${quarterColors[currentQuarter]}`,
                      boxShadow: '0 4px 15px rgba(245, 158, 11, 0.1)',
                    }}
                    className="rounded-lg p-6"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <CheckCircle2 size={20} style={{ color: '#d97706' }} />
                      <label style={{ color: '#059669' }} className="text-sm font-bold">
                        DAILY TARGET
                      </label>
                    </div>
                    <div style={{ color: '#059669' }} className="text-4xl font-black">
                      ${currentGoal.dailyGoal.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                    </div>
                    <div
                      style={{ color: '#047857' }}
                      className="text-xs mt-3 font-medium flex items-center gap-1"
                    >
                      <span>🎯</span> Daily
                    </div>
                  </div>
                </div>

                {/* Aggregate Financial Metrics Dashboard */}
                <div
                  style={{ backgroundColor: 'white', boxShadow: '0 4px 15px rgba(245, 158, 11, 0.1)' }}
                  className="rounded-lg p-8"
                >
                  <h3 style={{ color: '#b45309' }} className="text-2xl font-bold mb-6">
                    📊 Business Aggregate Metrics
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {/* Profit Margin */}
                    <div style={{ backgroundColor: '#fef3c7', borderLeft: '3px solid #fbbf24' }} className="p-4 rounded">
                      <p style={{ color: '#a16207' }} className="text-xs font-bold">
                        PROFIT MARGIN
                      </p>
                      <p style={{ color: '#b45309' }} className="text-2xl font-black mt-1">
                        {metrics.profitMargin.toFixed(1)}%
                      </p>
                    </div>

                    {/* Labor Cost Ratio */}
                    <div style={{ backgroundColor: '#fef3c7', borderLeft: '3px solid #fbbf24' }} className="p-4 rounded">
                      <p style={{ color: '#a16207' }} className="text-xs font-bold">
                        LABOR COST %
                      </p>
                      <p style={{ color: '#b45309' }} className="text-2xl font-black mt-1">
                        {metrics.costPercentage.toFixed(1)}%
                      </p>
                    </div>

                    {/* Avg Job Value */}
                    <div style={{ backgroundColor: '#dbeafe', borderLeft: '3px solid #0891b2' }} className="p-4 rounded">
                      <p style={{ color: '#0e7490' }} className="text-xs font-bold">
                        AVG JOB VALUE
                      </p>
                      <p style={{ color: '#0891b2' }} className="text-2xl font-black mt-1">
                        ${(metrics.avgJobValue / 1000).toFixed(1)}K
                      </p>
                    </div>

                    {/* Inventory Asset */}
                    <div style={{ backgroundColor: '#dcfce7', borderLeft: '3px solid #059669' }} className="p-4 rounded">
                      <p style={{ color: '#047857' }} className="text-xs font-bold">
                        ASSET VALUE
                      </p>
                      <p style={{ color: '#059669' }} className="text-2xl font-black mt-1">
                        ${(metrics.totalInventoryValue / 1000).toFixed(0)}K
                      </p>
                    </div>
                  </div>

                  {/* Trend & Status Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                    <div style={{ backgroundColor: '#f5f3f0' }} className="p-4 rounded">
                      <p style={{ color: '#a16207' }} className="text-xs font-bold">
                        TOTAL JOB INCOME
                      </p>
                      <p style={{ color: '#b45309' }} className="text-xl font-black mt-2">
                        ${metrics.jobsIncome.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                      </p>
                      <p style={{ color: '#a16207' }} className="text-xs mt-2">
                        {metrics.completedJobs} completed jobs
                      </p>
                    </div>

                    <div style={{ backgroundColor: '#f5f3f0' }} className="p-4 rounded">
                      <p style={{ color: '#a16207' }} className="text-xs font-bold">
                        TOTAL NET PROFIT
                      </p>
                      <p style={{ color: '#b45309' }} className="text-xl font-black mt-2">
                        ${metrics.jobsProfit.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                      </p>
                      <p style={{ color: '#a16207' }} className="text-xs mt-2">
                        Margin: {metrics.profitMargin.toFixed(1)}%
                      </p>
                    </div>

                    <div style={{ backgroundColor: '#f5f3f0' }} className="p-4 rounded">
                      <p style={{ color: '#a16207' }} className="text-xs font-bold">
                        BUSINESS STATUS
                      </p>
                      <p style={{ color: '#b45309' }} className="text-sm font-black mt-2">
                        {metrics.activeJobs > 0 ? '🚀 Active' : '📊 Planning'}
                      </p>
                      <p style={{ color: '#a16207' }} className="text-xs mt-2">
                        {metrics.activeJobs} jobs in progress
                      </p>
                    </div>
                  </div>
                </div>

                {/* Labor Cost Analysis Graph */}
                <div
                  style={{ backgroundColor: 'white', boxShadow: '0 4px 15px rgba(245, 158, 11, 0.1)' }}
                  className="rounded-lg p-8"
                >
                  <h3 style={{ color: '#b45309' }} className="text-2xl font-bold mb-6 flex items-center gap-3">
                    <BarChart3 size={28} style={{ color: '#fbbf24' }} />
                    Labor Cost vs Income Analysis
                  </h3>

                  {/* Chart Description */}
                  <div
                    style={{
                      backgroundColor: '#fef3c7',
                      borderLeft: '4px solid #fbbf24',
                    }}
                    className="p-4 rounded mb-6"
                  >
                    <p style={{ color: '#78716c' }} className="text-sm">
                      <strong>Healthy Margin Benchmarks:</strong> Labor should be 30-40% of income (green zone).
                      Current ratio: <strong>{metrics.costPercentage.toFixed(1)}%</strong> —{' '}
                      {metrics.costPercentage < 30
                        ? '✅ Excellent efficiency'
                        : metrics.costPercentage < 40
                          ? '✅ Healthy range'
                          : metrics.costPercentage < 50
                            ? '⚠️ Monitor carefully'
                            : '🔴 Needs optimization'}
                    </p>
                  </div>

                  {/* Visual Bar Chart */}
                  <div className="space-y-6">
                    {/* Income Bar */}
                    <div>
                      <div className="flex justify-between mb-2">
                        <span style={{ color: '#b45309' }} className="font-bold text-sm">
                          Total Job Income
                        </span>
                        <span style={{ color: '#b45309' }} className="font-bold text-sm">
                          ${metrics.jobsIncome.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                        </span>
                      </div>
                      <div
                        style={{
                          backgroundColor: '#fbbf24',
                          height: '40px',
                          borderRadius: '8px',
                          position: 'relative',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            backgroundColor: '#fcd34d',
                            height: '100%',
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#b45309',
                            fontWeight: 'bold',
                            fontSize: '14px',
                          }}
                        >
                          100% Income
                        </div>
                      </div>
                    </div>

                    {/* Labor Cost Bar */}
                    <div>
                      <div className="flex justify-between mb-2">
                        <span style={{ color: '#b45309' }} className="font-bold text-sm">
                          Labor Costs
                        </span>
                        <span style={{ color: '#b45309' }} className="font-bold text-sm">
                          ${metrics.jobsLaborCost.toLocaleString('en-US', { maximumFractionDigits: 0 })} ({metrics.costPercentage.toFixed(1)}%)
                        </span>
                      </div>
                      <div
                        style={{
                          backgroundColor: '#e5e7eb',
                          height: '40px',
                          borderRadius: '8px',
                          position: 'relative',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            backgroundColor:
                              metrics.costPercentage < 30
                                ? '#10b981' // Green
                                : metrics.costPercentage < 40
                                  ? '#84cc16' // Lime
                                  : metrics.costPercentage < 50
                                    ? '#f59e0b' // Amber
                                    : '#ef4444', // Red
                            height: '100%',
                            width: `${Math.min(metrics.costPercentage, 100)}%`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontWeight: 'bold',
                            fontSize: '14px',
                            transition: 'width 0.5s ease',
                          }}
                        >
                          {metrics.costPercentage.toFixed(1)}%
                        </div>
                      </div>
                    </div>

                    {/* Profit Bar */}
                    <div>
                      <div className="flex justify-between mb-2">
                        <span style={{ color: '#b45309' }} className="font-bold text-sm">
                          Net Profit (Remaining)
                        </span>
                        <span style={{ color: '#b45309' }} className="font-bold text-sm">
                          ${metrics.jobsProfit.toLocaleString('en-US', { maximumFractionDigits: 0 })} ({metrics.profitMargin.toFixed(1)}%)
                        </span>
                      </div>
                      <div
                        style={{
                          backgroundColor: '#e5e7eb',
                          height: '40px',
                          borderRadius: '8px',
                          position: 'relative',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            backgroundColor: '#10b981',
                            height: '100%',
                            width: `${Math.min(metrics.profitMargin, 100)}%`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontWeight: 'bold',
                            fontSize: '14px',
                            transition: 'width 0.5s ease',
                          }}
                        >
                          {metrics.profitMargin.toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Healthy Margin Benchmark */}
                  <div className="mt-8 pt-6 border-t border-gray-200">
                    <h4 style={{ color: '#b45309' }} className="font-bold mb-4">
                      Healthy Margin Benchmarks (Industry Standard)
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Excellent */}
                      <div style={{ backgroundColor: '#dcfce7', borderLeft: '4px solid #10b981' }} className="p-4 rounded">
                        <p style={{ color: '#047857' }} className="font-bold text-sm">
                          ✅ Excellent
                        </p>
                        <p style={{ color: '#065f46' }} className="text-xs mt-2">
                          Labor: &lt;30% | Profit: &gt;70%
                        </p>
                        <p style={{ color: '#047857' }} className="text-xs mt-1 font-semibold">
                          Max efficiency
                        </p>
                      </div>

                      {/* Healthy */}
                      <div style={{ backgroundColor: '#fef3c7', borderLeft: '4px solid #fbbf24' }} className="p-4 rounded">
                        <p style={{ color: '#b45309' }} className="font-bold text-sm">
                          ✅ Healthy
                        </p>
                        <p style={{ color: '#a16207' }} className="text-xs mt-2">
                          Labor: 30-40% | Profit: 60-70%
                        </p>
                        <p style={{ color: '#b45309' }} className="text-xs mt-1 font-semibold">
                          Sustainable
                        </p>
                      </div>

                      {/* Monitor */}
                      <div style={{ backgroundColor: '#fecaca', borderLeft: '4px solid #ef4444' }} className="p-4 rounded">
                        <p style={{ color: '#b91c1c' }} className="font-bold text-sm">
                          ⚠️ Needs Review
                        </p>
                        <p style={{ color: '#7f1d1d' }} className="text-xs mt-2">
                          Labor: &gt;40% | Profit: &lt;60%
                        </p>
                        <p style={{ color: '#b91c1c' }} className="text-xs mt-1 font-semibold">
                          Optimize staffing
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Strategic Insight */}
                  <div
                    style={{
                      backgroundColor: '#f0f9ff',
                      borderLeft: '4px solid #0891b2',
                    }}
                    className="rounded-lg p-4 mt-6"
                  >
                    <p style={{ color: '#0c4a6e' }} className="text-sm">
                      <strong>Strategic Insight:</strong> Your labor cost ratio of{' '}
                      <span style={{ color: '#0891b2' }} className="font-bold">
                        {metrics.costPercentage.toFixed(1)}%
                      </span>{' '}
                      means for every $100 of income, ${metrics.costPercentage.toFixed(2)} goes to labor costs and $
                      {metrics.profitMargin.toFixed(2)} is retained as profit. To reach healthy margins (60-70% profit),
                      focus on {metrics.costPercentage > 40 ? 'reducing labor costs through efficiency' : 'maintaining current practices'}.
                    </p>
                  </div>
                </div>

                {/* Financial Analysis & Insights */}
                <div
                  style={{ backgroundColor: 'white', boxShadow: '0 4px 15px rgba(245, 158, 11, 0.1)' }}
                  className="rounded-lg p-8"
                >
                  <h3 style={{ color: '#b45309' }} className="text-2xl font-bold mb-4 flex items-center gap-3">
                    <TrendingUp size={28} style={{ color: '#fbbf24' }} />
                    Financial Analysis
                  </h3>
                  <p style={{ color: '#78716c' }} className="text-lg leading-relaxed">
                    {currentGoal.analysis}
                  </p>
                </div>

                {/* Projected Outcome */}
                <div
                  style={{
                    backgroundColor: '#f0f9ff',
                    borderLeft: '4px solid #0891b2',
                    boxShadow: '0 4px 15px rgba(8, 145, 178, 0.1)',
                  }}
                  className="rounded-lg p-8"
                >
                  <h3 style={{ color: '#0e7490' }} className="text-xl font-bold mb-3">
                    Projected {currentQuarter} Outcome
                  </h3>
                  <p style={{ color: '#0c4a6e' }} className="text-base leading-relaxed">
                    {currentGoal.projectedOutcome}
                  </p>
                </div>

                {/* Strategic Recommendations */}
                <div
                  style={{ backgroundColor: 'white', boxShadow: '0 4px 15px rgba(245, 158, 11, 0.1)' }}
                  className="rounded-lg p-8"
                >
                  <h3 style={{ color: '#b45309' }} className="text-2xl font-bold mb-6">
                    Strategic Recommendations
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {currentGoal.recommendations.map((rec, idx) => (
                      <div
                        key={idx}
                        style={{
                          backgroundColor: '#fef3c7',
                          borderLeft: '3px solid #fbbf24',
                        }}
                        className="p-4 rounded-lg"
                      >
                        <div className="flex gap-3">
                          <span
                            style={{
                              backgroundColor: '#fbbf24',
                              color: 'white',
                            }}
                            className="w-8 h-8 rounded-full flex items-center justify-center font-bold flex-shrink-0 text-sm"
                          >
                            {idx + 1}
                          </span>
                          <span style={{ color: '#78716c' }} className="text-sm font-medium leading-relaxed">
                            {rec}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Connected Calendar & Tasks */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Upcoming Jobs */}
                  <div
                    style={{ backgroundColor: 'white', boxShadow: '0 4px 15px rgba(245, 158, 11, 0.1)' }}
                    className="rounded-lg p-6"
                  >
                    <h4 style={{ color: '#b45309' }} className="font-bold text-lg mb-4 flex items-center gap-2">
                      <Calendar size={20} style={{ color: '#fbbf24' }} />
                      Upcoming Jobs
                    </h4>
                    <div className="space-y-2">
                      {upcomingJobs.length > 0 ? (
                        upcomingJobs.map(job => (
                          <div
                            key={job.id}
                            style={{
                              backgroundColor: '#fef3c7',
                              borderLeft: '3px solid #fbbf24',
                            }}
                            className="p-3 rounded"
                          >
                            <p style={{ color: '#78716c' }} className="font-medium text-sm">
                              {job.title}
                            </p>
                            <p style={{ color: '#a16207' }} className="text-xs mt-1">
                              {new Date(job.start_at).toLocaleDateString()} • ${job.income?.toLocaleString() || 'TBD'}
                            </p>
                          </div>
                        ))
                      ) : (
                        <p style={{ color: '#a16207' }} className="text-sm">
                          No upcoming jobs scheduled
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Todo Tasks */}
                  <div
                    style={{ backgroundColor: 'white', boxShadow: '0 4px 15px rgba(245, 158, 11, 0.1)' }}
                    className="rounded-lg p-6"
                  >
                    <h4 style={{ color: '#b45309' }} className="font-bold text-lg mb-4 flex items-center gap-2">
                      <CheckCircle2 size={20} style={{ color: '#fbbf24' }} />
                      Task List
                    </h4>
                    <div className="space-y-2">
                      {tasks.filter(t => t.status === 'pending').length > 0 ? (
                        tasks
                          .filter(t => t.status === 'pending')
                          .map(task => (
                            <div
                              key={task.id}
                              style={{
                                backgroundColor: '#fef3c7',
                                borderLeft: '3px solid #fbbf24',
                              }}
                              className="p-3 rounded"
                            >
                              <p style={{ color: '#78716c' }} className="font-medium text-sm">
                                {task.title}
                              </p>
                              <p style={{ color: '#a16207' }} className="text-xs mt-1">
                                {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'No due date'}
                              </p>
                            </div>
                          ))
                      ) : (
                        <p style={{ color: '#a16207' }} className="text-sm">
                          No pending tasks
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() =>
                        addGoalTask(`Focus on ${currentGoal.recommendations[0].substring(0, 50)}...`, currentQuarter)
                      }
                      style={{ backgroundColor: '#fbbf24', color: '#78210f' }}
                      className="w-full mt-4 py-2 rounded font-bold text-sm hover:shadow-lg transition"
                    >
                      + Add Goal to Tasks
                    </button>
                  </div>
                </div>

                {/* Refresh Button */}
                <button
                  onClick={() => analyzeQuarterGoals(currentQuarter)}
                  disabled={loading.analysis}
                  style={{
                    backgroundColor: loading.analysis ? '#d1d5db' : '#f59e0b',
                    color: 'white',
                  }}
                  className="w-full font-bold py-3 px-4 rounded-lg transition hover:shadow-lg"
                >
                  {loading.analysis ? 'Refreshing Analysis...' : 'Refresh Analysis'}
                </button>
              </div>
            )}
          </>
        )}
        </>
        )}

        {/* Financial Dashboard View */}
        {activeTab === 'dashboard' && organizationId && (
          <div style={{ backgroundColor: 'white', borderRadius: '8px', padding: '24px' }}>
            <FinancialDashboard
              organizationId={organizationId}
              currentQuarterData={currentQuarterData}
              previousQuartersData={previousQuartersData}
              yearlyData={yearlyData}
              completedJobs={completedJobs || []}
            />
          </div>
        )}

        {/* Quest Chain View */}
        {activeTab === 'quests' && (
          <QuestChain
            questLine={questLine}
            metrics={metrics}
            onQuestGenerate={() => {
              const newQuestLine = generateQuestLine(
                'Quarterly Revenue Goal',
                75000,
                currentQuarter,
                metrics
              );
              setQuestLine(newQuestLine);
            }}
          />
        )}

        {/* Goal Templates View */}
        {activeTab === 'templates' && (
          <GoalTemplates
            quarter={currentQuarter}
            onTemplateApply={(goals) => {
              setTemplateGoals(goals);
            }}
          />
        )}

        {/* Industry Benchmarks View */}
        {activeTab === 'benchmarks' && metrics && (
          <IndustryBenchmarksComponent metrics={metrics} />
        )}

        {/* Quarter Date Editor Modal */}
        {(() => {
          const shouldShow = showDateEditor && editingQuarter;
          console.log('Modal render check - showDateEditor:', showDateEditor, 'editingQuarter:', editingQuarter, 'should show:', shouldShow);
          return shouldShow ? (
            <QuarterDateEditor
              quarter={editingQuarter}
              currentDates={quarterDates[editingQuarter]}
              onSave={(dates) => saveQuarterDates(editingQuarter, dates)}
              onClose={() => {
                setShowDateEditor(false);
                setEditingQuarter(null);
              }}
            />
          ) : null;
        })()}
      </div>
    </div>
  );
}

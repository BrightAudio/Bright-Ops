/**
 * AI Forecasting for Financial Goals
 * Predicts Q3/Q4 revenue based on Q1/Q2 trends
 */

export interface ForecastResult {
  q3Forecast: number;
  q4Forecast: number;
  yearlyForecast: number;
  growthRate: number;
  confidence: number; // 0-100%
  trendDirection: 'up' | 'down' | 'stable';
  recommendations: string[];
}

export interface GoalScenario {
  name: 'optimistic' | 'realistic' | 'pessimistic';
  q3Target: number;
  q4Target: number;
  yearlyTotal: number;
  achievementProbability: number;
  actionItems: string[];
}

/**
 * Calculate forecast based on historical quarterly revenue
 */
export function calculateForecast(
  q1Revenue: number,
  q2Revenue: number,
  q3Revenue?: number,
  q4Revenue?: number
): ForecastResult {
  const quarters = [q1Revenue, q2Revenue, q3Revenue || 0, q4Revenue || 0].filter(
    (q) => q > 0
  );

  // Calculate growth rate between consecutive quarters
  const growthRates = [];
  for (let i = 1; i < quarters.length; i++) {
    if (quarters[i - 1] > 0) {
      growthRates.push((quarters[i] - quarters[i - 1]) / quarters[i - 1]);
    }
  }

  const avgGrowthRate =
    growthRates.length > 0 ? growthRates.reduce((a, b) => a + b) / growthRates.length : 0;

  // Determine trend direction
  let trendDirection: 'up' | 'down' | 'stable' = 'stable';
  if (avgGrowthRate > 0.05) trendDirection = 'up';
  else if (avgGrowthRate < -0.05) trendDirection = 'down';

  // Calculate confidence based on consistency
  const variance = Math.sqrt(
    growthRates.reduce((sum, rate) => sum + Math.pow(rate - avgGrowthRate, 2), 0) /
      Math.max(growthRates.length, 1)
  );
  const confidence = Math.max(30, 100 - variance * 100); // 30-100%

  // Forecast future quarters
  const lastRevenue = quarters[quarters.length - 1] || q2Revenue;
  const q3Forecast = Math.round(lastRevenue * (1 + avgGrowthRate));
  const q4Forecast = Math.round(q3Forecast * (1 + avgGrowthRate * 0.9)); // Slight decay in growth

  const q1q2Total = q1Revenue + q2Revenue;
  const yearlyForecast = q1q2Total + q3Forecast + q4Forecast;

  // Generate recommendations based on trends
  const recommendations: string[] = [];
  if (trendDirection === 'up') {
    recommendations.push('🚀 Strong growth trend! Consider scaling operations.');
    recommendations.push('📈 Leverage momentum to expand job offerings.');
  } else if (trendDirection === 'down') {
    recommendations.push('⚠️ Revenue declining. Review pricing and marketing.');
    recommendations.push('🎯 Focus on high-margin jobs to maintain profitability.');
  } else {
    recommendations.push('➡️ Revenue stable. Focus on efficiency improvements.');
  }

  if (q3Forecast > q1q2Total * 0.5) {
    recommendations.push('💰 H2 revenue strong - maximize resource allocation.');
  } else {
    recommendations.push('🤔 H2 revenue softer - prepare cost management.');
  }

  return {
    q3Forecast,
    q4Forecast,
    yearlyForecast,
    growthRate: avgGrowthRate,
    confidence: Math.round(confidence),
    trendDirection,
    recommendations,
  };
}

/**
 * Generate multiple scenarios based on forecast
 */
export function generateScenarios(
  currentTarget: number,
  forecast: ForecastResult,
  q1ActualRevenue: number,
  q2ActualRevenue: number
): GoalScenario[] {
  const yieldFactor = 0.5; // Historical can deliver ~50% of forecast

  return [
    {
      name: 'optimistic',
      q3Target: Math.round(forecast.q3Forecast * 1.15),
      q4Target: Math.round(forecast.q4Forecast * 1.15),
      yearlyTotal: Math.round(forecast.yearlyForecast * 1.15),
      achievementProbability: Math.max(20, forecast.confidence - 30),
      actionItems: [
        'Aggressive marketing & business development',
        'Increase pricing by 10-15%',
        'Add 2-3 new job categories',
        'Expand team capacity',
      ],
    },
    {
      name: 'realistic',
      q3Target: Math.round(forecast.q3Forecast * yieldFactor),
      q4Target: Math.round(forecast.q4Forecast * yieldFactor),
      yearlyTotal: Math.round(forecast.yearlyForecast * yieldFactor),
      achievementProbability: forecast.confidence,
      actionItems: [
        'Maintain current marketing efforts',
        'Focus on customer retention',
        'Optimize existing job offerings',
        'Steady team growth',
      ],
    },
    {
      name: 'pessimistic',
      q3Target: Math.round(forecast.q3Forecast * yieldFactor * 0.8),
      q4Target: Math.round(forecast.q4Forecast * yieldFactor * 0.8),
      yearlyTotal: Math.round(forecast.yearlyForecast * yieldFactor * 0.8),
      achievementProbability: Math.min(25, Math.max(10, forecast.confidence - 50)),
      actionItems: [
        'Cost reduction initiatives',
        'Focus on high-margin work only',
        'Defer major expenses',
        'Maintain core team only',
      ],
    },
  ];
}

/**
 * Calculate real-time goal pace tracking
 */
export interface PaceMetrics {
  dayOfQuarter: number;
  daysInQuarter: number;
  percentOfQuarterComplete: number;
  targetPaceRequired: number;
  currentPace: number;
  variance: number; // positive = ahead of pace, negative = behind
  onTrack: boolean;
  daysRemaining: number;
  requiredDailyRate: number;
  alert?: string;
}

export function calculatePaceMetrics(
  targetRevenue: number,
  currentRevenue: number,
  quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4',
  today: Date = new Date(),
  quarterStart?: Date,
  quarterEnd?: Date
): PaceMetrics {
  // Use custom dates if provided, otherwise use default calendar quarters
  let start: Date;
  let end: Date;

  if (quarterStart && quarterEnd) {
    start = new Date(quarterStart);
    end = new Date(quarterEnd);
  } else {
    // Default calendar quarters
    const year = today.getFullYear();
    const quarterMonths: Record<string, [number, number]> = {
      Q1: [0, 2], // Jan-Mar
      Q2: [3, 5], // Apr-Jun
      Q3: [6, 8], // Jul-Sep
      Q4: [9, 11], // Oct-Dec
    };

    const [startMonth, endMonth] = quarterMonths[quarter];
    start = new Date(year, startMonth, 1);
    end = new Date(year, endMonth + 1, 0);
  }

  // Calculate day of quarter
  const dayOfQuarter = Math.floor(
    (today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
  );
  const daysInQuarter = Math.floor(
    (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
  );
  const daysRemaining = Math.max(0, daysInQuarter - dayOfQuarter);
  const percentOfQuarterComplete = Math.round((dayOfQuarter / daysInQuarter) * 100);

  // Target pace (should have earned this much by today)
  const targetPaceRequired = (targetRevenue / daysInQuarter) * dayOfQuarter;

  // Current progress vs pace
  const variance = currentRevenue - targetPaceRequired;
  const onTrack = variance >= 0;

  // Required daily rate to hit target
  const requiredDailyRate =
    daysRemaining > 0 ? (targetRevenue - currentRevenue) / daysRemaining : 0;

  // Generate alert
  let alert: string | undefined;
  if (!onTrack && Math.abs(variance) > targetRevenue * 0.1) {
    const percentBehind = Math.round((Math.abs(variance) / targetRevenue) * 100);
    alert = `⚠️ Behind pace by ${percentBehind}%. Need $${Math.round(requiredDailyRate)}/day to recover.`;
  } else if (onTrack && variance > targetRevenue * 0.15) {
    const percentAhead = Math.round((variance / targetRevenue) * 100);
    alert = `✅ Ahead of pace by ${percentAhead}%! Great momentum.`;
  }

  return {
    dayOfQuarter,
    daysInQuarter,
    percentOfQuarterComplete,
    targetPaceRequired,
    currentPace: currentRevenue,
    variance,
    onTrack,
    daysRemaining,
    requiredDailyRate,
    alert,
  };
}

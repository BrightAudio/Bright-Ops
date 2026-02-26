/**
 * Quest System - AI-Powered Goal Progression
 * Generates stepping-stone quests to reach target goals
 * 
 * Integrated with event system for flexible progress tracking from:
 * - Leads module (reachouts, conversions, meetings)
 * - Jobs module (new client acquisition, completion)
 * - Custom event types
 */

import { calculateNewClientsThisQuarter } from './calculateNewClientsThisQuarter';

export interface QuestStep {
  id: string;
  questIndex: number;
  title: string;
  description: string;
  objective: string;
  metricTarget: number;
  metricType: 'revenue' | 'jobs' | 'efficiency' | 'retention' | 'growth';
  difficulty: 'easy' | 'medium' | 'hard';
  reward: QuestReward;
  status: 'locked' | 'active' | 'completed';
  progress: number; // 0-100
  prerequisiteQuestId?: string;
  actionItems: string[];
}

export interface QuestLine {
  id: string;
  targetGoal: string;
  targetRevenue: number;
  quarter: string;
  questSteps: QuestStep[];
  lineProgress: number; // 0-100, overall completion
  createdAt: Date;
  completedAt?: Date;
  rewards: QuestReward[];
}

export interface QuestReward {
  id: string;
  type: 'badge' | 'unlock' | 'points' | 'multiplier';
  name: string;
  description: string;
  icon: string;
  earnedAt?: Date;
}

/**
 * AI generates a quest chain for a target goal
 */
export function generateQuestLine(
  targetGoal: string,
  targetRevenue: number,
  quarter: string,
  currentMetrics: any
): QuestLine {
  const questSteps: QuestStep[] = [];

  // Analyze current metrics to create jumping-off points
  const currentRevenue = currentMetrics?.jobsIncome || 0;
  const completedJobs = currentMetrics?.completedJobs || 0;
  const avgJobValue = completedJobs > 0 ? currentRevenue / completedJobs : 5000;
  const revenueGap = targetRevenue - currentRevenue;
  const jobsNeeded = Math.ceil(revenueGap / avgJobValue);

  // Quest 1: Foundation - Secure new client relationships
  questSteps.push({
    id: `quest-1-${Date.now()}`,
    questIndex: 1,
    title: 'Build Your Base',
    description: `Establish relationships with ${Math.ceil(jobsNeeded * 0.3)} new clients to create a foundation for growth`,
    objective: `Secure ${Math.ceil(jobsNeeded * 0.3)} new project commitments`,
    metricTarget: Math.ceil(jobsNeeded * 0.3),
    metricType: 'jobs',
    difficulty: 'easy',
    reward: {
      id: 'reward-1',
      type: 'badge',
      name: 'Network Builder',
      description: 'Established solid client relationships',
      icon: '🤝',
    },
    status: 'active',
    progress: 0,
    actionItems: [
      'Reach out to 10 potential clients',
      'Schedule discovery calls',
      'Send proposal quotes',
      'Close first 2-3 deals',
    ],
  });

  // Quest 2: Amplify - Increase deal value/efficiency
  questSteps.push({
    id: `quest-2-${Date.now()}`,
    questIndex: 2,
    title: 'Premium Positioning',
    description: `Upgrade to premium rental tiers and increase average job value to $${Math.round(avgJobValue * 1.3).toLocaleString()}`,
    objective: `Increase average job revenue by 30%`,
    metricTarget: Math.round(avgJobValue * 1.3),
    metricType: 'efficiency',
    difficulty: 'medium',
    reward: {
      id: 'reward-2',
      type: 'unlock',
      name: 'Premium Tier Access',
      description: 'Unlock advanced rental packages',
      icon: '⭐',
    },
    status: 'locked',
    progress: 0,
    prerequisiteQuestId: questSteps[0].id,
    actionItems: [
      'Audit current rental pricing',
      'Create 3 premium packages',
      'Train team on upselling',
      'Target premium packages for 50% of new jobs',
    ],
  });

  // Quest 3: Scale - Add volume through efficiency
  questSteps.push({
    id: `quest-3-${Date.now()}`,
    questIndex: 3,
    title: 'Operational Excellence',
    description: `Streamline operations to handle ${Math.ceil(jobsNeeded)} quarterly jobs efficiently`,
    objective: `Reduce labor cost per job by 15%`,
    metricTarget: 15,
    metricType: 'efficiency',
    difficulty: 'hard',
    reward: {
      id: 'reward-3',
      type: 'multiplier',
      name: 'Efficiency Boost',
      description: '+10% margin multiplier for next quarter',
      icon: '⚡',
    },
    status: 'locked',
    progress: 0,
    prerequisiteQuestId: questSteps[1].id,
    actionItems: [
      'Map current job workflows',
      'Identify bottlenecks',
      'Implement process improvements',
      'Monitor labor metrics weekly',
    ],
  });

  // Quest 4: Final Push - Revenue target
  questSteps.push({
    id: `quest-4-${Date.now()}`,
    questIndex: 4,
    title: 'FINAL QUEST: Revenue Mastery',
    description: `Achieve your quarterly goal of $${targetRevenue.toLocaleString()} revenue`,
    objective: `Hit $${targetRevenue.toLocaleString()} in total quarterly revenue`,
    metricTarget: targetRevenue,
    metricType: 'revenue',
    difficulty: 'hard',
    reward: {
      id: 'reward-4',
      type: 'badge',
      name: '🏆 Goal Champion',
      description: `Achieved ${quarter} revenue target - Ready for next challenge!`,
      icon: '🏆',
    },
    status: 'locked',
    progress: 0,
    prerequisiteQuestId: questSteps[2].id,
    actionItems: [
      'Monitor daily revenue pace',
      'Execute final client pushes',
      'Lock in remaining Q4 bookings',
      'Celebrate your achievement!',
    ],
  });

  return {
    id: `questline-${Date.now()}`,
    targetGoal,
    targetRevenue,
    quarter,
    questSteps,
    lineProgress: 0,
    createdAt: new Date(),
    rewards: [],
  };
}

/**
 * Calculate quest progress based on current metrics or events
 * 
 * For 'jobs' metric type: Counts new clients acquired this quarter
 * For 'revenue' metric type: Uses income from completed jobs
 * For 'efficiency' metric type: Calculates labor cost ratios
 * For other types: Can look up events or return 0
 */
export async function calculateQuestProgress(
  quest: QuestStep,
  currentMetrics: any,
  options?: {
    warehouseId?: string;
    userId?: string;
  }
): Promise<number> {
  try {
    if (quest.metricType === 'revenue') {
      const current = currentMetrics?.jobsIncome || 0;
      return Math.min(100, Math.round((current / quest.metricTarget) * 100));
    } else if (quest.metricType === 'jobs') {
      // NEW: Use new clients this quarter calculation
      // This powers quests like "Acquire 5 new clients this quarter"
      const result = await calculateNewClientsThisQuarter(
        quest.metricTarget,
        options?.warehouseId
      );
      return result.progressPercent;
    } else if (quest.metricType === 'efficiency') {
      // For efficiency metrics, use labor cost ratio
      if (quest.title.includes('Premium')) {
        const avgJob = currentMetrics?.jobsIncome
          ? currentMetrics.jobsIncome / (currentMetrics.completedJobs || 1)
          : 5000;
        return Math.min(100, Math.round((avgJob / quest.metricTarget) * 100));
      } else {
        // Labor efficiency
        const laborRatio =
          currentMetrics?.jobsLaborCost && currentMetrics?.jobsIncome
            ? (currentMetrics.jobsLaborCost / currentMetrics.jobsIncome) * 100
            : 35;
        const costReduction = 35 - laborRatio;
        return Math.min(100, Math.max(0, Math.round((costReduction / quest.metricTarget) * 100)));
      }
    } else if (quest.metricType === 'retention') {
      // Future: Could track retention via events
      return 0;
    } else if (quest.metricType === 'growth') {
      // Future: Could track growth events
      return 0;
    }
    return 0;
  } catch (err) {
    console.error('Error calculating quest progress:', err);
    // Fallback to simple calculation
    if (quest.metricType === 'jobs') {
      const current = currentMetrics?.completedJobs || 0;
      return Math.min(100, Math.round((current / quest.metricTarget) * 100));
    }
    return 0;
  }
}

/**
 * Check if a quest is complete
 */
export function isQuestComplete(quest: QuestStep, progress: number): boolean {
  return progress >= 100;
}

/**
 * Auto-unlock next quest when current completes
 * Now async to support event-based calculations
 */
export async function updateQuestStates(
  questLine: QuestLine,
  currentMetrics: any,
  options?: {
    warehouseId?: string;
    userId?: string;
  }
): Promise<QuestLine> {
  const updatedQuests: QuestStep[] = [];

  // Calculate progress for each quest (now async)
  for (const quest of questLine.questSteps) {
    const progress = await calculateQuestProgress(quest, currentMetrics, options);
    const isComplete = isQuestComplete(quest, progress);

    updatedQuests.push({
      ...quest,
      progress,
      status: isComplete && quest.status === 'active' ? ('completed' as const) : quest.status,
    });
  }

  // Auto-unlock next quest
  updatedQuests.forEach((quest, idx) => {
    if (quest.status === 'completed' && idx < updatedQuests.length - 1) {
      const nextQuest = updatedQuests[idx + 1];
      if (nextQuest.status === 'locked') {
        nextQuest.status = 'active';
      }
    }
  });

  // Calculate overall line progress
  const completedCount = updatedQuests.filter((q) => q.status === 'completed').length;
  const lineProgress = Math.round((completedCount / updatedQuests.length) * 100);

  return {
    ...questLine,
    questSteps: updatedQuests,
    lineProgress,
    completedAt: lineProgress === 100 ? new Date() : undefined,
  };
}

/**
 * Get next active quest
 */
export function getActiveQuest(questLine: QuestLine): QuestStep | null {
  return questLine.questSteps.find((q) => q.status === 'active') || null;
}

/**
 * Generate AI insights for a quest
 */
export function generateQuestInsight(quest: QuestStep, progress: number): string {
  if (progress === 0) {
    return `Time to begin "${quest.title}"! Start with: ${quest.actionItems[0]}`;
  } else if (progress < 30) {
    return `You're on your way! Keep pushing: ${quest.actionItems[1] || 'Keep up the momentum'}`;
  } else if (progress < 70) {
    return `Great progress! You're over halfway there. Next step: ${quest.actionItems[2] || 'Nearly there!'}`;
  } else if (progress < 100) {
    return `Almost there! Final push needed: ${quest.actionItems[3] || 'Complete this quest!'}`;
  } else {
    return `🎉 Quest Complete! Ready for the next challenge!`;
  }
}

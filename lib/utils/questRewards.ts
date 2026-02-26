/**
 * Quest Rewards System
 * Unlocks achievements and progression perks
 */

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  questId: string;
  earnedAt: Date;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

export interface RewardTracker {
  totalBadgesEarned: number;
  totalQuestsCompleted: number;
  currentStreak: number;
  multiplierActive: number; // 1.0 to 1.5
  unlockedFeatures: string[];
  achievements: Achievement[];
}

/**
 * Pre-defined rewards for quest completion
 */
export const QUEST_REWARDS = {
  'Network Builder': {
    badge: '🤝',
    name: 'Network Builder',
    description: 'Established solid client relationships',
    rarity: 'common' as const,
    unlocksFeature: 'client-crm-insights',
  },
  'Premium Tier Access': {
    badge: '⭐',
    name: 'Premium Tier Access',
    description: 'Unlock advanced rental packages and strategies',
    rarity: 'rare' as const,
    unlocksFeature: 'premium-packages',
  },
  'Efficiency Boost': {
    badge: '⚡',
    name: 'Efficiency Master',
    description: 'Streamlined operations for maximum margins',
    rarity: 'epic' as const,
    multiplier: 1.1,
  },
  'Goal Champion': {
    badge: '🏆',
    name: 'Goal Champion',
    description: 'Achieved quarterly revenue target',
    rarity: 'legendary' as const,
    multiplier: 1.2,
    unlocksFeature: 'ai-forecasting-pro',
  },
};

/**
 * Award achievement for completing a quest
 */
export function awardAchievement(
  questId: string,
  rewardName: string,
  tracker: RewardTracker
): { achievement: Achievement; tracker: RewardTracker } {
  const reward = QUEST_REWARDS[rewardName as keyof typeof QUEST_REWARDS];

  if (!reward) {
    throw new Error(`Unknown reward: ${rewardName}`);
  }

  const achievement: Achievement = {
    id: `achievement-${questId}-${Date.now()}`,
    name: reward.name,
    description: reward.description,
    icon: reward.badge,
    questId,
    earnedAt: new Date(),
    rarity: reward.rarity,
  };

  const newTracker = {
    ...tracker,
    achievements: [...tracker.achievements, achievement],
    totalBadgesEarned: tracker.totalBadgesEarned + 1,
  };

  // Apply multiplier if this reward has one
  if ('multiplier' in reward && reward.multiplier) {
    newTracker.multiplierActive = reward.multiplier;
  }

  // Unlock features if applicable
  if ('unlocksFeature' in reward && reward.unlocksFeature) {
    newTracker.unlockedFeatures.push(reward.unlocksFeature);
  }

  return { achievement, tracker: newTracker };
}

/**
 * Get all earned achievements
 */
export function getEarnedAchievements(tracker: RewardTracker): Achievement[] {
  return tracker.achievements;
}

/**
 * Check if user has unlocked a feature
 */
export function hasFeatureUnlocked(tracker: RewardTracker, feature: string): boolean {
  return tracker.unlockedFeatures.includes(feature);
}

/**
 * Get active multiplier
 */
export function getActiveMultiplier(tracker: RewardTracker): number {
  return tracker.multiplierActive || 1.0;
}

/**
 * Calculate streak and rewards
 */
export function updateStreak(
  tracker: RewardTracker,
  questCompleted: boolean
): RewardTracker {
  if (questCompleted) {
    return {
      ...tracker,
      totalQuestsCompleted: tracker.totalQuestsCompleted + 1,
      currentStreak: tracker.currentStreak + 1,
    };
  } else {
    return {
      ...tracker,
      currentStreak: 0,
    };
  }
}

/**
 * Get streak bonus
 */
export function getStreakBonus(tracker: RewardTracker): number {
  const streaks = [
    { threshold: 5, bonus: 'achievement-streak-5' },
    { threshold: 10, bonus: 'achievement-streak-10' },
    { threshold: 25, bonus: 'achievement-streak-25' },
  ];

  const bonuses = streaks
    .filter((s) => tracker.currentStreak >= s.threshold)
    .map((s) => s.bonus);

  return bonuses.length;
}

/**
 * Generate reward notification
 */
export function generateRewardNotification(
  questName: string,
  rewardName: string,
  streak: number
): string {
  const reward = QUEST_REWARDS[rewardName as keyof typeof QUEST_REWARDS];
  let message = `🎉 Quest Complete: "${questName}" - Earned ${reward?.badge} ${rewardName}`;

  if (streak > 1) {
    message += ` (${streak} quest streak! 🔥)`;
  }

  return message;
}

/**
 * Create new reward tracker
 */
export function createRewardTracker(): RewardTracker {
  return {
    totalBadgesEarned: 0,
    totalQuestsCompleted: 0,
    currentStreak: 0,
    multiplierActive: 1.0,
    unlockedFeatures: [],
    achievements: [],
  };
}

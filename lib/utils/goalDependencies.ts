/**
 * Goal Dependencies System
 * Manages relationships between goals to enable cascading effects and unlocking
 */

export interface GoalDependency {
  id: string;
  sourceGoalId: string;
  targetGoalId: string;
  type: 'blocks' | 'enables' | 'requires' | 'enhances';
  description: string;
}

export interface DependencyChain {
  goalId: string;
  blockingGoals: string[];
  enabling: string[];
  dependencies: string[];
  enhancedBy: string[];
}

/**
 * Calculate which goals are currently blocked
 */
export function getBlockedGoals(
  dependencies: GoalDependency[],
  completedGoals: string[]
): string[] {
  const blocked = new Set<string>();

  dependencies.forEach((dep) => {
    if (dep.type === 'blocks' && !completedGoals.includes(dep.sourceGoalId)) {
      blocked.add(dep.targetGoalId);
    }
  });

  return Array.from(blocked);
}

/**
 * Get goals that become enabled when a goal is completed
 */
export function getEnabledGoals(
  goalId: string,
  dependencies: GoalDependency[]
): string[] {
  return dependencies
    .filter((dep) => dep.sourceGoalId === goalId && dep.type === 'enables')
    .map((dep) => dep.targetGoalId);
}

/**
 * Get goals that require completion before a given goal
 */
export function getPrerequisiteGoals(
  goalId: string,
  dependencies: GoalDependency[]
): string[] {
  return dependencies
    .filter((dep) => dep.targetGoalId === goalId && dep.type === 'requires')
    .map((dep) => dep.sourceGoalId);
}

/**
 * Calculate goal impact score based on dependencies
 */
export function calculateDependencyImpact(
  goalId: string,
  dependencies: GoalDependency[]
): number {
  let impact = 0;

  // Goals that enable others have higher impact
  const enabling = dependencies.filter(
    (dep) => dep.sourceGoalId === goalId && dep.type === 'enables'
  ).length;
  impact += enabling * 2;

  // Goals with many dependents
  const dependents = dependencies.filter(
    (dep) => dep.targetGoalId === goalId
  ).length;
  impact += dependents;

  // Enhancement multiplier
  const enhancing = dependencies.filter(
    (dep) => dep.sourceGoalId === goalId && dep.type === 'enhances'
  ).length;
  impact += enhancing * 1.5;

  return impact;
}

/**
 * Build dependency chain for a goal
 */
export function buildDependencyChain(
  goalId: string,
  dependencies: GoalDependency[]
): DependencyChain {
  return {
    goalId,
    blockingGoals: dependencies
      .filter((dep) => dep.targetGoalId === goalId && dep.type === 'blocks')
      .map((dep) => dep.sourceGoalId),
    enabling: dependencies
      .filter((dep) => dep.sourceGoalId === goalId && dep.type === 'enables')
      .map((dep) => dep.targetGoalId),
    dependencies: dependencies
      .filter((dep) => dep.targetGoalId === goalId && dep.type === 'requires')
      .map((dep) => dep.sourceGoalId),
    enhancedBy: dependencies
      .filter((dep) => dep.targetGoalId === goalId && dep.type === 'enhances')
      .map((dep) => dep.sourceGoalId),
  };
}

/**
 * Add new dependency between goals
 */
export function addDependency(
  dependencies: GoalDependency[],
  sourceGoalId: string,
  targetGoalId: string,
  type: 'blocks' | 'enables' | 'requires' | 'enhances',
  description: string
): GoalDependency[] {
  const newDep: GoalDependency = {
    id: `dep-${sourceGoalId}-${targetGoalId}-${Date.now()}`,
    sourceGoalId,
    targetGoalId,
    type,
    description,
  };

  return [...dependencies, newDep];
}

/**
 * Remove dependency
 */
export function removeDependency(
  dependencies: GoalDependency[],
  dependencyId: string
): GoalDependency[] {
  return dependencies.filter((dep) => dep.id !== dependencyId);
}

/**
 * Get dependency description
 */
export function getDependencyDescription(type: string): string {
  const descriptions: Record<string, string> = {
    blocks: 'This goal must be completed first',
    enables: 'Enables related goals',
    requires: 'Requires completion of related goals',
    enhances: 'Enhances related goal outcomes',
  };
  return descriptions[type] || 'Related goal';
}

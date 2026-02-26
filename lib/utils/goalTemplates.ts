/**
 * Goal Templates System
 * Pre-built goal templates for common business scenarios
 */

export interface GoalTemplate {
  id: string;
  name: string;
  description: string;
  category: 'revenue' | 'efficiency' | 'growth' | 'retention' | 'custom';
  goals: TemplateGoal[];
  industry: 'audio-rental' | 'events' | 'general';
  season: 'Q1' | 'Q2' | 'Q3' | 'Q4' | 'any';
  expectedOutcome: string;
  createdAt: Date;
  popularity: number; // 1-5 stars
}

export interface TemplateGoal {
  name: string;
  description: string;
  target: number;
  targetType: 'revenue' | 'efficiency' | 'jobs' | 'retention' | 'custom';
  priority: 'high' | 'medium' | 'low';
  estimatedEffort: 'low' | 'medium' | 'high';
}

/**
 * Pre-built templates for audio rental businesses
 */
export const STANDARD_TEMPLATES: GoalTemplate[] = [
  {
    id: 'template-revenue-boost',
    name: 'Revenue Growth Sprint',
    description: 'Focused increase in quarterly revenue through job acquisition',
    category: 'revenue',
    industry: 'audio-rental',
    season: 'any',
    expectedOutcome: 'Increase quarterly revenue by 20-30%',
    popularity: 5,
    createdAt: new Date('2025-01-01'),
    goals: [
      {
        name: 'Increase Event Job Bookings',
        description: 'Target 5-7 new mid-size events',
        target: 50000,
        targetType: 'revenue',
        priority: 'high',
        estimatedEffort: 'medium',
      },
      {
        name: 'Expand Vendor Relationships',
        description: 'Establish partnerships with 3 new event planners',
        target: 3,
        targetType: 'custom',
        priority: 'high',
        estimatedEffort: 'medium',
      },
      {
        name: 'Premium Service Tier Adoption',
        description: 'Increase premium rental attachments to 25% of jobs',
        target: 25,
        targetType: 'efficiency',
        priority: 'medium',
        estimatedEffort: 'low',
      },
    ],
  },
  {
    id: 'template-efficiency-ops',
    name: 'Operational Efficiency Optimization',
    description: 'Streamline operations to improve margins without increasing headcount',
    category: 'efficiency',
    industry: 'audio-rental',
    season: 'any',
    expectedOutcome: 'Reduce labor costs by 10-15% while maintaining service quality',
    popularity: 4,
    createdAt: new Date('2025-01-01'),
    goals: [
      {
        name: 'Labor Cost Reduction',
        description: 'Reduce labor per job by 15% through process optimization',
        target: 15,
        targetType: 'efficiency',
        priority: 'high',
        estimatedEffort: 'high',
      },
      {
        name: 'Equipment Utilization Rate',
        description: 'Increase equipment utilization from current to 75%',
        target: 75,
        targetType: 'efficiency',
        priority: 'high',
        estimatedEffort: 'medium',
      },
      {
        name: 'Inventory Accuracy',
        description: 'Maintain 99% inventory accuracy',
        target: 99,
        targetType: 'efficiency',
        priority: 'medium',
        estimatedEffort: 'low',
      },
    ],
  },
  {
    id: 'template-customer-retention',
    name: 'Customer Retention Program',
    description: 'Build loyalty and repeat business from existing customers',
    category: 'retention',
    industry: 'audio-rental',
    season: 'any',
    expectedOutcome: 'Increase repeat customer rate by 25-30%',
    popularity: 4,
    createdAt: new Date('2025-01-01'),
    goals: [
      {
        name: 'Repeat Customer Rate',
        description: 'Increase repeat bookings to 40% of total jobs',
        target: 40,
        targetType: 'retention',
        priority: 'high',
        estimatedEffort: 'medium',
      },
      {
        name: 'Customer Satisfaction Score',
        description: 'Achieve 4.7+ average satisfaction rating',
        target: 4.7,
        targetType: 'custom',
        priority: 'high',
        estimatedEffort: 'medium',
      },
      {
        name: 'VIP Account Growth',
        description: 'Establish 5 new VIP customer accounts',
        target: 5,
        targetType: 'custom',
        priority: 'medium',
        estimatedEffort: 'low',
      },
    ],
  },
  {
    id: 'template-seasonal-push',
    name: 'Seasonal Peak Season Preparation',
    description: 'Maximize revenue during peak booking seasons',
    category: 'revenue',
    industry: 'audio-rental',
    season: 'Q2',
    expectedOutcome: 'Capitalize on peak season demand for 35%+ revenue increase',
    popularity: 5,
    createdAt: new Date('2025-01-01'),
    goals: [
      {
        name: 'Event Capacity Preparation',
        description: 'Add 20% more available equipment for peak season',
        target: 20,
        targetType: 'efficiency',
        priority: 'high',
        estimatedEffort: 'high',
      },
      {
        name: 'Seasonal Revenue Target',
        description: 'Achieve peak season revenue benchmark',
        target: 75000,
        targetType: 'revenue',
        priority: 'high',
        estimatedEffort: 'medium',
      },
      {
        name: 'Staff Readiness',
        description: 'Train and onboard 2 seasonal team members',
        target: 2,
        targetType: 'custom',
        priority: 'high',
        estimatedEffort: 'medium',
      },
    ],
  },
];

/**
 * Get templates filtered by criteria
 */
export function getTemplatesByCriteria(
  industry?: string,
  category?: string,
  season?: string
): GoalTemplate[] {
  return STANDARD_TEMPLATES.filter((template) => {
    if (industry && template.industry !== industry && template.industry !== 'general')
      return false;
    if (category && template.category !== category) return false;
    if (season && template.season !== season && template.season !== 'any') return false;
    return true;
  });
}

/**
 * Get top rated templates
 */
export function getTopTemplates(limit: number = 5): GoalTemplate[] {
  return [...STANDARD_TEMPLATES].sort((a, b) => b.popularity - a.popularity).slice(0, limit);
}

/**
 * Create custom template from existing goals
 */
export function createCustomTemplate(
  name: string,
  description: string,
  goals: TemplateGoal[]
): GoalTemplate {
  return {
    id: `template-custom-${Date.now()}`,
    name,
    description,
    category: 'custom',
    industry: 'audio-rental',
    season: 'any',
    expectedOutcome: `Custom template: ${description}`,
    popularity: 0,
    createdAt: new Date(),
    goals,
  };
}

/**
 * Apply template to create goals for a quarter
 */
export function applyTemplate(template: GoalTemplate, quarter: string): any[] {
  return template.goals.map((goal, index) => ({
    id: `goal-${quarter}-${index}-${Date.now()}`,
    name: goal.name,
    description: goal.description,
    target: goal.target,
    targetType: goal.targetType,
    priority: goal.priority,
    effort: goal.estimatedEffort,
    quarter,
    templateId: template.id,
    createdAt: new Date(),
    completed: false,
    progress: 0,
  }));
}

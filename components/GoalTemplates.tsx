import React, { useState } from 'react';
import {
  GoalTemplate,
  STANDARD_TEMPLATES,
  getTemplatesByCriteria,
  applyTemplate,
} from '@/lib/utils/goalTemplates';

interface GoalTemplatesProps {
  quarter: string;
  onTemplateApply: (goals: any[]) => void;
}

export default function GoalTemplates({ quarter, onTemplateApply }: GoalTemplatesProps) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const filteredTemplates =
    selectedCategory === 'all'
      ? STANDARD_TEMPLATES
      : getTemplatesByCriteria(undefined, selectedCategory);

  const Categories = ['revenue', 'efficiency', 'growth', 'retention', 'custom'];

  const handleApplyTemplate = (template: GoalTemplate) => {
    const generatedGoals = applyTemplate(template, quarter);
    onTemplateApply(generatedGoals);
  };

  const getRatingStars = (rating: number) => {
    return '⭐'.repeat(Math.round(rating));
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      revenue: '#16a34a',
      efficiency: '#2563eb',
      growth: '#9333ea',
      retention: '#dc2626',
      custom: '#b45309',
    };
    return colors[category] || '#6b7280';
  };

  return (
    <div style={{ padding: '1.5rem', backgroundColor: '#f9fafb', borderRadius: '0.75rem' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1f2937', marginBottom: '1rem' }}>
          Goal Templates
        </h3>

        {/* Category Filter */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {['all', ...Categories].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: selectedCategory === cat ? '#b45309' : '#e5e7eb',
                color: selectedCategory === cat ? 'white' : '#374151',
                border: 'none',
                borderRadius: '0.375rem',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: '500',
                textTransform: 'capitalize',
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Templates Grid */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {filteredTemplates.map((template) => (
          <div
            key={template.id}
            style={{
              backgroundColor: 'white',
              borderRadius: '0.5rem',
              overflow: 'hidden',
              border: '1px solid #d1d5db',
            }}
          >
            {/* Template Header */}
            <button
              onClick={() => setExpanded(expanded === template.id ? null : template.id)}
              style={{
                width: '100%',
                padding: '1rem',
                backgroundColor: expanded === template.id ? '#f3f4f6' : 'white',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
                  <span
                    style={{
                      display: 'inline-block',
                      width: '0.75rem',
                      height: '0.75rem',
                      borderRadius: '0.375rem',
                      backgroundColor: getCategoryColor(template.category),
                    }}
                  />
                  <h4 style={{ fontSize: '1rem', fontWeight: '600', color: '#1f2937', margin: 0 }}>
                    {template.name}
                  </h4>
                </div>
                <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>
                  {template.description}
                </p>
                <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.25rem' }}>
                  {getRatingStars(template.popularity)} • {template.goals.length} goals
                </div>
              </div>
              <span style={{ fontSize: '1.25rem', color: '#9ca3af', marginLeft: '1rem' }}>
                {expanded === template.id ? '▼' : '▶'}
              </span>
            </button>

            {/* Expanded Template Details */}
            {expanded === template.id && (
              <div style={{ borderTop: '1px solid #e5e7eb', padding: '1rem', backgroundColor: '#f9fafb' }}>
                <p style={{ fontSize: '0.875rem', color: '#374151', marginBottom: '1rem' }}>
                  Expected outcome: <strong>{template.expectedOutcome}</strong>
                </p>

                {/* Goals Preview */}
                <div style={{ marginBottom: '1rem' }}>
                  <h5 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#1f2937', marginBottom: '0.75rem' }}>
                    Included Goals:
                  </h5>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {template.goals.map((goal, idx) => (
                      <div
                        key={idx}
                        style={{
                          backgroundColor: 'white',
                          padding: '0.75rem',
                          borderRadius: '0.375rem',
                          borderLeft: `2px solid ${getCategoryColor(template.category)}`,
                        }}
                      >
                        <p style={{ fontSize: '0.875rem', fontWeight: '500', margin: '0 0 0.25rem 0' }}>
                          {goal.name}
                        </p>
                        <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: 0 }}>
                          Target: {goal.target} {goal.targetType === 'revenue' ? '$' : ''}
                        </p>
                        <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.25rem' }}>
                          Priority: <span style={{ textTransform: 'capitalize' }}>{goal.priority}</span> • Effort:{' '}
                          <span style={{ textTransform: 'capitalize' }}>{goal.estimatedEffort}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* CTA Button */}
                <button
                  onClick={() => handleApplyTemplate(template)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    backgroundColor: getCategoryColor(template.category),
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.375rem',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                  }}
                >
                  Apply Template for {quarter}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {filteredTemplates.length === 0 && (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
          <p style={{ fontSize: '0.875rem' }}>No templates found in this category</p>
        </div>
      )}
    </div>
  );
}

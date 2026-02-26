import React, { useState } from 'react';
import {
  GoalDependency,
  getBlockedGoals,
  getEnabledGoals,
  addDependency,
  removeDependency,
} from '@/lib/utils/goalDependencies';

interface GoalDependenciesProps {
  goals: any[];
  dependencies: GoalDependency[];
  onDependencyAdd: (deps: GoalDependency[]) => void;
  onDependencyRemove: (deps: GoalDependency[]) => void;
  completedGoals: string[];
}

export default function GoalDependencies({
  goals,
  dependencies,
  onDependencyAdd,
  onDependencyRemove,
  completedGoals,
}: GoalDependenciesProps) {
  const [showForm, setShowForm] = useState(false);
  const [selectedSource, setSelectedSource] = useState('');
  const [selectedTarget, setSelectedTarget] = useState('');
  const [dependencyType, setDependencyType] = useState<'blocks' | 'enables' | 'requires' | 'enhances'>('enables');

  const blockedGoals = getBlockedGoals(dependencies, completedGoals);

  const handleAddDependency = () => {
    if (selectedSource && selectedTarget && selectedSource !== selectedTarget) {
      const updated = addDependency(
        dependencies,
        selectedSource,
        selectedTarget,
        dependencyType,
        `${dependencyType} relationship created`
      );
      onDependencyAdd(updated);
      setSelectedSource('');
      setSelectedTarget('');
      setDependencyType('enables');
      setShowForm(false);
    }
  };

  const handleRemoveDependency = (depId: string) => {
    const updated = removeDependency(dependencies, depId);
    onDependencyRemove(updated);
  };

  const getGoalName = (goalId: string) => {
    return goals.find((g) => g.id === goalId)?.name || 'Unknown Goal';
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      blocks: '#dc2626',
      enables: '#16a34a',
      requires: '#2563eb',
      enhances: '#9333ea',
    };
    return colors[type] || '#6b7280';
  };

  const getTypeIcon = (type: string) => {
    const icons: Record<string, string> = {
      blocks: '🚫',
      enables: '✨',
      requires: '📋',
      enhances: '⬆️',
    };
    return icons[type] || '→';
  };

  return (
    <div style={{ padding: '1.5rem', backgroundColor: '#f9fafb', borderRadius: '0.75rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1f2937' }}>Goal Dependencies</h3>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{
            backgroundColor: '#b45309',
            color: 'white',
            border: 'none',
            padding: '0.5rem 1rem',
            borderRadius: '0.375rem',
            cursor: 'pointer',
            fontSize: '0.875rem',
          }}
        >
          {showForm ? 'Cancel' : '+ Add Dependency'}
        </button>
      </div>

      {/* Add Dependency Form */}
      {showForm && (
        <div style={{ backgroundColor: 'white', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>
                Source Goal
              </label>
              <select
                value={selectedSource}
                onChange={(e) => setSelectedSource(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem',
                }}
              >
                <option value="">Select goal...</option>
                {goals.map((goal) => (
                  <option key={goal.id} value={goal.id}>
                    {goal.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>
                Target Goal
              </label>
              <select
                value={selectedTarget}
                onChange={(e) => setSelectedTarget(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem',
                }}
              >
                <option value="">Select goal...</option>
                {goals.map((goal) => (
                  <option key={goal.id} value={goal.id}>
                    {goal.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>
              Relationship Type
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
              {(['enables', 'requires', 'blocks', 'enhances'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setDependencyType(type)}
                  style={{
                    padding: '0.5rem',
                    backgroundColor: dependencyType === type ? getTypeColor(type) : '#e5e7eb',
                    color: dependencyType === type ? 'white' : '#6b7280',
                    border: 'none',
                    borderRadius: '0.375rem',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    fontWeight: '500',
                  }}
                >
                  {getTypeIcon(type)} {type}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleAddDependency}
            disabled={!selectedSource || !selectedTarget}
            style={{
              backgroundColor: selectedSource && selectedTarget ? '#16a34a' : '#d1d5db',
              color: 'white',
              border: 'none',
              padding: '0.5rem 1rem',
              borderRadius: '0.375rem',
              cursor: selectedSource && selectedTarget ? 'pointer' : 'not-allowed',
              fontSize: '0.875rem',
              fontWeight: '500',
            }}
          >
            Add Dependency
          </button>
        </div>
      )}

      {/* Blocked Goals Alert */}
      {blockedGoals.length > 0 && (
        <div
          style={{
            backgroundColor: '#fee2e2',
            border: '1px solid #fecaca',
            borderRadius: '0.5rem',
            padding: '1rem',
            marginBottom: '1rem',
          }}
        >
          <p style={{ fontSize: '0.875rem', fontWeight: '500', color: '#991b1b', margin: 0 }}>
            ⚠️ {blockedGoals.length} goal(s) are currently blocked by incomplete prerequisites
          </p>
        </div>
      )}

      {/* Dependencies List */}
      <div>
        {dependencies.length === 0 ? (
          <p style={{ color: '#6b7280', fontSize: '0.875rem', marginTop: '1rem' }}>No dependencies configured yet</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {dependencies.map((dep) => (
              <div
                key={dep.id}
                style={{
                  backgroundColor: 'white',
                  padding: '0.75rem',
                  borderRadius: '0.375rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderLeft: `3px solid ${getTypeColor(dep.type)}`,
                }}
              >
                <div>
                  <p style={{ fontSize: '0.875rem', fontWeight: '500', margin: '0 0 0.25rem 0' }}>
                    {getGoalName(dep.sourceGoalId)} {getTypeIcon(dep.type)} {getGoalName(dep.targetGoalId)}
                  </p>
                  <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: 0 }}>{dep.type}</p>
                </div>
                <button
                  onClick={() => handleRemoveDependency(dep.id)}
                  style={{
                    backgroundColor: '#fee2e2',
                    color: '#dc2626',
                    border: 'none',
                    padding: '0.25rem 0.5rem',
                    borderRadius: '0.25rem',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                  }}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

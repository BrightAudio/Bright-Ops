import React from 'react';
import { TrendingUp, AlertCircle, CheckCircle2, Zap } from 'lucide-react';
import { ForecastResult, GoalScenario, PaceMetrics } from '@/lib/utils/goalForecasting';

interface GoalScenariosProps {
  forecast: ForecastResult;
  scenarios: GoalScenario[];
  selectedScenario: 'optimistic' | 'realistic' | 'pessimistic';
  onSelectScenario: (scenario: 'optimistic' | 'realistic' | 'pessimistic') => void;
  paceMetrics: PaceMetrics;
}

export default function GoalScenarios({
  forecast,
  scenarios,
  selectedScenario,
  onSelectScenario,
  paceMetrics,
}: GoalScenariosProps) {
  const selected = scenarios.find((s) => s.name === selectedScenario);

  return (
    <div className="space-y-6">
      {/* AI Forecast Overview */}
      <div
        style={{
          backgroundColor: 'white',
          borderLeft: `4px solid ${
            forecast.trendDirection === 'up'
              ? '#22c55e'
              : forecast.trendDirection === 'down'
                ? '#ef4444'
                : '#eab308'
          }`,
        }}
        className="rounded-lg p-6 shadow-md"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp size={24} style={{ color: '#d97706' }} />
            <h3 style={{ color: '#b45309' }} className="text-xl font-bold">
              AI Revenue Forecast
            </h3>
          </div>
          <div
            style={{
              backgroundColor: '#fef3c7',
              color: '#92400e',
              padding: '6px 12px',
              borderRadius: '9999px',
              fontSize: '14px',
              fontWeight: '600',
            }}
          >
            {forecast.confidence}% Confidence
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <p style={{ color: '#999999' }} className="text-sm font-medium mb-2">
              Q3 Forecast
            </p>
            <p style={{ color: '#b45309' }} className="text-2xl font-bold">
              ${forecast.q3Forecast.toLocaleString()}
            </p>
          </div>
          <div>
            <p style={{ color: '#999999' }} className="text-sm font-medium mb-2">
              Q4 Forecast
            </p>
            <p style={{ color: '#b45309' }} className="text-2xl font-bold">
              ${forecast.q4Forecast.toLocaleString()}
            </p>
          </div>
          <div>
            <p style={{ color: '#999999' }} className="text-sm font-medium mb-2">
              Yearly Total
            </p>
            <p style={{ color: '#b45309' }} className="text-2xl font-bold">
              ${forecast.yearlyForecast.toLocaleString()}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <p style={{ color: '#a16207' }} className="text-sm font-medium">
            📊 Trend: {forecast.trendDirection === 'up' ? '📈 Growing' : forecast.trendDirection === 'down' ? '📉 Declining' : '➡️ Stable'}
          </p>
          <p style={{ color: '#a16207' }} className="text-sm font-medium">
            📈 Growth Rate: {(forecast.growthRate * 100).toFixed(1)}% QoQ
          </p>
        </div>

        {/* Recommendations */}
        <div className="mt-4 space-y-2">
          {forecast.recommendations.map((rec, idx) => (
            <p key={idx} style={{ color: '#78716c' }} className="text-sm">
              {rec}
            </p>
          ))}
        </div>
      </div>

      {/* Real-time Pace Tracking */}
      <div
        style={{
          backgroundColor: paceMetrics.onTrack ? '#f0fdf4' : '#fef2f2',
          borderLeft: `4px solid ${paceMetrics.onTrack ? '#22c55e' : '#ef4444'}`,
        }}
        className="rounded-lg p-6 shadow-md"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {paceMetrics.onTrack ? (
              <CheckCircle2 size={24} style={{ color: '#22c55e' }} />
            ) : (
              <AlertCircle size={24} style={{ color: '#ef4444' }} />
            )}
            <h3 style={{ color: paceMetrics.onTrack ? '#166534' : '#992724' }} className="text-xl font-bold">
              Pace Tracking
            </h3>
          </div>
          <div style={{ color: '#78716c' }} className="text-sm font-medium">
            Day {paceMetrics.dayOfQuarter} of {paceMetrics.daysInQuarter}
          </div>
        </div>

        {/* Progress bar */}
        <div className="mb-4">
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div
              style={{
                width: `${paceMetrics.percentOfQuarterComplete}%`,
                backgroundColor: paceMetrics.onTrack ? '#22c55e' : '#ef4444',
                transition: 'width 0.3s ease',
              }}
              className="h-full"
            />
          </div>
          <p style={{ color: '#78716c' }} className="text-xs mt-2">
            {paceMetrics.percentOfQuarterComplete}% of quarter complete
          </p>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <p style={{ color: '#78716c' }} className="text-sm font-medium mb-2">
              Current Pace
            </p>
            <p style={{ color: paceMetrics.onTrack ? '#166534' : '#991b1b' }} className="text-2xl font-bold">
              ${paceMetrics.currentPace.toLocaleString()}
            </p>
          </div>
          <div>
            <p style={{ color: '#78716c' }} className="text-sm font-medium mb-2">
              Target Pace
            </p>
            <p style={{ color: '#b45309' }} className="text-2xl font-bold">
              ${Math.round(paceMetrics.targetPaceRequired).toLocaleString()}
            </p>
          </div>
          <div>
            <p style={{ color: '#78716c' }} className="text-sm font-medium mb-2">
              Variance
            </p>
            <p
              style={{
                color: paceMetrics.variance >= 0 ? '#166534' : '#991b1b',
              }}
              className="text-2xl font-bold"
            >
              {paceMetrics.variance >= 0 ? '+' : ''} ${paceMetrics.variance.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Alert */}
        {paceMetrics.alert && (
          <div style={{ color: paceMetrics.onTrack ? '#166534' : '#991b1b' }} className="text-sm font-medium">
            {paceMetrics.alert}
          </div>
        )}

        {paceMetrics.daysRemaining > 0 && (
          <p style={{ color: '#78716c' }} className="text-sm mt-3">
            📅 {paceMetrics.daysRemaining} days remaining. Need ${paceMetrics.requiredDailyRate.toLocaleString('en-US', { maximumFractionDigits: 0 })}/day to hit target.
          </p>
        )}
      </div>

      {/* Scenario Selector */}
      <div className="space-y-4">
        <h3 style={{ color: '#b45309' }} className="text-xl font-bold">
          Goal Scenarios
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {scenarios.map((scenario) => (
            <button
              key={scenario.name}
              onClick={() => onSelectScenario(scenario.name)}
              style={{
                backgroundColor: selectedScenario === scenario.name ? '#fef3c7' : 'white',
                borderLeft: `4px solid ${
                  scenario.name === 'optimistic'
                    ? '#22c55e'
                    : scenario.name === 'pessimistic'
                      ? '#ef4444'
                      : '#eab308'
                }`,
              }}
              className="rounded-lg p-6 text-left shadow-md hover:shadow-lg transition cursor-pointer"
            >
              <div className="flex items-start justify-between mb-3">
                <h4
                  style={{ color: '#b45309' }}
                  className="text-lg font-bold capitalize"
                >
                  {scenario.name === 'optimistic'
                    ? '🚀 Optimistic'
                    : scenario.name === 'pessimistic'
                      ? '⚠️ Pessimistic'
                      : '📊 Realistic'}
                </h4>
                <div
                  style={{
                    backgroundColor:
                      scenario.name === 'optimistic'
                        ? '#dcfce7'
                        : scenario.name === 'pessimistic'
                          ? '#fee2e2'
                          : '#fef3c7',
                    color:
                      scenario.name === 'optimistic'
                        ? '#166534'
                        : scenario.name === 'pessimistic'
                          ? '#991b1b'
                          : '#92400e',
                    padding: '4px 8px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '600',
                  }}
                >
                  {scenario.achievementProbability}% likely
                </div>
              </div>

              <div className="space-y-2 mb-4">
                <div>
                  <p style={{ color: '#999999' }} className="text-xs font-medium">
                    Q3 Target
                  </p>
                  <p style={{ color: '#b45309' }} className="text-lg font-bold">
                    ${scenario.q3Target.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p style={{ color: '#999999' }} className="text-xs font-medium">
                    Q4 Target
                  </p>
                  <p style={{ color: '#b45309' }} className="text-lg font-bold">
                    ${scenario.q4Target.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p style={{ color: '#999999' }} className="text-xs font-medium">
                    Yearly Total
                  </p>
                  <p style={{ color: '#b45309' }} className="text-lg font-bold">
                    ${scenario.yearlyTotal.toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="space-y-1">
                <p style={{ color: '#78716c' }} className="text-xs font-bold mb-2">
                  Action Items:
                </p>
                {scenario.actionItems.map((item, idx) => (
                  <p key={idx} style={{ color: '#78716c' }} className="text-xs">
                    ✓ {item}
                  </p>
                ))}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Selected Scenario Details */}
      {selected && (
        <div
          style={{
            backgroundColor: '#fff8f0',
            borderLeft: '4px solid #fbbf24',
          }}
          className="rounded-lg p-6"
        >
          <div className="flex items-center gap-2 mb-3">
            <Zap size={20} style={{ color: '#d97706' }} />
            <h4 style={{ color: '#b45309' }} className="text-lg font-bold">
              {selected.name === 'optimistic' ? '🚀 Optimistic' : selected.name === 'pessimistic' ? '⚠️ Pessimistic' : '📊 Realistic'} Scenario - Your Path Forward
            </h4>
          </div>

          <p style={{ color: '#a16207' }} className="mb-4 text-sm">
            Focus on these priorities to achieve your {selected.name} scenario:
          </p>

          <ul className="space-y-2">
            {selected.actionItems.map((item, idx) => (
              <li
                key={idx}
                style={{
                  backgroundColor: 'white',
                  borderLeft: '2px solid #fbbf24',
                  padding: '8px 12px',
                  borderRadius: '4px',
                  color: '#78716c',
                  fontSize: '14px',
                }}
              >
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

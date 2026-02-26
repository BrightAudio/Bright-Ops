import React, { useState, useEffect } from 'react';
import { generateBenchmarks, getImprovementRecommendations, IndustryBenchmarks } from '@/lib/utils/benchmarkMetrics';

interface IndustryBenchmarksProps {
  metrics: any;
}

export default function IndustryBenchmarksComponent({ metrics }: IndustryBenchmarksProps) {
  const [benchmarks, setBenchmarks] = useState<IndustryBenchmarks | null>(null);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [recommendations, setRecommendations] = useState<string[]>([]);

  useEffect(() => {
    if (metrics) {
      const generated = generateBenchmarks(metrics);
      setBenchmarks(generated);
      setRecommendations(getImprovementRecommendations(generated));
    }
  }, [metrics]);

  if (!benchmarks) {
    return (
      <div style={{ padding: '1.5rem', backgroundColor: '#f9fafb', borderRadius: '0.75rem' }}>
        <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>Loading benchmarks...</p>
      </div>
    );
  }

  const getPercentileColor = (percentile: number) => {
    if (percentile >= 80) return '#16a34a';
    if (percentile >= 60) return '#eab308';
    if (percentile >= 40) return '#f59e0b';
    return '#dc2626';
  };

  const getRankingLabel = (ranking: string) => {
    const labels: Record<string, string> = {
      'top-10': '🏆 Top 10%',
      'top-25': '⭐ Top 25%',
      median: '→ Median',
      'below-median': '📈 Below Median',
      'poor': '⚠️ Needs Improvement',
    };
    return labels[ranking] || ranking;
  };

  return (
    <div style={{ padding: '1.5rem', backgroundColor: '#f9fafb', borderRadius: '0.75rem' }}>
      {/* Header with Overall Score */}
      <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1f2937', marginBottom: '1rem' }}>
          Industry Benchmarks
        </h3>

        <div
          style={{
            backgroundColor: 'white',
            padding: '1.5rem',
            borderRadius: '0.75rem',
            border: `3px solid ${getPercentileColor(benchmarks.overallScore)}`,
            marginBottom: '1rem',
          }}
        >
          <div style={{ fontSize: '3rem', fontWeight: 'bold', color: getPercentileColor(benchmarks.overallScore) }}>
            {benchmarks.overallScore}
          </div>
          <p style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.5rem' }}>Overall Performance Score</p>
        </div>

        <p style={{ fontSize: '0.875rem', color: '#374151', lineHeight: '1.5', marginBottom: '1rem' }}>
          {benchmarks.recommendation}
        </p>

        {/* Key Recommendations */}
        {recommendations.length > 0 && (
          <div style={{ backgroundColor: '#fef3c7', border: '1px solid #fcd34d', borderRadius: '0.5rem', padding: '1rem', marginTop: '1rem' }}>
            <h4 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#92400e', margin: '0 0 0.75rem 0' }}>
              🎯 Prioritized Improvement Areas
            </h4>
            <ul
              style={{
                listStyle: 'none',
                padding: 0,
                margin: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
              }}
            >
              {recommendations.map((rec, idx) => {
                const isHighImpact = rec.includes('HIGH IMPACT');
                return (
                  <li
                    key={idx}
                    style={{
                      fontSize: '0.75rem',
                      color: '#78350f',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.5rem',
                      backgroundColor: isHighImpact ? '#fed7aa' : 'transparent',
                      borderRadius: '0.25rem',
                    }}
                  >
                    <span>{isHighImpact ? '⚠️' : '→'}</span>
                    {rec.replace('[HIGH IMPACT] ', '').replace('[MEDIUM IMPACT] ', '')}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>

      {/* Categories */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {benchmarks.categories.map((category) => (
          <div key={category.name} style={{ backgroundColor: 'white', borderRadius: '0.5rem', overflow: 'hidden' }}>
            {/* Category Header */}
            <button
              onClick={() =>
                setExpandedCategory(expandedCategory === category.name ? null : category.name)
              }
              style={{
                width: '100%',
                padding: '1rem',
                backgroundColor: expandedCategory === category.name ? '#f3f4f6' : 'white',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <h4 style={{ fontSize: '0.95rem', fontWeight: '600', color: '#1f2937', margin: 0 }}>
                  {category.name}
                </h4>
                <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
                  {getRankingLabel(category.ranking)} • Your: {category.yourScore} | Industry: {category.industryAverage}
                </div>
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  marginLeft: '1rem',
                }}
              >
                <div
                  style={{
                    width: '2.5rem',
                    height: '0.5rem',
                    backgroundColor: '#e5e7eb',
                    borderRadius: '0.25rem',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${(category.yourScore / 100) * 100}%`,
                      height: '100%',
                      backgroundColor: getPercentileColor(category.yourScore),
                    }}
                  />
                </div>
                <span style={{ fontSize: '1.25rem', color: '#9ca3af' }}>
                  {expandedCategory === category.name ? '▼' : '▶'}
                </span>
              </div>
            </button>

            {/* Category Details */}
            {expandedCategory === category.name && (
              <div style={{ borderTop: '1px solid #e5e7eb', padding: '1rem', backgroundColor: '#f9fafb' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {category.metrics.map((metric, idx) => (
                    <div
                      key={idx}
                      style={{
                        backgroundColor: 'white',
                        padding: '0.75rem',
                        borderRadius: '0.375rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.5rem',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontSize: '0.875rem', fontWeight: '500', margin: 0, marginBottom: '0.25rem' }}>
                            {metric.name}
                          </p>
                          <p style={{ fontSize: '0.65rem', color: '#9ca3af', margin: 0 }}>
                            {metric.recommendation}
                          </p>
                        </div>
                        <div
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'flex-end',
                            gap: '0.25rem',
                            marginLeft: '1rem',
                          }}
                        >
                          <div
                            style={{
                              fontSize: '0.875rem',
                              fontWeight: '600',
                              color: getPercentileColor(metric.percentile),
                            }}
                          >
                            {Math.round(metric.percentile)}%ile
                          </div>
                          <div
                            style={{
                              fontSize: '0.75rem',
                              color: metric.differenceFromAvg >= 0 ? '#16a34a' : '#dc2626',
                              fontWeight: '500',
                            }}
                          >
                            {metric.differenceFromAvg >= 0 ? '+' : ''}{metric.differenceFromAvg}% vs avg
                          </div>
                        </div>
                      </div>

                      {/* Detailed metrics */}
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr 1fr',
                          gap: '0.5rem',
                          paddingTop: '0.5rem',
                          borderTop: '1px solid #e5e7eb',
                        }}
                      >
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>Your Value</div>
                          <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#1f2937' }}>
                            {metric.yourValue}{metric.unit}
                          </div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>Industry Avg</div>
                          <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                            {metric.industryAverage}{metric.unit}
                          </div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>Top 25%</div>
                          <div style={{ fontSize: '0.875rem', color: '#16a34a', fontWeight: '500' }}>
                            {metric.industryTop25}{metric.unit}
                          </div>
                        </div>
                      </div>

                      {/* Trend indicator */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem' }}>
                        <span>
                          {metric.trend === 'up' && '↑'} {metric.trend === 'down' && '↓'}{' '}
                          {metric.trend === 'stable' && '→'} {metric.trend}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Disclaimer */}
      <p
        style={{
          fontSize: '0.75rem',
          color: '#9ca3af',
          marginTop: '1.5rem',
          textAlign: 'center',
          fontStyle: 'italic',
        }}
      >
        Benchmarks based on audio rental and events industry data as of {benchmarks.generatedDate.toLocaleDateString()}
      </p>
    </div>
  );
}

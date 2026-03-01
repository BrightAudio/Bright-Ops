import React, { useState, useEffect } from 'react';
import {
  QuestLine,
  QuestStep,
  getActiveQuest,
  generateQuestInsight,
  updateQuestStates,
  canAccessQuest,
} from '@/lib/utils/questSystem';
import { generateRewardNotification } from '@/lib/utils/questRewards';

interface QuestChainProps {
  questLine: QuestLine | null;
  metrics: any;
  organizationPlan?: 'starter' | 'pro' | 'enterprise' | null;
  onQuestGenerate: () => void;
  onQuestComplete?: (questId: string, reward: any) => void;
  onClaimReward?: (questId: string, reward: any) => void;
  onRegenerateQuest?: () => void;
  completedQuests?: any[];
}

export default function QuestChain({ questLine, metrics, organizationPlan, onQuestGenerate, onQuestComplete, onClaimReward, onRegenerateQuest, completedQuests = [] }: QuestChainProps) {
  const [updatedQuests, setUpdatedQuests] = useState<QuestLine | null>(questLine);
  const [showRewardNotification, setShowRewardNotification] = useState<string | null>(null);
  
  // Get the active quest
  const activeQuest = updatedQuests ? getActiveQuest(updatedQuests) : null;

  useEffect(() => {
    if (questLine && metrics) {
      // Handle async quest state updates
      const updateQuests = async () => {
        const updated = await updateQuestStates(questLine, metrics);
        setUpdatedQuests(updated);

        // Check for newly completed quests
        const prevComplete = questLine.questSteps.filter((q) => q.status === 'completed').length;
        const newComplete = updated.questSteps.filter((q) => q.status === 'completed').length;

        if (newComplete > prevComplete) {
          const completedQuest = updated.questSteps.find(
            (q) => q.status === 'completed' && !questLine.questSteps.find((qq) => qq.id === q.id && qq.status === 'completed')
          );
          if (completedQuest && completedQuest.reward) {
            const notification = generateRewardNotification(completedQuest.title, completedQuest.reward.name, 0);
            setShowRewardNotification(notification);
            setTimeout(() => setShowRewardNotification(null), 5000);
          }
        }
      };

      updateQuests();
    }
  }, [questLine, metrics]);

  if (!updatedQuests) {
    return (
      <div style={{ padding: '1.5rem', backgroundColor: '#f9fafb', borderRadius: '0.75rem', textAlign: 'center' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1f2937', marginBottom: '1rem' }}>
          No Active Quest Line
        </h3>
        <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
          Generate a quest line to start your guided goal progression journey
        </p>
        <button
          onClick={onQuestGenerate}
          style={{
            backgroundColor: '#b45309',
            color: 'white',
            border: 'none',
            padding: '0.75rem 1.5rem',
            borderRadius: '0.375rem',
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '0.875rem',
          }}
        >
          Generate Quest Line
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '1.5rem', backgroundColor: '#f9fafb', borderRadius: '0.75rem' }}>
      {/* Reward Notification */}
      {showRewardNotification && (
        <div
          style={{
            backgroundColor: '#fef3c7',
            border: '2px solid #fcd34d',
            borderRadius: '0.5rem',
            padding: '1rem',
            marginBottom: '1.5rem',
            animation: 'slideDown 0.3s ease-out',
          }}
        >
          <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: '600', color: '#78350f' }}>
            {showRewardNotification}
          </p>
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <h3 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1f2937', margin: 0 }}>
            🎮 Quest Line: {updatedQuests.targetGoal}
          </h3>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => {
                if (questLine && metrics) {
                  const updated = updateQuestStates(questLine, metrics);
                  updated.then((result) => setUpdatedQuests(result));
                }
              }}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#f59e0b',
                color: 'white',
                border: 'none',
                borderRadius: '0.375rem',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: '600',
                transition: 'background-color 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#d97706')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#f59e0b')}
            >
              🔄 Refresh Progress
            </button>
            <button
              onClick={onRegenerateQuest}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#8b5cf6',
                color: 'white',
                border: 'none',
                borderRadius: '0.375rem',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: '600',
                transition: 'background-color 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#7c3aed')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#8b5cf6')}
            >
              ♻️ Regenerate Quest
            </button>
          </div>
        </div>
        <p style={{ color: '#6b7280', fontSize: '0.875rem', margin: 0 }}>
          Target: ${updatedQuests.targetRevenue.toLocaleString()} • Quarter: {updatedQuests.quarter}
        </p>
      </div>

      {/* Overall Progress Bar */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
          <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>Quest Line Progress</span>
          <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#b45309' }}>
            {updatedQuests.lineProgress}%
          </span>
        </div>
        <div
          style={{
            width: '100%',
            height: '0.75rem',
            backgroundColor: '#e5e7eb',
            borderRadius: '0.375rem',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${updatedQuests.lineProgress}%`,
              height: '100%',
              backgroundColor: '#b45309',
              transition: 'width 0.3s ease',
            }}
          />
        </div>

        {/* Progress Context */}
        {activeQuest && (
          <div
            style={{
              marginTop: '1rem',
              padding: '0.75rem 1rem',
              backgroundColor: '#fef3c7',
              borderRadius: '0.375rem',
              fontSize: '0.875rem',
              color: '#78350f',
            }}
          >
            <p style={{ margin: 0, fontWeight: '600', marginBottom: '0.25rem' }}>
              📊 Current Focus: {activeQuest.title}
            </p>
            <p style={{ margin: 0, fontSize: '0.8125rem' }}>
              Progress: {activeQuest.progress}% • Target: {activeQuest.metricTarget.toLocaleString()} {activeQuest.metricType}
            </p>
          </div>
        )}
      </div>

      {/* Quest Steps */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {updatedQuests.questSteps.map((quest, idx) => {
          const isActive = quest.status === 'active';
          const isCompleted = quest.status === 'completed';
          const isLocked = quest.status === 'locked';
          
          // Check tier-based access
          const hasAccess = canAccessQuest(quest.requiredTier, organizationPlan || 'starter');
          const isLockedByTier = !hasAccess;

          const statusColor = isCompleted ? '#16a34a' : isActive ? '#b45309' : '#d1d5db';
          const statusIcon = isCompleted ? '✅' : isActive ? '⚡' : '🔒';

          return (
            <div
              key={quest.id}
              style={{
                backgroundColor: 'white',
                borderRadius: '0.5rem',
                overflow: 'hidden',
                border: `2px solid ${statusColor}`,
                opacity: (isLocked || isLockedByTier) ? 0.6 : 1,
              }}
            >
              {/* Quest Header */}
              <div
                style={{
                  backgroundColor: isCompleted ? '#dcfce7' : isActive ? '#fef3c7' : '#f3f4f6',
                  padding: '1rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'start',
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '1.5rem' }}>{statusIcon}</span>
                    <div>
                      <h4 style={{ fontSize: '1rem', fontWeight: '700', color: '#1f2937', margin: 0 }}>
                        {quest.title}
                      </h4>
                      <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '0.25rem 0 0 0' }}>
                        Quest {quest.questIndex} of {updatedQuests.questSteps.length}
                      </p>
                    </div>
                  </div>
                  <p style={{ fontSize: '0.875rem', color: '#374151', margin: '0.5rem 0 0 0' }}>
                    {quest.description}
                  </p>
                </div>

                {/* Difficulty & Tier Badges */}
                <div style={{ display: 'flex', gap: '0.5rem', marginLeft: '1rem', flexDirection: 'column' }}>
                  <div
                    style={{
                      display: 'inline-block',
                      padding: '0.25rem 0.75rem',
                      backgroundColor: statusColor,
                      color: 'white',
                      borderRadius: '0.25rem',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      textTransform: 'uppercase',
                    }}
                  >
                    {quest.difficulty}
                  </div>
                  {quest.requiredTier && quest.requiredTier !== 'starter' && (
                    <div
                      style={{
                        display: 'inline-block',
                        padding: '0.25rem 0.75rem',
                        backgroundColor: isLockedByTier ? '#ef4444' : '#8b5cf6',
                        color: 'white',
                        borderRadius: '0.25rem',
                        fontSize: '0.65rem',
                        fontWeight: '600',
                        textTransform: 'uppercase',
                      }}
                    >
                      {quest.requiredTier} ✦
                    </div>
                  )}
                </div>
              </div>

              {/* Quest Details */}
              {!isLocked && !isLockedByTier && (
                <div style={{ padding: '1rem', borderTop: `1px solid ${statusColor}` }}>
                  {/* Objective */}
                  <div style={{ marginBottom: '1rem' }}>
                    <p style={{ fontSize: '0.875rem', fontWeight: '600', color: '#1f2937', margin: '0 0 0.5rem 0' }}>
                      📍 Objective
                    </p>
                    <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>{quest.objective}</p>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '0.75rem',
                        color: '#9ca3af',
                        marginTop: '0.5rem',
                      }}
                    >
                      <span>Target: {quest.metricTarget.toLocaleString()}</span>
                      <span>Progress: {quest.progress}%</span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div style={{ marginBottom: '1rem' }}>
                    <div
                      style={{
                        width: '100%',
                        height: '0.5rem',
                        backgroundColor: '#e5e7eb',
                        borderRadius: '0.25rem',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          width: `${quest.progress}%`,
                          height: '100%',
                          backgroundColor: statusColor,
                          transition: 'width 0.3s ease',
                        }}
                      />
                    </div>
                  </div>

                  {/* Action Items */}
                  <div style={{ marginBottom: '1rem' }}>
                    <p style={{ fontSize: '0.875rem', fontWeight: '600', color: '#1f2937', margin: '0 0 0.5rem 0' }}>
                      ✓ Action Items
                    </p>
                    <ul
                      style={{
                        listStyle: 'none',
                        padding: 0,
                        margin: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.33rem',
                      }}
                    >
                      {quest.actionItems.map((item, i) => (
                        <li
                          key={i}
                          style={{
                            fontSize: '0.75rem',
                            color: '#6b7280',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                          }}
                        >
                          <span
                            style={{
                              display: 'inline-block',
                              width: '0.5rem',
                              height: '0.5rem',
                              backgroundColor: i < Math.floor((quest.progress / 25)) ? statusColor : '#d1d5db',
                              borderRadius: '50%',
                            }}
                          />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* AI Insight & Reward */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '0.75rem',
                      backgroundColor: '#f9fafb',
                      borderRadius: '0.25rem',
                      marginBottom: '0.75rem',
                    }}
                  >
                    <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: 0, flex: 1 }}>
                      💡 {generateQuestInsight(quest, quest.progress)}
                    </p>
                    {isCompleted && (
                      <div style={{ marginLeft: '1rem', textAlign: 'right' }}>
                        <div style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>{quest.reward.icon}</div>
                        <p style={{ fontSize: '0.65rem', fontWeight: '600', color: '#16a34a', margin: 0 }}>
                          {quest.reward.name}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  {isCompleted && (
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                      <button
                        onClick={() => onClaimReward?.(quest.id, quest.reward)}
                        style={{
                          flex: 1,
                          padding: '0.5rem 1rem',
                          backgroundColor: '#16a34a',
                          color: 'white',
                          border: 'none',
                          borderRadius: '0.375rem',
                          cursor: 'pointer',
                          fontWeight: '600',
                          fontSize: '0.875rem',
                          transition: 'background-color 0.2s',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#15803d')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#16a34a')}
                      >
                        🏆 Claim Reward
                      </button>
                    </div>
                  )}
                </div>
              )}

              {(isLocked || isLockedByTier) && (
                <div
                  style={{
                    padding: '1rem',
                    textAlign: 'center',
                    color: '#9ca3af',
                    fontSize: '0.75rem',
                    fontStyle: 'italic',
                  }}
                >
                  {isLockedByTier ? (
                    <p>
                      🔐 {quest.requiredTier?.toUpperCase()} Plan Required
                      <br />
                      <span style={{ fontSize: '0.65rem' }}>Upgrade your plan to unlock this quest</span>
                    </p>
                  ) : (
                    <p>Complete the previous quest to unlock</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Completion Message */}
      {updatedQuests.lineProgress === 100 && (
        <div
          style={{
            marginTop: '2rem',
            padding: '1.5rem',
            backgroundColor: '#fef3c7',
            border: '2px solid #fcd34d',
            borderRadius: '0.5rem',
            textAlign: 'center',
          }}
        >
          <p style={{ fontSize: '1.5rem', margin: '0 0 0.5rem 0' }}>🎉🏆🎉</p>
          <p style={{ fontSize: '1rem', fontWeight: '700', color: '#78350f', margin: 0 }}>
            Quest Line Complete!
          </p>
          <p style={{ fontSize: '0.875rem', color: '#92400e', margin: '0.5rem 0 0 0' }}>
            You've achieved your goal of ${updatedQuests.targetRevenue.toLocaleString()} for {updatedQuests.quarter}
          </p>
        </div>
      )}

      {/* Completed Quests Section */}
      {completedQuests && completedQuests.length > 0 && (
        <div style={{ marginTop: '2.5rem', paddingTop: '1.5rem', borderTop: '2px solid #e5e7eb' }}>
          <h4 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#1f2937', margin: '0 0 1.5rem 0' }}>
            ✅ Completed Quests ({completedQuests.length})
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {completedQuests.map((quest) => (
              <div
                key={quest.id}
                style={{
                  backgroundColor: '#dcfce7',
                  border: '2px solid #86efac',
                  borderRadius: '0.5rem',
                  padding: '1rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '1rem', fontWeight: '700', color: '#166534', margin: '0 0 0.25rem 0' }}>
                      ✅ {quest.title}
                    </p>
                    <p style={{ fontSize: '0.875rem', color: '#165e3a', margin: '0 0 0.5rem 0' }}>
                      Quarter: {quest.quarter} • Target: ${quest.target_amount?.toLocaleString() || 'N/A'}
                    </p>
                    {quest.completed_by && (
                      <p style={{ fontSize: '0.75rem', color: '#15803d', margin: '0 0 0.25rem 0' }}>
                        ✊ Team Effort
                      </p>
                    )}
                    {quest.contributors && (
                      <div style={{ position: 'relative', display: 'inline-block', width: '100%' }}>
                        <p 
                          style={{ fontSize: '0.75rem', color: '#15803d', margin: 0, cursor: 'help' }}
                          title={(() => {
                            try {
                              const contributors = JSON.parse(quest.contributors);
                              return 'Team: ' + contributors.map((c: any) => c.name || c.email).join(', ');
                            } catch {
                              return 'Team members contributed';
                            }
                          })()}
                        >
                          👥 {JSON.parse(quest.contributors).length} team member{JSON.parse(quest.contributors).length > 1 ? 's' : ''} contributed: {(() => {
                            try {
                              const contributors = JSON.parse(quest.contributors);
                              return contributors.map((c: any) => c.name || c.email).join(', ');
                            } catch {
                              return 'View quest details';
                            }
                          })()}
                        </p>
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign: 'right', marginLeft: '1rem' }}>
                    <div style={{ fontSize: '2rem' }}>🏆</div>
                    <p style={{ fontSize: '0.75rem', color: '#15803d', fontWeight: '600', margin: 0 }}>
                      {new Date(quest.completed_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

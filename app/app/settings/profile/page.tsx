"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabaseClient';
import { FaPlay, FaCheckCircle, FaClock, FaBook, FaTrophy } from 'react-icons/fa';

interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  department: string | null;
}

interface TrainingAssignment {
  id: string;
  status: string | null;
  due_date: string | null;
  assigned_at: string | null;
  completed_at: string | null;
  training_modules: {
    id: string;
    title: string;
    description: string | null;
    youtube_id: string;
    duration: string | null;
    difficulty: string | null;
    category: string;
  };
  training_progress: Array<{
    watched: boolean;
    marked_complete: boolean;
    completed_at: string | null;
  }> | null;
}

export default function ProfilePage() {
  const router = useRouter();
  const supabase = supabaseBrowser();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [assignments, setAssignments] = useState<TrainingAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedVideo, setExpandedVideo] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'assigned' | 'in_progress' | 'completed'>('all');

  useEffect(() => {
    loadProfile();
    loadAssignments();
  }, []);

  async function loadProfile() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth/login');
        return;
      }

      const { data: profileData } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      setProfile(profileData);
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  }

  async function loadAssignments() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('training_assignments')
        .select(`
          *,
          training_modules (*),
          training_progress (*)
        `)
        .eq('user_id', user.id)
        .order('assigned_at', { ascending: false });

      if (error) throw error;
      setAssignments((data as any) || []);
    } catch (error) {
      console.error('Error loading assignments:', error);
    } finally {
      setLoading(false);
    }
  }

  async function toggleComplete(assignmentId: string, moduleId: string, currentStatus: boolean) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const newStatus = !currentStatus;

      // Update or insert progress
      const { error: progressError } = await supabase
        .from('training_progress')
        .upsert({
          assignment_id: assignmentId,
          user_id: user.id,
          module_id: moduleId,
          marked_complete: newStatus,
          completed_at: newStatus ? new Date().toISOString() : null,
          watched: newStatus
        }, {
          onConflict: 'assignment_id'
        });

      if (progressError) throw progressError;

      // Update assignment status
      const { error: assignmentError } = await supabase
        .from('training_assignments')
        .update({
          status: newStatus ? 'completed' : 'in_progress',
          completed_at: newStatus ? new Date().toISOString() : null,
          started_at: new Date().toISOString()
        })
        .eq('id', assignmentId);

      if (assignmentError) throw assignmentError;

      // Reload assignments
      await loadAssignments();
    } catch (error) {
      console.error('Error updating completion:', error);
      alert('Failed to update training progress');
    }
  }

  const filteredAssignments = assignments.filter(a => {
    if (filter === 'all') return true;
    return a.status === filter;
  });

  const stats = {
    total: assignments.length,
    completed: assignments.filter(a => a.status === 'completed').length,
    inProgress: assignments.filter(a => a.status === 'in_progress').length,
    assigned: assignments.filter(a => a.status === 'assigned').length,
  };

  const completionRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

  if (loading) {
    return (
      <div className="p-6" style={{ minHeight: '100vh', background: '#1a1a1a', color: '#e5e5e5' }}>
        <div className="text-center py-12">Loading...</div>
      </div>
    );
  }

  return (
    <div className="p-6" style={{ minHeight: '100vh', background: '#1a1a1a', color: '#e5e5e5' }}>
      {/* Header */}
      <div className="mb-8">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
          <button
            onClick={() => router.push('/app/settings/account')}
            style={{
              padding: '0.5rem 1rem',
              background: '#2a2a2a',
              border: '1px solid #333333',
              borderRadius: '6px',
              color: '#e5e5e5',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            ← Back
          </button>
          <h1 style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0, color: '#f3f4f6' }}>
            My Profile
          </h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <p style={{ fontSize: '0.9375rem', color: '#9ca3af', margin: 0 }}>
            {profile?.email} • {profile?.role === 'manager' ? '👔 Manager' : '👤 Associate'} • {profile?.department?.toUpperCase()}
          </p>
          <button
            onClick={async () => {
              if (!profile?.id) {
                alert('Profile not loaded. Please refresh the page.');
                return;
              }
              
              const newRole = profile.role === 'manager' ? 'associate' : 'manager';
              
              // If switching to manager, require password
              if (newRole === 'manager') {
                const password = prompt('Enter manager password to switch to manager role:');
                const savedPassword = localStorage.getItem('managerPassword') || 'BrightNewSound';
                if (password !== savedPassword) {
                  alert('Incorrect password');
                  return;
                }
              }
              
              if (confirm(`Change role to ${newRole}?`)) {
                const { data, error } = await supabase
                  .from('user_profiles')
                  .update({ role: newRole })
                  .eq('id', profile.id);
                
                if (error) {
                  console.error('Error updating role:', error);
                  alert(`Failed to update role: ${error.message}`);
                } else {
                  alert(`Role changed to ${newRole}`);
                  // Reload page to update navigation
                  window.location.reload();
                }
              }
            }}
            style={{
              padding: '0.375rem 0.75rem',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              border: 'none',
              borderRadius: '6px',
              color: 'white',
              cursor: 'pointer',
              fontSize: '0.75rem',
              fontWeight: '500'
            }}
          >
            Switch to {profile?.role === 'manager' ? 'Associate' : 'Manager'}
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div style={{
          background: '#2a2a2a',
          border: '1px solid #333333',
          borderRadius: '8px',
          padding: '1rem'
        }}>
          <div style={{ fontSize: '0.875rem', color: '#9ca3af', marginBottom: '0.5rem' }}>
            Total Trainings
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#667eea' }}>
            {stats.total}
          </div>
        </div>

        <div style={{
          background: '#2a2a2a',
          border: '1px solid #333333',
          borderRadius: '8px',
          padding: '1rem'
        }}>
          <div style={{ fontSize: '0.875rem', color: '#9ca3af', marginBottom: '0.5rem' }}>
            Completed
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#10b981' }}>
            {stats.completed}
          </div>
        </div>

        <div style={{
          background: '#2a2a2a',
          border: '1px solid #333333',
          borderRadius: '8px',
          padding: '1rem'
        }}>
          <div style={{ fontSize: '0.875rem', color: '#9ca3af', marginBottom: '0.5rem' }}>
            In Progress
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#f59e0b' }}>
            {stats.inProgress}
          </div>
        </div>

        <div style={{
          background: '#2a2a2a',
          border: '1px solid #333333',
          borderRadius: '8px',
          padding: '1rem'
        }}>
          <div style={{ fontSize: '0.875rem', color: '#9ca3af', marginBottom: '0.5rem' }}>
            Completion Rate
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#667eea' }}>
            {completionRate}%
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      {stats.total > 0 && (
        <div className="mb-8" style={{
          background: '#2a2a2a',
          border: '1px solid #333333',
          borderRadius: '8px',
          padding: '1.5rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FaTrophy color="#f59e0b" size={20} />
              <span style={{ fontSize: '1rem', fontWeight: '600', color: '#f3f4f6' }}>
                Training Progress
              </span>
            </div>
            <span style={{ fontSize: '0.875rem', color: '#9ca3af' }}>
              {stats.completed} of {stats.total} completed
            </span>
          </div>
          <div style={{
            width: '100%',
            height: '24px',
            background: '#1a1a1a',
            borderRadius: '12px',
            overflow: 'hidden'
          }}>
            <div style={{
              width: `${completionRate}%`,
              height: '100%',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              transition: 'width 0.3s ease'
            }} />
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="mb-6">
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {(['all', 'assigned', 'in_progress', 'completed'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: '0.5rem 1rem',
                background: filter === f ? '#667eea' : '#2a2a2a',
                border: '1px solid',
                borderColor: filter === f ? '#667eea' : '#333333',
                borderRadius: '6px',
                color: filter === f ? 'white' : '#e5e5e5',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: '500'
              }}
            >
              {f === 'all' ? 'All' : f === 'in_progress' ? 'In Progress' : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Assigned Trainings */}
      <div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem', color: '#f3f4f6' }}>
          {filter === 'all' ? 'All Assigned Trainings' : 
           filter === 'assigned' ? 'New Assignments' :
           filter === 'in_progress' ? 'In Progress' :
           'Completed Trainings'}
        </h2>

        {filteredAssignments.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '3rem',
            background: '#2a2a2a',
            borderRadius: '8px',
            border: '1px solid #333333'
          }}>
            <FaBook size={48} color="#9ca3af" style={{ margin: '0 auto 1rem' }} />
            <p style={{ color: '#9ca3af' }}>
              {filter === 'all' ? 'No training assignments yet' :
               filter === 'completed' ? 'No completed trainings yet' :
               `No ${filter.replace('_', ' ')} trainings`}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredAssignments.map((assignment) => {
              const progress = assignment.training_progress?.[0];
              const isComplete = progress?.marked_complete || false;

              return (
                <div
                  key={assignment.id}
                  style={{
                    background: '#2a2a2a',
                    border: '1px solid #333333',
                    borderRadius: '8px',
                    overflow: 'hidden'
                  }}
                >
                  <div style={{
                    padding: '1.25rem',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '1rem'
                  }}>
                    {/* Thumbnail */}
                    <div style={{
                      width: '120px',
                      height: '67px',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      position: 'relative',
                      cursor: 'pointer'
                    }}
                    onClick={() => setExpandedVideo(expandedVideo === assignment.id ? null : assignment.id)}
                    >
                      <FaPlay color="white" size={24} />
                      <div style={{
                        position: 'absolute',
                        bottom: '4px',
                        right: '4px',
                        background: 'rgba(0,0,0,0.7)',
                        color: 'white',
                        padding: '2px 6px',
                        borderRadius: '3px',
                        fontSize: '0.75rem',
                        fontWeight: 'bold'
                      }}>
                        {assignment.training_modules.duration}
                      </div>
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1 }}>
                      <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem', fontWeight: '600', color: '#f3f4f6' }}>
                        {assignment.training_modules.title}
                      </h3>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                        <span style={{
                          padding: '0.25rem 0.75rem',
                          background: '#333333',
                          color: '#9ca3af',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          fontWeight: '500'
                        }}>
                          {assignment.training_modules.category}
                        </span>

                        <span style={{
                          padding: '0.25rem 0.75rem',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          fontWeight: '500',
                          border: '1px solid',
                          ...(() => {
                            const difficulty = assignment.training_modules.difficulty;
                            return {
                              background: difficulty === 'beginner' ? '#064e3b' : difficulty === 'intermediate' ? '#0c2d6b' : '#5f1313',
                              color: difficulty === 'beginner' ? '#6ee7b7' : difficulty === 'intermediate' ? '#60a5fa' : '#f87171',
                              borderColor: difficulty === 'beginner' ? '#059669' : difficulty === 'intermediate' ? '#2563eb' : '#dc2626'
                            };
                          })()
                        }}>
                          {assignment.training_modules.difficulty}
                        </span>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#9ca3af', fontSize: '0.875rem' }}>
                          <FaClock size={14} />
                          <span>Assigned {assignment.assigned_at ? new Date(assignment.assigned_at).toLocaleDateString() : 'N/A'}</span>
                        </div>
                      </div>

                      <p style={{ margin: 0, fontSize: '0.875rem', color: '#9ca3af', lineHeight: '1.4' }}>
                        {assignment.training_modules.description}
                      </p>
                    </div>

                    {/* Checkbox */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                      <button
                        onClick={() => toggleComplete(assignment.id, assignment.training_modules.id, isComplete)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '0.5rem'
                        }}
                      >
                        <FaCheckCircle
                          size={32}
                          color={isComplete ? '#10b981' : '#4b5563'}
                        />
                      </button>
                      <span style={{
                        fontSize: '0.75rem',
                        color: isComplete ? '#10b981' : '#9ca3af',
                        fontWeight: '500'
                      }}>
                        {isComplete ? 'Complete' : 'Mark Done'}
                      </span>
                    </div>
                  </div>

                  {/* Expanded Video Player */}
                  {expandedVideo === assignment.id && (
                    <div style={{
                      padding: '1.5rem',
                      borderTop: '1px solid #333333',
                      background: '#1a1a1a'
                    }}>
                      <iframe
                        width="100%"
                        height="400"
                        src={`https://www.youtube.com/embed/${assignment.training_modules.youtube_id}`}
                        title={assignment.training_modules.title}
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        style={{ borderRadius: '8px' }}
                      />
                      <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem' }}>
                        <button
                          onClick={() => window.open(`https://www.youtube.com/watch?v=${assignment.training_modules.youtube_id}`, '_blank')}
                          style={{
                            padding: '0.625rem 1.5rem',
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '0.875rem',
                            fontWeight: '500'
                          }}
                        >
                          Watch on YouTube
                        </button>
                        {!isComplete && (
                          <button
                            onClick={() => toggleComplete(assignment.id, assignment.training_modules.id, false)}
                            style={{
                              padding: '0.625rem 1.5rem',
                              background: '#10b981',
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontSize: '0.875rem',
                              fontWeight: '500'
                            }}
                          >
                            Mark as Complete
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

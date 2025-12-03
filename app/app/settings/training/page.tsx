"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabaseClient';
import Link from 'next/link';
import { FaPlay, FaCheckCircle, FaClock, FaBook, FaTrophy, FaArrowLeft } from 'react-icons/fa';

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
  training_progress: {
    watched: boolean | null;
    marked_complete: boolean | null;
    completed_at: string | null;
  } | null;
}

export default function SettingsTrainingPage() {
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
      <div style={{ padding: '2rem', minHeight: '100vh', background: '#f9fafb' }}>
        <div style={{ textAlign: 'center', paddingTop: '3rem' }}>Loading...</div>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', minHeight: '100vh', background: '#f9fafb' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
          <button
            onClick={() => router.back()}
            style={{
              padding: '0.5rem 1rem',
              background: '#fff',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              color: '#374151',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <FaArrowLeft />
            Back
          </button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <Link 
                href="/app/dashboard" 
                style={{ 
                  color: '#666', 
                  textDecoration: 'none',
                  fontSize: '0.875rem'
                }}
              >
                Dashboard
              </Link>
              <span style={{ color: '#999' }}>/</span>
              <Link 
                href="/app/settings/account" 
                style={{ 
                  color: '#666', 
                  textDecoration: 'none',
                  fontSize: '0.875rem'
                }}
              >
                Settings
              </Link>
              <span style={{ color: '#999' }}>/</span>
              <span style={{ color: '#333', fontSize: '0.875rem' }}>Training</span>
            </div>
            <h1 style={{ margin: 0, fontSize: '1.875rem', fontWeight: 600 }}>My Training</h1>
          </div>
        </div>
        <p style={{ fontSize: '0.9375rem', color: '#6b7280', margin: 0 }}>
          {profile?.email} • {profile?.role === 'manager' ? '👔 Manager' : '👤 Associate'} • {profile?.department?.toUpperCase()}
        </p>
      </div>

      {/* Stats Cards */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
        gap: '1rem', 
        marginBottom: '2rem' 
      }}>
        <div style={{
          background: '#fff',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          padding: '1.5rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <FaBook color="#667eea" />
            <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>Total Assigned</span>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#667eea' }}>
            {stats.total}
          </div>
        </div>

        <div style={{
          background: '#fff',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          padding: '1.5rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <FaCheckCircle color="#10b981" />
            <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>Completed</span>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#10b981' }}>
            {stats.completed}
          </div>
        </div>

        <div style={{
          background: '#fff',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          padding: '1.5rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <FaClock color="#f59e0b" />
            <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>In Progress</span>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#f59e0b' }}>
            {stats.inProgress}
          </div>
        </div>

        <div style={{
          background: '#fff',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          padding: '1.5rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <FaTrophy color="#8b5cf6" />
            <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>Completion Rate</span>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#8b5cf6' }}>
            {completionRate}%
          </div>
        </div>
      </div>

      {/* Filter Buttons */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        {(['all', 'assigned', 'in_progress', 'completed'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: '0.5rem 1rem',
              background: filter === f ? '#667eea' : '#fff',
              color: filter === f ? '#fff' : '#374151',
              border: '1px solid',
              borderColor: filter === f ? '#667eea' : '#d1d5db',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: '500'
            }}
          >
            {f === 'all' ? 'All' : f.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
          </button>
        ))}
      </div>

      {/* Training Assignments */}
      <div style={{
        background: '#fff',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        padding: '1.5rem'
      }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem' }}>
          Training Assignments
        </h2>

        {filteredAssignments.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '3rem', 
            color: '#6b7280' 
          }}>
            <FaBook size={48} color="#d1d5db" style={{ marginBottom: '1rem' }} />
            <p style={{ margin: 0, fontSize: '1rem' }}>
              {filter === 'all' 
                ? 'No training assigned yet.' 
                : `No ${filter.replace('_', ' ')} training.`}
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '1rem' }}>
            {filteredAssignments.map(assignment => {
              const isExpanded = expandedVideo === assignment.id;
              const progressData = Array.isArray(assignment.training_progress) 
                ? assignment.training_progress[0] 
                : assignment.training_progress;
              const isCompleted = progressData?.marked_complete || false;
              
              return (
                <div
                  key={assignment.id}
                  style={{
                    background: '#f9fafb',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    padding: '1rem',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: '#111827' }}>
                          {assignment.training_modules.title}
                        </h3>
                        <span style={{
                          padding: '0.25rem 0.75rem',
                          background: assignment.status === 'completed' ? '#d1fae5' :
                                     assignment.status === 'in_progress' ? '#dbeafe' : '#fee2e2',
                          color: assignment.status === 'completed' ? '#065f46' :
                                 assignment.status === 'in_progress' ? '#1e40af' : '#991b1b',
                          borderRadius: '9999px',
                          fontSize: '0.75rem',
                          fontWeight: '500'
                        }}>
                          {assignment.status?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </span>
                      </div>
                      <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.875rem', color: '#6b7280' }}>
                        {assignment.training_modules.description}
                      </p>
                      <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', color: '#9ca3af' }}>
                        <span>{assignment.training_modules.category}</span>
                        <span>•</span>
                        <span>{assignment.training_modules.difficulty}</span>
                        <span>•</span>
                        <span>{assignment.training_modules.duration}</span>
                        {assignment.due_date && (
                          <>
                            <span>•</span>
                            <span>Due: {new Date(assignment.due_date).toLocaleDateString()}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                      <button
                        onClick={() => setExpandedVideo(isExpanded ? null : assignment.id)}
                        style={{
                          padding: '0.5rem 1rem',
                          background: '#667eea',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '0.875rem',
                          fontWeight: '500',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem'
                        }}
                      >
                        <FaPlay size={12} />
                        {isExpanded ? 'Hide' : 'Watch'}
                      </button>
                      <button
                        onClick={() => toggleComplete(assignment.id, assignment.training_modules.id, isCompleted)}
                        style={{
                          padding: '0.5rem 1rem',
                          background: isCompleted ? '#10b981' : '#fff',
                          color: isCompleted ? '#fff' : '#374151',
                          border: '1px solid',
                          borderColor: isCompleted ? '#10b981' : '#d1d5db',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '0.875rem',
                          fontWeight: '500',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem'
                        }}
                      >
                        <FaCheckCircle size={14} />
                        {isCompleted ? 'Completed' : 'Mark Complete'}
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div style={{ marginTop: '1rem' }}>
                      <div style={{
                        position: 'relative',
                        paddingBottom: '56.25%',
                        height: 0,
                        overflow: 'hidden',
                        borderRadius: '8px'
                      }}>
                        <iframe
                          src={`https://www.youtube.com/embed/${assignment.training_modules.youtube_id}`}
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            border: 'none'
                          }}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Note about tests */}
      <div style={{
        marginTop: '2rem',
        background: '#eff6ff',
        border: '1px solid #bfdbfe',
        borderRadius: '8px',
        padding: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
          <FaTrophy color="#2563eb" size={20} />
          <div>
            <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '0.9375rem', fontWeight: 600, color: '#1e40af' }}>
              Knowledge Tests Coming Soon
            </h3>
            <p style={{ margin: 0, fontSize: '0.875rem', color: '#1e40af' }}>
              After completing your training videos, you'll be able to take knowledge tests to certify your understanding. 
              Test results will be automatically sent to your manager's dashboard.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

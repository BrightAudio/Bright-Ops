"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabaseClient';
import { FaUserPlus, FaUsers, FaChartBar, FaBook, FaCheckCircle, FaClock } from 'react-icons/fa';

interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  department: string | null;
}

interface TrainingModule {
  id: string;
  title: string;
  description: string | null;
  category: string;
  difficulty: string | null;
  department: string;
  duration: string | null;
}

interface AssignmentWithUser {
  id: string;
  user_id: string;
  status: string | null;
  assigned_at: string | null;
  completed_at: string | null;
  user_profiles: {
    email: string;
    full_name: string | null;
    department: string;
  };
  training_modules: {
    title: string;
    category: string;
  };
}

export default function TrainingManagerPage() {
  const router = useRouter();
  const supabase = supabaseBrowser();
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [associates, setAssociates] = useState<UserProfile[]>([]);
  const [modules, setModules] = useState<TrainingModule[]>([]);
  const [assignments, setAssignments] = useState<AssignmentWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAssociate, setSelectedAssociate] = useState<string>('');
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [filterDepartment, setFilterDepartment] = useState<'all' | 'warehouse' | 'leads' | 'both'>('all');
  const [activeTab, setActiveTab] = useState<'overview' | 'by-associate' | 'by-training'>('overview');
  const [selectedAssociateView, setSelectedAssociateView] = useState<string>('');

  useEffect(() => {
    checkAccess();
  }, []);

  async function checkAccess() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth/login');
        return;
      }

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (!profile || profile.role !== 'manager') {
        alert('Access denied. Manager role required.');
        router.push('/app/settings/profile');
        return;
      }

      setCurrentUser(profile);
      await Promise.all([loadAssociates(), loadModules(), loadAssignments()]);
    } catch (error) {
      console.error('Error checking access:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadAssociates() {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('role', 'associate')
      .order('email');

    if (error) {
      console.error('Error loading associates:', error);
    } else {
      console.log('Loaded associates:', data);
    }
    setAssociates(data || []);
  }

  async function loadModules() {
    const { data } = await supabase
      .from('training_modules')
      .select('*')
      .eq('is_active', true)
      .order('order_index');

    setModules(data || []);
  }

  async function loadAssignments() {
    const { data, error } = await supabase
      .from('training_assignments')
      .select(`
        *,
        user_profiles (email, full_name, department),
        training_modules (title, category)
      `)
      .order('assigned_at', { ascending: false });

    if (error) {
      console.error('Error loading assignments:', error);
    } else {
      console.log('Loaded assignments:', data);
    }
    setAssignments((data as any) || []);
  }

  async function assignTraining() {
    if (!selectedAssociate || selectedModules.length === 0) {
      alert('Please select an associate and at least one training module');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const assignmentsToCreate = selectedModules.map(moduleId => ({
        user_id: selectedAssociate,
        module_id: moduleId,
        assigned_by: user.id,
        due_date: dueDate || null,
        notes,
        status: 'assigned'
      }));

      const { error } = await supabase
        .from('training_assignments')
        .insert(assignmentsToCreate);

      if (error) throw error;

      alert(`Successfully assigned ${selectedModules.length} training(s)`);
      setShowAssignModal(false);
      setSelectedAssociate('');
      setSelectedModules([]);
      setDueDate('');
      setNotes('');
      
      // Reload data to show new assignments
      await Promise.all([loadAssignments(), loadAssociates()]);
    } catch (error: any) {
      console.error('Error assigning training:', error);
      alert(error.message || 'Failed to assign training');
    }
  }

  const toggleModuleSelection = (moduleId: string) => {
    setSelectedModules(prev =>
      prev.includes(moduleId)
        ? prev.filter(id => id !== moduleId)
        : [...prev, moduleId]
    );
  };

  const filteredModules = modules.filter(m => {
    if (filterDepartment === 'all') return true;
    return m.department === filterDepartment || m.department === 'both';
  });

  const stats = {
    totalAssociates: associates.length,
    totalAssignments: assignments.length,
    completedAssignments: assignments.filter(a => a.status === 'completed').length,
    pendingAssignments: assignments.filter(a => a.status === 'assigned' || a.status === 'in_progress').length,
  };

  const completionRate = stats.totalAssignments > 0 
    ? Math.round((stats.completedAssignments / stats.totalAssignments) * 100) 
    : 0;

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
            onClick={() => router.back()}
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
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '2rem', fontWeight: 'bold', margin: '0 0 0.5rem 0', color: '#f3f4f6' }}>
              Training Manager Dashboard
            </h1>
            <p style={{ fontSize: '0.9375rem', color: '#9ca3af', margin: 0 }}>
              Assign and track training for your team
            </p>
          </div>
          <button
            onClick={() => setShowAssignModal(true)}
            style={{
              padding: '0.75rem 1.5rem',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '0.9375rem',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <FaUserPlus />
            Assign Training
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div style={{
          background: '#2a2a2a',
          border: '1px solid #333333',
          borderRadius: '8px',
          padding: '1rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <FaUsers color="#667eea" />
            <span style={{ fontSize: '0.875rem', color: '#9ca3af' }}>Associates</span>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#667eea' }}>
            {stats.totalAssociates}
          </div>
        </div>

        <div style={{
          background: '#2a2a2a',
          border: '1px solid #333333',
          borderRadius: '8px',
          padding: '1rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <FaBook color="#f59e0b" />
            <span style={{ fontSize: '0.875rem', color: '#9ca3af' }}>Total Assignments</span>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#f59e0b' }}>
            {stats.totalAssignments}
          </div>
        </div>

        <div style={{
          background: '#2a2a2a',
          border: '1px solid #333333',
          borderRadius: '8px',
          padding: '1rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <FaCheckCircle color="#10b981" />
            <span style={{ fontSize: '0.875rem', color: '#9ca3af' }}>Completed</span>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#10b981' }}>
            {stats.completedAssignments}
          </div>
        </div>

        <div style={{
          background: '#2a2a2a',
          border: '1px solid #333333',
          borderRadius: '8px',
          padding: '1rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <FaChartBar color="#8b5cf6" />
            <span style={{ fontSize: '0.875rem', color: '#9ca3af' }}>Completion Rate</span>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#8b5cf6' }}>
            {completionRate}%
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '2px solid #333333' }}>
          <button
            onClick={() => setActiveTab('overview')}
            style={{
              padding: '0.75rem 1.5rem',
              background: 'transparent',
              border: 'none',
              borderBottom: '2px solid',
              borderBottomColor: activeTab === 'overview' ? '#667eea' : 'transparent',
              color: activeTab === 'overview' ? '#667eea' : '#9ca3af',
              cursor: 'pointer',
              fontSize: '0.9375rem',
              fontWeight: '600',
              marginBottom: '-2px'
            }}
          >
            Recent Assignments
          </button>
          <button
            onClick={() => setActiveTab('by-associate')}
            style={{
              padding: '0.75rem 1.5rem',
              background: 'transparent',
              border: 'none',
              borderBottom: '2px solid',
              borderBottomColor: activeTab === 'by-associate' ? '#667eea' : 'transparent',
              color: activeTab === 'by-associate' ? '#667eea' : '#9ca3af',
              cursor: 'pointer',
              fontSize: '0.9375rem',
              fontWeight: '600',
              marginBottom: '-2px'
            }}
          >
            Team Progress
          </button>
          <button
            onClick={() => setActiveTab('by-training')}
            style={{
              padding: '0.75rem 1.5rem',
              background: 'transparent',
              border: 'none',
              borderBottom: '2px solid',
              borderBottomColor: activeTab === 'by-training' ? '#667eea' : 'transparent',
              color: activeTab === 'by-training' ? '#667eea' : '#9ca3af',
              cursor: 'pointer',
              fontSize: '0.9375rem',
              fontWeight: '600',
              marginBottom: '-2px'
            }}
          >
            By Training Module
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div style={{
          background: '#2a2a2a',
          border: '1px solid #333333',
          borderRadius: '8px',
          padding: '1.5rem'
        }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem', color: '#f3f4f6' }}>
            Recent Assignments
          </h2>

          {assignments.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af' }}>
              No assignments yet. Click "Assign Training" to get started.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #333333' }}>
                    <th style={{ padding: '0.75rem', textAlign: 'left', color: '#9ca3af', fontSize: '0.875rem', fontWeight: '500' }}>
                      Associate
                    </th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', color: '#9ca3af', fontSize: '0.875rem', fontWeight: '500' }}>
                      Training
                    </th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', color: '#9ca3af', fontSize: '0.875rem', fontWeight: '500' }}>
                      Category
                    </th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', color: '#9ca3af', fontSize: '0.875rem', fontWeight: '500' }}>
                      Department
                    </th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', color: '#9ca3af', fontSize: '0.875rem', fontWeight: '500' }}>
                      Status
                    </th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', color: '#9ca3af', fontSize: '0.875rem', fontWeight: '500' }}>
                      Assigned
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {assignments.slice(0, 20).map(assignment => (
                    <tr key={assignment.id} style={{ borderBottom: '1px solid #333333' }}>
                      <td style={{ padding: '0.75rem', fontSize: '0.875rem', color: '#e5e5e5' }}>
                        {assignment.user_profiles.full_name || assignment.user_profiles.email}
                      </td>
                      <td style={{ padding: '0.75rem', fontSize: '0.875rem', color: '#e5e5e5' }}>
                        {assignment.training_modules.title}
                      </td>
                      <td style={{ padding: '0.75rem' }}>
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
                      </td>
                      <td style={{ padding: '0.75rem', fontSize: '0.875rem', color: '#e5e5e5' }}>
                        {assignment.user_profiles.department?.toUpperCase()}
                      </td>
                      <td style={{ padding: '0.75rem' }}>
                        <span style={{
                          padding: '0.25rem 0.75rem',
                          background: assignment.status === 'completed' ? '#064e3b' :
                                     assignment.status === 'in_progress' ? '#0c2d6b' : '#5f1313',
                          color: assignment.status === 'completed' ? '#6ee7b7' :
                                 assignment.status === 'in_progress' ? '#60a5fa' : '#9ca3af',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          fontWeight: '500'
                        }}>
                          {assignment.status?.replace('_', ' ') || 'N/A'}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem', fontSize: '0.875rem', color: '#9ca3af' }}>
                        {assignment.assigned_at ? new Date(assignment.assigned_at!).toLocaleDateString() : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Team Progress by Associate */}
      {activeTab === 'by-associate' && (
        <div>
          {associates.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '3rem',
              background: '#2a2a2a',
              borderRadius: '8px',
              border: '1px solid #333333'
            }}>
              <FaUsers size={48} color="#9ca3af" style={{ margin: '0 auto 1rem' }} />
              <p style={{ color: '#9ca3af' }}>No associates found</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '1rem' }}>
              {associates.map(associate => {
                const associateAssignments = assignments.filter(a => a.user_id === associate.id);
                const completed = associateAssignments.filter(a => a.status === 'completed').length;
                const total = associateAssignments.length;
                const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

                return (
                  <div
                    key={associate.id}
                    style={{
                      background: '#2a2a2a',
                      border: '1px solid #333333',
                      borderRadius: '8px',
                      overflow: 'hidden'
                    }}
                  >
                    <div
                      onClick={() => setSelectedAssociateView(selectedAssociateView === associate.id ? '' : associate.id)}
                      style={{
                        padding: '1.25rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1rem'
                      }}
                    >
                      <div style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.25rem',
                        fontWeight: 'bold',
                        color: 'white'
                      }}>
                        {(associate.full_name || associate.email).charAt(0).toUpperCase()}
                      </div>

                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '1rem', fontWeight: '600', color: '#f3f4f6', marginBottom: '0.25rem' }}>
                          {associate.full_name || associate.email}
                        </div>
                        <div style={{ fontSize: '0.875rem', color: '#9ca3af' }}>
                          {associate.email} • {associate.department?.toUpperCase()}
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.875rem', color: '#9ca3af', marginBottom: '0.25rem' }}>
                          {completed} / {total} completed
                        </div>
                        <div style={{
                          width: '120px',
                          height: '8px',
                          background: '#1a1a1a',
                          borderRadius: '4px',
                          overflow: 'hidden'
                        }}>
                          <div style={{
                            width: `${completionRate}%`,
                            height: '100%',
                            background: completionRate === 100 ? '#10b981' : completionRate > 50 ? '#f59e0b' : '#667eea',
                            transition: 'width 0.3s ease'
                          }} />
                        </div>
                      </div>

                      <div style={{ fontSize: '1.5rem', color: '#9ca3af' }}>
                        {selectedAssociateView === associate.id ? '▼' : '▶'}
                      </div>
                    </div>

                    {selectedAssociateView === associate.id && associateAssignments.length > 0 && (
                      <div style={{
                        padding: '0 1.25rem 1.25rem 1.25rem',
                        borderTop: '1px solid #333333'
                      }}>
                        <div style={{ overflowX: 'auto', marginTop: '1rem' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                              <tr style={{ borderBottom: '1px solid #333333' }}>
                                <th style={{ padding: '0.75rem', textAlign: 'left', color: '#9ca3af', fontSize: '0.875rem', fontWeight: '500' }}>
                                  Training
                                </th>
                                <th style={{ padding: '0.75rem', textAlign: 'left', color: '#9ca3af', fontSize: '0.875rem', fontWeight: '500' }}>
                                  Category
                                </th>
                                <th style={{ padding: '0.75rem', textAlign: 'left', color: '#9ca3af', fontSize: '0.875rem', fontWeight: '500' }}>
                                  Status
                                </th>
                                <th style={{ padding: '0.75rem', textAlign: 'left', color: '#9ca3af', fontSize: '0.875rem', fontWeight: '500' }}>
                                  Assigned
                                </th>
                                <th style={{ padding: '0.75rem', textAlign: 'left', color: '#9ca3af', fontSize: '0.875rem', fontWeight: '500' }}>
                                  Completed
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {associateAssignments.map(assignment => (
                                <tr key={assignment.id} style={{ borderBottom: '1px solid #333333' }}>
                                  <td style={{ padding: '0.75rem', fontSize: '0.875rem', color: '#e5e5e5' }}>
                                    {assignment.training_modules.title}
                                  </td>
                                  <td style={{ padding: '0.75rem' }}>
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
                                  </td>
                                  <td style={{ padding: '0.75rem' }}>
                                    <span style={{
                                      padding: '0.25rem 0.75rem',
                                      background: assignment.status === 'completed' ? '#064e3b' :
                                                 assignment.status === 'in_progress' ? '#0c2d6b' : '#5f1313',
                                      color: assignment.status === 'completed' ? '#6ee7b7' :
                                             assignment.status === 'in_progress' ? '#60a5fa' : '#9ca3af',
                                      borderRadius: '4px',
                                      fontSize: '0.75rem',
                                      fontWeight: '500'
                                    }}>
                                      {assignment.status?.replace('_', ' ') || 'assigned'}
                                    </span>
                                  </td>
                                  <td style={{ padding: '0.75rem', fontSize: '0.875rem', color: '#9ca3af' }}>
                                    {assignment.assigned_at ? new Date(assignment.assigned_at).toLocaleDateString() : 'N/A'}
                                  </td>
                                  <td style={{ padding: '0.75rem', fontSize: '0.875rem', color: '#9ca3af' }}>
                                    {assignment.completed_at ? new Date(assignment.completed_at).toLocaleDateString() : '-'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {selectedAssociateView === associate.id && associateAssignments.length === 0 && (
                      <div style={{
                        padding: '2rem',
                        textAlign: 'center',
                        color: '#9ca3af',
                        borderTop: '1px solid #333333'
                      }}>
                        No training assigned yet
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* By Training Module */}
      {activeTab === 'by-training' && (
        <div>
          {modules.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '3rem',
              background: '#2a2a2a',
              borderRadius: '8px',
              border: '1px solid #333333'
            }}>
              <FaBook size={48} color="#9ca3af" style={{ margin: '0 auto 1rem' }} />
              <p style={{ color: '#9ca3af' }}>No training modules found</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '1rem' }}>
              {modules.map(module => {
                const moduleAssignments = assignments.filter(a => a.training_modules.title === module.title);
                const completed = moduleAssignments.filter(a => a.status === 'completed').length;
                const total = moduleAssignments.length;

                return (
                  <div
                    key={module.id}
                    style={{
                      background: '#2a2a2a',
                      border: '1px solid #333333',
                      borderRadius: '8px',
                      padding: '1.25rem'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '1rem', fontWeight: '600', color: '#f3f4f6', marginBottom: '0.25rem' }}>
                          {module.title}
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                          <span style={{
                            padding: '0.25rem 0.75rem',
                            background: '#333333',
                            color: '#9ca3af',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: '500'
                          }}>
                            {module.category}
                          </span>
                          <span style={{ fontSize: '0.875rem', color: '#9ca3af' }}>
                            {module.department?.toUpperCase()}
                          </span>
                          <span style={{ fontSize: '0.875rem', color: '#9ca3af' }}>
                            • {module.difficulty}
                          </span>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.875rem', color: '#9ca3af' }}>
                          {total} assigned
                        </div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: completed === total && total > 0 ? '#10b981' : '#667eea' }}>
                          {completed} / {total}
                        </div>
                      </div>
                    </div>

                    {moduleAssignments.length > 0 && (
                      <div style={{ fontSize: '0.875rem', color: '#9ca3af' }}>
                        Assigned to: {moduleAssignments.map(a => a.user_profiles.full_name || a.user_profiles.email).join(', ')}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Recent Assignments */}
      <div style={{
        background: '#2a2a2a',
        border: '1px solid #333333',
        borderRadius: '8px',
        padding: '1.5rem',
        display: 'none'
      }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem', color: '#f3f4f6' }}>
          Recent Assignments
        </h2>

        {assignments.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af' }}>
            No assignments yet. Click "Assign Training" to get started.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #333333' }}>
                  <th style={{ padding: '0.75rem', textAlign: 'left', color: '#9ca3af', fontSize: '0.875rem', fontWeight: '500' }}>
                    Associate
                  </th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', color: '#9ca3af', fontSize: '0.875rem', fontWeight: '500' }}>
                    Training
                  </th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', color: '#9ca3af', fontSize: '0.875rem', fontWeight: '500' }}>
                    Category
                  </th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', color: '#9ca3af', fontSize: '0.875rem', fontWeight: '500' }}>
                    Department
                  </th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', color: '#9ca3af', fontSize: '0.875rem', fontWeight: '500' }}>
                    Status
                  </th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', color: '#9ca3af', fontSize: '0.875rem', fontWeight: '500' }}>
                    Assigned
                  </th>
                </tr>
              </thead>
              <tbody>
                {assignments.slice(0, 20).map(assignment => (
                  <tr key={assignment.id} style={{ borderBottom: '1px solid #333333' }}>
                    <td style={{ padding: '0.75rem', fontSize: '0.875rem', color: '#e5e5e5' }}>
                      {assignment.user_profiles.full_name || assignment.user_profiles.email}
                    </td>
                    <td style={{ padding: '0.75rem', fontSize: '0.875rem', color: '#e5e5e5' }}>
                      {assignment.training_modules.title}
                    </td>
                    <td style={{ padding: '0.75rem' }}>
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
                    </td>
                    <td style={{ padding: '0.75rem', fontSize: '0.875rem', color: '#e5e5e5' }}>
                      {assignment.user_profiles.department?.toUpperCase()}
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      <span style={{
                        padding: '0.25rem 0.75rem',
                        background: assignment.status === 'completed' ? '#064e3b' :
                                   assignment.status === 'in_progress' ? '#0c2d6b' : '#5f1313',
                        color: assignment.status === 'completed' ? '#6ee7b7' :
                               assignment.status === 'in_progress' ? '#60a5fa' : '#9ca3af',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: '500'
                      }}>
                        {assignment.status?.replace('_', ' ') || 'N/A'}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem', fontSize: '0.875rem', color: '#9ca3af' }}>
                      {assignment.assigned_at ? new Date(assignment.assigned_at!).toLocaleDateString() : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Assignment Modal */}
      {showAssignModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999
          }}
          onClick={() => setShowAssignModal(false)}
        >
          <div
            style={{
              background: '#2a2a2a',
              border: '1px solid #333333',
              borderRadius: '12px',
              padding: '2rem',
              width: '90%',
              maxWidth: '800px',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem', color: '#f3f4f6' }}>
              Assign Training
            </h2>

            {/* Select Associate */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#e5e5e5', marginBottom: '0.5rem' }}>
                Select Associate ({selectedAssociate ? '1 selected' : 'None selected'})
              </label>
              <div style={{
                maxHeight: '200px',
                overflowY: 'auto',
                border: '1px solid #333333',
                borderRadius: '6px',
                padding: '0.5rem'
              }}>
                {associates.length === 0 ? (
                  <div style={{ padding: '1rem', textAlign: 'center', color: '#9ca3af' }}>
                    No associates found
                  </div>
                ) : (
                  associates.map(associate => (
                    <div
                      key={associate.id}
                      onClick={() => setSelectedAssociate(associate.id)}
                      style={{
                        padding: '0.75rem',
                        background: selectedAssociate === associate.id ? '#667eea20' : '#1a1a1a',
                        border: '1px solid',
                        borderColor: selectedAssociate === associate.id ? '#667eea' : '#333333',
                        borderRadius: '6px',
                        marginBottom: '0.5rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem'
                      }}
                    >
                      <input
                        type="radio"
                        checked={selectedAssociate === associate.id}
                        onChange={() => {}}
                        style={{ cursor: 'pointer' }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.875rem', fontWeight: '500', color: '#f3f4f6' }}>
                          {associate.full_name || associate.email}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                          {associate.email} • {associate.department?.toUpperCase()}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Department Filter */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#e5e5e5', marginBottom: '0.5rem' }}>
                Filter by Department
              </label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {(['all', 'warehouse', 'leads', 'both'] as const).map(dept => (
                  <button
                    key={dept}
                    onClick={() => setFilterDepartment(dept)}
                    style={{
                      padding: '0.5rem 1rem',
                      background: filterDepartment === dept ? '#667eea' : '#333333',
                      border: 'none',
                      borderRadius: '6px',
                      color: 'white',
                      cursor: 'pointer',
                      fontSize: '0.875rem'
                    }}
                  >
                    {dept === 'all' ? 'All' : dept.charAt(0).toUpperCase() + dept.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Select Modules */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#e5e5e5', marginBottom: '0.5rem' }}>
                Select Training Modules ({selectedModules.length} selected)
              </label>
              <div style={{
                maxHeight: '300px',
                overflowY: 'auto',
                border: '1px solid #333333',
                borderRadius: '6px',
                padding: '0.5rem'
              }}>
                {filteredModules.map(module => (
                  <div
                    key={module.id}
                    onClick={() => toggleModuleSelection(module.id)}
                    style={{
                      padding: '0.75rem',
                      background: selectedModules.includes(module.id) ? '#667eea20' : '#1a1a1a',
                      border: '1px solid',
                      borderColor: selectedModules.includes(module.id) ? '#667eea' : '#333333',
                      borderRadius: '6px',
                      marginBottom: '0.5rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedModules.includes(module.id)}
                      onChange={() => {}}
                      style={{ cursor: 'pointer' }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.875rem', fontWeight: '500', color: '#f3f4f6', marginBottom: '0.25rem' }}>
                        {module.title}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                        {module.category} • {module.difficulty} • {module.duration}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Due Date */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#e5e5e5', marginBottom: '0.5rem' }}>
                Due Date (Optional)
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  background: '#1a1a1a',
                  border: '1px solid #333333',
                  borderRadius: '6px',
                  color: '#e5e5e5'
                }}
              />
            </div>

            {/* Notes */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#e5e5e5', marginBottom: '0.5rem' }}>
                Notes (Optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  background: '#1a1a1a',
                  border: '1px solid #333333',
                  borderRadius: '6px',
                  color: '#e5e5e5',
                  resize: 'vertical'
                }}
                placeholder="Add any instructions or notes..."
              />
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowAssignModal(false)}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: '#333333',
                  border: 'none',
                  borderRadius: '6px',
                  color: '#e5e5e5',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '500'
                }}
              >
                Cancel
              </button>
              <button
                onClick={assignTraining}
                disabled={!selectedAssociate || selectedModules.length === 0}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: selectedAssociate && selectedModules.length > 0
                    ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                    : '#555555',
                  border: 'none',
                  borderRadius: '6px',
                  color: 'white',
                  cursor: selectedAssociate && selectedModules.length > 0 ? 'pointer' : 'not-allowed',
                  fontSize: '0.875rem',
                  fontWeight: '500'
                }}
              >
                Assign Training
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

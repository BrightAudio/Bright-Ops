"use client";

import { useState, useEffect } from "react";
import { useGigCalendar, createGigEvent, CalendarEvent } from "@/lib/hooks/useGigCalendar";
import { useJobs } from "@/lib/hooks/useJobs";
import { supabase } from "@/lib/supabaseClient";

export default function GigCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [availableCrew, setAvailableCrew] = useState<any[]>([]);
  
  const month = currentDate.getMonth();
  const year = currentDate.getFullYear();
  
  const { data: events, loading, error, reload } = useGigCalendar(month, year);

  const errorMessage = error ? String(error) : null;

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const getEventsForDate = (day: number): CalendarEvent[] => {
    if (!events) return [];
    const dateStr = new Date(year, month, day).toISOString().split('T')[0];
    return events.filter(event => event.date.startsWith(dateStr));
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'on-the-road':
      case 'active':
        return 'bg-green-500 text-white';
      case 'in-process':
      case 'scheduled':
      case 'prep':
        return 'bg-yellow-500 text-white';
      case 'completed':
      case 'returned':
        return 'bg-gray-400 text-white';
      default:
        return 'bg-blue-500 text-white';
    }
  };

  const handleAddEvent = (date?: string) => {
    setSelectedDate(date || new Date().toISOString().split('T')[0]);
    setSelectedJobId(null); // Clear selected job for new event
    setShowAddModal(true);
  };

  const handleEditEvent = (event: CalendarEvent, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent day cell click
    console.log('handleEditEvent called with event:', event);
    console.log('Setting selectedJobId to:', event.job_id);
    setSelectedJobId(event.job_id);
    setSelectedDate(event.date);
    setShowAddModal(true);
  };

  // Generate calendar grid
  const calendarDays = [];
  const totalSlots = Math.ceil((firstDayOfMonth + daysInMonth) / 7) * 7;

  for (let i = 0; i < totalSlots; i++) {
    const day = i - firstDayOfMonth + 1;
    if (day > 0 && day <= daysInMonth) {
      calendarDays.push(day);
    } else {
      calendarDays.push(null);
    }
  }

  return (
    <div className="bg-white rounded-lg border border-zinc-300 p-3 md:p-4 shadow-lg">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div className="flex items-center gap-3 md:gap-4">
          <h2 className="text-lg md:text-xl font-bold text-zinc-900">Gig Calendar</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={prevMonth}
              className="p-1.5 md:p-2 hover:bg-zinc-100 rounded transition-colors text-zinc-600 hover:text-zinc-900"
            >
              <i className="fas fa-chevron-left text-sm md:text-base"></i>
            </button>
            <span className="text-zinc-900 font-semibold text-sm md:text-base min-w-[140px] md:min-w-[180px] text-center">
              {monthNames[month]} {year}
            </span>
            <button
              onClick={nextMonth}
              className="p-1.5 md:p-2 hover:bg-zinc-100 rounded transition-colors text-zinc-600 hover:text-zinc-900"
            >
              <i className="fas fa-chevron-right text-sm md:text-base"></i>
            </button>
          </div>
        </div>
        <button
          onClick={() => handleAddEvent()}
          className="flex items-center gap-2 px-3 md:px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors text-sm md:text-base w-full sm:w-auto justify-center"
        >
          <i className="fas fa-plus"></i>
          Add Event
        </button>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3 md:gap-4 mb-4 text-xs md:text-sm">
        <div className="flex items-center gap-1.5 md:gap-2">
          <div className="w-3 h-3 md:w-4 md:h-4 bg-green-500 rounded"></div>
          <span className="text-zinc-600">On the Road</span>
        </div>
        <div className="flex items-center gap-1.5 md:gap-2">
          <div className="w-3 h-3 md:w-4 md:h-4 bg-yellow-500 rounded"></div>
          <span className="text-zinc-600">In Process</span>
        </div>
        <div className="flex items-center gap-1.5 md:gap-2">
          <div className="w-3 h-3 md:w-4 md:h-4 bg-gray-400 rounded"></div>
          <span className="text-zinc-600">Completed</span>
        </div>
      </div>

      {loading && (
        <div className="text-center py-8 text-zinc-600">
          <i className="fas fa-spinner fa-spin text-2xl"></i>
        </div>
      )}

      {errorMessage && (
        <div className="text-center py-8 text-red-600">
          Error loading calendar: {errorMessage}
        </div>
      )}

      {!loading && !errorMessage && (
        <div>
          {/* Day headers */}
          <div className="grid grid-cols-7 gap-0.5 md:gap-1 mb-1">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, idx) => (
              <div key={day} className="text-center text-[10px] md:text-xs font-semibold text-zinc-700 py-1 md:py-2">
                {/* Show single letter on very small screens */}
                <span className="sm:hidden">{day[0]}</span>
                <span className="hidden sm:inline">{day}</span>
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-0.5 md:gap-1">
            {calendarDays.map((day, index) => {
              const dayEvents = day ? getEventsForDate(day) : [];
              const isToday = day === new Date().getDate() && 
                             month === new Date().getMonth() && 
                             year === new Date().getFullYear();

              return (
                <div
                  key={index}
                  className={`min-h-[60px] sm:min-h-[80px] md:min-h-[100px] p-1 md:p-2 rounded border ${
                    day
                      ? isToday
                        ? 'bg-blue-50 border-blue-400'
                        : 'bg-zinc-50 border-zinc-300 hover:border-zinc-400 hover:bg-zinc-100'
                      : 'bg-transparent border-transparent'
                  } transition-colors cursor-pointer`}
                  onClick={() => day && handleAddEvent(new Date(year, month, day).toISOString().split('T')[0])}
                >
                  {day && (
                    <>
                      <div className={`text-xs md:text-sm font-semibold mb-0.5 md:mb-1 ${
                        isToday ? 'text-blue-600' : 'text-zinc-700'
                      }`}>
                        {day}
                      </div>
                      <div className="space-y-0.5 md:space-y-1">
                        {dayEvents.slice(0, 3).map(event => {
                          const colorMap: Record<string, string> = {
                            'on-the-road': '#22c55e',
                            'active': '#22c55e',
                            'in-process': '#eab308',
                            'scheduled': '#eab308',
                            'prep': '#eab308',
                            'completed': '#9ca3af',
                            'returned': '#9ca3af'
                          };
                          const bgColor = colorMap[event.status?.toLowerCase() || ''] || '#3b82f6';
                          
                          return (
                            <div
                              key={event.id}
                              onClick={(e) => handleEditEvent(event, e)}
                              style={{
                                backgroundColor: bgColor,
                                color: 'white',
                                padding: '4px 6px',
                                borderRadius: '3px',
                                fontSize: '10px',
                                fontWeight: 600,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                cursor: 'pointer',
                                transition: 'opacity 0.2s'
                              }}
                              className="md:text-[11px] md:px-2 md:py-1.5 md:rounded"
                              onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
                              onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                              title={`${event.title}${event.location ? ` - ${event.location}` : ''}${event.employees.length > 0 ? ` (${event.employees.length} crew)` : ''}\nStatus: ${event.status || 'Unknown'}\n\nClick to edit`}
                            >
                              {event.title}
                            </div>
                          );
                        })}
                        {dayEvents.length > 3 && (
                          <div className="text-[10px] md:text-xs text-zinc-600 text-center">
                            +{dayEvents.length - 3} more
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add Event Modal */}
      {showAddModal && (
        <AddEventModal
          selectedDate={selectedDate}
          selectedJobId={selectedJobId}
          crew={availableCrew}
          onClose={() => {
            setShowAddModal(false);
            setSelectedJobId(null);
          }}
          onSuccess={() => {
            setShowAddModal(false);
            setSelectedJobId(null);
            reload();
          }}
        />
      )}
    </div>
  );
}

interface AddEventModalProps {
  selectedDate: string;
  selectedJobId: string | null;
  crew: any[];
  onClose: () => void;
  onSuccess: () => void;
}

function AddEventModal({ selectedDate, selectedJobId: initialJobId, crew, onClose, onSuccess }: AddEventModalProps) {
  const [jobs, setJobs] = useState<any[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>(initialJobId || '');
  const [status, setStatus] = useState<'on-the-road' | 'in-process' | 'completed'>('in-process');
  const [formData, setFormData] = useState({
    start_date: selectedDate,
    end_date: '',
    expected_return_date: ''
  });
  const [saving, setSaving] = useState(false);

  console.log('AddEventModal - initialJobId:', initialJobId);
  console.log('AddEventModal - selectedJobId:', selectedJobId);
  console.log('AddEventModal - jobs length:', jobs.length);

  // Fetch jobs
  useEffect(() => {
    async function fetchJobs() {
      const { data } = await supabase
        .from('jobs')
        .select('*')
        .order('created_at', { ascending: false });
      setJobs(data || []);
    }
    fetchJobs();
  }, []);

  // Load existing job data if editing
  useEffect(() => {
    if (initialJobId && jobs.length > 0) {
      const job = jobs.find(j => j.id === initialJobId);
      console.log('Loading job data for editing:', job);
      if (job) {
        setFormData({
          start_date: job.start_at || selectedDate,
          end_date: job.end_at || '',
          expected_return_date: ''
        });
        if (job.status) {
          setStatus(job.status as 'on-the-road' | 'in-process' | 'completed');
        }
        console.log('Loaded formData:', { start_at: job.start_at, end_at: job.end_at, status: job.status });
      }
    }
  }, [initialJobId, jobs, selectedDate]);

  const selectedJob = jobs.find(j => j.id === selectedJobId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJobId) {
      alert('Please select a job');
      return;
    }

    setSaving(true);
    try {
      // Update the job with dates and status
      const { error } = await supabase
        .from('jobs')
        .update({
          start_at: formData.start_date,
          end_at: formData.end_date || null,
          status: status
        } as any)
        .eq('id', selectedJobId);

      if (error) throw error;
      onSuccess();
    } catch (error) {
      console.error('Error scheduling job:', error);
      alert('Failed to schedule job');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedJobId || !initialJobId) return;
    
    const confirmDelete = window.confirm(
      `Are you sure you want to remove this job from the calendar?\n\nThis will clear the scheduling dates but won't delete the job itself.`
    );
    
    if (!confirmDelete) return;

    setSaving(true);
    try {
      // Clear the scheduling dates from the job
      const { error } = await supabase
        .from('jobs')
        .update({
          start_at: null,
          end_at: null,
          status: null
        } as any)
        .eq('id', selectedJobId);

      if (error) throw error;
      onSuccess();
    } catch (error) {
      console.error('Error removing job from calendar:', error);
      alert('Failed to remove job from calendar');
    } finally {
      setSaving(false);
    }
  };

  const getStatusColor = (s: string) => {
    switch (s) {
      case 'on-the-road': return 'bg-green-500';
      case 'in-process': return 'bg-yellow-500';
      case 'completed': return 'bg-gray-400';
      default: return 'bg-blue-500';
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999,
        padding: '8px'
      }}
      className="md:p-4"
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          maxWidth: '800px',
          width: '100%',
          maxHeight: '95vh',
          overflow: 'auto'
        }}
        className="md:max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b border-zinc-300 p-3 md:p-4 flex items-center justify-between">
          <h2 className="text-lg md:text-xl font-bold text-zinc-900">
            {initialJobId ? 'Edit Job Schedule' : 'Schedule Job on Calendar'}
          </h2>
          <button
            onClick={onClose}
            className="text-zinc-600 hover:text-zinc-900 transition-colors p-2"
          >
            <i className="fas fa-times text-lg md:text-xl"></i>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 md:p-6 space-y-3 md:space-y-4">
          <div>
            <label className="block text-xs md:text-sm font-medium text-zinc-700 mb-2">
              Select Job *
            </label>
            <select
              value={selectedJobId}
              onChange={(e) => setSelectedJobId(e.target.value)}
              className="w-full px-2 md:px-3 py-2 bg-white border border-zinc-300 rounded-md text-zinc-900 text-sm md:text-base"
              disabled={!!initialJobId}
              required
            >
              <option value="">-- Select a Job --</option>
              {jobs.map(job => (
                <option key={job.id} value={job.id}>
                  {job.code} - {job.title || 'Untitled'} {job.client ? `(${job.client})` : ''}
                </option>
              ))}
            </select>
            {initialJobId && (
              <p className="mt-1 text-xs text-zinc-500">Job selection is locked when editing</p>
            )}
            {selectedJob && (
              <div className="mt-2 p-2 md:p-3 bg-zinc-50 rounded border border-zinc-200">
                <p className="text-xs md:text-sm text-zinc-700">
                  <strong>Client:</strong> {selectedJob.client || 'N/A'}
                </p>
                {selectedJob.venue && (
                  <p className="text-xs md:text-sm text-zinc-700">
                    <strong>Venue:</strong> {selectedJob.venue}
                  </p>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs md:text-sm font-medium text-zinc-700 mb-2">
              Job Status (Color) *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 md:gap-3">
              <button
                type="button"
                onClick={() => setStatus('on-the-road')}
                style={{
                  padding: '12px',
                  borderRadius: '8px',
                  border: status === 'on-the-road' ? '2px solid #22c55e' : '2px solid #d4d4d8',
                  backgroundColor: status === 'on-the-road' ? '#f0fdf4' : 'white',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                <div style={{ width: '100%', height: '12px', backgroundColor: '#22c55e', borderRadius: '4px', marginBottom: '8px' }}></div>
                <span style={{ fontSize: '14px', fontWeight: 500, color: '#18181b' }}>On the Road</span>
              </button>
              <button
                type="button"
                onClick={() => setStatus('in-process')}
                style={{
                  padding: '12px',
                  borderRadius: '8px',
                  border: status === 'in-process' ? '2px solid #eab308' : '2px solid #d4d4d8',
                  backgroundColor: status === 'in-process' ? '#fefce8' : 'white',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                <div style={{ width: '100%', height: '12px', backgroundColor: '#eab308', borderRadius: '4px', marginBottom: '8px' }}></div>
                <span style={{ fontSize: '14px', fontWeight: 500, color: '#18181b' }}>In Process</span>
              </button>
              <button
                type="button"
                onClick={() => setStatus('completed')}
                style={{
                  padding: '12px',
                  borderRadius: '8px',
                  border: status === 'completed' ? '2px solid #9ca3af' : '2px solid #d4d4d8',
                  backgroundColor: status === 'completed' ? '#f4f4f5' : 'white',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                <div style={{ width: '100%', height: '12px', backgroundColor: '#9ca3af', borderRadius: '4px', marginBottom: '8px' }}></div>
                <span style={{ fontSize: '14px', fontWeight: 500, color: '#18181b' }}>Completed</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
            <div>
              <label className="block text-xs md:text-sm font-medium text-zinc-700 mb-2">
                Start Date *
              </label>
              <input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className="w-full px-2 md:px-3 py-2 bg-white border border-zinc-300 rounded-md text-zinc-900 text-sm md:text-base"
                required
              />
            </div>

            <div>
              <label className="block text-xs md:text-sm font-medium text-zinc-700 mb-2">
                End Date
              </label>
              <input
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                className="w-full px-2 md:px-3 py-2 bg-white border border-zinc-300 rounded-md text-zinc-900 text-sm md:text-base"
              />
            </div>

            <div>
              <label className="block text-xs md:text-sm font-medium text-zinc-700 mb-2">
                Expected Return
              </label>
              <input
                type="date"
                value={formData.expected_return_date}
                onChange={(e) => setFormData({ ...formData, expected_return_date: e.target.value })}
                className="w-full px-2 md:px-3 py-2 bg-white border border-zinc-300 rounded-md text-zinc-900 text-sm md:text-base"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 md:gap-3 pt-3 md:pt-4 border-t border-zinc-200">
            {initialJobId && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={saving}
                className="px-3 md:px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white rounded-md transition-colors font-medium text-sm md:text-base"
              >
                <i className="fas fa-trash mr-2"></i>
                Remove from Calendar
              </button>
            )}
            <button
              type="submit"
              disabled={saving || !selectedJobId}
              className="flex-1 px-3 md:px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-md transition-colors font-medium text-sm md:text-base"
            >
              {saving ? (initialJobId ? 'Updating...' : 'Scheduling...') : (initialJobId ? 'Update Schedule' : 'Schedule Job')}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-3 md:px-4 py-2 bg-zinc-200 hover:bg-zinc-300 text-zinc-900 rounded-md transition-colors text-sm md:text-base"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

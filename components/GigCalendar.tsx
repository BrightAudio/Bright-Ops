"use client";

import { useState, useEffect } from "react";
import { useGigCalendar, createGigEvent, CalendarEvent } from "@/lib/hooks/useGigCalendar";
import { useJobs } from "@/lib/hooks/useJobs";
import { supabase } from "@/lib/supabaseClient";

export default function GigCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>("");
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
    console.log('Add event clicked, date:', date);
    setSelectedDate(date || new Date().toISOString().split('T')[0]);
    setShowAddModal(true);
    console.log('Modal should show now');
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
    <div className="bg-white rounded-lg border border-zinc-300 p-4 shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-bold text-zinc-900">Gig Calendar</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={prevMonth}
              className="p-2 hover:bg-zinc-100 rounded transition-colors text-zinc-600 hover:text-zinc-900"
            >
              <i className="fas fa-chevron-left"></i>
            </button>
            <span className="text-zinc-900 font-semibold min-w-[180px] text-center">
              {monthNames[month]} {year}
            </span>
            <button
              onClick={nextMonth}
              className="p-2 hover:bg-zinc-100 rounded transition-colors text-zinc-600 hover:text-zinc-900"
            >
              <i className="fas fa-chevron-right"></i>
            </button>
          </div>
        </div>
        <button
          onClick={() => handleAddEvent()}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
        >
          <i className="fas fa-plus"></i>
          Add Event
        </button>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mb-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-500 rounded"></div>
          <span className="text-zinc-600">On the Road</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-yellow-500 rounded"></div>
          <span className="text-zinc-600">In Process</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-gray-400 rounded"></div>
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
          <div className="grid grid-cols-7 gap-1 mb-1">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-center text-xs font-semibold text-zinc-700 py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, index) => {
              const dayEvents = day ? getEventsForDate(day) : [];
              const isToday = day === new Date().getDate() && 
                             month === new Date().getMonth() && 
                             year === new Date().getFullYear();

              return (
                <div
                  key={index}
                  className={`min-h-[100px] p-2 rounded border ${
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
                      <div className={`text-sm font-semibold mb-1 ${
                        isToday ? 'text-blue-600' : 'text-zinc-700'
                      }`}>
                        {day}
                      </div>
                      <div className="space-y-1">
                        {dayEvents.slice(0, 2).map(event => (
                          <div
                            key={event.id}
                            className={`text-xs px-2 py-1 rounded truncate font-medium ${
                              getStatusColor(event.notes || '')
                            }`}
                            title={`${event.title}${event.location ? ` - ${event.location}` : ''}${event.employees.length > 0 ? ` (${event.employees.length} crew)` : ''}`}
                          >
                            {event.title}
                          </div>
                        ))}
                        {dayEvents.length > 2 && (
                          <div className="text-xs text-zinc-600 text-center">
                            +{dayEvents.length - 2} more
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
      {showAddModal ? (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-lg p-6 max-w-md">
            <h2 className="text-xl font-bold text-zinc-900 mb-4">Test Modal</h2>
            <p className="text-zinc-700">Modal is showing! Selected date: {selectedDate}</p>
            <button
              onClick={() => setShowAddModal(false)}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded"
            >
              Close
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

interface AddEventModalProps {
  selectedDate: string;
  crew: any[];
  onClose: () => void;
  onSuccess: () => void;
}

function AddEventModal({ selectedDate, crew, onClose, onSuccess }: AddEventModalProps) {
  const [jobs, setJobs] = useState<any[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>('');
  const [status, setStatus] = useState<'on-the-road' | 'in-process' | 'completed'>('in-process');
  const [formData, setFormData] = useState({
    start_date: selectedDate,
    end_date: '',
    expected_return_date: ''
  });
  const [saving, setSaving] = useState(false);

  console.log('AddEventModal rendered with selectedDate:', selectedDate);

  useEffect(() => {
    async function fetchJobs() {
      const { data } = await supabase
        .from('jobs')
        .select('*')
        .order('created_at', { ascending: false });
      console.log('Fetched jobs:', data);
      setJobs(data || []);
    }
    fetchJobs();
  }, []);

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
          start_date: formData.start_date,
          end_date: formData.end_date || null,
          expected_return_date: formData.expected_return_date || null,
          event_date: formData.start_date,
          status: status,
          notes: status // Store status in notes for color coding
        })
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
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b border-zinc-300 p-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-zinc-900">Schedule Job on Calendar</h2>
          <button
            onClick={onClose}
            className="text-zinc-600 hover:text-zinc-900 transition-colors"
          >
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-2">
              Select Job *
            </label>
            <select
              value={selectedJobId}
              onChange={(e) => setSelectedJobId(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-zinc-300 rounded-md text-zinc-900"
              required
            >
              <option value="">-- Select a Job --</option>
              {jobs.map(job => (
                <option key={job.id} value={job.id}>
                  {job.code} - {job.title || 'Untitled'} {job.client ? `(${job.client})` : ''}
                </option>
              ))}
            </select>
            {selectedJob && (
              <div className="mt-2 p-3 bg-zinc-50 rounded border border-zinc-200">
                <p className="text-sm text-zinc-700">
                  <strong>Client:</strong> {selectedJob.client || 'N/A'}
                </p>
                {selectedJob.venue && (
                  <p className="text-sm text-zinc-700">
                    <strong>Venue:</strong> {selectedJob.venue}
                  </p>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-2">
              Job Status (Color) *
            </label>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setStatus('on-the-road')}
                className={`p-3 rounded-lg border-2 transition-all ${
                  status === 'on-the-road'
                    ? 'border-green-500 bg-green-50'
                    : 'border-zinc-300 hover:border-green-400'
                }`}
              >
                <div className="w-full h-3 bg-green-500 rounded mb-2"></div>
                <span className="text-sm font-medium text-zinc-900">On the Road</span>
              </button>
              <button
                type="button"
                onClick={() => setStatus('in-process')}
                className={`p-3 rounded-lg border-2 transition-all ${
                  status === 'in-process'
                    ? 'border-yellow-500 bg-yellow-50'
                    : 'border-zinc-300 hover:border-yellow-400'
                }`}
              >
                <div className="w-full h-3 bg-yellow-500 rounded mb-2"></div>
                <span className="text-sm font-medium text-zinc-900">In Process</span>
              </button>
              <button
                type="button"
                onClick={() => setStatus('completed')}
                className={`p-3 rounded-lg border-2 transition-all ${
                  status === 'completed'
                    ? 'border-gray-400 bg-gray-50'
                    : 'border-zinc-300 hover:border-gray-400'
                }`}
              >
                <div className="w-full h-3 bg-gray-400 rounded mb-2"></div>
                <span className="text-sm font-medium text-zinc-900">Completed</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-2">
                Start Date *
              </label>
              <input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-zinc-300 rounded-md text-zinc-900"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-2">
                End Date
              </label>
              <input
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-zinc-300 rounded-md text-zinc-900"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-2">
                Expected Return
              </label>
              <input
                type="date"
                value={formData.expected_return_date}
                onChange={(e) => setFormData({ ...formData, expected_return_date: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-zinc-300 rounded-md text-zinc-900"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-zinc-200">
            <button
              type="submit"
              disabled={saving || !selectedJobId}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-md transition-colors font-medium"
            >
              {saving ? 'Scheduling...' : 'Schedule Job'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-zinc-200 hover:bg-zinc-300 text-zinc-900 rounded-md transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

type Meeting = {
  id: string;
  lead_id: string;
  lead_name: string;
  lead_email: string;
  meeting_date: string;
  meeting_time: string;
  meeting_type: string;
  notes: string | null;
  status: string;
  created_at: string;
};

const MEETING_TYPE_COLORS = {
  call: { bg: '#3b82f6', text: 'Call' },
  video: { bg: '#8b5cf6', text: 'Video' },
  meeting: { bg: '#10b981', text: 'In-Person' },
  email: { bg: '#f59e0b', text: 'Email' },
};

const STATUS_COLORS = {
  scheduled: '#3b82f6',
  completed: '#10b981',
  cancelled: '#ef4444',
  'no-show': '#f59e0b',
};

export default function CalendarPage() {
  const router = useRouter();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    loadMeetings();
  }, []);

  async function loadMeetings() {
    try {
      const supabaseAny = supabase as any;
      const { data, error } = await supabaseAny
        .from('scheduled_meetings')
        .select('*')
        .order('meeting_date', { ascending: true });

      if (error) throw error;
      setMeetings(data || []);
    } catch (err) {
      console.error('Error loading meetings:', err);
    } finally {
      setLoading(false);
    }
  }

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const getMeetingsForDate = (day: number) => {
    const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return meetings.filter(m => m.meeting_date === dateStr);
  };

  const upcomingMeetings = meetings.filter(m => {
    const meetingDate = new Date(m.meeting_date);
    const today = new Date();
    return meetingDate >= today && (filter === 'all' || m.status === filter);
  });

  const daysInMonth = getDaysInMonth(currentMonth);
  const firstDay = getFirstDayOfMonth(currentMonth);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  return (
    <div className="p-6" style={{ minHeight: '100vh', background: '#1a1a1a', color: '#e5e5e5' }}>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#f3f4f6' }}>Meeting Calendar</h1>
          <p className="text-sm" style={{ color: '#9ca3af' }}>Upcoming client meetings and follow-ups</p>
        </div>
        <button
          onClick={() => router.push('/app/dashboard/leads')}
          className="px-4 py-2 rounded-lg"
          style={{
            background: '#2a2a2a',
            border: '1px solid #333333',
            color: '#e5e5e5',
            cursor: 'pointer'
          }}
        >
          ← Back to Leads
        </button>
      </div>

      {/* Filter */}
      <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
        {[
          { key: 'all', label: 'All' },
          { key: 'scheduled', label: 'Scheduled' },
          { key: 'completed', label: 'Completed' },
          { key: 'cancelled', label: 'Cancelled' },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            style={{
              background: filter === f.key ? '#667eea' : '#2a2a2a',
              color: 'white',
              padding: '0.5rem 1rem',
              borderRadius: '6px',
              border: filter === f.key ? 'none' : '1px solid #333333',
              cursor: 'pointer',
              fontSize: '0.9rem'
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-2">
          <div className="rounded-lg shadow" style={{ background: '#2a2a2a', padding: '1.5rem' }}>
            {/* Month Navigation */}
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold" style={{ color: '#f3f4f6' }}>
                {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
                  style={{
                    background: '#333333',
                    color: '#e5e5e5',
                    padding: '0.5rem 1rem',
                    borderRadius: '4px',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  ←
                </button>
                <button
                  onClick={() => setCurrentMonth(new Date())}
                  style={{
                    background: '#333333',
                    color: '#e5e5e5',
                    padding: '0.5rem 1rem',
                    borderRadius: '4px',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  Today
                </button>
                <button
                  onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                  style={{
                    background: '#333333',
                    color: '#e5e5e5',
                    padding: '0.5rem 1rem',
                    borderRadius: '4px',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  →
                </button>
              </div>
            </div>

            {/* Weekday Headers */}
            <div className="grid grid-cols-7 gap-2 mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div
                  key={day}
                  className="text-center py-2 font-semibold"
                  style={{ color: '#9ca3af', fontSize: '0.9rem' }}
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-2">
              {Array.from({ length: firstDay }).map((_, i) => (
                <div key={`empty-${i}`}></div>
              ))}
              {days.map((day) => {
                const dayMeetings = getMeetingsForDate(day);
                const today = new Date();
                const isToday =
                  day === today.getDate() &&
                  currentMonth.getMonth() === today.getMonth() &&
                  currentMonth.getFullYear() === today.getFullYear();

                return (
                  <div
                    key={day}
                    style={{
                      background: isToday ? '#3b82f6' : '#1a1a1a',
                      border: `1px solid ${dayMeetings.length > 0 ? '#667eea' : '#333333'}`,
                      borderRadius: '6px',
                      padding: '0.5rem',
                      minHeight: '6rem',
                      cursor: dayMeetings.length > 0 ? 'pointer' : 'default'
                    }}
                    className="hover:border-purple-400"
                  >
                    <div className="font-bold mb-1" style={{ color: isToday ? 'white' : '#e5e5e5' }}>
                      {day}
                    </div>
                    <div className="space-y-1">
                      {dayMeetings.slice(0, 2).map((m) => (
                        <div
                          key={m.id}
                          style={{
                            background: MEETING_TYPE_COLORS[m.meeting_type as keyof typeof MEETING_TYPE_COLORS]?.bg || '#667eea',
                            color: 'white',
                            padding: '0.25rem 0.5rem',
                            borderRadius: '3px',
                            fontSize: '0.7rem',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}
                          title={m.lead_name}
                        >
                          {m.meeting_time}
                        </div>
                      ))}
                      {dayMeetings.length > 2 && (
                        <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                          +{dayMeetings.length - 2} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Upcoming Meetings List */}
        <div className="rounded-lg shadow" style={{ background: '#2a2a2a', padding: '1.5rem' }}>
          <h2 className="text-lg font-bold mb-4" style={{ color: '#f3f4f6' }}>
            Upcoming ({upcomingMeetings.length})
          </h2>

          {loading ? (
            <div className="text-center py-8" style={{ color: '#9ca3af' }}>
              <i className="fas fa-spinner fa-spin text-2xl"></i>
            </div>
          ) : upcomingMeetings.length === 0 ? (
            <div className="text-center py-8" style={{ color: '#9ca3af' }}>
              <p>No upcoming meetings</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {upcomingMeetings.map((meeting) => (
                <div
                  key={meeting.id}
                  className="p-3 rounded-lg border"
                  style={{
                    background: '#1a1a1a',
                    borderColor: '#333333',
                    borderLeft: `4px solid ${STATUS_COLORS[meeting.status as keyof typeof STATUS_COLORS]}`
                  }}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-semibold text-sm" style={{ color: '#f3f4f6' }}>
                        {meeting.lead_name}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#9ca3af' }}>
                        {meeting.lead_email}
                      </div>
                    </div>
                    <span
                      style={{
                        background: MEETING_TYPE_COLORS[meeting.meeting_type as keyof typeof MEETING_TYPE_COLORS]?.bg || '#667eea',
                        color: 'white',
                        padding: '0.25rem 0.5rem',
                        borderRadius: '3px',
                        fontSize: '0.7rem'
                      }}
                    >
                      {MEETING_TYPE_COLORS[meeting.meeting_type as keyof typeof MEETING_TYPE_COLORS]?.text || meeting.meeting_type}
                    </span>
                  </div>

                  <div style={{ fontSize: '0.85rem', color: '#e5e5e5', marginBottom: '0.5rem' }}>
                    📅 {new Date(meeting.meeting_date).toLocaleDateString()} at {meeting.meeting_time}
                  </div>

                  {meeting.notes && (
                    <div style={{ fontSize: '0.8rem', color: '#9ca3af', marginBottom: '0.5rem' }}>
                      {meeting.notes}
                    </div>
                  )}

                  <span
                    style={{
                      background: STATUS_COLORS[meeting.status as keyof typeof STATUS_COLORS] || '#667eea',
                      color: 'white',
                      padding: '0.25rem 0.5rem',
                      borderRadius: '3px',
                      fontSize: '0.7rem'
                    }}
                  >
                    {meeting.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

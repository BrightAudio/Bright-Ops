"use client";

import { useState } from "react";
import { useGigCalendar, createGigEvent, CalendarEvent } from "@/lib/hooks/useGigCalendar";

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

  const handleAddEvent = (date?: string) => {
    setSelectedDate(date || new Date().toISOString().split('T')[0]);
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
    <div className="bg-zinc-800/30 rounded-lg border border-zinc-700 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-bold text-white">Gig Calendar</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={prevMonth}
              className="p-2 hover:bg-zinc-700 rounded transition-colors text-zinc-400 hover:text-white"
            >
              <i className="fas fa-chevron-left"></i>
            </button>
            <span className="text-white font-semibold min-w-[180px] text-center">
              {monthNames[month]} {year}
            </span>
            <button
              onClick={nextMonth}
              className="p-2 hover:bg-zinc-700 rounded transition-colors text-zinc-400 hover:text-white"
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
          <div className="w-3 h-3 bg-green-500 rounded"></div>
          <span className="text-zinc-400">Start</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-blue-500 rounded"></div>
          <span className="text-zinc-400">Active</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-orange-500 rounded"></div>
          <span className="text-zinc-400">Return</span>
        </div>
      </div>

      {loading && (
        <div className="text-center py-8 text-zinc-400">
          <i className="fas fa-spinner fa-spin text-2xl"></i>
        </div>
      )}

      {errorMessage && (
        <div className="text-center py-8 text-red-400">
          Error loading calendar: {errorMessage}
        </div>
      )}

      {!loading && !errorMessage && (
        <div>
          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-center text-xs font-semibold text-zinc-400 py-2">
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
                        ? 'bg-blue-900/20 border-blue-500'
                        : 'bg-zinc-900/30 border-zinc-700 hover:border-zinc-600'
                      : 'bg-transparent border-transparent'
                  } transition-colors cursor-pointer`}
                  onClick={() => day && handleAddEvent(new Date(year, month, day).toISOString().split('T')[0])}
                >
                  {day && (
                    <>
                      <div className={`text-sm font-semibold mb-1 ${
                        isToday ? 'text-blue-400' : 'text-zinc-300'
                      }`}>
                        {day}
                      </div>
                      <div className="space-y-1">
                        {dayEvents.slice(0, 3).map(event => (
                          <div
                            key={event.id}
                            className={`text-xs p-1 rounded truncate ${
                              event.type === 'gig-start'
                                ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                                : event.type === 'gig-return'
                                ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
                                : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                            }`}
                            title={`${event.title}${event.employees.length > 0 ? ` (${event.employees.length} crew)` : ''}`}
                          >
                            {event.title}
                          </div>
                        ))}
                        {dayEvents.length > 3 && (
                          <div className="text-xs text-zinc-500 text-center">
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
          crew={availableCrew}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            reload();
          }}
        />
      )}
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
  const [formData, setFormData] = useState({
    title: '',
    start_date: selectedDate,
    end_date: '',
    expected_return_date: '',
    assigned_employees: [] as string[],
    location: '',
    notes: ''
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await createGigEvent(formData);
      onSuccess();
    } catch (error) {
      console.error('Error creating event:', error);
      alert('Failed to create event');
    } finally {
      setSaving(false);
    }
  };

  const toggleEmployee = (employeeId: string) => {
    setFormData(prev => ({
      ...prev,
      assigned_employees: prev.assigned_employees.includes(employeeId)
        ? prev.assigned_employees.filter(id => id !== employeeId)
        : [...prev.assigned_employees, employeeId]
    }));
  };

  return (
    <div
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-zinc-900 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-zinc-900 border-b border-zinc-700 p-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">Add Gig Event</h2>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white transition-colors"
          >
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Event Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-white"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Start Date *
              </label>
              <input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-white"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                End Date
              </label>
              <input
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Expected Return
              </label>
              <input
                type="date"
                value={formData.expected_return_date}
                onChange={(e) => setFormData({ ...formData, expected_return_date: e.target.value })}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Location/Venue
            </label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Assigned Crew
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-2 bg-zinc-800/50 rounded border border-zinc-700">
              {crew.map(member => (
                <label
                  key={member.id}
                  className="flex items-center gap-2 p-2 hover:bg-zinc-700/50 rounded cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={formData.assigned_employees.includes(member.id)}
                    onChange={() => toggleEmployee(member.id)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-zinc-300">{member.name}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-white"
              rows={3}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white rounded-md transition-colors"
            >
              {saving ? 'Creating...' : 'Create Event'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-md transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

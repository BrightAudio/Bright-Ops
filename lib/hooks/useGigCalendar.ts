import { useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { guard, useAsync } from "./useSupabase";

export interface GigEvent {
  id: string;
  job_id: string;
  title: string;
  start_date: string;
  end_date: string | null;
  expected_return_date: string | null;
  status: 'upcoming' | 'active' | 'completed';
  assigned_employees: string[];
  location: string | null;
  notes: string | null;
  created_at: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  type: 'gig-start' | 'gig-return' | 'gig-active';
  employees: string[];
  location?: string;
  notes?: string;
  status?: string;
  job_id: string;
}

export function useGigCalendar(month?: number, year?: number) {
  const currentMonth = month ?? new Date().getMonth();
  const currentYear = year ?? new Date().getFullYear();

  return useAsync<CalendarEvent[]>(async () => {
    // Get first and last day of the month
    const firstDay = new Date(currentYear, currentMonth, 1);
    firstDay.setHours(0, 0, 0, 0);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    lastDay.setHours(23, 59, 59, 999);

    // Fetch jobs that have any dates in this month
    const { data: jobs, error } = await supabase
      .from('jobs')
      .select('*');

    if (error) {
      console.error('Calendar error:', error);
      return [];
    }

    const events: CalendarEvent[] = [];

    jobs?.forEach((job: any) => {
      const jobTitle = job.title || job.code || 'Job';
      const assignedCrew = Array.isArray(job.assigned_crew) ? job.assigned_crew : [];

      // Add start date event (gig begins)
      if (job.start_at) {
        const startDate = new Date(job.start_at);
        if (startDate >= firstDay && startDate <= lastDay) {
          events.push({
            id: `${job.id}-start-early`,
            title: jobTitle,
            date: job.start_at,
            type: 'gig-start',
            employees: assignedCrew,
            location: job.venue,
            notes: job.notes,
            status: job.status,
            job_id: job.id
          });
        }
      }

      // Add start date (main show date)
      if (job.start_at) {
        const startDate = new Date(job.start_at);
        if (startDate >= firstDay && startDate <= lastDay) {
          events.push({
            id: `${job.id}-start`,
            title: `🎭 ${jobTitle}`,
            date: job.start_at,
            type: 'gig-start',
            employees: assignedCrew,
            location: job.venue,
            notes: job.notes,
            status: job.status,
            job_id: job.id
          });
        }
      }

      // Add return date event
      if (job.expected_return_date) {
        const returnDate = new Date(job.expected_return_date);
        if (returnDate >= firstDay && returnDate <= lastDay) {
          events.push({
            id: `${job.id}-return`,
            title: `${jobTitle} - Return`,
            date: job.expected_return_date,
            type: 'gig-return',
            employees: assignedCrew,
            location: job.venue,
            notes: job.notes,
            status: job.status,
            job_id: job.id
          });
        }
      }

      // Add active days between start and end
      if (job.start_at && job.end_at) {
        const start = new Date(job.start_at);
        const end = new Date(job.end_at);
        start.setHours(0, 0, 0, 0);
        end.setHours(0, 0, 0, 0);
        
        const current = new Date(start);
        current.setDate(current.getDate() + 1); // Start from day after start_at

        while (current < end) {
          if (current >= firstDay && current <= lastDay) {
            events.push({
              id: `${job.id}-active-${current.toISOString()}`,
              title: jobTitle,
              date: current.toISOString(),
              type: 'gig-active',
              employees: assignedCrew,
              location: job.venue,
              notes: job.notes,
              status: job.status,
              job_id: job.id
            });
          }
          current.setDate(current.getDate() + 1);
        }
      }
    });

    return events;
  }, [currentMonth, currentYear]);
}

export function useUpcomingGigs() {
  return useAsync<any[]>(async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .gte('start_at', today.toISOString())
      .order('start_at', { ascending: true })
      .limit(10);

    if (error) {
      console.error('Error fetching upcoming gigs:', error);
      return [];
    }
    return data || [];
  }, []);
}

export function useActiveGigs() {
  return useAsync<any[]>(async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .lte('start_date', today.toISOString())
      .gte('expected_return_date', today.toISOString())
      .order('start_date', { ascending: false });

    if (error) {
      console.error('Error fetching active gigs:', error);
      return [];
    }
    return data || [];
  }, []);
}

export async function createGigEvent(input: {
  job_id?: string;
  title: string;
  start_date: string;
  end_date?: string;
  expected_return_date?: string;
  assigned_employees?: string[];
  location?: string;
  notes?: string;
}): Promise<any> {
  // Create job entry with all date fields
  const jobData: any = {
    title: input.title,
    code: `GIG-${Date.now()}`,
    start_at: input.start_date,
    end_at: input.end_date || null,
    venue: input.location || null,
    notes: input.notes || null,
    status: 'scheduled'
  };

  if (input.job_id) {
    const { data, error } = await supabase
      .from('jobs')
      .update(jobData)
      .eq('id', input.job_id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  } else {
    const { data, error } = await supabase
      .from('jobs')
      .insert([jobData])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
}

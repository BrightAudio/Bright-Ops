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
  job_id: string;
}

export function useGigCalendar(month?: number, year?: number) {
  const currentMonth = month ?? new Date().getMonth();
  const currentYear = year ?? new Date().getFullYear();

  return useAsync<CalendarEvent[]>(async () => {
    // Get first and last day of the month
    const firstDay = new Date(currentYear, currentMonth, 1).toISOString();
    const lastDay = new Date(currentYear, currentMonth + 1, 0).toISOString();

    // Fetch jobs for the month
    const { data: jobs, error } = await supabase
      .from('jobs')
      .select('*')
      .or(`start_date.gte.${firstDay},expected_return_date.gte.${firstDay}`)
      .or(`start_date.lte.${lastDay},expected_return_date.lte.${lastDay}`);

    if (error) throw error;

    const events: CalendarEvent[] = [];

    jobs?.forEach((job: any) => {
      // Add start date event
      if (job.start_date) {
        events.push({
          id: `${job.id}-start`,
          title: job.title || job.code,
          date: job.start_date,
          type: 'gig-start',
          employees: job.assigned_crew || [],
          location: job.venue,
          notes: job.notes,
          job_id: job.id
        });
      }

      // Add return date event
      if (job.expected_return_date) {
        events.push({
          id: `${job.id}-return`,
          title: `${job.title || job.code} - Return`,
          date: job.expected_return_date,
          type: 'gig-return',
          employees: job.assigned_crew || [],
          location: job.venue,
          notes: job.notes,
          job_id: job.id
        });
      }

      // Add active days between start and return
      if (job.start_date && job.expected_return_date) {
        const start = new Date(job.start_date);
        const end = new Date(job.expected_return_date);
        const current = new Date(start);
        current.setDate(current.getDate() + 1);

        while (current < end) {
          events.push({
            id: `${job.id}-active-${current.toISOString()}`,
            title: job.title || job.code,
            date: current.toISOString(),
            type: 'gig-active',
            employees: job.assigned_crew || [],
            location: job.venue,
            notes: job.notes,
            job_id: job.id
          });
          current.setDate(current.getDate() + 1);
        }
      }
    });

    return events;
  }, [currentMonth, currentYear]);
}

export function useUpcomingGigs() {
  return useAsync<any[]>(async () => {
    const today = new Date().toISOString();
    
    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .gte('start_date', today)
      .order('start_date', { ascending: true })
      .limit(10);

    if (error) throw error;
    return data || [];
  }, []);
}

export function useActiveGigs() {
  return useAsync<any[]>(async () => {
    const today = new Date().toISOString();
    
    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .lte('start_date', today)
      .gte('expected_return_date', today)
      .order('start_date', { ascending: false });

    if (error) throw error;
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
  // If job_id is provided, update existing job
  // Otherwise create new job entry
  const jobData = {
    title: input.title,
    code: `GIG-${Date.now()}`,
    start_date: input.start_date,
    end_date: input.end_date,
    expected_return_date: input.expected_return_date,
    assigned_crew: input.assigned_employees || [],
    venue: input.location,
    notes: input.notes,
    status: 'scheduled' as const
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

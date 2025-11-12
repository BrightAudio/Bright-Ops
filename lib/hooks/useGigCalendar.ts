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
      .gte('created_at', firstDay)
      .lte('created_at', lastDay);

    if (error) {
      console.error('Calendar error:', error);
      return [];
    }

    const events: CalendarEvent[] = [];

    // For now, we'll just show when jobs were created
    // We can enhance this later when date fields are added to jobs table
    jobs?.forEach((job: any) => {
      if (job.created_at) {
        events.push({
          id: `${job.id}-created`,
          title: job.title || job.code || 'Job',
          date: job.created_at,
          type: 'gig-start',
          employees: [],
          location: job.client,
          notes: job.status,
          job_id: job.id
        });
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
  // Create a simple job entry with available fields
  const jobData: any = {
    title: input.title,
    code: `GIG-${Date.now()}`,
    client: input.location,
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

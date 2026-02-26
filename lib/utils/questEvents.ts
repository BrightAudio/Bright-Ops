/**
 * Quest Events System
 * Logs and tracks user actions as events that can contribute to quest progress.
 * Works with any lead/job action to power flexible, AI-generated quests.
 * 
 * Metric Value Convention:
 * - Count-based events: metric_value = 1 (represents one unit/action)
 * - Amount-based events: metric_value = actual value (revenue, hours, items, etc.)
 * - This allows calculateProgressFromEvents() to handle both sums and counts cleanly
 */

import { supabase } from '@/lib/supabaseClient';

export type EventType = 
  | 'lead_created'
  | 'lead_reachout_sent'
  | 'lead_email_opened'
  | 'lead_replied_or_engaged'
  | 'lead_meeting_booked'
  | 'lead_status_updated'
  | 'lead_converted_to_client'
  | 'new_client_this_quarter'
  | 'job_completed'
  | 'job_revenue_tracked';

export type EntityType = 'lead' | 'job' | 'client' | 'lead_email' | 'meeting';

export type EventSource = 'jobs' | 'inventory' | 'financial' | 'leads' | 'ai' | 'system';

export type TimeWindow = 'weekly' | 'monthly' | 'quarterly' | 'all-time';

export interface QuestEvent {
  id: string;
  event_type: EventType;
  entity_type: EntityType;
  entity_id: string;
  metric_value?: number;
  source?: EventSource;
  metadata?: Record<string, any>;
  org_id?: string;
  created_by?: string;
  created_at?: string;
}

/**
 * Log a quest event - single source of truth for all user actions
 * 
 * @param eventType - Type of action (e.g., lead_reachout_sent)
 * @param entityType - What entity this affects (lead, job, meeting, etc.)
 * @param entityId - ID of the affected entity
 * @param options - Additional data:
 *   - metricValue: For counts, use 1. For amounts (revenue), use actual value
 *   - source: Which module/source triggered this (jobs, leads, inventory, financial, ai, system)
 *   - metadata: Extra context for analytics/debugging
 */
export async function logQuestEvent(
  eventType: EventType,
  entityType: EntityType,
  entityId: string,
  options?: {
    metricValue?: number;
    source?: EventSource;
    metadata?: Record<string, any>;
    orgId?: string;
    userId?: string;
  }
): Promise<QuestEvent | null> {
  try {
    const supabaseAny = supabase as any;
    
    const { data, error } = await supabaseAny
      .from('quest_events')
      .insert({
        event_type: eventType,
        entity_type: entityType,
        entity_id: entityId,
        metric_value: options?.metricValue || null,
        source: options?.source || null,
        metadata: options?.metadata || null,
        org_id: options?.orgId || null,
        created_by: options?.userId || null,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Error logging quest event:', error);
      return null;
    }

    return data as QuestEvent;
  } catch (err) {
    console.error('Error in logQuestEvent:', err);
    return null;
  }
}

/**
 * Count events of a specific type within a time window
 * Returns count of events (each represents one action)
 */
export async function countEventsByType(
  eventType: EventType | EventType[],
  window: TimeWindow,
  orgId?: string
): Promise<number> {
  try {
    const supabaseAny = supabase as any;
    
    // Calculate time boundary
    const now = new Date();
    let dateThreshold: Date;
    
    switch (window) {
      case 'weekly':
        dateThreshold = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'monthly':
        dateThreshold = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'quarterly':
        // Quarter start (relative to current date)
        const quarter = Math.floor(now.getMonth() / 3);
        dateThreshold = new Date(now.getFullYear(), quarter * 3, 1);
        break;
      case 'all-time':
      default:
        dateThreshold = new Date(0);
    }

    let query = supabaseAny
      .from('quest_events')
      .select('id', { count: 'exact' });

    // Filter by event type(s)
    if (Array.isArray(eventType)) {
      query = query.in('event_type', eventType);
    } else {
      query = query.eq('event_type', eventType);
    }

    // Filter by time window
    query = query.gte('created_at', dateThreshold.toISOString());

    // Filter by org if provided
    if (orgId) {
      query = query.eq('org_id', orgId);
    }

    const { count, error } = await query;

    if (error) {
      console.error('Error counting quest events:', error);
      return 0;
    }

    return count || 0;
  } catch (err) {
    console.error('Error in countEventsByType:', err);
    return 0;
  }
}

/**
 * Sum metric_value across events of a specific type
 * Useful for amount-based quests (revenue, hours, etc.)
 * 
 * Example: Sum revenue from 'job_revenue_tracked' events
 */
export async function sumEventMetrics(
  eventType: EventType | EventType[],
  window: TimeWindow,
  orgId?: string
): Promise<number> {
  try {
    const supabaseAny = supabase as any;
    
    // Calculate time boundary
    const now = new Date();
    let dateThreshold: Date;
    
    switch (window) {
      case 'weekly':
        dateThreshold = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'monthly':
        dateThreshold = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'quarterly':
        const quarter = Math.floor(now.getMonth() / 3);
        dateThreshold = new Date(now.getFullYear(), quarter * 3, 1);
        break;
      case 'all-time':
      default:
        dateThreshold = new Date(0);
    }

    let query = supabaseAny
      .from('quest_events')
      .select('metric_value');

    // Filter by event type(s)
    if (Array.isArray(eventType)) {
      query = query.in('event_type', eventType);
    } else {
      query = query.eq('event_type', eventType);
    }

    // Filter by time window
    query = query.gte('created_at', dateThreshold.toISOString());

    // Filter by org if provided
    if (orgId) {
      query = query.eq('org_id', orgId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error summing event metrics:', error);
      return 0;
    }

    // Sum all metric_value entries
    return ((data || []) as any[]).reduce((sum, event) => sum + (event.metric_value || 0), 0);
  } catch (err) {
    console.error('Error in sumEventMetrics:', err);
    return 0;
  }
}

/**
 * Calculate progress percentage for a metric based on events
 * Supports both count-based and sum-based quests
 * 
 * @param mode - "count" for action-based quests (e.g., "send 20 emails")
 *              "sum" for amount-based quests (e.g., "generate $5000 revenue")
 * @returns Progress percentage (0-100) capped at 100%
 */
export async function calculateProgressFromEvents(
  eventType: EventType | EventType[],
  targetValue: number,
  window: TimeWindow,
  mode: 'count' | 'sum' = 'count',
  orgId?: string
): Promise<number> {
  try {
    let current: number;
    
    if (mode === 'sum') {
      current = await sumEventMetrics(eventType, window, orgId);
    } else {
      current = await countEventsByType(eventType, window, orgId);
    }
    
    return Math.min(100, Math.round((current / targetValue) * 100));
  } catch (err) {
    console.error('Error in calculateProgressFromEvents:', err);
    return 0;
  }
}

/**
 * Get all events for a specific entity (e.g., all activities for a lead)
 */
export async function getEventsForEntity(
  entityId: string,
  entityType?: EntityType
): Promise<QuestEvent[]> {
  try {
    const supabaseAny = supabase as any;
    
    let query = supabaseAny
      .from('quest_events')
      .select('*')
      .eq('entity_id', entityId)
      .order('created_at', { ascending: false });

    if (entityType) {
      query = query.eq('entity_type', entityType);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching entity events:', error);
      return [];
    }

    return (data || []) as QuestEvent[];
  } catch (err) {
    console.error('Error in getEventsForEntity:', err);
    return [];
  }
}

/**
 * Get aggregated metrics across all events
 * Useful for dashboards and overview stats
 */
export async function getEventMetrics(
  window: TimeWindow,
  orgId?: string
): Promise<Record<string, number>> {
  try {
    const supabaseAny = supabase as any;
    
    const now = new Date();
    let dateThreshold: Date;
    
    switch (window) {
      case 'weekly':
        dateThreshold = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'monthly':
        dateThreshold = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'quarterly':
        const quarter = Math.floor(now.getMonth() / 3);
        dateThreshold = new Date(now.getFullYear(), quarter * 3, 1);
        break;
      case 'all-time':
      default:
        dateThreshold = new Date(0);
    }

    let query = supabaseAny
      .from('quest_events')
      .select('event_type')
      .gte('created_at', dateThreshold.toISOString());

    if (orgId) {
      query = query.eq('org_id', orgId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching event metrics:', error);
      return {};
    }

    // Aggregate by event type
    const metrics: Record<string, number> = {};
    (data || []).forEach((event: any) => {
      metrics[event.event_type] = (metrics[event.event_type] || 0) + 1;
    });

    return metrics;
  } catch (err) {
    console.error('Error in getEventMetrics:', err);
    return {};
  }
}

/**
 * Clear old events (optional cleanup, runs manually or scheduled)
 */
export async function clearOldEvents(daysToKeep: number = 365): Promise<boolean> {
  try {
    const supabaseAny = supabase as any;
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const { error } = await supabaseAny
      .from('quest_events')
      .delete()
      .lt('created_at', cutoffDate.toISOString());

    if (error) {
      console.error('Error clearing old events:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Error in clearOldEvents:', err);
    return false;
  }
}

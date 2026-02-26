/**
 * Calculate New Clients This Quarter
 * Uses job data to identify first-time customers acquired this quarter.
 * 
 * A client is "new this quarter" if:
 * - They have at least one job (start_at) during this quarter
 * - They have zero jobs in any prior quarter
 */

import { supabase } from '@/lib/supabaseClient';
import { logQuestEvent } from './questEvents';

/**
 * Calculate count of new clients acquired this quarter
 * Returns: { newClients: number, progressPercent: number }
 */
export async function calculateNewClientsThisQuarter(
  targetClients: number = 5,
  warehouseId?: string,
  userId?: string
): Promise<{ newClients: number; progressPercent: number }> {
  try {
    const supabaseAny = supabase as any;

    // Get quarter boundaries
    const now = new Date();
    const quarter = Math.floor(now.getMonth() / 3);
    const quarterStart = new Date(now.getFullYear(), quarter * 3, 1);
    const quarterEnd = new Date(now.getFullYear(), (quarter + 1) * 3, 1);

    // Raw SQL query to track new clients
    const { data, error } = await supabaseAny.rpc('get_new_clients_this_quarter', {
      p_quarter_start: quarterStart.toISOString(),
      p_quarter_end: quarterEnd.toISOString(),
      p_warehouse_id: warehouseId || null,
    });

    if (error) {
      // Fallback: query via PostgREST if RPC not available
      return await fallbackNewClientsCalculation(
        quarterStart,
        quarterEnd,
        warehouseId
      );
    }

    const newClients = data?.[0]?.new_clients_count || 0;
    const progressPercent = Math.min(100, Math.round((newClients / targetClients) * 100));

    // Log event for tracking
    if (userId) {
      await logQuestEvent('new_client_this_quarter', 'client', `new-clients-${now.getFullYear()}-q${quarter + 1}`, {
        metricValue: newClients > 0 ? 1 : 0, // Represents one "new client count event"
        source: 'jobs',
        metadata: {
          target: targetClients,
          actual_new_clients: newClients,
          quarter_start: quarterStart.toISOString(),
          quarter_end: quarterEnd.toISOString(),
          warehouse_id: warehouseId,
        },
        userId,
      });
    }

    return {
      newClients,
      progressPercent,
    };
  } catch (err) {
    console.error('Error calculating new clients:', err);
    return { newClients: 0, progressPercent: 0 };
  }
}

/**
 * Fallback calculation using PostgREST queries when RPC not available
 * This method queries jobs in two steps and determines new clients
 */
async function fallbackNewClientsCalculation(
  quarterStart: Date,
  quarterEnd: Date,
  warehouseId?: string
): Promise<{ newClients: number; progressPercent: number }> {
  try {
    const supabaseAny = supabase as any;

    // Step 1: Get clients with jobs in THIS quarter
    let thisQQuery = supabaseAny
      .from('jobs')
      .select('client_id', { count: 'exact' })
      .not('client_id', 'is', null)
      .gte('start_at', quarterStart.toISOString())
      .lt('start_at', quarterEnd.toISOString());

    if (warehouseId) {
      thisQQuery = thisQQuery.eq('warehouse_id', warehouseId);
    }

    const { data: thisQData, error: thisQError } = await thisQQuery;

    if (thisQError) {
      console.error('Error fetching this quarter jobs:', thisQError);
      return { newClients: 0, progressPercent: 0 };
    }

    // Get unique client IDs from this quarter
    const thisQClientIds = new Set<string>();
    (thisQData || []).forEach((job: any) => {
      if (job.client_id) {
        thisQClientIds.add(job.client_id);
      }
    });

    if (thisQClientIds.size === 0) {
      return { newClients: 0, progressPercent: 0 };
    }

    // Step 2: Get clients with jobs in PRIOR quarters
    let priorQQuery = supabaseAny
      .from('jobs')
      .select('client_id', { count: 'exact' })
      .not('client_id', 'is', null)
      .lt('start_at', quarterStart.toISOString());

    if (warehouseId) {
      priorQQuery = priorQQuery.eq('warehouse_id', warehouseId);
    }

    const { data: priorQData, error: priorQError } = await priorQQuery;

    if (priorQError) {
      console.error('Error fetching prior quarter jobs:', priorQError);
      // If prior query fails, treat all this quarter clients as new
      return {
        newClients: thisQClientIds.size,
        progressPercent: Math.min(100, Math.round((thisQClientIds.size / 5) * 100)),
      };
    }

    // Get unique client IDs from prior quarters
    const priorQClientIds = new Set<string>();
    (priorQData || []).forEach((job: any) => {
      if (job.client_id) {
        priorQClientIds.add(job.client_id);
      }
    });

    // New clients = those in this quarter but NOT in any prior quarter
    const newClientIds = new Set(
      [...thisQClientIds].filter((id) => !priorQClientIds.has(id))
    );

    const newClientsCount = newClientIds.size;
    const progressPercent = Math.min(100, Math.round((newClientsCount / 5) * 100));

    return {
      newClients: newClientsCount,
      progressPercent,
    };
  } catch (err) {
    console.error('Error in fallbackNewClientsCalculation:', err);
    return { newClients: 0, progressPercent: 0 };
  }
}

/**
 * Get detailed breakdown of new clients this quarter
 * Useful for reports and analysis
 */
export async function getNewClientsDetails(
  quarterStart: Date,
  quarterEnd: Date,
  warehouseId?: string
): Promise<Array<{ clientId: string; clientName: string; jobCount: number; jobIds: string[] }>> {
  try {
    const supabaseAny = supabase as any;

    // Get jobs from this quarter
    let query = supabaseAny
      .from('jobs')
      .select('id, client_id, client')
      .not('client_id', 'is', null)
      .gte('start_at', quarterStart.toISOString())
      .lt('start_at', quarterEnd.toISOString());

    if (warehouseId) {
      query = query.eq('warehouse_id', warehouseId);
    }

    const { data: thisQJobs, error: thisQError } = await query;

    if (thisQError) {
      console.error('Error fetching this quarter jobs:', thisQError);
      return [];
    }

    // Get prior clients
    let priorQuery = supabaseAny
      .from('jobs')
      .select('client_id')
      .not('client_id', 'is', null)
      .lt('start_at', quarterStart.toISOString());

    if (warehouseId) {
      priorQuery = priorQuery.eq('warehouse_id', warehouseId);
    }

    const { data: priorJobs, error: priorError } = await priorQuery;

    if (priorError) {
      console.error('Error fetching prior jobs:', priorError);
      return [];
    }

    // Build prior client set
    const priorClientIds = new Set<string>();
    (priorJobs || []).forEach((job: any) => {
      if (job.client_id) {
        priorClientIds.add(job.client_id);
      }
    });

    // Build new clients detail
    const newClientsMap = new Map<
      string,
      { clientName: string; jobCount: number; jobIds: string[] }
    >();

    (thisQJobs || []).forEach((job: any) => {
      if (job.client_id && !priorClientIds.has(job.client_id)) {
        const existing = newClientsMap.get(job.client_id) || {
          clientName: job.client || 'Unknown',
          jobCount: 0,
          jobIds: [] as string[],
        };
        existing.jobCount++;
        existing.jobIds.push(job.id);
        newClientsMap.set(job.client_id, existing);
      }
    });

    // Convert to array
    return Array.from(newClientsMap.entries()).map(([clientId, details]) => ({
      clientId,
      ...details,
    }));
  } catch (err) {
    console.error('Error in getNewClientsDetails:', err);
    return [];
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

interface Change {
  id: string;
  table_name: string;
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  record_id: string;
  old_values?: Record<string, unknown>;
  new_values?: Record<string, unknown>;
  created_at: string;
}

interface SyncResponse {
  success: boolean;
  synced: number;
  failed: number;
  errors?: Array<{ changeId: string; error: string }>;
}

async function validateToken(request: NextRequest) {
  const authHeader = request.headers.get('authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { valid: false, error: 'Missing authorization header', user: null };
  }

  const token = authHeader.substring(7);

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return { valid: false, error: 'Invalid token', user: null };
    }

    return { valid: true, user, error: null };
  } catch {
    return { valid: false, error: 'Token validation failed', user: null };
  }
}

async function applyChange(
  supabase: unknown,
  change: Change
): Promise<{ success: boolean; error?: string }> {
  try {
    const { table_name, operation, record_id, new_values, old_values } = change;

    // Validate table name to prevent SQL injection
    const allowedTables = [
      'inventory_items',
      'pull_sheets',
      'pull_sheet_items',
      'jobs',
      'job_assignments',
      'employees',
      'clients',
      'warehouses',
      'financing_applications',
      'payments',
      'return_manifests',
      'return_items',
      'tasks',
      'task_assignments',
      'venues',
      'notifications',
    ];

    if (!allowedTables.includes(table_name)) {
      return { success: false, error: `Invalid table: ${table_name}` };
    }

    // Check for conflicts (last-write-wins strategy)
    if (operation === 'UPDATE' && old_values?.updated_at) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: remoteRecord } = await (supabase as any)
          .from(table_name)
          .select('updated_at')
          .eq('id', record_id)
          .single();

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (remoteRecord && (remoteRecord as any).updated_at > old_values.updated_at) {
          // Conflict detected - remote was updated after our change was created
          console.warn(
            `Conflict detected for ${table_name}:${record_id} - using last-write-wins`
          );
          // Still apply the change (last-write-wins)
        }
      } catch {
        // Conflict check failed, continue with sync
        console.debug('Conflict check skipped (table may not have updated_at)');
      }
    }

    // Apply the change
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;

    switch (operation) {
      case 'INSERT':
        if (!new_values) {
          return { success: false, error: 'INSERT requires new_values' };
        }
        const { error: insertError } = await sb
          .from(table_name)
          .insert([{ id: record_id, ...new_values }]);

        if (insertError) {
          return { success: false, error: insertError.message };
        }
        break;

      case 'UPDATE':
        if (!new_values) {
          return { success: false, error: 'UPDATE requires new_values' };
        }
        const { error: updateError } = await sb
          .from(table_name)
          .update(new_values)
          .eq('id', record_id);

        if (updateError) {
          return { success: false, error: updateError.message };
        }
        break;

      case 'DELETE':
        const { error: deleteError } = await sb
          .from(table_name)
          .delete()
          .eq('id', record_id);

        if (deleteError) {
          return { success: false, error: deleteError.message };
        }
        break;

      default:
        return { success: false, error: `Unknown operation: ${operation}` };
    }

    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { success: false, error: errorMessage };
  }
}

export async function POST(request: NextRequest): Promise<NextResponse<SyncResponse>> {
  const auth = await validateToken(request);

  if (!auth.valid || !auth.user) {
    return NextResponse.json(
      { success: false, synced: 0, failed: 0, errors: [{ changeId: 'auth', error: auth.error || 'Unauthorized' }] },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const changes: Change[] = body.changes || [];

    if (!Array.isArray(changes)) {
      return NextResponse.json(
        { success: false, synced: 0, failed: 0, errors: [{ changeId: 'body', error: 'changes must be an array' }] },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    let synced = 0;
    let failed = 0;
    const errors: Array<{ changeId: string; error: string }> = [];

    // Process each change
    for (const change of changes) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await applyChange(supabase as any, change);
      if (result.success) {
        synced++;
      } else {
        failed++;
        errors.push({ changeId: change.id, error: result.error || 'Unknown error' });
      }
    }

    return NextResponse.json(
      {
        success: failed === 0,
        synced,
        failed,
        ...(errors.length > 0 && { errors }),
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      {
        success: false,
        synced: 0,
        failed: 1,
        errors: [{ changeId: 'parse', error: errorMessage }],
      },
      { status: 400 }
    );
  }
}

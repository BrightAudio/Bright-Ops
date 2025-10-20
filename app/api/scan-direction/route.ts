export const runtime = "nodejs";

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  // server-side: use the service role for RPC that mutates
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
);

export async function POST(req: Request) {
  try {
    const { jobCode, code, direction, scannedBy, location } = await req.json();

    if (!jobCode || !code || !direction) {
      return NextResponse.json({ error: 'Missing jobCode, code, or direction' }, { status: 400 });
    }
    if (!['OUT','IN','out','in'].includes(direction)) {
      return NextResponse.json({ error: 'direction must be OUT or IN' }, { status: 400 });
    }

    const { data, error } = await supabase.rpc('scan_direction', {
      p_job_code: jobCode,
      p_serial_or_barcode: code,
      p_direction: String(direction).toUpperCase(),
      p_scanned_by: scannedBy ?? null,
      p_location: location ?? null
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, result: data }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Unexpected error' }, { status: 500 });
  }
}

// Optional: reject non-POST requests with a friendly message
export async function GET() {
  return NextResponse.json({ error: 'Method Not Allowed' }, { status: 405 });
}

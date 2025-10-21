export const runtime = "nodejs";

import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseServer';

type Direction = "IN" | "OUT";

type ScanRow = {
  id: string;
  job_id: string;
  serial_id: string;
  direction: Direction;
  scanned_by: string | null;
  location: string | null;
  created_at: string;
};

type RpcParams = {
  p_job_code: string;
  p_serial_or_barcode: string;
  p_direction: Direction;
  p_scanned_by: string | null;
  p_location: string | null;
};

// Types for request body
type RequestBody = {
  jobCode: string;
  code: string;
  direction: string;
  scannedBy?: string;
  location?: string;
};

// Response types
type SuccessResponse = {
  ok: true;
  result: ScanRow | Record<string, unknown> | null;
};

type ErrorResponse = {
  error: string;
};

type RpcResult = ScanRow | { message?: string } | null;


export async function POST(req: Request): Promise<NextResponse<SuccessResponse | ErrorResponse>> {
  try {
    const body = await req.json() as RequestBody;
    const { jobCode, code, direction, scannedBy, location } = body;

    if (!jobCode || !code || !direction) {
      return NextResponse.json(
        { error: 'Missing jobCode, code, or direction' },
        { status: 400 }
      );
    }

    const dirNorm = String(direction).toUpperCase();
    if (dirNorm !== "OUT" && dirNorm !== "IN") {
      return NextResponse.json(
        { error: 'direction must be OUT or IN' },
        { status: 400 }
      );
    }

    const params: RpcParams = {
      p_job_code: jobCode,
      p_serial_or_barcode: code,
      p_direction: dirNorm as Direction,
      p_scanned_by: scannedBy ?? null,
      p_location: location ?? null
    };

    const { data, error } = await supabase.rpc('scan_direction', params);
    
    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { ok: true, result: data as RpcResult },
      { status: 200 }
    );
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

// Optional: reject non-POST requests with a friendly message
export async function GET() {
  return NextResponse.json({ error: 'Method Not Allowed' }, { status: 405 });
}

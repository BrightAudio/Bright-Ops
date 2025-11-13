import { NextResponse } from "next/server";
import { supabaseServer } from '@/lib/supabaseServer';

export async function GET() {
  const supabase = await supabaseServer();
  
  const { data: jobs, error } = await supabase
    .from("jobs")
    .select("id, job_id, name")
    .limit(10);
  
  return NextResponse.json({ jobs, error });
}

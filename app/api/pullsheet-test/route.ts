export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { supabaseServer } from '@/lib/supabaseServer';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const jobCode = url.searchParams.get("jobCode");

  if (!jobCode) {
    return NextResponse.json({ error: "jobCode required" }, { status: 400 });
  }

  const supabase = await supabaseServer();

  try {
    // Get job
    const { data: job, error: jobError } = await (supabase as any)
      .from("jobs")
      .select("id, code, title")
      .eq("code", jobCode)
      .single();

    if (jobError || !job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // Get pull sheet
    const { data: ps, error: psError } = await (supabase as any)
      .from("pull_sheets")
      .select("id, name, status")
      .eq("job_id", job.id)
      .limit(1)
      .single();

    if (psError || !ps) {
      return NextResponse.json({ error: "No pull sheet for job" }, { status: 404 });
    }

    // Get items
    const { data: items } = await (supabase as any)
      .from("pull_sheet_items")
      .select("qty_requested, qty_pulled, item_name, barcode")
      .eq("pull_sheet_id", ps.id);

    const itemList = items ?? [];

    const html = `<!DOCTYPE html>
<html>
<head>
  <title>Pull Sheet - ${job.code}</title>
</head>
<body>
  <h1>Pull Sheet: ${ps.name}</h1>
  <h2>Job: ${job.code} - ${job.title}</h2>
  <h3>Status: ${ps.status}</h3>
  
  <table border="1">
    <tr>
      <th>Item</th>
      <th>Barcode</th>
      <th>Qty Requested</th>
      <th>Qty Pulled</th>
    </tr>
    ${itemList.map((item: any) => `
    <tr>
      <td>${item.item_name}</td>
      <td>${item.barcode || '-'}</td>
      <td>${item.qty_requested}</td>
      <td>${item.qty_pulled}</td>
    </tr>
    `).join('')}
  </table>
</body>
</html>`;

    return new Response(html, { headers: { "Content-Type": "text/html" } });
  } catch (e) {
    console.error("Error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

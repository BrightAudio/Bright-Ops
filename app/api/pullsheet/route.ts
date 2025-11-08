export const runtime = "nodejs";

// app/api/pullsheet/route.ts
import { NextResponse } from "next/server";
import { supabaseServer } from '@/lib/supabaseServer';

// minimal types

type JobRow = {
  id: string;
  code: string;
  title?: string | null;
  venue?: string | null;
  start_at?: string | null;
  end_at?: string | null;
  notes?: string | null;
};

type PullSheetRow = {
  id: string;
  code: string;
  name?: string | null;
  status?: string | null;
  created_at?: string | null;
  finalized_at?: string | null;
  scheduled_out_at?: string | null;
  expected_return_at?: string | null;
  job_id?: string | null;
};

type PullSheetItem = {
  product_id: string | null;
  inventory_item_id: string | null;
  qty_requested: number | null;
  qty_pulled: number | null;
  item_name?: string | null;
  products?: ProductMeta[] | null;
  inventory_items?: InventoryMeta[] | null;
};

type ProductMeta = { id: string; sku?: string | null; name?: string | null };
type InventoryMeta = { id: string; name?: string | null; barcode?: string | null };
type RowOut = {
  sku: string;
  name: string;
  qty_req: number;
  qty_pulled: number;
};

export async function GET(req: Request) {
  const supabase = await supabaseServer();
  const { searchParams } = new URL(req.url);
  const jobCode = searchParams.get("jobCode");
  const pullSheetId = searchParams.get("pullSheetId");

  if (!jobCode && !pullSheetId) {
    return NextResponse.json({ error: "Missing pullSheetId or jobCode" }, { status: 400 });
  }

  let job: JobRow | null = null;
  let ps: PullSheetRow | null = null;

  if (pullSheetId) {
    const psRes = await supabase
      .from("pull_sheets")
      .select("id, code, name, status, created_at, finalized_at, scheduled_out_at, expected_return_at, job_id")
      .eq("id", pullSheetId)
      .maybeSingle();
    if (psRes.error || !psRes.data) {
      return NextResponse.json({ error: psRes.error?.message || "Pull sheet not found" }, { status: 404 });
    }
    ps = psRes.data as PullSheetRow;
    if (ps.job_id) {
      const jobRes = await supabase
        .from("jobs")
        .select("id, code, title, venue, start_at, end_at")
        .eq("id", ps.job_id)
        .maybeSingle();
      if (!jobRes.error && jobRes.data) {
        job = jobRes.data as JobRow;
      }
    }
  } else if (jobCode) {
    const jobRes = await supabase
      .from("jobs")
      .select("id, code, title, venue, start_at, end_at")
      .eq("code", jobCode)
      .limit(1);
    const jobRows = jobRes.data as JobRow[] | null;
    const jobErr = jobRes.error;
    if (jobErr || !jobRows || jobRows.length === 0) {
      return NextResponse.json({ error: jobErr?.message || "Job not found" }, { status: 404 });
    }
    job = jobRows[0];

    const psRes = await supabase
      .from("pull_sheets")
      .select("id, code, name, status, created_at, finalized_at, scheduled_out_at, expected_return_at, job_id")
      .eq("job_id", job.id)
      .order("created_at", { ascending: false, nullsFirst: false })
      .limit(1);
    const psRows = psRes.data as PullSheetRow[] | null;
    const psErr = psRes.error;
    if (psErr || !psRows || psRows.length === 0) {
      return NextResponse.json({ error: psErr?.message || "No pull sheet for job" }, { status: 404 });
    }
    ps = psRows[0];
  }

  if (!ps) {
    return NextResponse.json({ error: "Pull sheet not found" }, { status: 404 });
  }

  // job fallback for metadata
  const jobMeta = job ?? ({ code: "—", title: null, venue: null, start_at: null, end_at: null } as JobRow);

  // items
  const itemRes = await supabase
    .from("pull_sheet_items")
    .select(
      `qty_requested, qty_pulled, item_name, product_id, inventory_item_id,
       products ( id, sku, name ),
       inventory_items ( id, name, barcode )`
    )
    .eq("pull_sheet_id", ps.id);
  const items = itemRes.data as PullSheetItem[] | null;
  const itemErr = itemRes.error;
  if (itemErr) return NextResponse.json({ error: itemErr.message }, { status: 400 });
  const itemList: PullSheetItem[] = items ?? [];

  // build a typed rows array
  const rows: RowOut[] = itemList.map((r) => {
    const prod = r.products && r.products[0];
    const inventory = r.inventory_items && r.inventory_items[0];
    const sku = prod?.sku ?? inventory?.barcode ?? "";
    const name = r.item_name ?? prod?.name ?? inventory?.name ?? "";
    return {
      sku,
      name,
      qty_req: r.qty_requested ?? 0,
      qty_pulled: r.qty_pulled ?? 0
    };
  });

  const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Pull Sheet – ${escapeHtml(jobMeta.code ?? "")}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 24px; }
    h1 { margin: 0 0 4px 0; }
    .meta { color:#555; margin-bottom: 16px; }
    table { width:100%; border-collapse: collapse; }
    th, td { border:1px solid #ddd; padding:8px; }
    th { background:#f4f4f4; text-align:left; }
    .badge { display:inline-block; padding:2px 8px; border-radius:12px; background:#000; color:#fff; font-size:12px; }
    .small { font-size:12px; color:#666; }
    .footer { margin-top:16px; font-size:12px; color:#777; }
  </style>
</head>
<body>
  <h1>Pull Sheet <span class="badge">${escapeHtml(ps.code)}</span></h1>
  <div class="meta">
    <div><b>Name:</b> ${escapeHtml(ps.name ?? "")}</div>
    <div><b>Job:</b> ${escapeHtml(jobMeta.code ?? "")} – ${escapeHtml(jobMeta.title ?? "")}</div>
    <div><b>Venue:</b> ${escapeHtml(jobMeta.venue ?? "")}</div>
    <div><b>Window:</b> ${escapeHtml(ps.scheduled_out_at ?? jobMeta.start_at ?? "")} → ${escapeHtml(ps.expected_return_at ?? jobMeta.end_at ?? "")}</div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width:140px">SKU</th>
        <th>Item</th>
        <th style="width:110px">Qty Req</th>
        <th style="width:110px">Qty Pulled</th>
      </tr>
    </thead>
    <tbody>
      ${rows.length > 0
        ? rows
            .map(
              (r) => `
        <tr>
          <td>${escapeHtml(r.sku)}</td>
          <td>${escapeHtml(r.name)}</td>
          <td style="text-align:right">${r.qty_req}</td>
          <td style="text-align:right">${r.qty_pulled}</td>
        </tr>`
            )
            .join("")
        : `<tr><td colspan="4" style="text-align:center; color:#666">No items found</td></tr>`}
    </tbody>
  </table>

  <div class="footer">
    Generated by Bright Audio · ${new Date().toLocaleString()}
  </div>
</body>
</html>`;

  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}

// small utility to avoid HTML injection in values
function escapeHtml(str: string) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

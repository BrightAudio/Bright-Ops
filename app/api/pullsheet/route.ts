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
  const idOnly = searchParams.get("idOnly") === "true"; // New parameter for just getting the ID

  if (!jobCode && !pullSheetId) {
    return NextResponse.json({ error: "Missing pullSheetId or jobCode" }, { status: 400 });
  }

  // Get the current user's company name
  let companyName = "Bright Audio"; // Default fallback
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("company_name")
        .eq("id", user.id)
        .single();
      if ((profile as any)?.company_name) {
        companyName = (profile as any).company_name;
      }
    }
  } catch (err) {
    // Continue with default company name if profile fetch fails
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
      return NextResponse.json({ 
        error: jobErr?.message || "Job not found",
        requestedJobCode: jobCode
      }, { status: 404 });
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

  // If only ID is requested, return early
  if (idOnly) {
    return NextResponse.json({ pullSheetId: ps.id });
  }

  // job fallback for metadata
  const jobMeta = job ?? ({ id: "", code: "—", title: null, venue: null, start_at: null, end_at: null } as JobRow);

  // items - simplified query without complex joins
  const itemRes = await supabase
    .from("pull_sheet_items")
    .select("qty_requested, qty_pulled, item_name, barcode, category")
    .eq("pull_sheet_id", ps.id);
  const items = itemRes.data as Array<{
    qty_requested: number;
    qty_pulled: number;
    item_name: string;
    barcode: string | null;
    category: string | null;
  }> | null;
  const itemErr = itemRes.error;
  if (itemErr) return NextResponse.json({ error: itemErr.message }, { status: 400 });
  const itemList = items ?? [];

  // build a typed rows array
  const rows: RowOut[] = itemList.map((r) => {
    return {
      sku: r.barcode ?? "",
      name: r.item_name ?? "",
      qty_req: r.qty_requested ?? 0,
      qty_pulled: r.qty_pulled ?? 0
    };
  });

  // Format dates for display
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    } catch {
      return dateStr;
    }
  };

  const pullDate = formatDate((ps.scheduled_out_at ?? jobMeta.start_at) ?? null);
  const returnDate = formatDate((ps.expected_return_at ?? jobMeta.end_at) ?? null);
  const prepStatus = ps.status === "completed" ? "COMPLETE" : ps.status === "in_progress" ? "IN PROGRESS" : "PENDING";
  
  // Group items by case/zone (for now, single "EQUIPMENT" group)
  const groupedItems = [{
    groupName: "EQUIPMENT",
    items: rows
  }];

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Pull Sheet – ${escapeHtml(jobMeta.code ?? "")}</title>
  <style>
    @page {
      size: letter portrait;
      margin: 0.5in;
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      font-size: 11pt;
      line-height: 1.3;
      color: #000;
      background: #fff;
    }

    .page-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      margin-bottom: 16px;
      padding-bottom: 12px;
      border-bottom: 3px solid #000;
    }

    .logo-section {
      flex: 0 0 auto;
    }

    .logo-section h1 {
      font-size: 28px;
      font-weight: 700;
      letter-spacing: -0.5px;
      margin-bottom: 2px;
    }

    .logo-section .tagline {
      font-size: 10px;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .title-section {
      flex: 1;
      text-align: center;
      padding: 0 20px;
    }

    .title-section h2 {
      font-size: 24px;
      font-weight: 700;
      margin-bottom: 4px;
    }

    .title-section .pull-code {
      font-size: 14px;
      color: #666;
      font-weight: 600;
    }

    .meta-panel {
      flex: 0 0 220px;
      border: 1.5px solid #000;
      padding: 8px 10px;
      font-size: 10px;
      line-height: 1.4;
    }

    .meta-panel .row {
      display: flex;
      margin-bottom: 3px;
    }

    .meta-panel .row:last-child {
      margin-bottom: 0;
    }

    .meta-panel .label {
      font-weight: 700;
      width: 70px;
      flex-shrink: 0;
    }

    .meta-panel .value {
      flex: 1;
    }

    .content-section {
      margin-top: 20px;
    }

    .group-header {
      background: #000;
      color: #fff;
      padding: 6px 10px;
      font-size: 12px;
      font-weight: 700;
      margin-top: 16px;
      margin-bottom: 0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .group-header:first-of-type {
      margin-top: 0;
    }

    .group-qty {
      font-size: 11px;
      font-weight: 600;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 12px;
      font-size: 10.5px;
    }

    thead {
      background: #f0f0f0;
      border-top: 1.5px solid #000;
      border-bottom: 1.5px solid #000;
    }

    thead th {
      padding: 6px 8px;
      text-align: left;
      font-weight: 700;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    tbody tr {
      border-bottom: 1px solid #ddd;
    }

    tbody tr:nth-child(even) {
      background: #fafafa;
    }

    tbody td {
      padding: 6px 8px;
      vertical-align: top;
    }

    .col-num {
      width: 30px;
      text-align: center;
      color: #666;
      font-size: 9px;
    }

    .col-case {
      width: 60px;
      font-weight: 600;
    }

    .col-item {
      min-width: 180px;
    }

    .col-accessories {
      width: 120px;
      font-size: 9px;
      color: #555;
      font-style: italic;
    }

    .col-qty-req {
      width: 50px;
      text-align: center;
      font-weight: 600;
    }

    .col-qty-scanned {
      width: 50px;
      text-align: center;
    }

    .col-serial {
      width: 100px;
      font-size: 9px;
      font-family: "Courier New", monospace;
    }

    .col-barcode {
      width: 100px;
      font-size: 9px;
      font-family: "Courier New", monospace;
    }

    .col-notes {
      width: 80px;
      font-size: 9px;
      color: #666;
    }

    .item-name {
      font-weight: 600;
      display: block;
      margin-bottom: 2px;
    }

    .item-model {
      font-size: 9px;
      color: #666;
    }

    .page-footer {
      margin-top: 24px;
      padding-top: 12px;
      border-top: 1.5px solid #000;
      font-size: 9px;
      color: #333;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .footer-left {
      flex: 1;
    }

    .footer-right {
      text-align: right;
      flex: 1;
    }

    .footer-legend {
      margin-top: 8px;
      font-size: 8px;
      color: #666;
      font-style: italic;
    }

    @media print {
      body {
        print-color-adjust: exact;
        -webkit-print-color-adjust: exact;
      }

      div[style*="border-bottom: 1px solid #ddd"] {
        display: none !important;
      }

      .group-header {
        page-break-after: avoid;
      }

      table {
        page-break-inside: avoid;
      }

      thead {
        display: table-header-group;
      }

      tr {
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <div style="padding: 10px 20px; border-bottom: 1px solid #ddd; display: flex; gap: 10px; align-items: center;">
    <button onclick="window.history.back()" style="padding: 8px 16px; background-color: #f0f0f0; border: 1px solid #999; border-radius: 4px; cursor: pointer; font-size: 14px; font-weight: 500;">
      ← Back
    </button>
    <button onclick="window.print()" style="padding: 8px 16px; background-color: #f0f0f0; border: 1px solid #999; border-radius: 4px; cursor: pointer; font-size: 14px; font-weight: 500;">
      🖨️ Print
    </button>
  </div>
  <div class="page-header">
    <div class="logo-section">
      <h1>${escapeHtml(companyName.toUpperCase())}</h1>
      <div class="tagline">Professional Audio Solutions</div>
    </div>

    <div class="title-section">
      <h2>PULL SHEET</h2>
      <div class="pull-code">${escapeHtml(ps.code)}</div>
    </div>

    <div class="meta-panel">
      <div class="row">
        <div class="label">Job Code:</div>
        <div class="value">${escapeHtml(jobMeta.code ?? "—")}</div>
      </div>
      <div class="row">
        <div class="label">Venue:</div>
        <div class="value">${escapeHtml(jobMeta.venue ?? "—")}</div>
      </div>
      <div class="row">
        <div class="label">Pull Date:</div>
        <div class="value">${pullDate}</div>
      </div>
      <div class="row">
        <div class="label">Return:</div>
        <div class="value">${returnDate}</div>
      </div>
      <div class="row">
        <div class="label">Prep Status:</div>
        <div class="value"><strong>${prepStatus}</strong></div>
      </div>
      <div class="row">
        <div class="label">Page:</div>
        <div class="value">1 of 1</div>
      </div>
    </div>
  </div>

  <div class="content-section">
    ${groupedItems.map((group) => {
      const totalQty = group.items.reduce((sum, item) => sum + item.qty_req, 0);
      return `
    <div class="group-header">
      <span>${escapeHtml(group.groupName)}</span>
      <span class="group-qty">Total Qty: ${totalQty}</span>
    </div>

    <table>
      <thead>
        <tr>
          <th class="col-num">#</th>
          <th class="col-case">Case</th>
          <th class="col-item">Item / Model</th>
          <th class="col-accessories">Accessories</th>
          <th class="col-qty-req">Qty Req</th>
          <th class="col-qty-scanned">Qty Scanned</th>
          <th class="col-serial">Serial / Unit</th>
          <th class="col-barcode">Barcode</th>
          <th class="col-notes">Notes</th>
        </tr>
      </thead>
      <tbody>
        ${group.items.length > 0
          ? group.items.map((item, idx) => `
        <tr>
          <td class="col-num">${idx + 1}</td>
          <td class="col-case">—</td>
          <td class="col-item">
            <span class="item-name">${escapeHtml(item.name)}</span>
            <span class="item-model">${escapeHtml(item.sku)}</span>
          </td>
          <td class="col-accessories">—</td>
          <td class="col-qty-req">${item.qty_req}</td>
          <td class="col-qty-scanned">${item.qty_pulled || "—"}</td>
          <td class="col-serial">—</td>
          <td class="col-barcode">${escapeHtml(item.sku)}</td>
          <td class="col-notes"></td>
        </tr>
          `).join("")
          : `
        <tr>
          <td colspan="9" style="text-align:center; color:#999; padding:20px;">No items in this group</td>
        </tr>
          `}
      </tbody>
    </table>
      `;
    }).join("")}
  </div>

  <div class="page-footer">
    <div class="footer-left">
      <div><strong>${escapeHtml(companyName)}</strong></div>
      <div>Generated: ${new Date().toLocaleString("en-US", { 
        month: "short", 
        day: "numeric", 
        year: "numeric", 
        hour: "numeric", 
        minute: "2-digit", 
        hour12: true 
      })}</div>
    </div>
    <div class="footer-right">
      <div><strong>Pull Sheet:</strong> ${escapeHtml(ps.name ?? ps.code)}</div>
      <div><strong>Job:</strong> ${escapeHtml(jobMeta.title ?? jobMeta.code ?? "—")}</div>
    </div>
  </div>

  <div class="footer-legend">
    Legend: Qty Req = Quantity Requested | Qty Scanned = Quantity Picked/Verified | Serial/Unit = Specific unit assignment
  </div>
</body>
</html>`;

  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}

// small utility to avoid HTML injection in values
function escapeHtml(str: string | null | undefined) {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

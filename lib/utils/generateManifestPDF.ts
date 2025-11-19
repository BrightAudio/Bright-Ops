/**
 * Generate Pull Sheet Manifest PDF
 * 
 * Creates a PDF document with:
 * - Job details (name, code, venue)
 * - Client information (name, phone, email)
 * - Expected arrival date/time
 * - Complete item list with quantities
 */

import jsPDF from 'jspdf';
import 'jspdf-autotable';

export interface ManifestData {
  pullSheet: {
    id: string;
    name: string;
    scheduled_out_at?: string | null;
    expected_return_at?: string | null;
    notes?: string | null;
  };
  job: {
    code?: string;
    title: string;
    venue?: string | null;
    venues?: {
      name: string;
      address?: string | null;
      city?: string | null;
      state?: string | null;
      contact_phone?: string | null;
    } | null;
  } | null;
  client: {
    name: string;
    phone?: string | null;
    email?: string | null;
  } | null;
  items: Array<{
    item_name: string;
    qty_requested: number;
    qty_pulled: number;
    notes?: string | null;
    inventory_items?: {
      barcode?: string;
      category?: string;
    } | null;
  }>;
}

export function generateManifestPDF(data: ManifestData): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let yPos = 20;

  // Title
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('PULL SHEET MANIFEST', pageWidth / 2, yPos, { align: 'center' });
  yPos += 15;

  // Job Information Box
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('JOB INFORMATION', 14, yPos);
  yPos += 2;
  
  doc.setLineWidth(0.5);
  doc.line(14, yPos, pageWidth - 14, yPos);
  yPos += 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);

  // Job Name & Code
  if (data.job) {
    doc.setFont('helvetica', 'bold');
    doc.text('Job:', 14, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(`${data.job.title}${data.job.code ? ` (${data.job.code})` : ''}`, 50, yPos);
    yPos += 6;
  }

  // Venue
  if (data.job?.venues) {
    doc.setFont('helvetica', 'bold');
    doc.text('Venue:', 14, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(data.job.venues.name, 50, yPos);
    yPos += 6;

    if (data.job.venues.address || data.job.venues.city) {
      const address = [
        data.job.venues.address,
        data.job.venues.city,
        data.job.venues.state
      ].filter(Boolean).join(', ');
      doc.text(address, 50, yPos);
      yPos += 6;
    }

    if (data.job.venues.contact_phone) {
      doc.setFont('helvetica', 'bold');
      doc.text('Venue Phone:', 14, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(data.job.venues.contact_phone, 50, yPos);
      yPos += 6;
    }
  } else if (data.job?.venue) {
    doc.setFont('helvetica', 'bold');
    doc.text('Venue:', 14, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(data.job.venue, 50, yPos);
    yPos += 6;
  }

  // Expected Arrival Date/Time
  if (data.pullSheet.scheduled_out_at) {
    doc.setFont('helvetica', 'bold');
    doc.text('Arrival Date/Time:', 14, yPos);
    doc.setFont('helvetica', 'normal');
    const arrivalDate = new Date(data.pullSheet.scheduled_out_at);
    doc.text(arrivalDate.toLocaleString(), 50, yPos);
    yPos += 6;
  }

  // Expected Return
  if (data.pullSheet.expected_return_at) {
    doc.setFont('helvetica', 'bold');
    doc.text('Expected Return:', 14, yPos);
    doc.setFont('helvetica', 'normal');
    const returnDate = new Date(data.pullSheet.expected_return_at);
    doc.text(returnDate.toLocaleString(), 50, yPos);
    yPos += 6;
  }

  yPos += 4;

  // Client Information Box
  if (data.client) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('CLIENT INFORMATION', 14, yPos);
    yPos += 2;
    
    doc.setLineWidth(0.5);
    doc.line(14, yPos, pageWidth - 14, yPos);
    yPos += 8;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Client:', 14, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(data.client.name, 50, yPos);
    yPos += 6;

    if (data.client.phone) {
      doc.setFont('helvetica', 'bold');
      doc.text('Phone:', 14, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(data.client.phone, 50, yPos);
      yPos += 6;
    }

    if (data.client.email) {
      doc.setFont('helvetica', 'bold');
      doc.text('Email:', 14, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(data.client.email, 50, yPos);
      yPos += 6;
    }

    yPos += 4;
  }

  // Equipment List
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('EQUIPMENT LIST', 14, yPos);
  yPos += 2;
  
  doc.setLineWidth(0.5);
  doc.line(14, yPos, pageWidth - 14, yPos);
  yPos += 6;

  // Table headers and data
  const tableData = data.items.map(item => [
    item.qty_requested.toString(),
    item.item_name,
    item.inventory_items?.category || '',
    item.inventory_items?.barcode || '',
    item.notes || ''
  ]);

  (doc as any).autoTable({
    startY: yPos,
    head: [['Qty', 'Item', 'Category', 'Barcode', 'Notes']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [41, 128, 185],
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 10
    },
    bodyStyles: {
      fontSize: 9
    },
    columnStyles: {
      0: { cellWidth: 15, halign: 'center' },
      1: { cellWidth: 60 },
      2: { cellWidth: 30 },
      3: { cellWidth: 35 },
      4: { cellWidth: 'auto' }
    },
    margin: { left: 14, right: 14 }
  });

  // Footer with notes if present
  if (data.pullSheet.notes) {
    const finalY = (doc as any).lastAutoTable.finalY || yPos + 60;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Notes:', 14, finalY + 10);
    doc.setFont('helvetica', 'normal');
    
    const splitNotes = doc.splitTextToSize(data.pullSheet.notes, pageWidth - 28);
    doc.text(splitNotes, 14, finalY + 16);
  }

  // Save the PDF
  const fileName = `manifest-${data.job?.code || 'pullsheet'}-${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
}

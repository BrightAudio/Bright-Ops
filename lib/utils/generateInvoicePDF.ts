import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface LineItem {
  id: string;
  item_type: string;
  item_name: string;
  quantity: number | null;
  unit_cost: number | null;
  total_cost: number | null;
}

interface InvoiceData {
  jobName: string;
  jobId: string;
  clientName?: string;
  invoiceNumber?: string;
  invoiceDate: string;
  dueDate?: string;
  equipmentItems: LineItem[];
  laborItems: LineItem[];
  equipmentTotal: number;
  laborTotal: number;
  subtotal: number;
  finalAmount: number;
}

export function generateInvoicePDF(data: InvoiceData) {
  const doc = new jsPDF();
  
  // Company Header
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('BRIGHT AUDIO', 105, 20, { align: 'center' });
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Professional Audio & Lighting Services', 105, 28, { align: 'center' });
  
  // Invoice Title
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('INVOICE', 105, 45, { align: 'center' });
  
  // Invoice Details - Left Side
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  let yPos = 60;
  
  if (data.invoiceNumber) {
    doc.setFont('helvetica', 'bold');
    doc.text('Invoice #:', 20, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(data.invoiceNumber, 50, yPos);
    yPos += 7;
  }
  
  doc.setFont('helvetica', 'bold');
  doc.text('Date:', 20, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(data.invoiceDate, 50, yPos);
  yPos += 7;
  
  if (data.dueDate) {
    doc.setFont('helvetica', 'bold');
    doc.text('Due Date:', 20, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(data.dueDate, 50, yPos);
    yPos += 7;
  }
  
  doc.setFont('helvetica', 'bold');
  doc.text('Job:', 20, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(data.jobName || 'Untitled Job', 50, yPos);
  yPos += 7;
  
  if (data.clientName) {
    doc.setFont('helvetica', 'bold');
    doc.text('Client:', 20, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(data.clientName, 50, yPos);
  }
  
  // Separator Line
  yPos = 95;
  doc.setDrawColor(200, 200, 200);
  doc.line(20, yPos, 190, yPos);
  
  yPos += 10;
  
  // Equipment Items Section
  if (data.equipmentItems.length > 0) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Equipment Rental', 20, yPos);
    yPos += 7;
    
    const equipmentRows = data.equipmentItems.map(item => [
      item.item_name,
      (item.quantity || 0).toString(),
      `$${(item.unit_cost || 0).toFixed(2)}`,
      `$${(item.total_cost || 0).toFixed(2)}`
    ]);
    
    autoTable(doc, {
      startY: yPos,
      head: [['Item', 'Qty', 'Rate/Day', 'Total']],
      body: equipmentRows,
      theme: 'striped',
      headStyles: { fillColor: [66, 135, 245], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 9 },
      columnStyles: {
        0: { cellWidth: 90 },
        1: { cellWidth: 25, halign: 'center' },
        2: { cellWidth: 35, halign: 'right' },
        3: { cellWidth: 35, halign: 'right' }
      }
    });
    
    yPos = (doc as any).lastAutoTable.finalY + 3;
    
    // Equipment Subtotal
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Equipment Subtotal:', 130, yPos);
    doc.text(`$${data.equipmentTotal.toFixed(2)}`, 185, yPos, { align: 'right' });
    yPos += 10;
  }
  
  // Labor Items Section
  if (data.laborItems.length > 0) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Labor Charges', 20, yPos);
    yPos += 7;
    
    const laborRows = data.laborItems.map(item => [
      item.item_name,
      (item.quantity || 0).toString(),
      `$${(item.unit_cost || 0).toFixed(2)}`,
      `$${(item.total_cost || 0).toFixed(2)}`
    ]);
    
    autoTable(doc, {
      startY: yPos,
      head: [['Role', 'Hours', 'Rate/Hour', 'Total']],
      body: laborRows,
      theme: 'striped',
      headStyles: { fillColor: [124, 58, 237], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 9 },
      columnStyles: {
        0: { cellWidth: 90 },
        1: { cellWidth: 25, halign: 'center' },
        2: { cellWidth: 35, halign: 'right' },
        3: { cellWidth: 35, halign: 'right' }
      }
    });
    
    yPos = (doc as any).lastAutoTable.finalY + 3;
    
    // Labor Subtotal
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Labor Subtotal:', 130, yPos);
    doc.text(`$${data.laborTotal.toFixed(2)}`, 185, yPos, { align: 'right' });
    yPos += 10;
  }
  
  // Totals Section
  yPos += 5;
  doc.setDrawColor(100, 100, 100);
  doc.setLineWidth(0.5);
  doc.line(130, yPos, 190, yPos);
  yPos += 7;
  
  // Subtotal
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text('Subtotal:', 130, yPos);
  doc.text(`$${data.subtotal.toFixed(2)}`, 185, yPos, { align: 'right' });
  yPos += 8;
  
  // Final Amount (Bold and larger)
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setDrawColor(66, 135, 245);
  doc.setLineWidth(1);
  doc.line(130, yPos - 2, 190, yPos - 2);
  yPos += 3;
  doc.text('TOTAL DUE:', 130, yPos);
  doc.text(`$${data.finalAmount.toFixed(2)}`, 185, yPos, { align: 'right' });
  
  // Footer
  const pageHeight = doc.internal.pageSize.height;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(100, 100, 100);
  doc.text('Thank you for your business!', 105, pageHeight - 20, { align: 'center' });
  doc.text('Payment is due within 30 days unless otherwise specified.', 105, pageHeight - 15, { align: 'center' });
  
  // Save the PDF
  const fileName = `Invoice_${data.invoiceNumber || data.jobId}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
}

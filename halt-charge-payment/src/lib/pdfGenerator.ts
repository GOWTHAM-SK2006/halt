import { Invoice } from './types';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

function formatCurrency(amount: number): string {
  return `₹${amount.toFixed(2)}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: 'Asia/Kolkata',
  });
}

export async function generateInvoicePDF(invoice: Invoice): Promise<void> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const W = doc.internal.pageSize.getWidth();

  // ── Colours ──────────────────────────────────────────────────────────────────
  const BLACK = [5, 5, 5] as [number, number, number];
  const GREEN = [57, 255, 20] as [number, number, number];
  const WHITE = [255, 255, 255] as [number, number, number];
  const GREY = [184, 189, 184] as [number, number, number];
  const DARK = [17, 20, 17] as [number, number, number];

  // ── Background ───────────────────────────────────────────────────────────────
  doc.setFillColor(...BLACK);
  doc.rect(0, 0, W, 297, 'F');

  // ── Header band ──────────────────────────────────────────────────────────────
  doc.setFillColor(...DARK);
  doc.rect(0, 0, W, 42, 'F');

  // Green accent bar
  doc.setFillColor(...GREEN);
  doc.rect(0, 42, W, 1.2, 'F');

  // Company name (since we can't embed image in PDF easily, text logo)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(...GREEN);
  doc.text('HALT', 15, 18);
  doc.setTextColor(...WHITE);
  doc.text('&', 41, 18);
  doc.setTextColor(...GREEN);
  doc.text('CHARGE', 49, 18);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...GREY);
  doc.text('REDEFINING THE WAY YOU RECHARGE', 15, 25);

  // Invoice label on right
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...WHITE);
  doc.text('TAX INVOICE', W - 15, 18, { align: 'right' });

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...GREY);
  doc.text(`Invoice No: ${invoice.invoiceNumber}`, W - 15, 25, { align: 'right' });
  doc.text(`Date: ${formatDate(invoice.paidAt)}`, W - 15, 31, { align: 'right' });

  // ── Session & Transaction Info ────────────────────────────────────────────────
  let y = 54;

  const infoLeft = [
    ['Station', invoice.station.stationName],
    ['Location', invoice.station.location],
    ['Charger ID', invoice.station.chargerId],
    ['Session ID', invoice.sessionId],
    ['Session Date', invoice.station.sessionDate],
  ];
  if (invoice.station.startTime && invoice.station.endTime) {
    infoLeft.push(['Session Time', `${invoice.station.startTime} – ${invoice.station.endTime}`]);
  }
  if (invoice.station.connectorType) {
    infoLeft.push(['Connector', invoice.station.connectorType]);
  }

  const infoRight = [
    ['Transaction ID', invoice.transactionId],
    ['Payment ID', invoice.paymentId],
    ['Payment Method', invoice.paymentMethod],
    ['Payment Status', 'PAID ✓'],
  ];

  // Left column
  let yl = y;
  for (const [label, value] of infoLeft) {
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...GREY);
    doc.text(label.toUpperCase(), 15, yl);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...WHITE);
    doc.text(value, 15, yl + 4.5);
    yl += 12;
  }

  // Right column
  let yr = y;
  for (const [label, value] of infoRight) {
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...GREY);
    doc.text(label.toUpperCase(), W / 2 + 5, yr);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(label === 'Payment Status' ? GREEN[0] : WHITE[0], label === 'Payment Status' ? GREEN[1] : WHITE[1], label === 'Payment Status' ? GREEN[2] : WHITE[2]);
    doc.text(value, W / 2 + 5, yr + 4.5);
    yr += 12;
  }

  y = Math.max(yl, yr) + 4;

  // Divider
  doc.setDrawColor(...GREEN);
  doc.setLineWidth(0.4);
  doc.line(15, y, W - 15, y);
  y += 8;

  // ── Billing Table ─────────────────────────────────────────────────────────────
  const { billing } = invoice;

  const tableRows: (string | number)[][] = [
    ['Energy Consumed', `${billing.energyConsumedKwh.toFixed(2)} kWh`, `₹${billing.tariffPerKwh.toFixed(2)}/kWh`, formatCurrency(billing.energyCharge)],
    ['GST (5%)', '', '', formatCurrency(billing.gstAmount)],
  ];

  if (billing.serviceFee > 0) {
    tableRows.push(['Service Fee', '', '', formatCurrency(billing.serviceFee)]);
  }
  if (billing.discount > 0) {
    tableRows.push(['Discount', '', '', `− ${formatCurrency(billing.discount)}`]);
  }

  autoTable(doc, {
    startY: y,
    head: [['Description', 'Quantity', 'Rate', 'Amount']],
    body: tableRows,
    theme: 'plain',
    headStyles: {
      fillColor: DARK,
      textColor: GREEN,
      fontStyle: 'bold',
      fontSize: 9,
      cellPadding: { top: 4, bottom: 4, left: 4, right: 4 },
    },
    bodyStyles: {
      fillColor: [12, 15, 12],
      textColor: WHITE,
      fontSize: 9,
      cellPadding: { top: 4, bottom: 4, left: 4, right: 4 },
    },
    alternateRowStyles: { fillColor: [17, 20, 17] },
    columnStyles: {
      0: { cellWidth: 80 },
      1: { cellWidth: 35, halign: 'center' },
      2: { cellWidth: 35, halign: 'center' },
      3: { cellWidth: 30, halign: 'right' },
    },
    margin: { left: 15, right: 15 },
  });

  const tableEndY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 4;

  // Total row
  doc.setFillColor(...GREEN);
  doc.roundedRect(W - 80, tableEndY, 65, 16, 3, 3, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...BLACK);
  doc.text('TOTAL PAID', W - 75, tableEndY + 7);
  doc.setFontSize(13);
  doc.text(formatCurrency(billing.totalAmount), W - 17, tableEndY + 7, { align: 'right' });

  // ── Footer ────────────────────────────────────────────────────────────────────
  const footerY = 275;
  doc.setDrawColor(...GREEN);
  doc.setLineWidth(0.3);
  doc.line(15, footerY - 4, W - 15, footerY - 4);

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...GREY);
  doc.text('Halt & Charge — EV Charging Services', 15, footerY + 2);
  doc.text(`Support: ${invoice.supportEmail}  |  ${invoice.supportPhone}`, 15, footerY + 8);
  doc.text('This is a system-generated invoice and does not require a physical signature.', W - 15, footerY + 5, { align: 'right' });

  // Save
  doc.save(`HaltCharge-Invoice-${invoice.invoiceNumber}.pdf`);
}

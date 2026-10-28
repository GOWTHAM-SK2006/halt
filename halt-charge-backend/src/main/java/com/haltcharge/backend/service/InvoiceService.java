package com.haltcharge.backend.service;

import com.haltcharge.backend.entity.PaymentSession;
import com.itextpdf.text.*;
import com.itextpdf.text.pdf.*;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.time.format.DateTimeFormatter;

@Service
@Slf4j
public class InvoiceService {

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("dd MMM yyyy");
    private static final DateTimeFormatter TIME_FMT = DateTimeFormatter.ofPattern("HH:mm");

    private static final BaseColor BRAND_GREEN = new BaseColor(39, 174, 96);
    private static final BaseColor DARK_BG     = new BaseColor(20, 20, 20);
    private static final BaseColor LIGHT_GRAY  = new BaseColor(245, 245, 245);
    private static final BaseColor BORDER_GRAY = new BaseColor(220, 220, 220);

    /**
     * Generates a PDF invoice for a paid payment session.
     * Returns raw PDF bytes.
     */
    public byte[] generateInvoice(PaymentSession session) {
        if (session.getStatus() != PaymentSession.PaymentStatus.PAID) {
            throw new IllegalStateException("Invoice can only be generated for PAID sessions");
        }

        try {
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            Document doc = new Document(PageSize.A4, 40, 40, 40, 40);
            PdfWriter.getInstance(doc, baos);
            doc.open();

            addContent(doc, session);

            doc.close();
            return baos.toByteArray();
        } catch (DocumentException e) {
            log.error("Failed to generate invoice for session: {}", session.getToken(), e);
            throw new RuntimeException("Invoice generation failed", e);
        }
    }

    private void addContent(Document doc, PaymentSession session) throws DocumentException {
        Font titleFont    = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 22, BRAND_GREEN);
        Font subFont      = FontFactory.getFont(FontFactory.HELVETICA, 10, BaseColor.GRAY);
        Font headerFont   = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 11, BaseColor.WHITE);
        Font labelFont    = FontFactory.getFont(FontFactory.HELVETICA, 10, BaseColor.GRAY);
        Font valueFont    = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10, BaseColor.BLACK);
        Font totalFont    = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 13, BRAND_GREEN);
        Font footerFont   = FontFactory.getFont(FontFactory.HELVETICA, 9, BaseColor.GRAY);

        String invoiceNo = "HC-INV-" + session.getToken().substring(0, 8).toUpperCase();
        String paidDate  = session.getPaidAt() != null
            ? session.getPaidAt().format(DATE_FMT) : "N/A";
        String paidTime  = session.getPaidAt() != null
            ? session.getPaidAt().format(TIME_FMT) : "N/A";

        // ── Header ──
        PdfPTable headerTable = new PdfPTable(2);
        headerTable.setWidthPercentage(100);
        headerTable.setSpacingAfter(20);

        PdfPCell brandCell = new PdfPCell();
        brandCell.setBorder(Rectangle.NO_BORDER);
        brandCell.addElement(new Paragraph("Halt & Charge", titleFont));
        brandCell.addElement(new Paragraph("EV Charging Payment Invoice", subFont));
        headerTable.addCell(brandCell);

        PdfPCell metaCell = new PdfPCell();
        metaCell.setBorder(Rectangle.NO_BORDER);
        metaCell.setHorizontalAlignment(Element.ALIGN_RIGHT);
        Font invNoFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12, BaseColor.BLACK);
        Paragraph invPara = new Paragraph("Invoice #" + invoiceNo, invNoFont);
        invPara.setAlignment(Element.ALIGN_RIGHT);
        metaCell.addElement(invPara);
        Paragraph datePara = new Paragraph("Date: " + paidDate + "  Time: " + paidTime, subFont);
        datePara.setAlignment(Element.ALIGN_RIGHT);
        metaCell.addElement(datePara);
        Paragraph txnPara = new Paragraph("Txn: " + session.getToken(), subFont);
        txnPara.setAlignment(Element.ALIGN_RIGHT);
        metaCell.addElement(txnPara);
        headerTable.addCell(metaCell);

        doc.add(headerTable);

        // Divider
        LineSeparator line = new LineSeparator(1, 100, BRAND_GREEN, Element.ALIGN_CENTER, -2);
        doc.add(line);
        doc.add(Chunk.NEWLINE);

        // ── Station Info ──
        PdfPTable infoTable = new PdfPTable(2);
        infoTable.setWidthPercentage(100);
        infoTable.setSpacingAfter(20);

        PdfPCell fromCell = new PdfPCell();
        fromCell.setBorder(Rectangle.NO_BORDER);
        fromCell.addElement(new Paragraph("FROM", FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9, BaseColor.GRAY)));
        fromCell.addElement(new Paragraph("Halt & Charge EV Solutions", valueFont));
        fromCell.addElement(new Paragraph("123 Green Energy Park, Bengaluru 560001", labelFont));
        fromCell.addElement(new Paragraph("GSTIN: 29AABCU9603R1ZX", labelFont));
        fromCell.addElement(new Paragraph("support@haltandcharge.in", labelFont));
        infoTable.addCell(fromCell);

        PdfPCell sessionCell = new PdfPCell();
        sessionCell.setBorder(Rectangle.NO_BORDER);
        sessionCell.addElement(new Paragraph("CHARGING SESSION", FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9, BaseColor.GRAY)));
        sessionCell.addElement(new Paragraph(session.getStationName(), valueFont));
        sessionCell.addElement(new Paragraph("Charger: " + session.getChargerId(), labelFont));
        sessionCell.addElement(new Paragraph("Session Token: " + session.getToken().substring(0, 12) + "...", labelFont));
        if (session.getRazorpayPaymentId() != null) {
            sessionCell.addElement(new Paragraph("Payment ID: " + session.getRazorpayPaymentId(), labelFont));
        }
        infoTable.addCell(sessionCell);

        doc.add(infoTable);

        // ── Line Items Table ──
        PdfPTable itemsTable = new PdfPTable(new float[]{0.5f, 3f, 1f, 1.5f});
        itemsTable.setWidthPercentage(100);
        itemsTable.setSpacingAfter(10);

        String[] cols = {"#", "Description", "Qty", "Amount"};
        for (String col : cols) {
            PdfPCell cell = new PdfPCell(new Phrase(col, headerFont));
            cell.setBackgroundColor(DARK_BG);
            cell.setPadding(8);
            cell.setHorizontalAlignment(col.equals("Amount") ? Element.ALIGN_RIGHT : Element.ALIGN_LEFT);
            itemsTable.addCell(cell);
        }

        // Row 1: Charging Service
        addItemRow(itemsTable, "1", "EV Charging Service\nAC/DC Fast Charging", "1",
            formatCurrency(session.getBaseAmount()), valueFont);

        if (session.getAdditionalFees().compareTo(BigDecimal.ZERO) > 0) {
            addItemRow(itemsTable, "2", "Additional Fees", "1",
                formatCurrency(session.getAdditionalFees()), valueFont);
        }

        if (session.getDiscount().compareTo(BigDecimal.ZERO) > 0) {
            addItemRow(itemsTable, "-", "Discount Applied", "1",
                "-" + formatCurrency(session.getDiscount()), valueFont);
        }

        doc.add(itemsTable);

        // ── Amount Summary ──
        PdfPTable summaryTable = new PdfPTable(new float[]{3f, 2f});
        summaryTable.setWidthPercentage(60);
        summaryTable.setHorizontalAlignment(Element.ALIGN_RIGHT);
        summaryTable.setSpacingAfter(24);

        addSummaryRow(summaryTable, "Subtotal", formatCurrency(session.getBaseAmount()), labelFont, valueFont);
        addSummaryRow(summaryTable, "GST / Tax", formatCurrency(session.getTaxAmount()), labelFont, valueFont);
        if (session.getAdditionalFees().compareTo(BigDecimal.ZERO) > 0) {
            addSummaryRow(summaryTable, "Additional Fees", formatCurrency(session.getAdditionalFees()), labelFont, valueFont);
        }
        if (session.getDiscount().compareTo(BigDecimal.ZERO) > 0) {
            addSummaryRow(summaryTable, "Discount", "-" + formatCurrency(session.getDiscount()), labelFont, valueFont);
        }

        // Total row
        PdfPCell totalLabel = new PdfPCell(new Phrase("TOTAL PAID", totalFont));
        totalLabel.setBorder(Rectangle.TOP);
        totalLabel.setPaddingTop(8);
        totalLabel.setPaddingBottom(8);
        summaryTable.addCell(totalLabel);

        PdfPCell totalValue = new PdfPCell(new Phrase(formatCurrency(session.getFinalAmount()), totalFont));
        totalValue.setBorder(Rectangle.TOP);
        totalValue.setHorizontalAlignment(Element.ALIGN_RIGHT);
        totalValue.setPaddingTop(8);
        totalValue.setPaddingBottom(8);
        summaryTable.addCell(totalValue);

        doc.add(summaryTable);

        // ── Footer ──
        doc.add(line);
        doc.add(Chunk.NEWLINE);
        Paragraph footer = new Paragraph(
            "Thank you for charging with Halt & Charge · Powering India's EV Future\n" +
            "This is a computer-generated invoice. No signature required.",
            footerFont
        );
        footer.setAlignment(Element.ALIGN_CENTER);
        doc.add(footer);
    }

    private void addItemRow(PdfPTable table, String num, String desc, String qty, String amount, Font font) {
        PdfPCell numCell = new PdfPCell(new Phrase(num, font));
        numCell.setPadding(8);
        numCell.setBackgroundColor(LIGHT_GRAY);
        table.addCell(numCell);

        PdfPCell descCell = new PdfPCell(new Phrase(desc, font));
        descCell.setPadding(8);
        descCell.setBackgroundColor(LIGHT_GRAY);
        table.addCell(descCell);

        PdfPCell qtyCell = new PdfPCell(new Phrase(qty, font));
        qtyCell.setPadding(8);
        qtyCell.setBackgroundColor(LIGHT_GRAY);
        table.addCell(qtyCell);

        PdfPCell amtCell = new PdfPCell(new Phrase(amount, font));
        amtCell.setPadding(8);
        amtCell.setHorizontalAlignment(Element.ALIGN_RIGHT);
        amtCell.setBackgroundColor(LIGHT_GRAY);
        table.addCell(amtCell);
    }

    private void addSummaryRow(PdfPTable table, String label, String value, Font labelFont, Font valueFont) {
        PdfPCell lCell = new PdfPCell(new Phrase(label, labelFont));
        lCell.setBorder(Rectangle.BOTTOM);
        lCell.setBorderColor(BORDER_GRAY);
        lCell.setPadding(6);
        table.addCell(lCell);

        PdfPCell vCell = new PdfPCell(new Phrase(value, valueFont));
        vCell.setBorder(Rectangle.BOTTOM);
        vCell.setBorderColor(BORDER_GRAY);
        vCell.setHorizontalAlignment(Element.ALIGN_RIGHT);
        vCell.setPadding(6);
        table.addCell(vCell);
    }

    private String formatCurrency(BigDecimal amount) {
        return "\u20B9" + String.format("%.2f", amount);
    }
}

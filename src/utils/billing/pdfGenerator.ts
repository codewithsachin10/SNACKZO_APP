
import jsPDF from 'jspdf';

const BRAND_COLOR = [124, 58, 237]; // #7c3aed

// --- 1. TAX INVOICE GENERATOR (Legal) ---
export const generateTaxInvoicePDF = (order: any) => {
    const doc = new jsPDF();
    let y = 20;

    // Header
    doc.setFontSize(22);
    doc.setTextColor(BRAND_COLOR[0], BRAND_COLOR[1], BRAND_COLOR[2]);
    doc.text("Snackzo", 14, y);

    doc.setFontSize(10);
    doc.setTextColor(100);
    y += 6;
    doc.text("Instant Hostel Delivery", 14, y);
    y += 6;
    doc.text("GSTIN: 33AAAAA0000A1Z5", 14, y);

    // Title
    doc.setFontSize(16);
    doc.setTextColor(0);
    doc.text("TAX INVOICE", 196, 20, { align: 'right' });

    // Invoice Details
    doc.setFontSize(10);
    doc.text(`Invoice No: SNZ/${new Date().getFullYear()}/${order.id.slice(0, 6).toUpperCase()}`, 196, 30, { align: 'right' });
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 196, 35, { align: 'right' });
    doc.text(`Order Ref: #${order.id.slice(0, 8).toUpperCase()}`, 196, 40, { align: 'right' });

    // Bill To
    y = 55;
    doc.setFontSize(11);
    doc.text("Bill To:", 14, y);
    y += 6;
    doc.setFontSize(10);
    doc.text(order.user_name || "Customer", 14, y);
    doc.text(order.delivery_address || "", 14, y + 5);

    y += 20;

    // Table Header
    doc.setFillColor(245, 245, 245);
    doc.rect(14, y, 182, 8, 'F');
    doc.setFont(undefined, 'bold');
    doc.text("Item Description", 16, y + 5);
    doc.text("Qty", 120, y + 5);
    doc.text("Rate", 150, y + 5);
    doc.text("Amount", 196, y + 5, { align: 'right' });
    doc.setFont(undefined, 'normal');

    y += 10;

    // Items
    order.items.forEach((item: any) => {
        doc.text(item.name.substring(0, 40), 16, y);
        doc.text(String(item.quantity), 120, y);
        doc.text(`Rs.${item.price}`, 150, y);
        doc.text(`Rs.${item.quantity * item.price}`, 196, y, { align: 'right' });
        y += 8;
    });

    doc.line(14, y, 196, y);
    y += 8;

    // Totals
    const xLabel = 140;
    const xVal = 196;

    doc.text("Subtotal", xLabel, y); doc.text(`Rs.${order.subtotal}`, xVal, y, { align: 'right' }); y += 6;
    doc.text("Delivery Charges", xLabel, y); doc.text(`Rs.${order.delivery_fee}`, xVal, y, { align: 'right' }); y += 6;

    // Tax Breakup (Simulated for simpler billing)
    const tax = Math.round(order.total * 0.05); // 5% GST Assumption
    doc.text("CGST (2.5%)", xLabel, y); doc.text(`Rs.${(tax / 2).toFixed(2)}`, xVal, y, { align: 'right' }); y += 6;
    doc.text("SGST (2.5%)", xLabel, y); doc.text(`Rs.${(tax / 2).toFixed(2)}`, xVal, y, { align: 'right' }); y += 8;

    doc.setFont(undefined, 'bold');
    doc.setFontSize(12);
    doc.text("Total Payable", xLabel, y);
    doc.text(`Rs.${order.total}`, xVal, y, { align: 'right' });

    // Legal Footer
    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(150);
    doc.text("This is a computer generated invoice.", 105, 280, { align: 'center' });

    return doc;
};

// --- 2. ORDER SUMMARY GENERATOR (Non-Legal) ---
export const generateOrderSummaryPDF = (order: any) => {
    const doc = new jsPDF();
    let y = 20;

    doc.setFontSize(18);
    doc.setTextColor(BRAND_COLOR[0], BRAND_COLOR[1], BRAND_COLOR[2]);
    doc.text("Snackzo Order Summary", 14, y);

    doc.setFontSize(10);
    doc.setTextColor(220, 38, 38); // Red warning
    doc.text("THIS IS NOT A TAX INVOICE", 14, y + 8);

    doc.setTextColor(0);
    y += 20;
    doc.text(`Order ID: #${order.id.slice(0, 8).toUpperCase()}`, 14, y);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 14, y + 6);

    y += 20;

    // Simple List
    doc.setFont(undefined, 'bold');
    doc.text("Pass Details:", 14, y);
    doc.setFont(undefined, 'normal');
    y += 10;

    order.items.forEach((item: any) => {
        doc.text(`• ${item.name} x ${item.quantity}`, 14, y);
        doc.text(`Rs.${item.price * item.quantity}`, 180, y, { align: 'right' });
        y += 8;
    });

    y += 5;
    doc.line(14, y, 190, y);
    y += 10;
    doc.setFont(undefined, 'bold');
    doc.text(`Total Estimate: Rs.${order.total}`, 180, y, { align: 'right' });

    return doc;
};

// Helpers
export const generateTaxInvoiceBase64 = (order: any) => {
    const doc = generateTaxInvoicePDF(order);
    // Remove the data specifier to get raw base64
    return doc.output('datauristring').split(',')[1];
};

export const downloadTaxInvoice = (order: any) => {
    generateTaxInvoicePDF(order).save(`Invoice_Snackzo_${order.id.slice(0, 8)}.pdf`);
};

export const downloadOrderSummary = (order: any) => {
    generateOrderSummaryPDF(order).save(`OrderSummary_${order.id.slice(0, 8)}.pdf`);
};

// Legacy support if needed
export const downloadInvoice = downloadTaxInvoice;

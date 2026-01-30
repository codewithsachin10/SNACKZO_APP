
// Helper to format currency
const formatCurrency = (amount: number) => `₹${amount.toFixed(2)}`;

// Helper: Common Header
const getHeader = () => `
  <tr>
    <td align="center" style="background-color: #7c3aed; padding: 25px 20px;">
      <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">Snackzo</h1>
      <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0; font-size: 13px;">Instant Hostel Delivery</p>
    </td>
  </tr>
`;

// Helper: Common Footer
const getFooter = (type: string) => `
  <tr>
    <td style="background-color: #fafafa; padding: 30px 40px; text-align: center; border-top: 1px solid #eee;">
       <p style="margin: 0 0 10px; font-size: 12px; color: #71717a;">
         This is an automated ${type} email.
       </p>
       <p style="margin: 0 0 10px; font-size: 12px; color: #a1a1aa;">
         Need help? <a href="mailto:support@snackzo.tech" style="color: #7c3aed; text-decoration: none;">support@snackzo.tech</a>
       </p>
       <p style="margin: 0; font-size: 11px; color: #d4d4d8;">
         &copy; 2026 Snackzo Inc. • <a href="#" style="color: #a1a1aa;">Privacy</a> • <a href="#" style="color: #a1a1aa;">Refunds</a>
       </p>
    </td>
  </tr>
`;

// 📩 EMAIL 1: ORDER PLACED (Summary)
export const generateOrderPlacedEmail = (order: any) => {
    const { id, items, subtotal, delivery_fee, total, created_at, delivery_address, user_name, payment_method } = order;

    const itemsHtml = items.map((item: any) => `
    <tr>
      <td style="padding: 8px 0; color: #333; font-size: 14px;">${item.name} <span style="color: #666; font-size: 12px;">x${item.quantity}</span></td>
      <td style="padding: 8px 0; text-align: right; color: #333; font-size: 14px;">${formatCurrency(item.price * item.quantity)}</td>
    </tr>
  `).join('');

    return `
<!DOCTYPE html>
<html>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: sans-serif;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="padding: 20px 0;">
    <tr>
      <td align="center">
        <table width="600" border="0" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05); max-width: 600px; width: 100%;">
          ${getHeader()}
          <tr>
            <td align="center" style="padding: 30px 40px 10px;">
              <h2 style="color: #18181b; margin: 0 0 10px; font-size: 20px;">Order Received! 📦</h2>
              <p style="color: #52525b; margin: 0; font-size: 15px; line-height: 1.5;">
                Hi ${user_name?.split(' ')[0]}, we've received your order #${id.slice(0, 6).toUpperCase()}.
                <br/>Your snacks are being prepared!
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 40px;">
              <div style="background-color: #fafafa; border-radius: 8px; padding: 20px;">
                <h3 style="margin: 0 0 15px; font-size: 14px; color: #71717a; text-transform: uppercase;">Order Summary</h3>
                <table width="100%" border="0">${itemsHtml}</table>
                <hr style="border: 0; border-top: 1px dashed #ddd; margin: 15px 0;">
                <table width="100%" border="0">
                  <tr><td>Subtotal</td><td align="right">${formatCurrency(subtotal)}</td></tr>
                  <tr><td>Delivery</td><td align="right">${formatCurrency(delivery_fee)}</td></tr>
                  <tr><td style="font-weight:bold; padding-top:10px;">Total</td><td align="right" style="font-weight:bold; padding-top:10px; color: #7c3aed;">${formatCurrency(total)}</td></tr>
                </table>
              </div>
            </td>
          </tr>
           <tr>
            <td align="center" style="padding: 0 40px 40px;">
              <a href="https://snackzo.tech/orders/${id}" style="display: inline-block; background-color: #18181b; color: #ffffff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14px;">Track Order</a>
              <p style="margin-top: 15px; font-size: 12px; color: #71717a;">Attached: Order Summary (Not a Tax Invoice)</p>
            </td>
          </tr>
          ${getFooter('Order Confirmation')}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};

// 📩 EMAIL 2: PAYMENT SUCCESS (Financial)
export const generatePaymentSuccessEmail = (payment: any) => {
    const { order_id, amount, method, transaction_id, date, user_name } = payment;

    return `
<!DOCTYPE html>
<html>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: sans-serif;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="padding: 20px 0;">
    <tr>
      <td align="center">
        <table width="600" border="0" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05); max-width: 600px; width: 100%;">
          ${getHeader()}
          <tr>
            <td align="center" style="padding: 30px 40px 10px;">
              <div style="background-color: #d1fae5; color: #065f46; padding: 8px 16px; border-radius: 20px; font-weight: bold; font-size: 14px; display: inline-block; margin-bottom: 15px;">✓ Payment Successful</div>
              <h2 style="color: #18181b; margin: 0 0 10px; font-size: 20px;">We've received your payment! 💸</h2>
              <p style="color: #52525b; margin: 0; font-size: 15px;">
                Thanks ${user_name?.split(' ')[0]}, your transaction was successful.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 40px;">
              <table width="100%" cellpadding="10" style="background-color: #fafafa; border-radius: 8px;">
                <tr>
                  <td style="color: #71717a; font-size: 13px;">Amount Paid</td>
                  <td align="right" style="font-weight: bold; font-size: 16px; color: #18181b;">${formatCurrency(amount)}</td>
                </tr>
                <tr>
                  <td style="color: #71717a; font-size: 13px;">Transaction ID</td>
                  <td align="right" style="font-family: monospace; font-size: 13px; color: #18181b;">${transaction_id}</td>
                </tr>
                <tr>
                  <td style="color: #71717a; font-size: 13px;">Payment Method</td>
                  <td align="right" style="font-size: 13px; color: #18181b; text-transform: capitalize;">${method}</td>
                </tr>
                 <tr>
                  <td style="color: #71717a; font-size: 13px;">Order ID</td>
                  <td align="right" style="font-family: monospace; font-size: 13px; color: #18181b;">#${order_id.slice(0, 8).toUpperCase()}</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding: 0 40px 40px;">
              <a href="https://snackzo.tech/receipt/${order_id}" style="display: inline-block; background-color: #7c3aed; color: #ffffff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14px;">Download Tax Invoice</a>
              <p style="margin-top: 15px; font-size: 12px; color: #71717a;">Attached: Tax Invoice PDF (Legal Document)</p>
            </td>
          </tr>
          ${getFooter('Payment Receipt')}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};

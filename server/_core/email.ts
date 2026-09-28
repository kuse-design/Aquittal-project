import { ENV } from "./env";

export type EmailConfig = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
};

export function getEmailConfig(): EmailConfig | null {
  const { smtpHost, smtpPort, smtpUser, smtpPass, smtpFrom } = ENV;
  if (!smtpHost || !smtpUser || !smtpPass || !smtpFrom) {
    return null;
  }
  return {
    host: smtpHost,
    port: Number(smtpPort) || 587,
    secure: Number(smtpPort) === 465,
    user: smtpUser,
    pass: smtpPass,
    from: smtpFrom,
  };
}

let transporter: Awaited<ReturnType<typeof createTransporter>> | null = null;

async function createTransporter() {
  let nodemailer: any;
  try {
    // @ts-ignore - nodemailer may not be installed
    nodemailer = await import("nodemailer");
  } catch {
    console.warn("[Email] nodemailer not installed, emails disabled");
    return null;
  }
  const config = getEmailConfig();
  if (!config) return null;
  return nodemailer.createTransport(config);
}

export async function getTransporter() {
  if (!transporter) {
    transporter = await createTransporter();
  }
  return transporter;
}

export async function sendEmail(
  to: string,
  subject: string,
  html: string,
  text?: string
): Promise<boolean> {
  const transport = await getTransporter();
  if (!transport) {
    console.log("[Email] SMTP not configured, skipping email to:", to);
    return false;
  }
  try {
    await transport.sendMail({
      from: getEmailConfig()?.from,
      to,
      subject,
      html,
      text: text ?? html.replace(/<[^>]*>/g, ""),
    });
    console.log("[Email] Sent to:", to);
    return true;
  } catch (error) {
    console.error("[Email] Failed to send:", error);
    return false;
  }
}

export function generateAdminOrderEmail(order: {
  orderNumber: string;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string;
  customerNote: string | null;
  total: string;
  currencyCode: string;
  items: Array<{
    productTitle: string;
    variantLabel: string;
    quantity: number;
    unitPrice: string;
    lineTotal: string;
  }>;
  createdAt: number;
}): { subject: string; html: string } {
  const date = new Date(order.createdAt).toLocaleString();
  const itemsHtml = order.items
    .map(
      (item) => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #e5e5e5;">${item.productTitle}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e5e5;">${item.variantLabel}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e5e5; text-align: center;">${item.quantity}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e5e5; text-align: right;">${item.unitPrice}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e5e5; text-align: right;">${item.lineTotal}</td>
    </tr>
  `
    )
    .join("");

  return {
    subject: `New Order Request: ${order.orderNumber}`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #f7f5ef; border: 1px solid #d9d3c4; border-radius: 8px; padding: 32px;">
    <h1 style="margin: 0 0 8px; font-family: Georgia, serif; font-size: 28px; color: #080808; font-weight: 400;">New Order Request</h1>
    <p style="margin: 0 0 24px; color: #8a6d1b; font-size: 14px;">${order.orderNumber} · ${date}</p>
    
    <div style="background: #fffdf8; border: 1px solid #d9d3c4; border-radius: 6px; padding: 20px; margin-bottom: 24px;">
      <h2 style="margin: 0 0 16px; font-size: 16px; font-weight: 600;">Customer Details</h2>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #666; width: 120px;">Name</td>
          <td style="padding: 8px 0; font-weight: 600;">${order.customerName}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #666;">Phone</td>
          <td style="padding: 8px 0;"><a href="tel:${order.customerPhone}" style="color: #c9a227; text-decoration: none;">${order.customerPhone}</a></td>
        </tr>
        ${order.customerEmail ? `
        <tr>
          <td style="padding: 8px 0; color: #666;">Email</td>
          <td style="padding: 8px 0;"><a href="mailto:${order.customerEmail}" style="color: #c9a227; text-decoration: none;">${order.customerEmail}</a></td>
        </tr>
        ` : ""}
        ${order.customerNote ? `
        <tr>
          <td style="padding: 8px 0; color: #666; vertical-align: top;">Note</td>
          <td style="padding: 8px 0;">${order.customerNote}</td>
        </tr>
        ` : ""}
      </table>
    </div>

    <div style="background: #fffdf8; border: 1px solid #d9d3c4; border-radius: 6px; padding: 20px; margin-bottom: 24px;">
      <h2 style="margin: 0 0 16px; font-size: 16px; font-weight: 600;">Order Items</h2>
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr style="background: #f7f5ef;">
            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #d9d3c4;">Product</th>
            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #d9d3c4;">Variant</th>
            <th style="padding: 12px; text-align: center; border-bottom: 2px solid #d9d3c4;">Qty</th>
            <th style="padding: 12px; text-align: right; border-bottom: 2px solid #d9d3c4;">Unit Price</th>
            <th style="padding: 12px; text-align: right; border-bottom: 2px solid #d9d3c4;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>
    </div>

    <div style="text-align: right; font-size: 20px; font-weight: 600; color: #080808;">
      Order Estimate: ${order.currencyCode} ${order.total}
    </div>

    <p style="margin-top: 24px; font-size: 12px; color: #8a6d1b;">
      <strong>Action required:</strong> Log in to the admin panel to contact the customer and update the order status.
    </p>
  </div>
</body>
</html>
  `,
  };
}

export function generateCustomerConfirmationEmail(order: {
  orderNumber: string;
  customerName: string;
  total: string;
  currencyCode: string;
  items: Array<{
    productTitle: string;
    variantLabel: string;
    quantity: number;
    lineTotal: string;
  }>;
  createdAt: number;
}): { subject: string; html: string } {
  const date = new Date(order.createdAt).toLocaleDateString();
  const itemsHtml = order.items
    .map(
      (item) => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #e5e5e5;">${item.productTitle}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e5e5;">${item.variantLabel}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e5e5; text-align: center;">${item.quantity}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e5e5; text-align: right;">${item.lineTotal}</td>
    </tr>
  `
    )
    .join("");

  return {
    subject: `Your order request ${order.orderNumber} has been received`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #f7f5ef; border: 1px solid #d9d3c4; border-radius: 8px; padding: 32px;">
    <h1 style="margin: 0 0 8px; font-family: Georgia, serif; font-size: 28px; color: #080808; font-weight: 400;">Thank you, ${order.customerName}!</h1>
    <p style="margin: 0 0 24px; color: #8a6d1b; font-size: 14px;">Order request ${order.orderNumber} · ${date}</p>
    
    <p style="margin-bottom: 24px;">We've received your order request. Our team will contact you shortly to confirm availability, delivery options, and final pricing. No payment has been taken.</p>

    <div style="background: #fffdf8; border: 1px solid #d9d3c4; border-radius: 6px; padding: 20px; margin-bottom: 24px;">
      <h2 style="margin: 0 0 16px; font-size: 16px; font-weight: 600;">Your Items</h2>
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr style="background: #f7f5ef;">
            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #d9d3c4;">Product</th>
            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #d9d3c4;">Variant</th>
            <th style="padding: 12px; text-align: center; border-bottom: 2px solid #d9d3c4;">Qty</th>
            <th style="padding: 12px; text-align: right; border-bottom: 2px solid #d9d3c4;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>
    </div>

    <div style="text-align: right; font-size: 20px; font-weight: 600; color: #080808;">
      Order Estimate: ${order.currencyCode} ${order.total}
    </div>

    <p style="margin-top: 24px; font-size: 12px; color: #8a6d1b;">
      Questions? Reply to this email or call us. We're happy to help.
    </p>
  </div>
</body>
</html>
  `,
  };
}
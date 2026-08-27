import nodemailer from 'nodemailer';

/**
 * Email Service — sends reminder emails via SMTP.
 * Configure via environment variables:
 *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
 */

let transporter: nodemailer.Transporter | null = null;

const getTransporter = (): nodemailer.Transporter | null => {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT) || 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return null;
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  return transporter;
};

/**
 * Check if email service is configured and ready.
 */
export const isEmailConfigured = (): boolean => {
  return !!process.env.SMTP_HOST && !!process.env.SMTP_USER && !!process.env.SMTP_PASS;
};

/**
 * Send a reminder email for a schedule event.
 */
export const sendReminderEmail = async (
  to: string,
  eventTitle: string,
  eventTime: string,
  remainingText: string
): Promise<boolean> => {
  const transport = getTransporter();
  if (!transport) {
    console.warn('📧 Email not configured — skipping email notification');
    return false;
  }

  const from = process.env.SMTP_FROM || process.env.SMTP_USER;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background: #f5f5f5; }
    .container { max-width: 520px; margin: 24px auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.08); }
    .header { background: linear-gradient(135deg, #1890ff, #722ed1); padding: 24px; color: #fff; }
    .header h1 { margin: 0; font-size: 20px; }
    .header p { margin: 8px 0 0; opacity: 0.9; font-size: 14px; }
    .body { padding: 24px; }
    .event-card { background: #f0f5ff; border-left: 4px solid #1890ff; border-radius: 8px; padding: 16px; margin: 16px 0; }
    .event-title { font-size: 18px; font-weight: 700; color: #1f2937; margin: 0 0 8px; }
    .event-time { font-size: 14px; color: #595959; margin: 4px 0; }
    .countdown { display: inline-block; background: #fff2e8; color: #d4380d; padding: 4px 12px; border-radius: 16px; font-size: 13px; font-weight: 600; margin-top: 8px; }
    .footer { padding: 16px 24px; background: #fafafa; text-align: center; font-size: 12px; color: #8c8c8c; border-top: 1px solid #f0f0f0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⏰ Nhắc nhở sự kiện</h1>
      <p>Manage Timetable — Thông báo tự động</p>
    </div>
    <div class="body">
      <p style="color:#595959; margin:0 0 8px;">Xin chào,</p>
      <p style="color:#595959; margin:0 0 16px;">Bạn có sự kiện sắp diễn ra:</p>
      <div class="event-card">
        <div class="event-title">${eventTitle}</div>
        <div class="event-time">🕐 Thời gian: <strong>${eventTime}</strong></div>
        <div class="countdown">⏳ Còn ${remainingText}</div>
      </div>
      <p style="color:#8c8c8c; font-size:13px; margin-top:16px;">Đăng nhập vào ứng dụng để xem chi tiết hoặc chỉnh sửa sự kiện.</p>
    </div>
    <div class="footer">
      Email này được gửi tự động từ Manage Timetable.<br>
      Bạn có thể tắt thông báo email trong phần Cài đặt.
    </div>
  </div>
</body>
</html>`;

  try {
    await transport.sendMail({
      from: `"Manage Timetable" <${from}>`,
      to,
      subject: `⏰ Nhắc nhở: ${eventTitle} — còn ${remainingText}`,
      html,
    });
    console.log(`📧 Reminder email sent to ${to} for "${eventTitle}"`);
    return true;
  } catch (error) {
    console.error('📧 Failed to send reminder email:', error);
    return false;
  }
};

// services/emailService.js
import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

// Create transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: process.env.SMTP_PORT === "465", // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Verify transporter connection
transporter.verify((error, success) => {
  if (error) {
    console.error("❌ Email service connection failed:", error.message);
  } else {
    console.log("✅ Email service is ready to send emails");
  }
});

/**
 * Send a generic email
 */
export const sendEmail = async ({ to, subject, html, text }) => {
  try {
    const mailOptions = {
      from: `"SEO Analyzer" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text,
      html,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✉️ Email sent: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("❌ Failed to send email:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Send a beautiful welcome email
 */
export const sendWelcomeEmail = async (email, name) => {
  const subject = "Welcome to SEO Analyzer! 🚀";
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          background-color: #0d0e12;
          color: #e2e8f0;
          margin: 0;
          padding: 0;
        }
        .container {
          max-width: 600px;
          margin: 40px auto;
          background: #15171e;
          border: 1px solid #272a37;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
        }
        .header {
          background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
          padding: 40px 20px;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          color: #ffffff;
          font-size: 28px;
          font-weight: 700;
          letter-spacing: -0.5px;
        }
        .content {
          padding: 40px 30px;
          line-height: 1.6;
        }
        .content h2 {
          color: #ffffff;
          font-size: 20px;
          margin-top: 0;
        }
        .content p {
          color: #94a3b8;
          font-size: 16px;
        }
        .button-container {
          text-align: center;
          margin: 30px 0;
        }
        .button {
          display: inline-block;
          padding: 14px 30px;
          background-color: #3b82f6;
          color: #ffffff !important;
          text-decoration: none;
          border-radius: 9999px;
          font-weight: 600;
          font-size: 16px;
          box-shadow: 0 4px 14px rgba(59, 130, 246, 0.4);
        }
        .features {
          background: #1c1f26;
          border-radius: 12px;
          padding: 20px;
          margin-top: 30px;
        }
        .feature-item {
          display: flex;
          align-items: center;
          margin-bottom: 12px;
          font-size: 14px;
          color: #cbd5e1;
        }
        .feature-icon {
          color: #10b981;
          margin-right: 10px;
          font-weight: bold;
        }
        .footer {
          background: #0e1015;
          padding: 20px;
          text-align: center;
          border-top: 1px solid #1c1f26;
          font-size: 12px;
          color: #64748b;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>SEO Analyzer</h1>
        </div>
        <div class="content">
          <h2>Hi ${name},</h2>
          <p>Thank you for signing up for SEO Analyzer! We're thrilled to help you optimize your website's performance, SEO rankings, and user experience.</p>
          <p>Get started right away by running your first comprehensive SEO scan. It takes less than a minute!</p>
          
          <div class="button-container">
            <a href="http://localhost:5173/dashboard" class="button">Analyze Your Website</a>
          </div>

          <div class="features">
            <h3 style="margin-top:0; color:#ffffff; font-size:15px;">What you can do now:</h3>
            <div class="feature-item">
              <span class="feature-icon">✓</span> Run 5 free detailed SEO audits every day
            </div>
            <div class="feature-item">
              <span class="feature-icon">✓</span> Track keyword Google search rankings
            </div>
            <div class="feature-item">
              <span class="feature-icon">✓</span> Identify critical accessibility and performance issues
            </div>
          </div>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} SEO Analyzer. All rights reserved.</p>
          <p>If you have any questions, feel free to reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  const text = `Hi ${name},\n\nWelcome to SEO Analyzer! We are excited to help you optimize your website. Get started by analyzing your website at http://localhost:5173/dashboard.\n\nBest regards,\nSEO Analyzer Team`;

  return sendEmail({ to: email, subject, html, text });
};

/**
 * Send subscription success email
 */
export const sendSubscriptionSuccessEmail = async (email, name, planName, price) => {
  const subject = "Welcome to SEO Analyzer Pro! 🌟";
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          background-color: #0d0e12;
          color: #e2e8f0;
          margin: 0;
          padding: 0;
        }
        .container {
          max-width: 600px;
          margin: 40px auto;
          background: #15171e;
          border: 1px solid #272a37;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
        }
        .header {
          background: linear-gradient(135deg, #10b981 0%, #3b82f6 100%);
          padding: 40px 20px;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          color: #ffffff;
          font-size: 28px;
          font-weight: 700;
          letter-spacing: -0.5px;
        }
        .content {
          padding: 40px 30px;
          line-height: 1.6;
        }
        .content h2 {
          color: #ffffff;
          font-size: 20px;
          margin-top: 0;
        }
        .content p {
          color: #94a3b8;
          font-size: 16px;
        }
        .button-container {
          text-align: center;
          margin: 30px 0;
        }
        .button {
          display: inline-block;
          padding: 14px 30px;
          background-color: #10b981;
          color: #ffffff !important;
          text-decoration: none;
          border-radius: 9999px;
          font-weight: 600;
          font-size: 16px;
          box-shadow: 0 4px 14px rgba(16, 185, 129, 0.4);
        }
        .receipt-card {
          background: #1c1f26;
          border-radius: 12px;
          padding: 20px;
          margin-top: 30px;
          border: 1px solid #2d313f;
        }
        .receipt-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 10px;
          font-size: 14px;
        }
        .receipt-label {
          color: #94a3b8;
        }
        .receipt-value {
          color: #ffffff;
          font-weight: 600;
        }
        .footer {
          background: #0e1015;
          padding: 20px;
          text-align: center;
          border-top: 1px solid #1c1f26;
          font-size: 12px;
          color: #64748b;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>You are now Pro!</h1>
        </div>
        <div class="content">
          <h2>Hi ${name},</h2>
          <p>Thank you for upgrading to <strong>SEO Analyzer Pro</strong>! Your account has been successfully upgraded, and you now have full access to all premium features.</p>
          <p>Your subscription is active, and you can now run unlimited website scans and track as many keywords as you need.</p>
          
          <div class="button-container">
            <a href="http://localhost:5173/dashboard" class="button">Go to Dashboard</a>
          </div>

          <div class="receipt-card">
            <h3 style="margin-top:0; color:#ffffff; font-size:15px; border-bottom: 1px solid #2d313f; padding-bottom:10px; margin-bottom:15px;">Subscription Details</h3>
            <div class="receipt-row">
              <span class="receipt-label">Plan</span>
              <span class="receipt-value">${planName}</span>
            </div>
            <div class="receipt-row">
              <span class="receipt-label">Price</span>
              <span class="receipt-value">${price}</span>
            </div>
            <div class="receipt-row">
              <span class="receipt-label">Status</span>
              <span class="receipt-value" style="color: #10b981;">Active</span>
            </div>
          </div>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} SEO Analyzer. All rights reserved.</p>
          <p>Need help with your subscription? Reply to this email anytime.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `Hi ${name},\n\nThank you for upgrading to SEO Analyzer Pro! Your account has been upgraded to ${planName} ($5/month). You can now access all Pro features at http://localhost:5173/dashboard.\n\nBest regards,\nSEO Analyzer Team`;

  return sendEmail({ to: email, subject, html, text });
};

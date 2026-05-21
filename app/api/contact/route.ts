import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { z } from "zod";

const contactSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(50),
  lastName:  z.string().min(1, "Last name is required").max(50),
  email:     z.string().email("Please enter a valid email"),
  subject:   z.string().min(1, "Subject is required").max(100),
  message:   z.string().min(10, "Message must be at least 10 characters").max(2000),
});

export async function POST(req: NextRequest) {
  try {
    const body      = await req.json();
    const validated = contactSchema.parse(body);

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });

    // ── Email to owner ───────────────────────────────────────
    await transporter.sendMail({
      from:    `"Stelfi Contact" <${process.env.GMAIL_USER}>`,
      to:      process.env.CONTACT_RECEIVER,
      replyTo: validated.email,
      subject: `[Stelfi] ${validated.subject}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: Inter, sans-serif; background: #050A14; color: #ffffff; margin: 0; padding: 0; }
              .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
              .header { background: linear-gradient(135deg, #00D4AA, #00B8A0); padding: 32px; border-radius: 16px 16px 0 0; text-align: center; }
              .header h1 { color: #050A14; font-size: 24px; font-weight: 800; margin: 0; }
              .header p { color: rgba(5,10,20,0.7); margin: 8px 0 0; font-size: 14px; }
              .body { background: #0D1526; border: 1px solid rgba(255,255,255,0.08); border-top: none; padding: 32px; border-radius: 0 0 16px 16px; }
              .field { margin-bottom: 20px; padding-bottom: 20px; border-bottom: 1px solid rgba(255,255,255,0.06); }
              .field:last-child { border-bottom: none; margin-bottom: 0; padding-bottom: 0; }
              .label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #00D4AA; margin-bottom: 6px; }
              .value { font-size: 15px; color: #ffffff; line-height: 1.6; }
              .message-box { background: rgba(0,212,170,0.05); border: 1px solid rgba(0,212,170,0.15); border-radius: 10px; padding: 16px; font-size: 15px; color: #ffffff; line-height: 1.7; white-space: pre-wrap; }
              .footer { text-align: center; margin-top: 32px; font-size: 12px; color: rgba(139,158,199,0.6); }
              .reply-btn { display: inline-block; margin-top: 20px; padding: 12px 28px; background: linear-gradient(135deg, #00D4AA, #00B8A0); color: #050A14; font-weight: 700; font-size: 14px; border-radius: 8px; text-decoration: none; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>New Contact Message</h1>
                <p>Received via Stelfi website</p>
              </div>
              <div class="body">
                <div class="field">
                  <div class="label">Full Name</div>
                  <div class="value">${validated.firstName} ${validated.lastName}</div>
                </div>
                <div class="field">
                  <div class="label">Email Address</div>
                  <div class="value">${validated.email}</div>
                </div>
                <div class="field">
                  <div class="label">Subject</div>
                  <div class="value">${validated.subject}</div>
                </div>
                <div class="field">
                  <div class="label">Message</div>
                  <div class="message-box">${validated.message}</div>
                </div>
                <div style="text-align:center; margin-top: 24px;">
                  <a href="mailto:${validated.email}" class="reply-btn">Reply to ${validated.firstName}</a>
                </div>
              </div>
              <div class="footer">
                <p>Sent from Stelfi · Stellar Finance. Simplified.</p>
                <p>Built on Arc Network · Powered by USDC</p>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    // ── Auto-reply to sender ─────────────────────────────────
    await transporter.sendMail({
      from:    `"Stelfi" <${process.env.GMAIL_USER}>`,
      to:      validated.email,
      subject: "We received your message — Stelfi",
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: Inter, sans-serif; background: #050A14; color: #ffffff; margin: 0; padding: 0; }
              .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
              .header { background: linear-gradient(135deg, #00D4AA, #00B8A0); padding: 40px 32px; border-radius: 16px 16px 0 0; text-align: center; }
              .logo { font-size: 32px; font-weight: 900; color: #050A14; letter-spacing: -1px; }
              .tagline { color: rgba(5,10,20,0.65); font-size: 13px; margin-top: 4px; }
              .body { background: #0D1526; border: 1px solid rgba(255,255,255,0.08); border-top: none; padding: 40px 32px; border-radius: 0 0 16px 16px; }
              h2 { font-size: 22px; font-weight: 700; margin: 0 0 16px; color: #ffffff; }
              p { color: rgba(139,158,199,0.9); line-height: 1.7; font-size: 15px; margin: 0 0 16px; }
              .highlight { color: #00D4AA; font-weight: 600; }
              .divider { border: none; border-top: 1px solid rgba(255,255,255,0.06); margin: 28px 0; }
              .footer { text-align: center; margin-top: 28px; font-size: 12px; color: rgba(139,158,199,0.5); line-height: 1.8; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <div class="logo">Stelfi</div>
                <div class="tagline">Stellar Finance. Simplified.</div>
              </div>
              <div class="body">
                <h2>Hi ${validated.firstName}, thank you for reaching out!</h2>
                <p>We have received your message and our team will get back to you within <span class="highlight">24–48 hours</span>.</p>
                <p>In the meantime, feel free to explore Stelfi — swap stablecoins across borders or stake USDC on real-world prediction markets, all on Arc Network.</p>
                <hr class="divider" />
                <p style="font-size:13px; color: rgba(139,158,199,0.6)">
                  <strong style="color:#ffffff">Your message:</strong><br/>
                  ${validated.message}
                </p>
              </div>
              <div class="footer">
                <p>© 2026 Stelfi · Built on Arc Network · Powered by USDC</p>
                <p>You are receiving this because you contacted us at stelfi.xyz</p>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    return NextResponse.json({ success: true, message: "Message sent successfully" });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, errors: error.issues }, { status: 400 });
    }
    console.error("Email error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to send message. Please try again." },
      { status: 500 }
    );
  }
}

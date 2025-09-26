import { NextResponse } from "next/server";
import { createClient } from "@libsql/client";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";

const client = createClient({
  url: process.env.TURSO_CONNECTION_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    const result = await client.execute({
      sql: `SELECT * FROM users WHERE email = ?`,
      args: [email],
    });

    if (result.rows.length > 0) {
      const user = result.rows[0];
      const userId = user.id as string; 
      const userName = typeof user.name === 'string' ? user.name : "User"; 

      
      const token = jwt.sign({ id: userId }, process.env.JWT_SECRET!, { expiresIn: "1h" });
      const expires = Date.now() + 3600000; 

      
      await client.execute({
        sql: `UPDATE users SET reset_password_token = ?, reset_password_expires = ? WHERE id = ?`,
        args: [token, expires, userId],
      });

    
      const resetLink = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/Resetpassword/${token}?email=${encodeURIComponent(email)}`;

  
      await transporter.sendMail({
        from: process.env.EMAIL_FROM,
        to: email,
        subject: "Password Reset Request",
        html: generateResetEmailHtml(userName, resetLink),
      });
      
      console.log(`Sent email to ${email}`);
    }

    return NextResponse.json({
      success: true,
      message: "If an account exists with this email, you'll receive a password reset link.",
    });
  } catch (error) {
    console.error("Forgot Password Error:", error);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}

// Function to generate the HTML content of the password reset email
const generateResetEmailHtml = (name: string, resetLink: string) => {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Password Reset Request</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          margin: 0;
          padding: 0;
          background-color: #f9f9f9;
        }
        .email-container {
          max-width: 600px;
          margin: 20px auto;
          padding: 25px;
          background-color: #ffffff;
          border: 1px solid #ddd;
          border-radius: 8px;
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
        }
        .alert {
          background-color: #e6f2ff;
          color: #0056b3;
          padding: 12px;
          border-radius: 5px;
          text-align: center;
          font-weight: bold;
          margin-bottom: 15px;
          border: 1px solid #0056b3;
        }
        h4 {
          color: #333;
          font-size: 18px;
          margin: 0 0 15px 0;
        }
        p {
          font-size: 14px;
          color: #555;
          margin-bottom: 15px;
          line-height: 1.5;
        }
        .footer {
          margin-top: 20px;
          font-size: 13px;
          color: #777;
        }
        hr {
          border: 0;
          height: 1px;
          background: #ddd;
          margin: 20px 0;
        }
      </style>
    </head>
    <body>
      <div class="email-container">
        <div class="alert">🔑 Password Reset Request</div>
        <h4>Hello ${name},</h4>
        <hr>
        <p>We received a request to reset your password for your account. If you made this request, you can reset your password by clicking the button below.</p>
        <p><strong>This link can be used only once and will expire in 1 hour.</strong></p>
        <div>
          <p><a href="${resetLink}" style="background-color: #0056b3; color: white; padding: 6px 20px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Reset Password</a></p>
        </div>
        <p>If you didn't request this, ignore this email, and your account will remain secure.</p>
        <p>Need help? Contact us at <a href="mailto:support@example.com">support@example.com</a></p>
        <div class="footer">
          <p>Best regards,<br><strong>Your Company</strong></p>
        </div>
      </div>
    </body>
    </html>
  `;
};
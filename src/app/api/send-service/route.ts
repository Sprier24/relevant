// app/api/send-service/route.ts
import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request: Request) {
  try {
    const { serviceId, pdfData, customerName } = await request.json();

    // Setup the transporter for sending emails
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const defaultRecipient = process.env.DEFAULT_NOTIFICATION_EMAIL;
    if (!defaultRecipient) {
      return NextResponse.json(
        { error: "Default notification email not configured" },
        { status: 400 }
      );
    }

    // Create the email
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.DEFAULT_NOTIFICATION_EMAIL,
      subject: `Service Report: ${serviceId} - ${customerName}`,
      text: `Please find attached the service report for ${customerName}`,
      attachments: [{
        filename: `service-report-${serviceId}.pdf`,
        content: pdfData,
        encoding: 'base64'
      }]
    };

    // Send the email
    await transporter.sendMail(mailOptions);

    return NextResponse.json({ 
      success: true,
      message: "Email sent successfully" 
    });

  } catch (error: any) {
    console.error("Error sending email:", error);
    return NextResponse.json(
      { error: error.message || "Failed to send email" },
      { status: 500 }
    );
  }
}
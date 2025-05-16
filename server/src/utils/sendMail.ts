import crypto from "crypto";
import nodemailer from "nodemailer";
import { env } from "../conf/env.js";

const transporter = nodemailer.createTransport({
  service: "gmail",
  port: 465,
  secure: true,
  auth: {
    user: env.gmailUser,
    pass: env.gmailAppPassword,
  },
  tls: {
    rejectUnauthorized: false,
  },
});

const generateOtp = () => crypto.randomInt(100000, 999999).toString();

const sendMail = async (user: string, type: "OTP" | "WELCOME" | "FEEDBACK-RECEIVED" | "FEEDBACK-SENT" | "NEW-DEVICE-LOGIN", details: any = {}) => {

  if (!user || !/^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/.test(user)) {
    throw new Error("Invalid email address");
  }
  
  try {
    // Generate OTP if it's an OTP mail
    const otpCode = type === "OTP" ? generateOtp() : undefined;
    
    // Customize the email content based on whether it's an OTP mail
    const subject =
    type === "OTP" ? "Your OTP Code - Secure Login" : "Welcome to Flick!";
    
    const text =
    type === "OTP"
    ? `Dear user,\n\nYour OTP code is: ${otpCode}. This code will expire in 1 minute. Please do not share it with anyone for security reasons.\n\nThank you for using Flick!\nBest regards,\nThe Flick Team`
    : `Hello,\n\nThank you for choosing Flick! We're excited to have you with us.\n\nIf you have any questions, feel free to reach out!\nBest regards,\nThe Flick Team`;
    
    let html;
    
    switch (type) {
      case "OTP":
        html = `<div style="font-family: Arial, sans-serif; padding: 20px; line-height: 1.6;">
        <h2 style="color: #4CAF50;">Your OTP Code</h2>
          <p>Dear user,</p>
          <p>Your <strong>One-Time Password (OTP)</strong> is:</p>
          <p style="font-size: 1.5em; font-weight: bold; color: #333;">${otpCode}</p>
          <p>This code will expire in <strong>1 minute</strong>. Please do not share it with anyone for security reasons.</p>
          <hr style="border: none; border-top: 1px solid #ccc;" />
          <p style="color: #888;">Thank you for using Flick!</p>
          <p style="color: #888;">Best regards,<br />The Flick Team</p>
        </div>`;
        break;
      case "WELCOME":
        html = `<div style="font-family: Arial, sans-serif; padding: 20px; line-height: 1.6;">
          <h2 style="color: #4CAF50;">Welcome to Flick!</h2>
          <p>We're excited to have you with us. Flick helps you manage and organize your links easily and securely.</p>
          <p>If you have any questions or need assistance, feel free to reach out to us anytime.</p>
          <hr style="border: none; border-top: 1px solid #ccc;" />
          <p style="color: #888;">Best regards,<br />The Flick Team</p>
        </div>`;
        break;
      case "FEEDBACK-RECEIVED":
        html = `<div style="font-family: Arial, sans-serif; padding: 20px; line-height: 1.6;">
          <h2 style="color: #4CAF50;">Feedback Received</h2>
          <p>Dear user,</p>
          <p>Thank you for your valuable feedback. We value your input and will use it to improve our services.</p>
          <hr style="border: none; border-top: 1px solid #ccc;" />
          <p style="color: #888;">Best regards,<br />The Flick Team</p>
          </div>`;
          break;
          case "FEEDBACK-SENT":
            html =
            `<div style="font-family: Arial, sans-serif; padding: 20px; line-height: 1.6;">
            <h2 style="color: #4CAF50;">Feedback from [[USER]]</h2>
            <h6>[[TITLE]]</h6>
            <hr style="border: none; border-top: 1px solid #ccc;" />
            <p style="color: #888;">Best regards,<br />[[DESCRIPTION]]</p>
            </div>`
            .replace("[[USER]]", details.sendBy)
            .replace("[[TITLE]]", details.title)
            .replace("[[DESCRIPTION]]", details.description);
            break;
          }
          
    const info = await transporter.sendMail({
      from: `"Flick" <${env.gmailUser}>`,
      to: user,
      subject,
      text,
      html,
    });

    return {
      success: true,
      messageId: info.messageId,
      type,
      otpCode,
    };
  } catch (error) {
    console.error("Error in sendMail:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
      type,
    };
  }
};

export default sendMail;

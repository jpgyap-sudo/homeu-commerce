import nodemailer from 'nodemailer';
import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';

export async function sendEmail({ to, subject, html, text }) {
  if (process.env.SEND_PROVIDER === 'ses') return sendViaSes({ to, subject, html, text });
  return sendViaSmtp({ to, subject, html, text });
}

async function sendViaSmtp({ to, subject, html, text }) {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined
  });

  const info = await transporter.sendMail({
    from: `"${process.env.SMTP_FROM_NAME || 'HomeU'}" <${process.env.SMTP_FROM_EMAIL}>`,
    to,
    subject,
    html,
    text,
    headers: {
      'List-Unsubscribe': '<mailto:unsubscribe@homeu.ph>',
      'X-HomeU-System': 'DaVinciOS-Campaign-Builder'
    }
  });
  return { messageId: info.messageId };
}

async function sendViaSes({ to, subject, html, text }) {
  const client = new SESv2Client({ region: process.env.AWS_REGION || 'ap-southeast-1' });
  const command = new SendEmailCommand({
    FromEmailAddress: `${process.env.SMTP_FROM_NAME || 'HomeU'} <${process.env.SMTP_FROM_EMAIL}>`,
    Destination: { ToAddresses: [to] },
    Content: {
      Simple: {
        Subject: { Data: subject },
        Body: { Html: { Data: html }, Text: { Data: text } }
      }
    }
  });
  const response = await client.send(command);
  return { messageId: response.MessageId };
}

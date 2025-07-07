import nodemailer from 'nodemailer';
import logger from '../logger';
import {
  SMTP_EMAIL,
  SMTP_HOST,
  SMTP_PORT,
  SMTP_PWD,
  SMTP_SECURE,
  SMTP_SENDER_NAME,
  SMTP_USER
} from '../../env-config';

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_SECURE,
  auth: {
    user: SMTP_USER,
    pass: SMTP_PWD,
  },
  sender: SMTP_EMAIL
});

export async function sendEmail({ to, subject, content }: { to: string; subject: string; content: string; }) {
  if (!to || !subject || !content) {
    throw new Error('Missing email fields');
  }

  await transporter.sendMail({
    from: `"${SMTP_SENDER_NAME}" <${SMTP_EMAIL}>`,
    to,
    subject,
    text: content,
  });
}

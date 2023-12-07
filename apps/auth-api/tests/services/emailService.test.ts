import nodemailer from 'nodemailer';
import sendEmail from '../../src/services/emailService';
import {
  SMTP_HOST,
  SMTP_PORT,
  SMTP_USER,
  SMTP_PWD,
  SMTP_EMAIL,
} from '../../env-config';
import { expect, jest, describe, it } from '@jest/globals';

jest.mock('nodemailer');

describe('sendEmail function', () => {
  it('should send an email', async () => {
    const mockCreateTransport = jest.fn().mockReturnValue({
      sendMail: jest.fn().mockResolvedValue({} as never),
    });
    nodemailer.createTransport = mockCreateTransport;

    const to = 'test@example.com';
    const subject = 'Test Subject';
    const html = '<p>This is a test email</p>';

    await sendEmail(to, subject, html);

    expect(mockCreateTransport).toHaveBeenCalledWith({
      host: SMTP_HOST,
      port: SMTP_PORT,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PWD,
      },
    });

    expect(mockCreateTransport().sendMail).toHaveBeenCalledWith({
      from: SMTP_EMAIL,
      to,
      subject,
      html,
    });
  });
});

import nodemailer, { TransportOptions } from 'nodemailer';
import {
    SMTP_HOST,
    SMTP_PORT,
    SMTP_USER,
    SMTP_PWD,
    SMTP_EMAIL
} from '../../env-config';

async function sendEmail(
    to: string,
    subject: string,
    html: string | undefined = undefined,
    text: string | undefined = undefined,
) {
    const transporter = nodemailer.createTransport({
        host: SMTP_HOST,
        port: SMTP_PORT, 
        auth: {
            user: SMTP_USER,
            pass: SMTP_PWD
        }
    } as TransportOptions);

    const mailOptions = {
        from: SMTP_EMAIL,
        to,
        subject,
        text,
        html
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log('Email sent successfully');
    } catch (error) {
        console.error('Error sending email:', error);
    }
}

export default sendEmail;

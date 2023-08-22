import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
        user: process.env.GMAIL_APP,
        pass: process.env.GMAIL_APP_PASSWORD,
    },
    tls: {
        rejectUnauthorized: false,
    },
});
const sendMail = (messageOptions) => {
    const message = {
        from: process.env.GMAIL_APP,
        to: messageOptions.recipient,
        subject: messageOptions.subject,
        text: messageOptions.text,
        html: messageOptions.html,
    };
    return transporter.sendMail(message);
};
export { sendMail };

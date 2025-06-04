const nodeMailer = require('nodemailer');

// Create a transporter object using SMTP transport
const transporter = nodeMailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.example.com',
  port: process.env.SMTP_PORT || 587,
  secure: process.env.SMTP_SECURE === 'true', // Convert string to boolean
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || ''
  }
});

sendConfirmationEmail = async (email, token) => {
    const confirmationUrl = `${process.env.FRONTEND_URL}/confirm-email?token=${token}`;
    
    const mailOptions = {
        from: `"Breezy" <${process.env.SMTP_USER}>`, // sender address
        to: email, // list of receivers
        subject: 'Email Confirmation', // Subject line
        text: `Please confirm your email by clicking the following link: ${confirmationUrl}`, // plain text body
        html: `<p>Please confirm your email by clicking the following link:</p><a href="${confirmationUrl}">${confirmationUrl}</a>` // html body
    };
    
    try {
        await transporter.sendMail(mailOptions);
        console.log('Confirmation email sent successfully');
    } catch (error) {
        console.error('Error sending confirmation email:', error);
        throw new Error('Failed to send confirmation email');
    }
}

module.exports = {
    sendConfirmationEmail
};
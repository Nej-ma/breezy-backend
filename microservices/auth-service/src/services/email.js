import nodeMailer from 'nodemailer';

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

const sendConfirmationEmail = async (email, token) => {
    const confirmationUrl = `${process.env.FRONTEND_URL}/confirm-email?token=${token}`;
    
    const mailOptions = {
        from: `"${process.env.APP_NAME}" <${process.env.SMTP_USER}>`, // sender address
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
        throw new Error('Failed to send confirmation email to ' + `"${process.env.APP_NAME}" <${process.env.SMTP_USER}>`);
    }
}

const sendPasswordResetEmail = async (email, token) => {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
    
    const mailOptions = {
        from: `"${process.env.APP_NAME}" <${process.env.SMTP_USER}>`,
        to: email,
        subject: 'Password Reset Request',
        text: `You requested a password reset. Please click the following link to reset your password: ${resetUrl}`,
        html: `
            <p>You requested a password reset.</p>
            <p>Please click the following link to reset your password:</p>
            <a href="${resetUrl}">Reset Password</a>
            <p>This link will expire in 1 hour.</p>
            <p>If you didn't request this, please ignore this email.</p>
        `
    };
    
    try {
        await transporter.sendMail(mailOptions);
        console.log('Password reset email sent successfully');
    } catch (error) {
        console.error('Error sending password reset email:', error);
        throw new Error('Failed to send password reset email');
    }
};

export {
    sendConfirmationEmail,
    sendPasswordResetEmail
};
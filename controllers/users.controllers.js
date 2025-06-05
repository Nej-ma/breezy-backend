const { request } = require('../app');
const User = require('../models/User');
const emailService = require('../services/email');

// Create user account
createAccount = async (req, res) => {
    try {
        const { username, displayName, email, password } = req.body;

        // check if there is no user with the same email
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: 'Email already in use' });
        }

        // create verification token
        const verificationToken = Math.random().toString(36).substring(2, 15);
        const verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

        const newUser = new User({ username, displayName, email, password, verificationToken, verificationTokenExpires: verificationTokenExpiry });
        await newUser.save();

        // Send verification email
        await emailService.sendConfirmationEmail(email, verificationToken);

        res.status(201).json({ message: 'User created successfully' });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
}

// Validate email 
validateEmail = async (req, res) => {
    try {
        const {token} = req.params;
        const user = await User.findOne({ verificationToken: token, verificationTokenExpires: { $gt: new Date() } });
        if (!user) {
            return res.status(400).json({ error: 'Invalid or expired token' });
        }
        
        user.isVerified = true;
        user.verificationToken = '';
        user.verificationTokenExpires = null;

        await user.save();

        res.status(200).json({ message: 'Email validated successfully' });
    } catch (error) {
        return res.status(400).json({ error: error.message });
    }
}

// export 
module.exports = {
    createAccount,
    validateEmail
};
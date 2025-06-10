import User from '../models/User.js';
import { sendConfirmationEmail } from '../services/email.js';

// Create user account
const createAccount = async (req, res) => {
    try {
        const { username, displayName, email, password } = req.body;

        // Validation des champs requis
        if (!username || !displayName || !email || !password) {
            return res.status(400).json({ 
                error: 'Missing required fields: username, displayName, email, password' 
            });
        }

        // check if there is no user with the same email
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: 'Email already in use' });
        }

        // create verification token
        const verificationToken = Math.random().toString(36).substring(2, 15);
        const verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

        const newUser = new User({ 
            username, 
            displayName, 
            email, 
            password, 
            verificationToken, 
            verificationTokenExpires: verificationTokenExpiry 
        });
        await newUser.save();

        // Envoyer l'email de confirmation en arrière-plan (non bloquant)
        sendConfirmationEmail(email, verificationToken).catch(error => {
            console.error('❌ Erreur envoi email (non bloquant):', error.message);
        });

        res.status(201).json({ 
            message: 'User created successfully',
            verificationRequired: true,
            userId: newUser._id
        });
    } catch (error) {
        console.error('❌ Erreur création utilisateur:', error);
        res.status(400).json({ error: error.message });
    }
}

// Validate email
const validateEmail = async (req, res) => {
    try {
        const {token} = req.params;
        const user = await User.findOne({ 
            verificationToken: token, 
            verificationTokenExpires: { $gt: new Date() } 
        });
        
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

// Get user by ID
const getUserById = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.findById(id).select('-password -verificationToken -verificationTokenExpires -__v -updatedAt');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json(user);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
}

// Get all users
const getUsers = async (req, res) => {
    try {
        const users = await User.find().select('-password -verificationToken -verificationTokenExpires -__v -updatedAt');
        if (!users || users.length === 0) {
            return res.status(404).json({ message: 'No users found' });
        }
        res.json(users);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
}

// export 
export {
    getUsers,
    getUserById,
    createAccount,
    validateEmail
};
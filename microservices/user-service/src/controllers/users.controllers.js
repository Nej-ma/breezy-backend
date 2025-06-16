import UserProfile from '../models/User.js';
import { sendConfirmationEmail } from '../services/email.js';

// Create user profile (appelé par Auth Service)
const createUserProfile = async (req, res) => {
    try {
        const { userId, username, displayName } = req.body;

        // Validation des champs requis
        if (!userId || !username || !displayName) {
            return res.status(400).json({ 
                error: 'Missing required fields: userId, username, displayName' 
            });
        }

        // Vérifier si le profil existe déjà
        const existingProfile = await UserProfile.findOne({ userId });
        if (existingProfile) {
            return res.status(400).json({ error: 'User profile already exists' });
        }

        const newProfile = new UserProfile({ 
            userId,
            username, 
            displayName
        });
        await newProfile.save();

        res.status(201).json({ 
            message: 'User profile created successfully',
            profile: {
                userId: newProfile.userId,
                username: newProfile.username,
                displayName: newProfile.displayName,
                bio: newProfile.bio,
                profilePicture: newProfile.profilePicture,
                coverPicture: newProfile.coverPicture
            }
        });
    } catch (error) {
        console.error('❌ Erreur création profil utilisateur:', error);
        res.status(400).json({ error: error.message });
    }
}

// Create user account (legacy - redirige vers Auth Service)
const createAccount = async (req, res) => {
    res.status(400).json({
        error: 'User registration should be done via Auth Service',
        redirectTo: '/api/auth/register',
        message: 'Please use POST /api/auth/register to create a new account'
    });
}

// Validate email (legacy - redirige vers Auth Service)
const validateEmail = async (req, res) => {
    res.status(400).json({
        error: 'Email validation should be done via Auth Service',
        redirectTo: '/api/auth/activate/:token',
        message: 'Please use POST /api/auth/activate/:token to verify your email'
    });
}

// Get user by Username
const getUserByUsername = async (req, res) => {
    try {
        const { username } = req.params;
        const userProfile = await UserProfile.findOne({ username });
        if (!userProfile) {
            return res.status(404).json({ message: 'User profile not found' });
        }
        res.json(userProfile);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
}

// Get all users
const getUsers = async (req, res) => {
    try {
        const profiles = await UserProfile.find().select('-__v -updatedAt');
        if (!profiles || profiles.length === 0) {
            return res.status(404).json({ message: 'No user profiles found' });
        }
        res.json(profiles);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
}

// export 
export {
    getUsers,
    getUserByUsername,
    createAccount,
    validateEmail,
    createUserProfile
};
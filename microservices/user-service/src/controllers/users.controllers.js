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

const getUserById = async (req, res) => {
    try {
        const { userId } = req.params;
        const userProfile = await UserProfile.findOne({ userId });
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

// Search users by username or display name
const searchUsers = async (req, res) => {
    try {
        const { q, limit = 10, skip = 0 } = req.query;
        
        // Validate limit and skip parameters
        const parsedLimit = parseInt(limit, 10);
        const parsedSkip = parseInt(skip, 10);
        if (isNaN(parsedLimit) || isNaN(parsedSkip) || parsedLimit < 1 || parsedLimit > 50 || parsedSkip < 0) {
            return res.status(400).json({ 
                error: 'Invalid parameters: "limit" must be between 1 and 50, and "skip" must be 0 or greater' 
            });
        }
        
        // Validate the search query
        if (!q || q.trim().length === 0) {
            return res.status(400).json({ 
                error: 'Search query parameter "q" is required' 
            });
        }

        const searchQuery = q.trim();
        
        // to ensure minimum length for search
        if (searchQuery.length < 2) {
            return res.status(400).json({ 
                error: 'Search query must be at least 2 characters long' 
            });
        }        // Use MongoDB's $text search with the existing text index
        const searchCriteria = {
            $text: { 
                $search: searchQuery,
                $caseSensitive: false 
            }
        };

        // Execute the search with pagination
        const users = await UserProfile.find(searchCriteria)
            .select('userId username displayName bio profilePicture followersCount followingCount')
            .limit(parseInt(limit))
            .skip(parseInt(skip))
            .sort({ 
                score: { $meta: 'textScore' }, // Tri par pertinence text search
                followersCount: -1, 
                username: 1 
            });// Sort by popularity then alphabetically

        // Count total for pagination
        const totalCount = await UserProfile.countDocuments(searchCriteria);

        res.json({
            users,
            pagination: {
                total: totalCount,
                limit: parseInt(limit),
                skip: parseInt(skip),
                hasMore: (parseInt(skip) + parseInt(limit)) < totalCount
            },
            searchQuery: searchQuery
        });
    } catch (error) {
        console.error('❌ Erreur recherche utilisateurs:', error);
        res.status(500).json({ error: 'Server error during search' });
    }
}

// export 
export {
    getUsers,
    getUserByUsername,
    createAccount,
    validateEmail,
    createUserProfile,
    getUserById,
    searchUsers
};
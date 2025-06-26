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
        }

        // Create a regex for case-insensitive search
        const searchRegex = new RegExp(searchQuery, 'i');

        // Search in username and displayName
        const searchCriteria = {
            $or: [
                { username: { $regex: searchRegex } },
                { displayName: { $regex: searchRegex } }
            ]
        };

        // Execute the search with pagination
        const users = await UserProfile.find(searchCriteria)
            .select('userId username displayName bio profilePicture followersCount followingCount')
            .limit(parseInt(limit))
            .skip(parseInt(skip))
            .sort({ followersCount: -1, username: 1 }); // Sort by popularity then alphabetically

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

// GET current user profile
const getCurrentUserProfile = async (req, res) => {
    try {
        if (!req.user || !req.user.userId) {
            return res.status(401).json({ error: 'Unauthorized: user not authenticated' });
        }
        const userProfile = await UserProfile.findOne({ userId: req.user.userId }).select('-__v -updatedAt');
        if (!userProfile) {
            return res.status(404).json({ error: 'User profile not found' });
        }
        res.status(200).json({ profile: userProfile });
    } catch (error) {
        console.error('Get current user profile error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const updateUserProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { profilePicture, coverPicture, displayName, bio, location, website } = req.body;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized: user not authenticated' });
    }
    // Prépare l'objet de mise à jour uniquement avec les champs fournis
    const updateFields = {};
    if (profilePicture !== undefined) updateFields.profilePicture = profilePicture;
    if (coverPicture !== undefined) updateFields.coverPicture = coverPicture;
    if (displayName !== undefined) {
      // Check if displayName is already taken by another user
      const existing = await UserProfile.findOne({ displayName, userId: { $ne: userId } });
      if (existing) {
        return res.status(409).json({ error: 'Display name already taken' });
      }
      updateFields.displayName = displayName;
    }
    if (bio !== undefined) updateFields.bio = bio;
    if (location !== undefined) updateFields.location = location;
    if (website !== undefined) updateFields.website = website;

    if (Object.keys(updateFields).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const updatedUser = await UserProfile.findOneAndUpdate(
      { userId },
      { $set: updateFields },
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      message: 'Profile updated successfully',
      user: updatedUser
    });
  } catch (err) {
    console.error('Error updating user profile:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const deleteUserProfile = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(401).json({ error: 'Unauthorized: user not authenticated' });
        }

        const deletedProfile = await UserProfile.findById(id);

        if (!deletedProfile) {
            return res.status(404).json({ error: 'User profile not found' });
        }

        // Only allow if user is deleting their own profile or has moderator/admin role
        const isSelf = deletedProfile.userId === req.user.id;
        const isModeratorOrAdmin = req.user.role === 'moderator' || req.user.role === 'admin';

        if (!isSelf && !isModeratorOrAdmin) {
            return res.status(403).json({ error: 'Forbidden: insufficient permissions' });
        }

        // Extract the token from the Authorization header
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

       
        // delete user account in Auth Service
        try {
            const authServiceUrl = process.env.AUTH_SERVICE_URL || 'http://auth-service:3001';
            const response = await fetch(`${authServiceUrl}/${deletedProfile.userId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to delete user account in Auth Service - ' + response.statusText);
            }

            // Delete the user profile from User Service
            await UserProfile.findByIdAndDelete(id);

        } catch (error) {
            console.error('Error deleting user account in Auth Service:', error);
            return res.status(500).json({ error: 'Internal server error' });

        }

        res.status(200).json({ message: 'User profile deleted successfully' });
    } catch (error) {
        console.error('Error deleting user profile:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// export 
export {
    getUsers,
    getUserByUsername,
    createAccount,
    validateEmail,
    createUserProfile,
    getUserById,
    searchUsers,
    getCurrentUserProfile,
    updateUserProfile, 
    deleteUserProfile
};
import Follow from '../models/Follow.js';
import User from '../models/User.js';

// Fonction utilitaire pour recalculer et synchroniser les compteurs
const syncUserCounts = async (userId) => {
    try {
        const [followersCount, followingCount] = await Promise.all([
            Follow.countDocuments({ following: userId }),
            Follow.countDocuments({ follower: userId })
        ]);

        await User.findOneAndUpdate(
            { userId: userId },
            {
                followersCount: followersCount,
                followingCount: followingCount
            }
        );

        return { followersCount, followingCount };
    } catch (error) {
        console.error('Error syncing user counts:', error);
        return null;
    }
};

const followUser = async (req, res) => {
    try {
        const { userId } = req.params;

        if (!userId) {
            return res.status(400).json({ message: 'User ID is required' });
        }

        if( req.user.id === userId) {
            return res.status(400).json({ message: 'You cannot follow yourself' });
        }

        const existingFollow = await Follow.findOne({
            follower: req.user.id,
            following: userId
        });

        if (existingFollow) {
            return res.status(400).json({ message: 'Already following this user' });
        }

        const follow = new Follow({
            follower: req.user.id,
            following: userId
        });

        await follow.save();

        // Mettre à jour les compteurs
        await Promise.all([
            // Incrémenter le followingCount de l'utilisateur qui suit
            User.findOneAndUpdate(
                { userId: req.user.id },
                { $inc: { followingCount: 1 } }
            ),
            // Incrémenter le followersCount de l'utilisateur suivi
            User.findOneAndUpdate(
                { userId: userId },
                { $inc: { followersCount: 1 } }
            )
        ]);

        res.status(200).json({ message: 'User followed successfully' });
    } catch (error) {
        console.error('Error following user:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

const unfollowUser = async (req, res) => {
    try {
        const { userId } = req.params;

        if (!userId) {
            return res.status(400).json({ message: 'User ID is required' });
        }

        if( req.user.id === userId) {
            return res.status(400).json({ message: 'You cannot unfollow yourself' });
        }

        const existingFollow = await Follow.findOne({
            follower: req.user.id,
            following: userId
        });

        if (!existingFollow) {
            return res.status(404).json({ message: 'Follow relationship not found' });
        }

        const result = await Follow.deleteOne({
            follower: req.user.id,
            following: userId
        });

        if (result.deletedCount === 0) {
            return res.status(404).json({ message: 'Follow relationship not found' });
        }

        // Mettre à jour les compteurs
        await Promise.all([
            // Décrémenter le followingCount de l'utilisateur qui ne suit plus
            User.findOneAndUpdate(
                { userId: req.user.id },
                { $inc: { followingCount: -1 } }
            ),
            // Décrémenter le followersCount de l'utilisateur qui n'est plus suivi
            User.findOneAndUpdate(
                { userId: userId },
                { $inc: { followersCount: -1 } }
            )
        ]);

        res.status(200).json({ message: 'User unfollowed successfully' });
    } catch (error) {
    console.error('Error unfollowing user:', error);
    res.status(500).json({ message: 'Internal server error' });
    }
}

const getFollowers = async (req, res) => {
    try {
        const { userId } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = Math.min(parseInt(req.query.limit) || 10, 50); // Limite à 50 max
        const skip = (page - 1) * limit;
        
        console.log(`📋 Getting followers for user ${userId}, page ${page}, limit ${limit}`);
        
        // Validation de l'userId
        if (!userId || userId.length !== 24) {
            return res.status(400).json({ message: 'Invalid user ID' });
        }
        
        // Use Promise.all pour optimiser les requêtes
        const [totalFollows, follows] = await Promise.all([
            Follow.countDocuments({ following: userId }),
            Follow.find({ following: userId })
                .skip(skip)
                .limit(limit)
                .sort({ createdAt: -1 })
                .lean() // Optimisation MongoDB
        ]);
        
        if (follows.length === 0) {
            return res.status(200).json({
                users: [],
                pagination: {
                    page,
                    limit,
                    total: totalFollows,
                    pages: Math.ceil(totalFollows / limit),
                    hasMore: false
                }
            });
        }
        
        // Get user details for all followers
        const followerIds = follows.map(follow => follow.follower);
        const followers = await User.find({ 
            userId: { $in: followerIds } 
        })
        .select('userId username displayName profilePicture bio isVerified followersCount followingCount')
        .lean(); // Optimisation MongoDB
        
        console.log(`✅ Found ${followers.length} followers for page ${page}`);
        
        res.status(200).json({
            users: followers,
            pagination: {
                page,
                limit,
                total: totalFollows,
                pages: Math.ceil(totalFollows / limit),
                hasMore: page * limit < totalFollows
            }
        });
    } catch (error) {
        console.error('Error fetching followers:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}

const getFollowing = async (req, res) => {
    try {
        const { userId } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = Math.min(parseInt(req.query.limit) || 10, 50); // Limite à 50 max
        const skip = (page - 1) * limit;
        
        console.log(`📋 Getting following for user ${userId}, page ${page}, limit ${limit}`);
        
        // Validation de l'userId
        if (!userId || userId.length !== 24) {
            return res.status(400).json({ message: 'Invalid user ID' });
        }
        
        // Use Promise.all pour optimiser les requêtes
        const [totalFollows, follows] = await Promise.all([
            Follow.countDocuments({ follower: userId }),
            Follow.find({ follower: userId })
                .skip(skip)
                .limit(limit)
                .sort({ createdAt: -1 })
                .lean() // Optimisation MongoDB
        ]);
        
        if (follows.length === 0) {
            return res.status(200).json({
                users: [],
                pagination: {
                    page,
                    limit,
                    total: totalFollows,
                    pages: Math.ceil(totalFollows / limit),
                    hasMore: false
                }
            });
        }
        
        // Get user details for all users being followed
        const followingIds = follows.map(follow => follow.following);
        const following = await User.find({ 
            userId: { $in: followingIds } 
        })
        .select('userId username displayName profilePicture bio isVerified followersCount followingCount')
        .lean(); // Optimisation MongoDB
        
        console.log(`✅ Found ${following.length} following for page ${page}`);
        
        res.status(200).json({
            users: following,
            pagination: {
                page,
                limit,
                total: totalFollows,
                pages: Math.ceil(totalFollows / limit),
                hasMore: page * limit < totalFollows
            }
        });
    } catch (error) {
        console.error('Error fetching following:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}

const isFollowingUser = async (req, res) => {
    try {
        const { userId } = req.params;
        const follow = await Follow.findOne({ 
            follower: req.user.id, 
            following: userId
        });
        res.status(200).json({ isFollowing: !!follow });
    } catch (error) {
        console.error('Error checking follow status:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}

// Synchroniser tous les compteurs (fonction pour développement)
const syncAllCounts = async (req, res) => {
    try {
        console.log('🔄 Starting sync of all user counts...');
        
        // Récupérer tous les utilisateurs
        const users = await User.find({}, 'userId');
        
        let syncedCount = 0;
        for (const user of users) {
            try {
                await syncUserCounts(user.userId);
                syncedCount++;
            } catch (error) {
                console.error(`❌ Failed to sync counts for user ${user.userId}:`, error);
            }
        }
        
        console.log(`✅ Synced counts for ${syncedCount}/${users.length} users`);
        res.status(200).json({ 
            message: `Successfully synced counts for ${syncedCount}/${users.length} users`,
            syncedCount,
            totalUsers: users.length
        });
    } catch (error) {
        console.error('❌ Error syncing all counts:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}

export default {
    followUser,
    unfollowUser,
    getFollowers,
    getFollowing,
    isFollowingUser,
    syncUserCounts,
    syncAllCounts
}
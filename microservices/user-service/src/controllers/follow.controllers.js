import Follow from '../models/Follow.js';

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
        res.status(201).json({ message: 'User followed successfully' });
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

        res.status(200).json({ message: 'User unfollowed successfully' });
    } catch (error) {
    console.error('Error unfollowing user:', error);
    res.status(500).json({ message: 'Internal server error' });
    }
}

const getFollowers = async (req, res) => {
    try {
        const { userId } = req.params;
        const followers = await Follow.find({ following: userId }).select('follower');
        res.status(200).json(followers);
    } catch (error) {
        console.error('Error fetching followers:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}

const getFollowing = async (req, res) => {
    try {
        const { userId } = req.params;
        const following = await Follow.find({ follower: userId }).select('following'); 
        res.status(200).json(following);
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

export default {
    followUser,
    unfollowUser,
    getFollowers,
    getFollowing,
    isFollowingUser
}
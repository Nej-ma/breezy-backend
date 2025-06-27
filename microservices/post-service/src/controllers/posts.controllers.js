import Post from '../models/Post.js';

import axios from 'axios';

const publishPost = async (req, res) => {
    try {
        const { content, images, videos, tags, mentions, visibility } = req.body;
        const userId = req.user.userId;

        if (!content) {
            return res.status(400).json({ message: 'Content is required.' });
        }

        // Check if user is suspended
        try {
            const userServiceUrl = process.env.USER_SERVICE_URL || 'http://user-service:3002';
            const authToken = req.headers.authorization;
           
            const headers = { 'Content-Type': 'application/json' };
            if (authToken) {
                headers['Authorization'] = authToken;
            }
           
            const response = await axios.get(`${userServiceUrl}/id/${userId}`, {
                headers,
                timeout: 5000
            });
            
            if (response.status !== 200) {
                return res.status(404).json({ message: 'User not found.' });
            }
            
            // Check if user is suspended
            const userData = response.data;
            if (userData.isSuspended) {
                const suspendedUntil = userData.suspendedUntil ? new Date(userData.suspendedUntil) : null;
                if (!suspendedUntil || suspendedUntil > new Date()) {
                    return res.status(403).json({ 
                        message: 'Vous êtes suspendu et ne pouvez pas publier de posts.',
                        suspended: true,
                        suspendedUntil: userData.suspendedUntil
                    });
                }
            }

        } catch (error) {
            console.error('Error fetching user:', error);
            return res.status(500).json({ message: 'Internal server error while checking user.', error: error.message });
        }

        // Create post
        const newPost = new Post({
            author: userId,
            content,
            images: images || [],
            videos: videos || [],
            tags: tags || [],
            mentions: mentions || [],
            visibility: visibility || 'public'
        });

        await newPost.save();
        res.status(201).json({ message: 'Post published successfully', post: newPost });

    } catch (error) {
        console.error('Error publishing post:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}

const getPosts = async (req, res) => {
    try {
        const { filter, author, id } = req.query;
        const userId = req.user.userId;
        const userServiceUrl = process.env.USER_SERVICE_URL;
        const authToken = req.headers.authorization;

        if (id) {
            const post = await Post.findById(id)
                .populate('tags', 'name');

            if (!post || post.isDeleted) {
                return res.status(404).json({ message: 'Post not found.' });
            }

            let canViewPost = false;

            if (post.visibility === 'public') {
                canViewPost = true;
            } else if (post.visibility === 'private') {
                canViewPost = (post.author === userId);
            } else if (post.visibility === 'followers') {
                if (post.author === userId) {
                    canViewPost = true;
                } else {
                    try {
                        const followerResponse = await axios.get(`${userServiceUrl}/${post.author}/is-following`, {
                            headers: {
                                'Authorization': authToken,
                                'Content-Type': 'application/json'
                            },
                            timeout: 5000
                        });
                        canViewPost = followerResponse.data.isFollowing;
                    } catch (error) {
                        console.error('Error checking if author follows user:', error);
                        canViewPost = false;
                    }
                }
            }

            if (!canViewPost) {
                return res.status(403).json({ message: 'Access denied. You cannot view this post.' });
            }

            // Enrich single post with user data
            const enrichedPost = await enrichPostWithUserData(post, userServiceUrl, authToken);

            return res.status(200).json({
                post: enrichedPost,
                filter: 'single',
                id: id
            });
        }

        if (filter === 'following') {
            const followingResponse = await axios.get(`${userServiceUrl}/${userId}/following`, {
                headers: {
                    'Authorization': authToken,
                    'Content-Type': 'application/json'
                },
                timeout: 5000
            });

            if (followingResponse.status !== 200) {
                return res.status(500).json({ message: 'Error fetching following users.' });
            }

            const followingUserIds = followingResponse.data.users.map(user => user.userId);

            const posts = await Post.find({ 
                author: { $in: followingUserIds }, 
                isDeleted: false 
            })
            .populate('tags', 'name')
            .sort({ createdAt: -1 });

            const filteredPosts = await filterPostsByVisibility(posts, userId, userServiceUrl, authToken);
            
            return res.status(200).json(filteredPosts);
        }

        if (author) {
            const posts = await Post.find({ 
                author: author, 
                isDeleted: false 
            })
            .populate('tags', 'name')
            .sort({ createdAt: -1 });

            const filteredPosts = await filterPostsByVisibility(posts, userId, userServiceUrl, authToken);

            return res.status(200).json(filteredPosts);
        }

        const posts = await Post.find({ isDeleted: false })
            .populate('tags', 'name')
            .sort({ createdAt: -1 });

        const filteredPosts = await filterPostsByVisibility(posts, userId, userServiceUrl, authToken);

        return res.status(200).json( filteredPosts );

    } catch (error) {
        console.error('Error fetching posts:', error);
        res.status(500).json({ message: `Internal server error ${error.message}` });
    }
}

// Shared function to enrich a single post with user data
const enrichPostWithUserData = async (post, userServiceUrl, authToken = null) => {
    try {
        const headers = { 'Content-Type': 'application/json' };
        if (authToken) {
            headers['Authorization'] = authToken;
        }
        
        const { data: userData } = await axios.get(`${userServiceUrl}/id/${post.author}`, {
            headers,
            timeout: 5000
        });
        return {
            ...post.toObject(),
            // Update author data with fresh data from user service
            authorRole: userData.role || 'user',
            authorDisplayName: userData.displayName || post.authorDisplayName,
            authorUsername: userData.username || post.authorUsername,
            authorProfilePicture: userData.profilePicture || post.authorProfilePicture
        };
    } catch (error) {
        console.error(`Erreur lors de la récupération des données utilisateur pour le post ${post._id}:`, error);
        // Return original post if user data fetch fails
        return post.toObject();
    }
};

const filterPostsByVisibility = async (posts, currentUserId, userServiceUrl, authToken) => {
    const filteredPosts = [];
    
    for (const post of posts) {
        // Always allow if current user is the author
        if (post.author?.toString?.() === currentUserId) {
            filteredPosts.push(post);
            continue;
        }

        if (post.visibility === 'public') {
            filteredPosts.push(post);
        } else if (post.visibility === 'followers') {
            try {
                const followerResponse = await axios.get(`${userServiceUrl}/${post.author}/is-following`, {
                    headers: { 
                        'Authorization': authToken,
                        'Content-Type': 'application/json'
                    },
                    timeout: 5000
                });
                if (followerResponse.data.isFollowing) {
                    filteredPosts.push(post);
                }
            } catch (error) {
                console.error('Error checking if author follows user:', error);
            }
        }
        // Do not push private posts if not the author
    }
    
    // Enrich posts with updated user data (including roles)
    const enrichedPosts = await Promise.all(
        filteredPosts.map(post => enrichPostWithUserData(post, userServiceUrl, authToken))
    );
    
    return enrichedPosts;
};


const updatePost = async (req, res) => {
    try {
        const postId = req.params.id;
        const { content, images, videos, tags, mentions, visibility } = req.body;

        const post = await Post.findById(postId);
        if (!post) {
            return res.status(404).json({ message: 'Post not found.' });
        }
        if (post.author.toString() !== req.user.userId) {
            return res.status(403).json({ message: 'You are not authorized to update this post.' });
        } 

        // Dynamically build the update object
        if (!content && !images && !videos && !tags && !mentions && !visibility) {
            return res.status(400).json({ message: 'At least one field must be provided for update.' });
        }
        const updateFields = {};
        if (content !== undefined) updateFields.content = content;
        if (images !== undefined) updateFields.images = images;
        if (videos !== undefined) updateFields.videos = videos;
        if (tags !== undefined) updateFields.tags = tags;
        if (mentions !== undefined) updateFields.mentions = mentions;
        if (visibility !== undefined) updateFields.visibility = visibility;

        const updatedPost = await Post.findByIdAndUpdate(postId, updateFields, { new: true });

        if (!updatedPost || updatedPost.isDeleted) {
            return res.status(404).json({ message: 'Post not found.' });
        }

        res.status(200).json({ message: 'Post updated successfully', post: updatedPost });
    } catch (error) {
        console.error('Error updating post:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}

const deletePost = async (req, res) => {
    try {
        const postId = req.params.id;
        const { moderatorAction, reason } = req.body || {};

        const post = await Post.findById(postId);
        if (!post) {
            return res.status(404).json({ message: 'Post not found.' });
        }

        // Vérifier les permissions de suppression
        const isAuthor = post.author.toString() === req.user.userId;
        const isModerator = req.user.role === 'moderator' || req.user.role === 'admin';
        
        if (!isAuthor && !isModerator) {
            return res.status(403).json({ message: 'You are not authorized to delete this post.' });
        }

        // Si c'est une action de modération, logguer l'action
        if (moderatorAction && isModerator && !isAuthor) {
            console.log(`🔨 Post ${postId} supprimé par modération par ${req.user.userId} (${req.user.role}). Raison: ${reason || 'Non spécifiée'}`);
        }
    
        const deletedPost = await Post.findByIdAndUpdate(postId, { 
            isDeleted: true,
            // Optionnel: ajouter des métadonnées de modération
            ...(moderatorAction && { 
                deletedBy: req.user.userId,
                deletionReason: reason,
                isModerationAction: true 
            })
        }, { new: true });
        
        if (!deletedPost) {
            return res.status(404).json({ message: 'Post not found.' });
        }
        
        res.status(200).json({ 
            message: moderatorAction ? 'Post deleted by moderation' : 'Post deleted successfully', 
            post: deletedPost 
        });
    } catch (error) {
        console.error('Error deleting post:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}


const updatePostLikes = async (req, res) => {
    try {
        const postId = req.params.id;
        const { userId } = req.body; // Get userId from body

        if (!userId || !postId) {
            return res.status(400).json({ message: 'User ID and post ID are required.' });
        }

        // Check if user exists
        try {
            const userServiceUrl = process.env.USER_SERVICE_URL || 'http://user-service:3002';
            const authToken = req.headers.authorization;
           
            const headers = { 'Content-Type': 'application/json' };
            if (authToken) {
                headers['Authorization'] = authToken;
            }
           
            const response = await axios.get(`${userServiceUrl}/id/${userId}`, {
                headers,
                timeout: 5000
            });
            
            if (response.status !== 200) {
                return res.status(404).json({ message: 'User not found.' });
            }
            
            // Check if user is suspended
            const userData = response.data;
            if (userData.isSuspended) {
                const suspendedUntil = userData.suspendedUntil ? new Date(userData.suspendedUntil) : null;
                if (!suspendedUntil || suspendedUntil > new Date()) {
                    return res.status(403).json({ 
                        message: 'Vous êtes suspendu et ne pouvez pas aimer les posts.',
                        suspended: true,
                        suspendedUntil: userData.suspendedUntil
                    });
                }
            }

        } catch (error) {
            console.error('Error fetching user:', error);
            return res.status(500).json({ message: 'Internal server error while checking user.', error: error.message });
        }

        const post = await Post.findById(postId);
        if (!post || post.isDeleted) {
            return res.status(404).json({ message: 'Post not found.' });
        }

        const userIndex = post.likes.indexOf(userId);

        if (userIndex !== -1) {
            // User already liked, so remove the like
            post.likes.splice(userIndex, 1);
        } else {
            // User has not liked, so add the like
            post.likes.push(userId);
        }

        await post.save();

        res.status(200).json({ message: 'Post likes updated successfully', likes: post.likes });
    } catch (error) {
        console.error('Error updating post likes:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}


const searchPostsByTags = async (req, res) => {
    try {
        const { tags, limit = 10, skip = 0 } = req.query;
        const userId = req.user.userId;
        const userServiceUrl = process.env.USER_SERVICE_URL;
        const authToken = req.headers.authorization;

        // Validation des paramètres
        if (!tags) {
            return res.status(400).json({ message: 'Tags parameter is required.' });
        }

        // Parse tags - support both ?tags=tag1&tags=tag2 and ?tags=tag1,tag2
        let tagsArray = [];
        if (Array.isArray(tags)) {
            tagsArray = tags;
        } else if (typeof tags === 'string') {
            tagsArray = tags.includes(',') ? tags.split(',') : [tags];
        }

        // Nettoyage des tags (enlever espaces, convertir en minuscules)
        tagsArray = tagsArray.map(tag => tag.trim().toLowerCase()).filter(tag => tag.length > 0);

        if (tagsArray.length === 0) {
            return res.status(400).json({ message: 'At least one valid tag is required.' });
        }

        // Validation des limites
        const parsedLimit = Math.min(Math.max(parseInt(limit) || 10, 1), 50);
        const parsedSkip = Math.max(parseInt(skip) || 0, 0);

        // Recherche des posts avec au moins un des tags (recherche insensible à la casse)
        const posts = await Post.find({
            tags: { $in: tagsArray.map(tag => new RegExp(`^${tag}$`, 'i')) },
            isDeleted: false
        })
        .sort({ createdAt: -1 })
        .skip(parsedSkip)
        .limit(parsedLimit + 100) // On récupère plus pour filtrer par visibilité après
        .populate('tags', 'name');

        // Filtrage par visibilité
        const filteredPosts = await filterPostsByVisibility(posts, userId, userServiceUrl, authToken);
        
        // Application finale de la limite après filtrage
        const finalPosts = filteredPosts.slice(0, parsedLimit);

        // Compter le total pour la pagination
        const totalCount = await Post.countDocuments({
            tags: { $in: tagsArray.map(tag => new RegExp(`^${tag}$`, 'i')) },
            isDeleted: false
        });

        res.status(200).json({
            posts: finalPosts,
            pagination: {
                currentPage: Math.floor(parsedSkip / parsedLimit) + 1,
                totalPages: Math.ceil(totalCount / parsedLimit),
                totalResults: totalCount,
                limit: parsedLimit,
                skip: parsedSkip
            },
            searchCriteria: {
                tags: tagsArray
            }
        });

    } catch (error) {
        console.error('Error searching posts by tags:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

const deleteAllUserPosts = async (req, res) => {
    try {
        const userId = req.user.userId;

        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized: user not authenticated' });
        }

        // Delete all posts by the user
        await Post.deleteMany({ author: userId });

        res.status(200).json({ message: 'All user posts deleted successfully' });
    } catch (error) {
        console.error('Error deleting all user posts:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export {
    publishPost,
    getPosts,
    updatePost,
    deletePost,
    updatePostLikes,
    deleteAllUserPosts,
    searchPostsByTags
};

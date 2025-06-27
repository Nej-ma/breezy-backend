import { get } from "mongoose";
import Comment from "../models/Comment.js";
import axios from 'axios';
import Post from "../models/Post.js";

const publishComment = async (req, res) => {
    try {
        const { content, parentComment, mentions } = req.body;
        const post = req.params.postId;
        
        // Validate required fields
        if (!post || !content) {
            return res.status(400).json({ message: 'Post and content are required.' });
        }
        
        const userId = req.user.userId || req.user.id;
        if (!userId) {
            return res.status(400).json({ message: 'Author is required.' });
        }
        
        // Check if post exists
        const postExists = await Post.findById(post);
        if (!postExists) {
            return res.status(404).json({ message: 'Post not found.' });
        }
        
        const userServiceUrl = process.env.USER_SERVICE_URL || 'https://api.breezy.website/api/users';
        const authToken = req.headers.authorization;
       
        const headers = { 'Content-Type': 'application/json' };
        if (authToken) {
            headers['Authorization'] = authToken;
        }
       
        const { data: userData } = await axios.get(`${userServiceUrl}/id/${userId}`, {
            headers,
            timeout: 5000
        });
        
        // Check if user is suspended
        if (userData.isSuspended) {
            const suspendedUntil = userData.suspendedUntil ? new Date(userData.suspendedUntil) : null;
            if (!suspendedUntil || suspendedUntil > new Date()) {
                return res.status(403).json({ 
                    message: 'Vous êtes suspendu et ne pouvez pas publier de commentaires.',
                    suspended: true,
                    suspendedUntil: userData.suspendedUntil
                });
            }
        }
        
        // Create a new comment
        const newComment = new Comment({
            author: userId,
            authorUsername: userData.username,
            authorDisplayName: userData.displayName,
            authorProfilePicture: userData.profilePicture || '',
            authorRole: userData.role || 'user',
            post,
            content,
            parentComment: parentComment || null,
            mentions: mentions || []
        });
        
        // Save the comment to the database
        await newComment.save();
        
        if (parentComment) {
            await Comment.findByIdAndUpdate(
                parentComment,
                { $inc: { repliesCount: 1 } }
            );
        }
        
        await Post.findByIdAndUpdate(
            post,
            { $inc: { commentsCount: 1 } }
        );
        
        res.status(201).json({ message: 'Comment published successfully', comment: newComment });
    } catch (error) {
        console.error('Error publishing comment:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}

const getComment = async (req, res) => {
    try {
        const postId = req.params.postId;
        
        // Fetch comments for the post, excluding deleted comments
        const comments = await Comment.find({ post: postId, isDeleted: false })
            .sort({ createdAt: -1 });
        
        // Enrichir les commentaires avec les données utilisateur actualisées
        const userServiceUrl = process.env.USER_SERVICE_URL || 'https://api.breezy.website/api/users';
        const authToken = req.headers.authorization;
       
        const enrichedComments = await Promise.all(
            comments.map(async (comment) => {
                try {
                    const headers = { 'Content-Type': 'application/json' };
                    if (authToken) {
                        headers['Authorization'] = authToken;
                    }
                   
                    const { data: userData } = await axios.get(`${userServiceUrl}/id/${comment.author}`, {
                        headers,
                        timeout: 5000
                    });
                    
                    return {
                        ...comment.toObject(),
                        authorRole: userData.role || 'user',
                        authorDisplayName: userData.displayName || comment.authorDisplayName,
                        authorUsername: userData.username || comment.authorUsername,
                        authorProfilePicture: userData.profilePicture || comment.authorProfilePicture
                    };
                } catch (error) {
                    console.error(`Erreur lors de la récupération des données utilisateur pour ${comment.author}:`, error);
                    // Retourner le commentaire original en cas d'erreur
                    return comment.toObject();
                }
            })
        );
        
        res.status(200).json(enrichedComments);
    } catch (error) {
        console.error('Error fetching comments:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}

const updateComment = async (req, res) => {
    try {
        const commentId = req.params.id;
        const { content, mentions } = req.body;
        
        const comment = await Comment.findById(commentId);
        if (!comment) {
            return res.status(404).json({ message: 'Comment not found.' });
        }
        
        if (comment.author.toString() !== req.user.userId) {
            return res.status(403).json({ message: 'You are not authorized to update this comment.' });
        }
        
        if (!content) {
            return res.status(400).json({ message: 'Content is required.' });
        }
        
        const updateFields = {};
        if (content !== undefined) updateFields.content = content;
        if (mentions !== undefined) updateFields.mentions = mentions || [];
        
        // Find and update the comment
        const updatedComment = await Comment.findByIdAndUpdate(commentId, updateFields, { new: true });
        
        if (!updatedComment || updatedComment.isDeleted) {
            return res.status(404).json({ message: 'Comment not found.' });
        }
        
        res.status(200).json({ message: 'Comment updated successfully', comment: updatedComment });
    } catch (error) {
        console.error('Error updating comment:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}

const deleteComment = async (req, res) => {
    try {
        const commentId = req.params.id;
        const { reason } = req.body;
        
        const comment = await Comment.findById(commentId);
        if (!comment) {
            return res.status(404).json({ message: 'Comment not found.' });
        }
        
        // Check if user is authorized to delete
        const userRole = req.user.role;
        const isAuthor = comment.author.toString() === req.user.userId;
        const isModerator = userRole === 'moderator' || userRole === 'admin';
       
        if (!isAuthor && !isModerator) {
            return res.status(403).json({ message: 'You are not authorized to delete this comment.' });
        }
        
        // Prepare update fields
        const updateFields = {
            isDeleted: true,
            deletedAt: new Date()
        };
        
        // If it's a moderation action (not the author deleting their own comment)
        if (!isAuthor && isModerator) {
            updateFields.deletedBy = req.user.userId;
            updateFields.deletionReason = reason || 'Moderation action';
            updateFields.isModerationAction = true;
        }
        
        // Find and delete the comment
        const deletedComment = await Comment.findByIdAndUpdate(
            commentId,
            updateFields,
            { new: true }
        );
        
        if (!deletedComment) {
            return res.status(404).json({ message: 'Comment not found.' });
        }
        
        if (comment.parentComment) {
            await Comment.findByIdAndUpdate(
                comment.parentComment,
                { $inc: { repliesCount: -1 } }
            );
        }
        
        await Post.findByIdAndUpdate(
            comment.post,
            { $inc: { commentsCount: -1 } }
        );
        
        const actionType = updateFields.isModerationAction ? 'moderated' : 'deleted';
        res.status(200).json({
            message: `Comment ${actionType} successfully`,
            comment: deletedComment
        });
    } catch (error) {
        console.error('Error deleting comment:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}

const updateCommentLikes = async (req, res) => {
    try {
        const userId = req.user.id;
        const commentId = req.params.id; // Get comment id from params
        console.log('params:', commentId);
        
        if (!commentId) {
            return res.status(400).json({ message: 'comment ID is required.' });
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
                        message: 'Vous êtes suspendu et ne pouvez pas aimer les commentaires.',
                        suspended: true,
                        suspendedUntil: userData.suspendedUntil
                    });
                }
            }
        } catch (error) {
            console.error('Error fetching user:', error);
            return res.status(500).json({ message: 'Internal server error while checking user.', error: error.message });
        }
        
        const comment = await Comment.findById(commentId);
        if (!comment || comment.isDeleted) {
            return res.status(404).json({ message: 'Comment not found.' });
        }
        
        const userIndex = comment.likes.indexOf(userId);
        if (userIndex !== -1) {
            // User already liked, so remove the like
            comment.likes.splice(userIndex, 1);
        } else {
            // User has not liked, so add the like
            comment.likes.push(userId);
        }
        
        await comment.save();
        
        res.status(200).json({ message: 'Comment likes updated successfully', likes: comment.likes });
    } catch (error) {
        console.error('Error updating comment likes:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}

const deleteAllUserComments = async (req, res) => {
    try {
        const userId = req.user.userId;
        
        if (!userId) {
            return res.status(400).json({ message: 'User ID is required.' });
        }
        
        // Delete all comments by the user
        await Comment.deleteMany({ author: userId });
        
        res.status(200).json({ message: 'All user comments deleted successfully' });
    } catch (error) {
        console.error('Error deleting all user comments:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}

export default {
    publishComment,
    getComment,
    updateComment,
    deleteComment,
    updateCommentLikes,
    deleteAllUserComments
};
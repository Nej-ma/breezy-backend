import { get } from "mongoose";
import Comment from "../models/Comment.js";
import axios from 'axios';


const publishComment = async (req, res) => {
    try {
        const {content, parentComment, mentions } = req.body;
        const post = req.params.postId
        // Validate required fields
        if (!post || !content) {
            return res.status(400).json({ message: 'Author, post, and content are required.' });
        }

        const userId = req.user.userId;
        const userServiceUrl = process.env.USER_SERVICE_URL || 'http://localhost:8080/api/users';
        const { data: userData } = await axios.get(`${userServiceUrl}/id/${userId}`);

        // Create a new comment
        const newComment = new Comment({
            author: userId,
            authorUsername: userData.username,
            authorDisplayName: userData.displayName,
            authorProfilePicture: userData.profilePicture || '',
            post,
            content,
            parentComment: parentComment || null,
            mentions: mentions || []
        });

        // Save the comment to the database
        await newComment.save();

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

        res.status(200).json(comments);
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

        const comment = await Comment.findById(commentId);
        if (!comment) {
            return res.status(404).json({ message: 'Comment not found.' });
        }
        if (comment.author.toString() !== req.user.userId) {
            return res.status(403).json({ message: 'You are not authorized to delete this comment.' });
        }

        // Find and delete the comment
        const deletedComment = await Comment.findByIdAndUpdate(
            commentId,
            { isDeleted: true },
            { new: true }
        );

        if (!deletedComment) {
            return res.status(404).json({ message: 'Comment not found.' });
        }

        res.status(200).json({ message: 'Comment deleted successfully', comment: deletedComment });
    } catch (error) {
        console.error('Error deleting comment:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}

const updateCommentLikes = async (req, res) => {
    try {
        const userId = req.user.id;
        const commentId  = req.params.id; // Get comment id from params
        console.log('params:', commentId);
        if ( !commentId) {
            return res.status(400).json({ message: 'comment ID is required.' });
        }

        // Check if user exists
        try {
            const userServiceUrl = process.env.USER_SERVICE_URL || 'http://user-service:3002';
            const response = await axios.get(`${userServiceUrl}/id/${userId}`);
            
            if (response.status !== 200) {
                return res.status(404).json({ message: 'User not found.' });
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

export default {
    publishComment,
    getComment,
    updateComment,
    deleteComment,
    updateCommentLikes
};
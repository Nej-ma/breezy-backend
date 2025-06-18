import { get } from "mongoose";
import Comment from "../models/Comment.js";
import Like from "../models/Like.js";
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
        if (content !== undefined) updateFields.mentions = mentions || [];

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
        const commentId = req.params.id;
        const userId = req.user.userId; 
        const { action } = req.body; // action: 'like' or 'unlike'

        if (!userId || !action) {
            return res.status(400).json({ message: 'User ID and action are required.' });
        }

        const comment = await Comment.findById(commentId);
        if (!comment || comment.isDeleted) {
            return res.status(404).json({ message: 'Comment not found.' });
        }

        const existingLike = await Like.findOne({
            user: userId,
            targetType: 'Comment',
            targetId: commentId
        });

        if (action === 'like') {
            if (!existingLike) {
                await Like.create({
                    user: userId,
                    targetType: 'Comment',
                    targetId: commentId
                });
                comment.likesCount += 1;
                await comment.save();
            }
        } else if (action === 'unlike') {
            if (existingLike) {
                await Like.deleteOne({ _id: existingLike._id });
                comment.likesCount = Math.max(0, comment.likesCount - 1);
                await comment.save();
            }
        } else {
            return res.status(400).json({ message: 'Invalid action.' });
        }

        res.status(200).json({ message: 'Comment likes updated successfully', comment });
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
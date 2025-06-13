import { get } from "mongoose";
import Comment from "../models/Comment.js";

const publishComment = async (req, res) => {
    try {
        const { author, post, content, parentComment, mentions } = req.body;

        // Validate required fields
        if (!author || !post || !content) {
            return res.status(400).json({ message: 'Author, post, and content are required.' });
        }

        // Create a new comment
        const newComment = new Comment({
            author,
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
            .populate('author', 'username profilePicture')
            .populate('mentions', 'username profilePicture')
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

        if (!content) {
            return res.status(400).json({ message: 'Content is required.' });
        }

        const updateFields = {};
        if (content !== undefined) updateFields.content = content;
        if (content !== undefined) updateFields.mentions = mentions || [];
        

        // Find and update the comment
        const updatedComment = await Comment.findByIdAndUpdate(
            commentId,
        );

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
        const { userId, action } = req.body; // action can be 'like' or 'unlike'

        if (!userId || !action) {
            return res.status(400).json({ message: 'User ID and action are required.' });
        }

        const comment = await Comment.findById(commentId);
        if (!comment || comment.isDeleted) {
            return res.status(404).json({ message: 'Comment not found.' });
        }

        if (action === 'like') {
            comment.likesCount += 1;
        } else if (action === 'unlike') {
            comment.likesCount = Math.max(0, comment.likesCount - 1);
        } else {
            return res.status(400).json({ message: 'Invalid action.' });
        }

        await comment.save();

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
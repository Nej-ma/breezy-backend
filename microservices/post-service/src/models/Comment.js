import mongoose from 'mongoose';

const commentSchema = new mongoose.Schema({
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
    authorUsername: {
    type: String,
    required: true
  },
  authorDisplayName: {
    type: String,
    required: true
  },
  authorProfilePicture: {
    type: String,
    default: ''
  },
  authorRole: {
    type: String,
    enum: ['user', 'moderator', 'admin'],
    default: 'user'
  },
  post: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post',
    required: true
  },
  parentComment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment',
    default: null
  },
  content: {
    type: String,
    required: true,
    maxLength: 280
  },
  mentions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  repliesCount: {
    type: Number,
    default: 0
  },
  isReported: {
    type: Boolean,
    default: false
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  // Champs de modération
  deletedBy: {
    type: String, // userId de celui qui a supprimé
    default: null
  },
  deletionReason: {
    type: String,
    default: null
  },
  isModerationAction: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Index for better performance
commentSchema.index({ post: 1, createdAt: -1 });
commentSchema.index({ parentComment: 1 });

const Comment = mongoose.model('Comment', commentSchema);

export default Comment;

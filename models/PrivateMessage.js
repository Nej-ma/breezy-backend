const mongoose = require('mongoose');

const privateMessageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true,
    maxLength: 1000
  },
  images: [{
    type: String
  }],
  isRead: {
    type: Boolean,
    default: false
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  conversation: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});

// Create conversation ID from user IDs
privateMessageSchema.pre('save', function(next) {
  if (!this.conversation) {
    const ids = [this.sender.toString(), this.recipient.toString()].sort();
    this.conversation = ids.join('_');
  }
  next();
});

// Index for efficient queries
privateMessageSchema.index({ conversation: 1, createdAt: -1 });
privateMessageSchema.index({ recipient: 1, isRead: 1 });

module.exports = mongoose.model('PrivateMessage', privateMessageSchema);

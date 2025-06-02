const mongoose = require('mongoose');

const tagSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    maxLength: 50
  },
  displayName: {
    type: String,
    required: true,
    trim: true,
    maxLength: 50
  },
  postsCount: {
    type: Number,
    default: 0
  },
  trending: {
    type: Boolean,
    default: false
  },
  category: {
    type: String,
    default: 'general'
  }
}, {
  timestamps: true
});

// Index for search performance
tagSchema.index({ name: 'text', displayName: 'text' });

module.exports = mongoose.model('Tag', tagSchema);

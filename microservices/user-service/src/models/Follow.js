import mongoose from 'mongoose';

const followSchema = new mongoose.Schema({
  follower: {
    type: String, 
    required: true
  },
  following: {
    type: String, 
    required: true
  },
}, {
  timestamps: true
});

// Ensure a user can't follow the same person twice
followSchema.index({ follower: 1, following: 1 }, { unique: true });

// Optimize queries for getting followers (ordered by creation date)
followSchema.index({ following: 1, createdAt: -1 });

// Optimize queries for getting following (ordered by creation date)  
followSchema.index({ follower: 1, createdAt: -1 });

// Single field indexes for counting
followSchema.index({ follower: 1 });
followSchema.index({ following: 1 });

// Prevent self-following 
followSchema.pre('save', function(next) {
  if (this.follower === this.following) {
    throw new Error('Users cannot follow themselves');
  }
  next();
});

const Follow = mongoose.model('Follow', followSchema);

export default Follow;
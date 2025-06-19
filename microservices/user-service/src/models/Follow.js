import mongoose from 'mongoose';

const followSchema = new mongoose.Schema({
  follower: {
    type: String, // Changé de ObjectId vers String
    required: true
  },
  following: {
    type: String, // Changé de ObjectId vers String
    required: true
  },
}, {
  timestamps: true
});

// Ensure a user can't follow the same person twice
followSchema.index({ follower: 1, following: 1 }, { unique: true });

// Prevent self-following 
followSchema.pre('save', function(next) {
  if (this.follower === this.following) {
    throw new Error('Users cannot follow themselves');
  }
  next();
});

const Follow = mongoose.model('Follow', followSchema);

export default Follow;
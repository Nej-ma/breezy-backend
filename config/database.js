const mongoose = require('mongoose');

// MongoDB connection setup
mongoose.set('strictQuery', false);

const connectDB = async () => {
  try {
    const mongoDB = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/breezy_database';
    await mongoose.connect(mongoDB);
    console.log('Connected to MongoDB successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Connection event listeners
mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected');
});

mongoose.connection.on('error', (error) => {
  console.error('MongoDB connection error:', error);
});

module.exports = connectDB;

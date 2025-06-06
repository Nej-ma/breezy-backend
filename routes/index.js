import express from 'express';
import User from '../models/User.js';

const router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express with MongoDB' });
});

/* GET test MongoDB connection */
router.get('/test-db', async function(req, res, next) {
  try {
    // Test creating a user with all required fields
    const testUser = new User({
      username: 'testuser123',
      email: 'test@example.com',
      password: 'testpassword123',
      displayName: 'Test User'
    });
    
    await testUser.save();
    
    // Fetch all users
    const users = await User.find({});
    
    res.json({
      message: 'MongoDB connection successful!',
      users: users
    });
  } catch (error) {
    res.status(500).json({
      message: 'Database error',
      error: error.message
    });
  }
});

export default router;
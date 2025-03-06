import express from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = express.Router();

// Show login form
router.get('/', asyncHandler(async (req, res) => {
  // If already logged in, redirect to dashboard
  if (req.session.user) {
    return res.redirect('/');
  }
  
  res.render('pages/login', {
    error: req.session.error,
    success: req.session.success
  });
  
  delete req.session.error;
  delete req.session.success;
}));

// Process login
router.post('/', asyncHandler(async (req, res) => {
  const { username, password } = req.body;
  
  // Simple demo login - accept any credentials
  req.session.user = {
    id: '999',
    username: username || 'guest',
    profileImage: 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y'
  };
  
  req.session.success = 'Logged in successfully!';
  res.redirect('/');
}));

export default router;
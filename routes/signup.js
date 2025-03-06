import express from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = express.Router();

// Show signup form
router.get('/', asyncHandler(async (req, res) => {
  // If already logged in, redirect to dashboard
  if (req.session.user) {
    return res.redirect('/');
  }
  
  res.render('pages/signup', {
    error: req.session.error,
    success: req.session.success
  });
  
  delete req.session.error;
  delete req.session.success;
}));

// Process signup
router.post('/', asyncHandler(async (req, res) => {
  const { username, email, password } = req.body;
  
  // Simple demo signup - accept any credentials
  req.session.user = {
    id: '999',
    username: username || 'guest',
    email: email || 'guest@example.com',
    profileImage: 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y'
  };
  
  req.session.success = 'Account created successfully!';
  res.redirect('/');
}));

export default router;
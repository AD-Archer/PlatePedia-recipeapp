import express from 'express';
import { body, validationResult } from 'express-validator';
import { User, Recipe } from '../models/TableCreation.js';
import { isAuthenticated } from '../middleware/authMiddleware.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { Op } from 'sequelize';
import { getUserData } from '../utils/dataSync.js';
import { getRandomRecipes } from '../utils/jsonDataService.js';

const router = express.Router();

// Profile route - redirect to login if not authenticated
router.get('/', asyncHandler(async (req, res) => {
  if (!req.session?.user) {
    req.session.error = 'Please log in to view your profile';
    return res.redirect('/login');
  }
  
  // Get some random recipes to display as user's recipes
  const recipes = await getRandomRecipes(6);
  
  // Format recipes to match expected structure
  const formattedRecipes = recipes.map(recipe => ({
    id: recipe.id,
    title: recipe.title,
    description: `${recipe.title} - A delicious ${recipe.category} recipe from ${recipe.area} cuisine.`,
    imageUrl: recipe.thumbnail,
    author: { username: 'themealdb', id: '1' }
  }));

  res.render('pages/users/profile', {
    profileUser: req.session.user,
    recipes: formattedRecipes,
    isFollowing: false,
    followerCount: 0,
    followingCount: 0,
    user: req.session.user,
    error: req.session.error,
    success: req.session.success
  });
  
  delete req.session.error;
  delete req.session.success;
}));

// Show edit profile form
router.get('/edit', asyncHandler(async (req, res) => {
  if (!req.session?.user) {
    req.session.error = 'Please log in to edit your profile';
    return res.redirect('/login');
  }
  
  res.render('pages/profile/edit', {
    user: req.session.user,
    path: '/profile/edit',
    error: req.session.error,
    success: req.session.success
  });
  
  delete req.session.error;
  delete req.session.success;
}));

// Update profile
router.post('/edit', asyncHandler(async (req, res) => {
  if (!req.session?.user) {
    req.session.error = 'Please log in to edit your profile';
    return res.redirect('/login');
  }
  
  const { username, email, bio, profileImage } = req.body;
  
  // Update session data
  req.session.user = {
    ...req.session.user,
    username: username || req.session.user.username,
    email: email || req.session.user.email,
    bio: bio || req.session.user.bio,
    profileImage: profileImage || req.session.user.profileImage
  };
  
  req.session.success = 'Profile updated successfully';
  res.redirect('/profile');
}));

export default router; 
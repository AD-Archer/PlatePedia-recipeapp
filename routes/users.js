import express from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { getRandomRecipes } from '../utils/jsonDataService.js';

const router = express.Router();

// List users (simplified to just return a placeholder)
router.get('/', asyncHandler(async (req, res) => {
  try {
    // Create some placeholder users
    const users = [
      { 
        id: '1', 
        username: 'themealdb', 
        profileImage: 'https://www.themealdb.com/images/logo-small.png',
        bio: 'The official MealDB account with thousands of recipes from around the world.'
      }
    ];

    // Get some random recipes to display
    const recipes = await getRandomRecipes(3);
    
    // Format recipes to match expected structure
    const formattedRecipes = recipes.map(recipe => ({
      id: recipe.id,
      title: recipe.title,
      description: `${recipe.title} - A delicious ${recipe.category} recipe from ${recipe.area} cuisine.`,
      imageUrl: recipe.thumbnail,
      author: { username: 'themealdb', id: '1' }
    }));

    res.render('pages/users/index', {
      users,
      popularRecipes: formattedRecipes,
      error: req.session?.error,
      success: req.session?.success
    });
    
    if (req.session) {
      delete req.session.error;
      delete req.session.success;
    }
  } catch (error) {
    console.error('Error loading users:', error);
    res.status(500).send('Error loading users');
  }
}));

// View user profile
router.get('/:id', asyncHandler(async (req, res) => {
  try {
    // Only support the themealdb user
    if (req.params.id !== '1') {
      if (req.session) req.session.error = 'User not found';
      return res.redirect('/users');
    }
    
    const user = { 
      id: '1', 
      username: 'themealdb', 
      profileImage: 'https://www.themealdb.com/images/logo-small.png',
      bio: 'The official MealDB account with thousands of recipes from around the world.'
    };
    
    // Get some random recipes to display as user's recipes
    const recipes = await getRandomRecipes(6);
    
    // Format recipes to match expected structure
    const formattedRecipes = recipes.map(recipe => ({
      id: recipe.id,
      title: recipe.title,
      description: `${recipe.title} - A delicious ${recipe.category} recipe from ${recipe.area} cuisine.`,
      imageUrl: recipe.thumbnail,
      userId: '1',
      author: { username: 'themealdb', id: '1' }
    }));

    res.render('pages/users/profile', {
      profileUser: user,
      recipes: formattedRecipes,
      isFollowing: false,
      followerCount: 0,
      followingCount: 0,
      user: req.session?.user,
      error: req.session?.error,
      success: req.session?.success
    });
    
    if (req.session) {
      delete req.session.error;
      delete req.session.success;
    }
  } catch (error) {
    console.error('Error loading user profile:', error);
    if (req.session) req.session.error = 'Error loading user profile';
    res.redirect('/users');
  }
}));

export default router; 
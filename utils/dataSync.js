// This is the file that is used to get the data from the JSON file

import { getRandomRecipes } from './jsonDataService.js';

// Simple in-memory cache
const cache = {
  data: {},
  timestamp: {},
  dashboard: {
    popularRecipes: [],
    recentRecipes: [],
    categories: [],
    lastSync: null
  },
  recipes: {
    allRecipes: [],
    savedRecipes: new Map(),
    userRecipes: new Map(),
    lastSync: null
  },
  users: {
    popularUsers: [],
    userProfiles: new Map(),
    lastSync: null
  },
  categories: {
    grouped: {},
    all: [],
    lastSync: null
  }
};

/**
 * Get cached data or fetch new data
 * @param {string} key - Cache key
 * @param {Function} fetchFn - Function to fetch data if not cached
 * @param {number} ttl - Time to live in milliseconds
 * @returns {Promise<any>} - Cached or fresh data
 */
export const getCachedData = async (key, fetchFn, ttl = 5 * 60 * 1000) => {
  const now = Date.now();
  
  // If data is cached and not expired, return it
  if (cache.data[key] && cache.timestamp[key] && (now - cache.timestamp[key] < ttl)) {
    return cache.data[key];
  }
  
  // Otherwise fetch fresh data
  try {
    const data = await fetchFn();
    cache.data[key] = data;
    cache.timestamp[key] = now;
    return data;
  } catch (error) {
    console.error(`Error fetching data for key ${key}:`, error);
    // Return empty data if fetch fails
    return [];
  }
};

/**
 * Clear cache for a specific key or all keys
 * @param {string} key - Cache key to clear (optional)
 */
export const clearCache = (key) => {
  if (key) {
    delete cache.data[key];
    delete cache.timestamp[key];
  } else {
    cache.data = {};
    cache.timestamp = {};
  }
};

/**
 * Get user's saved recipes (simplified version that doesn't use the database)
 * @param {string} userId - User ID
 * @returns {Promise<Array>} - Array of saved recipes
 */
export const getUserSavedRecipes = async (userId) => {
  // Get some random recipes to simulate saved recipes
  const recipes = await getRandomRecipes(8);
  
  // Format recipes to match expected structure
  return recipes.map(recipe => ({
    id: recipe.id,
    title: recipe.title,
    description: `${recipe.title} - A delicious ${recipe.category} recipe from ${recipe.area} cuisine.`,
    imageUrl: recipe.thumbnail,
    author: { username: 'themealdb', id: '1' },
    isSaved: true
  }));
};

/**
 * Get user data (simplified version that doesn't use the database)
 * @param {string} userId - User ID
 * @returns {Promise<Object>} - User data
 */
export const getUserData = async (userId) => {
  // Return the user from the session or a default user
  return {
    id: userId,
    username: 'user_' + userId,
    email: `user${userId}@example.com`,
    profileImage: 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y',
    bio: 'This is a demo user account.',
    createdAt: new Date()
  };
}; 
// This is the file that is used to get the data from the JSON file

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataFilePath = path.join(__dirname, '..', 'data', 'mealdb_recipes.json');

// Cache the data in memory to avoid reading from disk on every request
let recipesCache = null;
let lastCacheTime = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Loads recipe data from the JSON file
 * @returns {Promise<Object>} The recipe data
 */
async function loadRecipeData() {
  try {
    // Return cached data if it's still fresh
    if (recipesCache && lastCacheTime && (Date.now() - lastCacheTime < CACHE_DURATION)) {
      return recipesCache;
    }
    
    // Read and parse the JSON file
    const data = await fs.readFile(dataFilePath, 'utf8');
    recipesCache = JSON.parse(data);
    lastCacheTime = Date.now();
    
    return recipesCache;
  } catch (error) {
    console.error('Error loading recipe data:', error);
    // Return empty data structure if file can't be read
    return { recipes: [], total: 0, generated_at: new Date().toISOString() };
  }
}

/**
 * Gets all recipes
 * @returns {Promise<Array>} Array of recipes
 */
export async function getAllRecipes() {
  const data = await loadRecipeData();
  return data.recipes || [];
}

/**
 * Gets a recipe by ID
 * @param {string} id - The recipe ID
 * @returns {Promise<Object|null>} The recipe or null if not found
 */
export async function getRecipeById(id) {
  const data = await loadRecipeData();
  return data.recipes.find(recipe => recipe.id === id) || null;
}

/**
 * Searches recipes by title, ingredients, or category
 * @param {string} query - The search query
 * @returns {Promise<Array>} Array of matching recipes
 */
export async function searchRecipes(query) {
  if (!query) return getAllRecipes();
  
  const data = await loadRecipeData();
  const lowerQuery = query.toLowerCase();
  
  return data.recipes.filter(recipe => {
    // Search in title
    if (recipe.title.toLowerCase().includes(lowerQuery)) return true;
    
    // Search in ingredients
    if (recipe.ingredients.some(ing => 
      ing.ingredient.toLowerCase().includes(lowerQuery))) return true;
    
    // Search in category
    if (recipe.category.toLowerCase().includes(lowerQuery)) return true;
    
    // Search in area (cuisine)
    if (recipe.area.toLowerCase().includes(lowerQuery)) return true;
    
    return false;
  });
}

/**
 * Gets recipes by category
 * @param {string} category - The category name
 * @returns {Promise<Array>} Array of matching recipes
 */
export async function getRecipesByCategory(category) {
  const data = await loadRecipeData();
  return data.recipes.filter(recipe => recipe.category === category);
}

/**
 * Gets recipes by area (cuisine)
 * @param {string} area - The area/cuisine name
 * @returns {Promise<Array>} Array of matching recipes
 */
export async function getRecipesByArea(area) {
  const data = await loadRecipeData();
  return data.recipes.filter(recipe => recipe.area === area);
}

/**
 * Gets all unique categories
 * @returns {Promise<Array>} Array of category objects
 */
export async function getAllCategories() {
  const data = await loadRecipeData();
  const categories = new Map();
  
  // Define cuisine default images
  const cuisineDefaultImages = {
    'american': 'https://images.unsplash.com/photo-1551782450-a2132b4ba21d', // burger
    'british': 'https://images.unsplash.com/photo-1577906096429-f73c2c312435', // fish and chips
    'chinese': 'https://images.unsplash.com/photo-1585032226651-759b368d7246', // dimsum
    'french': 'https://images.unsplash.com/photo-1608855238293-a8853e7f7c98', // french food
    'indian': 'https://images.unsplash.com/photo-1585937421612-70a008356fbe', // indian curry
    'italian': 'https://images.unsplash.com/photo-1598866594230-a7c12756260f', // pasta
    'japanese': 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351', // sushi
    'mexican': 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47', // tacos
    'default': 'https://images.unsplash.com/photo-1504674900247-0877df9cc836'
  };
  
  // Extract unique categories
  data.recipes.forEach(recipe => {
    if (!categories.has(recipe.category)) {
      categories.set(recipe.category, {
        id: recipe.category.toLowerCase().replace(/\s+/g, '-'),
        name: recipe.category,
        type: 'meal',
        recipeCount: 1,
        imageUrl: cuisineDefaultImages[recipe.category.toLowerCase()] || cuisineDefaultImages.default,
        // Add getDefaultImage method
        getDefaultImage: function() {
          return cuisineDefaultImages[this.name.toLowerCase()] || cuisineDefaultImages.default;
        }
      });
    } else {
      const category = categories.get(recipe.category);
      category.recipeCount++;
    }
    
    // Also add area as cuisine category
    if (recipe.area && !categories.has(recipe.area)) {
      categories.set(recipe.area, {
        id: recipe.area.toLowerCase().replace(/\s+/g, '-'),
        name: recipe.area,
        type: 'cuisine',
        recipeCount: 1,
        imageUrl: cuisineDefaultImages[recipe.area.toLowerCase()] || cuisineDefaultImages.default,
        // Add getDefaultImage method
        getDefaultImage: function() {
          return cuisineDefaultImages[this.name.toLowerCase()] || cuisineDefaultImages.default;
        }
      });
    } else if (recipe.area) {
      const area = categories.get(recipe.area);
      area.recipeCount++;
    }
  });
  
  return Array.from(categories.values());
}

/**
 * Gets random recipes
 * @param {number} count - Number of recipes to return
 * @returns {Promise<Array>} Array of random recipes
 */
export async function getRandomRecipes(count = 6) {
  const data = await loadRecipeData();
  const recipes = [...data.recipes];
  
  // Shuffle array
  for (let i = recipes.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [recipes[i], recipes[j]] = [recipes[j], recipes[i]];
  }
  
  return recipes.slice(0, count);
}

/**
 * Gets recent recipes (just returns the first few since we can't add new ones)
 * @param {number} count - Number of recipes to return
 * @returns {Promise<Array>} Array of recent recipes
 */
export async function getRecentRecipes(count = 6) {
  const data = await loadRecipeData();
  return data.recipes.slice(0, count);
} 
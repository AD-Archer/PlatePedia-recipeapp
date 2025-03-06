// This file is used to save recipes to the user's table 

import { SavedRecipe } from '../models/TableCreation.js';

/**
 * Add saved status to recipes
 * @param {Array} recipes - Array of recipes
 * @param {Array} savedRecipeIds - Array of saved recipe IDs
 * @returns {Array} - Recipes with saved status
 */
export const addSavedStatus = (recipes, savedRecipeIds = []) => {
  if (!recipes || !Array.isArray(recipes)) return [];
  
  return recipes.map(recipe => ({
    ...recipe,
    isSaved: savedRecipeIds.includes(recipe.id)
  }));
}; 
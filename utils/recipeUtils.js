// This file is used to save recipes to the user's table 

import { SavedRecipe } from '../models/TableCreation.js';

export async function addSavedStatus(userId, recipeId) {
    if (!userId) {
        throw new Error('User ID is required to save a recipe');
    }
    // Your logic to save the recipe
} 
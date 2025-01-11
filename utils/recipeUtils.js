// This file is used to save recipes to the user's table 

import { SavedRecipe } from '../models/TableCreation.js';

export const addSavedStatus = async (recipes, userId) => {
    if (!userId || !recipes || recipes.length === 0) {
        return recipes;
    }

    // Get all saved recipes for this user
    const savedRecipes = await SavedRecipe.findAll({
        where: {
            user_id: userId,
            recipe_id: recipes.map(recipe => recipe.id)
        }
    });

    // Create a Set of saved recipe IDs for faster lookup
    const savedRecipeIds = new Set(savedRecipes.map(sr => sr.recipe_id));

    // Add isSaved property to each recipe
    return recipes.map(recipe => {
        // If recipe is already a plain object, just add isSaved
        if (!recipe.get) {
            return {
                ...recipe,
                isSaved: savedRecipeIds.has(recipe.id)
            };
        }
        
        // If recipe is a Sequelize instance, convert to plain object first
        const plainRecipe = recipe.get({ plain: true });
        return {
            ...plainRecipe,
            isSaved: savedRecipeIds.has(plainRecipe.id)
        };
    });
}; 
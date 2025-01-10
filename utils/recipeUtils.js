import { SavedRecipe } from '../models/TableCreation.js';

export async function addSavedStatus(recipes, userId) {
    try {
        // Get all saved recipe IDs for this user
        const savedRecipes = await SavedRecipe.findAll({
            where: { 
                user_id: userId 
            },
            attributes: ['recipe_id']
        });

        const savedRecipeIds = savedRecipes.map(sr => sr.recipe_id);

        // Add isSaved property to each recipe
        if (Array.isArray(recipes)) {
            return recipes.map(recipe => ({
                ...recipe,
                isSaved: savedRecipeIds.includes(recipe.id)
            }));
        } else {
            return {
                ...recipes,
                isSaved: savedRecipeIds.includes(recipes.id)
            };
        }
    } catch (error) {
        console.error('Error adding saved status:', error);
        return recipes; // Return original recipes if there's an error
    }
} 
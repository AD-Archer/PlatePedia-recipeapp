import { SavedRecipe } from '../models/TableCreation.js';

export async function addSavedStatus(recipes, user) {
    // If no user or no recipes, return recipes as is
    if (!user || !recipes || !Array.isArray(recipes)) {
        return recipes;
    }

    try {
        const savedRecipes = await SavedRecipe.findAll({
            where: {
                user_id: user.id,
                recipe_id: recipes.map(recipe => recipe.id)
            }
        });

        const savedRecipeIds = new Set(savedRecipes.map(sr => sr.recipe_id));
        
        return recipes.map(recipe => ({
            ...recipe,
            isSaved: savedRecipeIds.has(recipe.id)
        }));
    } catch (error) {
        console.error('Error adding saved status:', error);
        return recipes; // Return original recipes if there's an error
    }
} 
import { SavedRecipe } from '../models/TableCreation.js';

export const addSavedStatus = async (recipes, userId) => {
    if (!recipes || !userId) {
        return recipes;
    }

    try {
        // Convert recipes to plain objects if they're Sequelize instances
        const plainRecipes = recipes.map(recipe => 
            recipe.toJSON ? recipe.toJSON() : recipe
        );

        // Get all saved recipe IDs for this user
        const savedRecipes = await SavedRecipe.findAll({
            where: { userId },
            attributes: ['recipeId']
        });

        const savedRecipeIds = new Set(savedRecipes.map(sr => sr.recipeId));

        // Add isSaved property to each recipe
        return plainRecipes.map(recipe => ({
            ...recipe,
            isSaved: savedRecipeIds.has(recipe.id)
        }));
    } catch (error) {
        console.error('Error adding saved status:', error);
        return recipes;
    }
}; 
import { SavedRecipe } from '../models/TableCreation.js';

export const addSavedStatus = async (recipes, userId) => {
    if (!userId) return recipes;

    const savedRecipes = await SavedRecipe.findAll({
        where: { userId },
        attributes: ['recipeId']
    });

    const savedRecipeIds = new Set(savedRecipes.map(sr => sr.recipeId));

    return recipes.map(recipe => ({
        ...recipe.toJSON(),
        isSaved: savedRecipeIds.has(recipe.id)
    }));
}; 
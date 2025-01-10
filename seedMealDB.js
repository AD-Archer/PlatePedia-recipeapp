// This is untested and may never end

/*

import fetch from 'node-fetch';
import { Recipe, User, Category, RecipeCategory } from './models/TableCreation.js';
import sequelize from './config/db.js';
import { fileURLToPath } from 'url';

// Helper to fetch meals based on a given URL and page number
async function fetchMealsPage(page = 1) {
    try {
        const response = await fetch(`https://www.themealdb.com/api/json/v1/1/search.php?s=&page=${page}`);
        const data = await response.json();
        return data.meals || [];
    } catch (error) {
        console.error(`Error fetching meals on page ${page}:`, error);
        return [];
    }
}

// Function to fetch all meals across pages
async function fetchAllMeals() {
    let meals = [];
    let page = 1;
    let hasMoreMeals = true;

    while (hasMoreMeals) {
        console.log(`Fetching page ${page}...`);
        const mealsOnPage = await fetchMealsPage(page);
        if (mealsOnPage.length > 0) {
            meals = meals.concat(mealsOnPage);
            page++;
        } else {
            hasMoreMeals = false;
        }
    }
    return meals;
}

async function seedMealDB() {
    try {
        // Create a system user for MealDB recipes if it doesn't exist
        const [systemUser] = await User.findOrCreate({
            where: { username: 'themealdb' },
            defaults: {
                email: 'api@themealdb.com',
                password: 'randompassword123',
                bio: 'Official TheMealDB recipes collection',
                profileImage: 'https://www.themealdb.com/images/logo-small.png'
            }
        });

        console.log('Fetching all meals...');
        const meals = await fetchAllMeals();
        let totalRecipes = 0;

        for (const meal of meals) {
            // Format ingredients and measurements into a list
            const ingredients = [];
            for (let i = 1; i <= 20; i++) {
                const ingredient = meal[`strIngredient${i}`];
                const measure = meal[`strMeasure${i}`];
                if (ingredient && ingredient.trim()) {
                    ingredients.push(`${measure ? measure.trim() + ' ' : ''}${ingredient.trim()}`);
                }
            }

            // Estimate cooking time from instructions length
            const instructionsLength = meal.strInstructions?.length || 0;
            const estimatedTime = Math.max(30, Math.min(180, Math.floor(instructionsLength / 50)));

            // Estimate calories (random between 200-800 for demo)
            const estimatedCalories = Math.floor(Math.random() * (800 - 200) + 200);

            // Create or update recipe
            const [recipe, created] = await Recipe.findOrCreate({
                where: { title: meal.strMeal },
                defaults: {
                    userId: systemUser.id,
                    description: `${meal.strMeal} - A delicious ${meal.strCategory} recipe from ${meal.strArea} cuisine.`,
                    ingredients: ingredients.join('\n'),
                    instructions: meal.strInstructions,
                    imageUrl: meal.strMealThumb,
                    cookingTime: estimatedTime,
                    servings: 4,
                    difficulty: instructionsLength > 1000 ? 'hard' : instructionsLength > 500 ? 'medium' : 'easy',
                    calories: estimatedCalories,
                    youtubeLink: meal.strYoutube // Add YouTube link
                }
            });

            // Handle categories
            if (meal.strCategory) {
                const [category] = await Category.findOrCreate({
                    where: { name: meal.strCategory },
                    defaults: {
                        type: 'meal',
                        imageUrl: `https://www.themealdb.com/images/category/${meal.strCategory.toLowerCase()}.png`
                    }
                });

                // Link recipe to category
                await RecipeCategory.findOrCreate({
                    where: {
                        recipeId: recipe.id,
                        categoryId: category.id
                    }
                });
            }

            // Add area as a category if it exists
            if (meal.strArea) {
                const [areaCategory] = await Category.findOrCreate({
                    where: { name: meal.strArea },
                    defaults: {
                        type: 'cuisine',
                        imageUrl: `https://www.themealdb.com/images/category/miscellaneous.png`
                    }
                });

                await RecipeCategory.findOrCreate({
                    where: {
                        recipeId: recipe.id,
                        categoryId: areaCategory.id
                    }
                });
            }

            totalRecipes++;
            console.log(`${created ? 'Created' : 'Updated'} recipe: ${recipe.title}`);
        }

        console.log(`MealDB seed completed successfully. Total recipes: ${totalRecipes}`);
    } catch (error) {
        console.error('Error seeding MealDB data:', error);
        throw error;
    }
}

// Run the seeder if this file is executed directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
    try {
        await sequelize.authenticate();
        console.log('Database connection established');
        await seedMealDB();
        console.log('Seeding completed');
        process.exit(0);
    } catch (error) {
        console.error('Seeding failed:', error);
        process.exit(1);
    }
}

export default seedMealDB;
*/



// expected outcome "MealDB seed completed successfully. Total recipes: 301" message.
import fetch from 'node-fetch';
import { Recipe, User, Category, RecipeCategory } from './models/TableCreation.js';
import sequelize from './config/db.js';
import { fileURLToPath } from 'url';

// Helper to fetch meals by the first letter
async function fetchMealsByLetter(letter) {
    try {
        const response = await fetch(`https://www.themealdb.com/api/json/v1/1/search.php?f=${letter}`);
        const data = await response.json();
        return data.meals || [];
    } catch (error) {
        console.error(`Error fetching meals starting with ${letter}:`, error);
        return [];
    }
}

// Function to fetch meals for all letters of the alphabet
async function fetchAllMeals() {
    const meals = [];
    const alphabet = 'abcdefghijklmnopqrstuvwxyz'.split('');

    for (const letter of alphabet) {
        console.log(`Fetching meals starting with letter: ${letter}`);
        const mealsOnLetter = await fetchMealsByLetter(letter);
        meals.push(...mealsOnLetter);
        console.log(`Found ${mealsOnLetter.length} meals starting with ${letter}`);
    }

    // Limit to 1000 recipes (if needed)
    return meals.slice(0, 1000);
}

async function seedMealDB() {
    try {
        // Create a system user for MealDB recipes if it doesn't exist
        const [systemUser] = await User.findOrCreate({
            where: { username: 'themealdb' },
            defaults: {
                id: '1',
                email: 'api@themealdb.com',
                password: 'randompassword123',
                bio: 'Official TheMealDB recipes collection',
                profileImage: 'https://www.themealdb.com/images/logo-small.png'
            }
        });

        console.log('Fetching all meals...');
        const meals = await fetchAllMeals();
        let totalRecipes = 0;

        for (const meal of meals) {
            // Check if the recipe already exists to avoid duplicates
            const existingRecipe = await Recipe.findOne({
                where: { title: meal.strMeal }
            });

            if (existingRecipe) {
                console.log(`Skipping duplicate recipe: ${meal.strMeal}`);
                continue; // Skip this meal as it already exists in the database
            }

            // Format ingredients and measurements into a list
            const ingredients = [];
            for (let i = 1; i <= 20; i++) {
                const ingredient = meal[`strIngredient${i}`];
                const measure = meal[`strMeasure${i}`];
                if (ingredient && ingredient.trim()) {
                    ingredients.push(`${measure ? measure.trim() + ' ' : ''}${ingredient.trim()}`);
                }
            }

            // Estimate cooking time from instructions length
            const instructionsLength = meal.strInstructions?.length || 0;
            const estimatedTime = Math.max(30, Math.min(180, Math.floor(instructionsLength / 50)));

            // Estimate calories (random between 200-800 for demo)
            const estimatedCalories = Math.floor(Math.random() * (800 - 200) + 200);

            // Create or update recipe
    const [recipe, created] = await Recipe.findOrCreate({
        where: { title: meal.strMeal },
        defaults: {
            userId: systemUser.id,
            description: `${meal.strMeal} - A delicious ${meal.strCategory} recipe from ${meal.strArea} cuisine.`,
            ingredients: ingredients.join('\n'),
            instructions: meal.strInstructions,
            imageUrl: meal.strMealThumb,
            cookingTime: estimatedTime,
            servings: 4,
            difficulty: instructionsLength > 1000 ? 'hard' : instructionsLength > 500 ? 'medium' : 'easy',
            calories: estimatedCalories,
            youtubeLink: meal.strYoutube && meal.strYoutube.trim() ? meal.strYoutube : null // Ensure youtubeLink is null if empty
        }
    });


            // Handle categories
            if (meal.strCategory) {
                const [category] = await Category.findOrCreate({
                    where: { name: meal.strCategory },
                    defaults: {
                        type: 'meal',
                        imageUrl: `https://www.themealdb.com/images/category/${meal.strCategory.toLowerCase()}.png`
                    }
                });

                // Link recipe to category
                await RecipeCategory.findOrCreate({
                    where: {
                        recipeId: recipe.id,
                        categoryId: category.id
                    }
                });
            }

            // Add area as a category if it exists
            if (meal.strArea) {
                const [areaCategory] = await Category.findOrCreate({
                    where: { name: meal.strArea },
                    defaults: {
                        type: 'cuisine',
                        imageUrl: `https://www.themealdb.com/images/category/miscellaneous.png`
                    }
                });

                await RecipeCategory.findOrCreate({
                    where: {
                        recipeId: recipe.id,
                        categoryId: areaCategory.id
                    }
                });
            }

            totalRecipes++;
            console.log(`${created ? 'Created' : 'Updated'} recipe: ${recipe.title}`);
        }

        console.log(`MealDB seed completed successfully. Total recipes: ${totalRecipes}`);
    } catch (error) {
        console.error('Error seeding MealDB data:', error);
        throw error;
    }
}

// Run the seeder if this file is executed directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
    try {
        await sequelize.authenticate();
        console.log('Database connection established');
        await seedMealDB();
        console.log('Seeding completed');
        process.exit(0);
    } catch (error) {
        console.error('Seeding failed:', error);
        process.exit(1);
    }
}

export default seedMealDB;

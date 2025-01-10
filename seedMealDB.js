import fetch from 'node-fetch';
import { Recipe, User, Category, RecipeCategory } from './models/TableCreation.js';
import sequelize from './config/db.js';
import { fileURLToPath } from 'url';

async function fetchRecipesByLetter(letter) {
    try {
        const response = await fetch(`https://www.themealdb.com/api/json/v1/1/search.php?f=${letter}`);
        const data = await response.json();
        return data.meals || [];
    } catch (error) {
        console.error(`Error fetching recipes for letter ${letter}:`, error);
        return [];
    }
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

        // Fetch recipes for each letter of the alphabet
        const alphabet = 'abcdefghijklmnopqrstuvwxyz'.split('');
        let totalRecipes = 0;

        for (const letter of alphabet) {
            console.log(`Fetching recipes starting with '${letter}'...`);
            const meals = await fetchRecipesByLetter(letter);
            
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
                        calories: estimatedCalories
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
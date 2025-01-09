/*

Only run this once to seed the database with the MealDB recipes and only run if this is the first time the app is being run.

*/




import { User, Recipe, Category, RecipeCategory } from './models/TableCreation.js';
import bcrypt from 'bcrypt';
import fetch from 'node-fetch';
import { getDb } from './config/db.js';

const MEALDB_API = 'https://www.themealdb.com/api/json/v1/1';

async function seedDatabase() {
    try {
        // Connect to database
        const sequelize = await getDb();
        await sequelize.authenticate();
        console.log('Database connected...');

        // Check if MealDB user exists
        const existingUser = await User.findOne({ where: { username: 'themealdb' } });
        if (existingUser) {
            console.log('MealDB user already exists, using existing account...');
            var mealdbUser = existingUser;
        } else {
            // Create MealDB user account
            const hashedPassword = await bcrypt.hash('mealdb123', 10);
            const [mealdbUser] = await User.findOrCreate({
                where: { username: 'themealdb' },
                defaults: {
                    email: 'api@themealdb.com',
                    password: hashedPassword,
                    bio: 'Official TheMealDB recipes collection',
                    profileImage: 'https://www.themealdb.com/images/logo-small.png'
                }
            });
            console.log('MealDB user account created...');
        }

        // Fetch all categories and areas
        const [categoriesResponse, areasResponse] = await Promise.all([
            fetch(`${MEALDB_API}/categories.php`),
            fetch(`${MEALDB_API}/list.php?a=list`)
        ]);
        
        const [categoriesData, areasData] = await Promise.all([
            categoriesResponse.json(),
            areasResponse.json()
        ]);

        // Create categories if they don't exist
        for (const cat of categoriesData.categories) {
            await Category.findOrCreate({
                where: { name: cat.strCategory },
                defaults: {
                    type: determineType(cat.strCategory),
                    imageUrl: cat.strCategoryThumb
                }
            });
        }
        console.log('Categories checked/seeded...');

        // Get all existing recipes to avoid duplicates
        const existingRecipes = await Recipe.findAll({
            attributes: ['title']
        });
        const existingTitles = new Set(existingRecipes.map(r => r.title.toLowerCase()));

        // Fetch recipes from each category and area combination
        const categories = await Category.findAll();
        const areas = areasData.meals.map(a => a.strArea);

        for (const category of categories) {
            console.log(`Processing category: ${category.name}`);
            
            // First fetch by category
            const categoryMealsResponse = await fetch(`${MEALDB_API}/filter.php?c=${category.name}`);
            const categoryMealsData = await categoryMealsResponse.json();
            
            if (categoryMealsData.meals) {
                await processMeals(categoryMealsData.meals, category, mealdbUser, existingTitles);
            }

            // Then fetch by each area for this category
            for (const area of areas) {
                const areaMealsResponse = await fetch(`${MEALDB_API}/filter.php?a=${area}`);
                const areaMealsData = await areaMealsResponse.json();
                
                if (areaMealsData.meals) {
                    await processMeals(areaMealsData.meals, category, mealdbUser, existingTitles);
                }
            }
        }

        console.log('Database seeding completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Error seeding database:', error);
        process.exit(1);
    }
}

async function processMeals(meals, category, mealdbUser, existingTitles) {
    for (const meal of meals) {
        if (!existingTitles.has(meal.strMeal.toLowerCase())) {
            try {
                // Get full meal details
                const detailsResponse = await fetch(`${MEALDB_API}/lookup.php?i=${meal.idMeal}`);
                const detailsData = await detailsResponse.json();
                
                if (detailsData.meals && detailsData.meals[0]) {
                    const mealDetails = detailsData.meals[0];

                    // Format ingredients and measurements
                    const ingredients = [];
                    for (let i = 1; i <= 20; i++) {
                        const ingredient = mealDetails[`strIngredient${i}`];
                        const measure = mealDetails[`strMeasure${i}`];
                        if (ingredient && ingredient.trim()) {
                            ingredients.push(`${measure?.trim() || ''} ${ingredient.trim()}`);
                        }
                    }

                    // Create recipe
                    const [recipe] = await Recipe.findOrCreate({
                        where: { title: mealDetails.strMeal },
                        defaults: {
                            userId: mealdbUser.id,
                            description: mealDetails.strInstructions.substring(0, 500),
                            ingredients: ingredients.join('\n'),
                            instructions: mealDetails.strInstructions,
                            imageUrl: mealDetails.strMealThumb,
                            difficulty: estimateDifficulty(mealDetails),
                            cookingTime: estimateCookingTime(mealDetails),
                            servings: estimateServings(mealDetails),
                            calories: estimateCalories(mealDetails),
                            tags: [
                                category.name,
                                mealDetails.strArea,
                                ...mealDetails.strTags ? mealDetails.strTags.split(',') : []
                            ]
                                .filter(Boolean)
                                .map(tag => tag.trim())
                                .join(',')
                        }
                    });

                    // Associate recipe with category
                    await RecipeCategory.findOrCreate({
                        where: {
                            recipeId: recipe.id,
                            categoryId: category.id
                        }
                    });

                    existingTitles.add(mealDetails.strMeal.toLowerCase());
                }
            } catch (error) {
                console.error(`Error processing meal ${meal.strMeal}:`, error);
                continue;
            }
        }
    }
}

function determineType(categoryName) {
    const typeMap = {
        'Beef': 'ingredient',
        'Chicken': 'ingredient',
        'Lamb': 'ingredient',
        'Pork': 'ingredient',
        'Seafood': 'ingredient',
        'Vegetarian': 'dietary',
        'Breakfast': 'meal',
        'Dessert': 'course',
        'Side': 'course',
        'Starter': 'course',
        'Pasta': 'dish'
    };
    return typeMap[categoryName] || 'dish';
}

function estimateDifficulty(meal) {
    const ingredientCount = Object.keys(meal)
        .filter(key => key.startsWith('strIngredient') && meal[key])
        .length;
    
    if (ingredientCount <= 5) return 'easy';
    if (ingredientCount <= 10) return 'medium';
    return 'hard';
}

function estimateCookingTime(meal) {
    const instructions = meal.strInstructions.toLowerCase();
    if (instructions.includes('hour')) return '60+ minutes';
    if (instructions.includes('minutes')) {
        const minutes = instructions.match(/\d+\s*minutes/);
        if (minutes) {
            const time = parseInt(minutes[0]);
            if (time <= 30) return '0-30 minutes';
            if (time <= 60) return '30-60 minutes';
            return '60+ minutes';
        }
    }
    return '30-60 minutes';
}

function estimateServings(meal) {
    const instructions = meal.strInstructions.toLowerCase();
    const servingsMatch = instructions.match(/serves?\s*(\d+)/i);
    return servingsMatch ? parseInt(servingsMatch[1]) : 4;
}

function estimateCalories(meal) {
    // Basic estimation based on category
    const categoryCalories = {
        'Dessert': 400,
        'Breakfast': 300,
        'Seafood': 250,
        'Chicken': 350,
        'Beef': 450,
        'Pork': 400,
        'Lamb': 400,
        'Pasta': 350,
        'Vegetarian': 300,
        'Vegan': 250,
        'Side': 200,
        'Starter': 200
    };
    
    return categoryCalories[meal.strCategory] || 350;
}

// Run the seeder
seedDatabase(); 
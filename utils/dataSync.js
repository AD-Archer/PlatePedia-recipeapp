import { Recipe, User, Category, SavedRecipe } from '../models/TableCreation.js';
import sequelize from '../config/db.js';
import express from 'express';

const router = express.Router();

// Add asyncHandler helper
const asyncHandler = fn => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

// Expanded cache structure
let cache = {
    dashboard: {
        popularRecipes: [],
        recentRecipes: [],
        categories: [],
        lastSync: null
    },
    recipes: {
        allRecipes: [],
        savedRecipes: new Map(), // Map of userId -> saved recipes
        userRecipes: new Map(),  // Map of userId -> user recipes
        lastSync: null
    },
    users: {
        popularUsers: [],
        userProfiles: new Map(), // Map of userId -> user profile
        lastSync: null
    },
    categories: {
        grouped: {},
        all: [],
        lastSync: null
    },
    savedStatuses: new Map(), // Map of userId -> Set of saved recipe IDs
};

// Add cache duration settings
const CACHE_DURATION = {
    dashboard: 5 * 60 * 1000, // 5 minutes
    categories: 60 * 60 * 1000, // 1 hour
    recipes: 15 * 60 * 1000 // 15 minutes
};

// Sync specific data types
const syncMethods = {
    async dashboard() {
        const [recentRecipes, popularRecipes, categories] = await Promise.all([
            Recipe.findAll({
                limit: 6,
                order: [['createdAt', 'DESC']],
                include: [{
                    model: User,
                    as: 'author',
                    attributes: ['username', 'id', 'profileImage']
                }]
            }),
            Recipe.findAll({
                limit: 6,
                order: sequelize.random(),
                include: [{
                    model: User,
                    as: 'author',
                    attributes: ['username', 'id', 'profileImage']
                }]
            }),
            Category.findAll({
                order: [['type', 'ASC'], ['name', 'ASC']],
                attributes: {
                    include: [[
                        sequelize.literal(`(
                            SELECT COUNT(*)
                            FROM recipe_categories
                            WHERE recipe_categories."categoryId" = "Category".id
                        )`),
                        'recipeCount'
                    ]]
                }
            })
        ]);

        cache.dashboard = {
            popularRecipes,
            recentRecipes,
            categories,
            lastSync: new Date()
        };
    },

    async recipes() {
        const allRecipes = await Recipe.findAll({
            include: [
                {
                    model: User,
                    as: 'author',
                    attributes: ['username', 'id', 'profileImage']
                },
                {
                    model: Category,
                    as: 'Categories',
                    through: { attributes: [] }
                }
            ],
            order: [['createdAt', 'DESC']]
        });

        cache.recipes.allRecipes = allRecipes;
        cache.recipes.lastSync = new Date();
    },

    async users() {
        const popularUsers = await User.findAll({
            attributes: [
                'id',
                'username',
                'profileImage',
                [
                    sequelize.literal(`(
                        SELECT COUNT(*)
                        FROM recipes
                        WHERE recipes."userId" = "User".id
                    )`),
                    'recipeCount'
                ]
            ],
            order: [[sequelize.literal('"recipeCount"'), 'DESC']],
            limit: 10
        });

        cache.users.popularUsers = popularUsers;
        cache.users.lastSync = new Date();
    },

    async categories() {
        const categories = await Category.findAll({
            order: [['type', 'ASC'], ['name', 'ASC']],
            attributes: {
                include: [[
                    sequelize.literal(`(
                        SELECT COUNT(*)
                        FROM recipe_categories
                        WHERE recipe_categories."categoryId" = "Category".id
                    )`),
                    'recipeCount'
                ]]
            }
        });

        // Group categories by type
        const grouped = categories.reduce((acc, category) => {
            const type = category.type || 'Other';
            if (!acc[type]) acc[type] = [];
            acc[type].push(category);
            return acc;
        }, {});

        cache.categories = {
            grouped,
            all: categories,
            lastSync: new Date()
        };
    },

    async savedStatuses(userId) {
        const savedRecipes = await SavedRecipe.findAll({
            where: { user_id: userId },
            attributes: ['recipe_id']
        });
        
        cache.savedStatuses.set(userId, new Set(
            savedRecipes.map(sr => sr.recipe_id)
        ));
    }
};

// User-specific data methods
export const getUserData = async (userId) => {
    try {
        // Check if we have cached user data that's not too old
        const cachedProfile = cache.users.userProfiles.get(userId);
        if (cachedProfile && (new Date() - cachedProfile.lastSync) < 5 * 60 * 1000) {
            return cachedProfile.data;
        }

        // Fetch fresh user data
        const userData = await User.findByPk(userId, {
            include: [
                {
                    model: Recipe,
                    as: 'userRecipes',
                    limit: 6,
                    order: [['createdAt', 'DESC']]
                }
            ]
        });

        // Cache the result
        cache.users.userProfiles.set(userId, {
            data: userData,
            lastSync: new Date()
        });

        return userData;
    } catch (error) {
        console.error('Error fetching user data:', error);
        return null;
    }
};

// Get saved recipes for a user
export const getUserSavedRecipes = async (userId) => {
    try {
        const cachedSaved = cache.recipes.savedRecipes.get(userId);
        if (cachedSaved && (new Date() - cachedSaved.lastSync) < 5 * 60 * 1000) {
            return cachedSaved.data;
        }

        const savedRecipes = await SavedRecipe.findAll({
            where: { user_id: userId },
            include: [{
                model: Recipe,
                include: [{
                    model: User,
                    as: 'author',
                    attributes: ['username', 'id', 'profileImage']
                }]
            }]
        });

        cache.recipes.savedRecipes.set(userId, {
            data: savedRecipes,
            lastSync: new Date()
        });

        return savedRecipes;
    } catch (error) {
        console.error('Error fetching saved recipes:', error);
        return [];
    }
};

// Main sync function
export const syncData = async (types = ['dashboard', 'recipes', 'users', 'categories']) => {
    try {
        await Promise.all(types.map(type => syncMethods[type]()));
        console.log('Data sync completed:', new Date());
    } catch (error) {
        console.error('Data sync error:', error);
    }
};

// Get cached data with optional type filter
export const getCachedData = (type = 'dashboard') => {
    const cacheEntry = cache[type];
    if (!cacheEntry?.lastSync || (new Date() - cacheEntry.lastSync) > 5 * 60 * 1000) {
        syncData([type]);
    }
    return cache[type];
};

// Clear specific cache entries
export const clearCache = (type) => {
    if (type) {
        cache[type] = { ...cache[type], lastSync: null };
    } else {
        Object.keys(cache).forEach(key => {
            cache[key] = { ...cache[key], lastSync: null };
        });
    }
};

// Initial sync
syncData();

// Set up auto-sync every 5 minutes
setInterval(() => syncData(), 5 * 60 * 1000); 

// Add utility function
export const addSavedStatus = async (recipes, userId) => {
    if (!userId || !recipes || recipes.length === 0) {
        return recipes;
    }

    // Check cache first
    let savedRecipeIds = cache.savedStatuses.get(userId);
    
    // If not in cache or stale, sync it
    if (!savedRecipeIds) {
        await syncMethods.savedStatuses(userId);
        savedRecipeIds = cache.savedStatuses.get(userId);
    }

    return recipes.map(recipe => {
        const plainRecipe = recipe.get ? recipe.get({ plain: true }) : recipe;
        return {
            ...plainRecipe,
            isSaved: savedRecipeIds.has(plainRecipe.id)
        };
    });
};

// Update cache check logic
function isCacheValid(type) {
    return cache[type].lastSync && 
           (Date.now() - cache[type].lastSync) < CACHE_DURATION[type];
}

// Update the route handler
router.get('/', asyncHandler(async (req, res) => {
    res.set({
        'Cache-Control': 'public, max-age=300', // 5 minutes
        'Surrogate-Control': 'public, max-age=3600' // 1 hour
    });
    res.json({ success: true });
}));

export default router; 
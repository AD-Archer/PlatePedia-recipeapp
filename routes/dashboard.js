import express from 'express';
import { Recipe, User, Category } from '../models/TableCreation.js';
import { Op } from 'sequelize';
import { asyncHandler } from '../middleware/errorHandler.js';
import sequelize from '../config/db.js';
import { addSavedStatus } from '../utils/recipeUtils.js';

const router = express.Router();

// Utility function to fetch recipes with optional saved status
const fetchRecipes = async (orderBy, limit, userId) => {
    const recipes = await Recipe.findAll({
        include: [
            {
                model: User,
                as: 'author',
                attributes: ['username', 'profileImage']
            }
        ],
        order: [orderBy],
        limit,
        raw: false,
        nest: true
    });
    return userId ? addSavedStatus(recipes, userId) : recipes;
};

// Fetch categories grouped by type
const fetchGroupedCategories = async () => {
    const categories = await Category.findAll({
        attributes: [
            'id',
            'name',
            'type',
            'imageUrl',
            [
                sequelize.literal(
                    '(SELECT COUNT(*) FROM recipe_categories WHERE recipe_categories."categoryId" = "Category".id)'
                ),
                'recipeCount'
            ]
        ],
        order: [
            ['type', 'ASC'],
            ['name', 'ASC']
        ]
    });

    return categories.reduce((acc, category) => {
        const { type } = category;
        if (!acc[type]) acc[type] = [];
        acc[type].push(category);
        return acc;
    }, {});
};

// Fetch suggested users for logged-in users
const fetchSuggestedUsers = async (userId) => {
    const users = await User.findAll({
        where: {
            id: { [Op.ne]: userId }
        },
        attributes: [
            'id',
            'username',
            'profileImage',
            [
                sequelize.literal(
                    '(SELECT COUNT(*) FROM recipes WHERE recipes."userId" = "User".id)'
                ),
                'recipeCount'
            ]
        ],
        limit: 4,
        order: sequelize.random()
    });
    return users.map(user => user.get({ plain: true }));
};

// Dashboard route
router.get('/', async (req, res) => {
    try {
        const userId = req.session.user?.id;

        // Fetch all recipes with authors
        const allRecipes = await Recipe.findAll({
            include: [{
                model: User,
                as: 'author',
                attributes: ['username', 'id']
            }],
            order: [['createdAt', 'DESC']]
        });

        // Shuffle and slice recipes for popular and latest sections
        const shuffledRecipes = allRecipes.sort(() => Math.random() - 0.5);
        const popularRecipes = shuffledRecipes.slice(0, 6);
        const latestRecipes = allRecipes.slice(0, 8);

        // Fetch categories with recipe counts
        const categories = await Category.findAll({
            attributes: {
                include: [
                    [
                        sequelize.literal(
                            '(SELECT COUNT(*) FROM recipe_categories WHERE recipe_categories."categoryId" = "Category".id)'
                        ),
                        'recipeCount'
                    ]
                ]
            },
            order: [['type', 'ASC'], ['name', 'ASC']]
        });

        // Group categories by type
        const groupedCategories = categories.reduce((acc, category) => {
            const type = category.type || 'Other';
            if (!acc[type]) acc[type] = [];
            acc[type].push(category);
            return acc;
        }, {});

        // Add saved status if user is logged in
        const processedPopularRecipes = userId 
            ? await addSavedStatus(popularRecipes, userId) 
            : popularRecipes;

        const processedLatestRecipes = userId 
            ? await addSavedStatus(latestRecipes, userId) 
            : latestRecipes;

        // Render the dashboard view
        res.render('pages/dashboard', {
            user: req.session.user,
            popularRecipes: processedPopularRecipes,
            latestRecipes: processedLatestRecipes,
            groupedCategories,
            error: req.session.error,
            success: req.session.success
        });

        // Clear flash messages after rendering
        delete req.session.error;
        delete req.session.success;

    } catch (error) {
        console.error('Error loading dashboard:', error);
        res.status(500).render('pages/error', {
            message: 'Error loading dashboard',
            error
        });
    }
});


export default router;

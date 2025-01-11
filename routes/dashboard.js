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
        attributes: [
            'id',
            'title',
            'description',
            'imageUrl',
            'difficulty',
            'calories',
            'cookingTime',
            'userId',
            'createdAt'
        ],
        include: [
            {
                model: User,
                as: 'author',
                attributes: ['id', 'username', 'profileImage']
            },
            {
                model: Category,
                as: 'Categories',
                through: { attributes: [] }
            }
        ],
        order: [orderBy],
        limit,
        raw: false,
        nest: true
    });

    // Add saved status if user is logged in
    return userId ? await addSavedStatus(recipes, userId) : recipes;
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
            id: { [Op.ne]: userId },
            username: { [Op.ne]: 'themealdb' }
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
        limit: 2,
        order: sequelize.random()
    });
    return users.map(user => user.get({ plain: true }));
};

// Dashboard route
router.get('/', asyncHandler(async (req, res) => {
    try {
        const userId = req.session.user?.id;

        // Use the fetchRecipes utility function
        const popularRecipes = await fetchRecipes(['createdAt', 'DESC'], 6, userId);
        const latestRecipes = await fetchRecipes(['createdAt', 'DESC'], 8, userId);

        // Fetch suggested users if user is logged in
        const suggestedUsers = userId ? await fetchSuggestedUsers(userId) : [];

        // Add themealdb user to suggested users if it exists
        const themealdbUser = await User.findOne({
            where: { username: 'themealdb' },
            attributes: [
                'id', 
                'username', 
                'profileImage',
                [
                    sequelize.literal(
                        '(SELECT COUNT(*) FROM recipes WHERE recipes."userId" = "User"."id")'
                    ),
                    'recipeCount'
                ]
            ]
        });

        if (themealdbUser) {
            const plainThemealdbUser = themealdbUser.get({ plain: true });
            if (userId) {
                const isFollowing = await User.findOne({
                    where: { 
                        id: userId,
                        '$following.id$': themealdbUser.id 
                    },
                    include: [{
                        model: User,
                        as: 'following'
                    }]
                });
                plainThemealdbUser.isFollowing = !!isFollowing;
            }
            suggestedUsers.push(plainThemealdbUser);
        }

        // Add isFollowing status to suggested users
        if (userId) {
            const userFollowings = await User.findOne({
                where: { id: userId },
                include: [{
                    model: User,
                    as: 'following',
                    attributes: ['id']
                }]
            });

            const followingIds = userFollowings?.following.map(f => f.id) || [];
            suggestedUsers.forEach(user => {
                user.isFollowing = followingIds.includes(user.id);
            });
        }

        // Get grouped categories
        const groupedCategories = await fetchGroupedCategories();

        // Render the dashboard
        res.render('pages/dashboard', {
            user: req.session.user,
            popularRecipes,  // These are already processed by fetchRecipes
            latestRecipes,   // These are already processed by fetchRecipes
            groupedCategories,
            suggestedUsers,
            error: req.session.error,
            success: req.session.success
        });

        delete req.session.error;
        delete req.session.success;

    } catch (error) {
        console.error('Error loading dashboard:', error);
        res.status(500).render('pages/error', {
            message: 'Error loading dashboard',
            error
        });
    }
}));


export default router;

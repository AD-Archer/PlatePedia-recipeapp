import express from 'express';
import { Recipe, User, Category } from '../models/TableCreation.js';
import { Op } from 'sequelize';
import { asyncHandler } from '../middleware/errorHandler.js';
import { sequelize } from '../config/db.js';
import { addSavedStatus } from '../utils/recipeUtils.js';

const router = express.Router();

// Dashboard home - accessible to all
router.get('/', asyncHandler(async (req, res) => {
    try {
        // Get latest recipes
        const latestRecipes = await Recipe.findAll({
            include: [
                {
                    model: User,
                    as: 'author',
                    attributes: ['username', 'profileImage']
                }
            ],
            order: [['createdAt', 'DESC']],
            limit: 8,
            raw: false,
            nest: true
        });

        // Get popular recipes (most saved)
        const popularRecipes = await Recipe.findAll({
            include: [
                {
                    model: User,
                    as: 'author',
                    attributes: ['username', 'profileImage']
                }
            ],
            order: [['createdAt', 'DESC']],
            limit: 8,
            raw: false,
            nest: true
        });

        // Get categories with recipe counts
        const categories = await Category.findAll({
            attributes: [
                'id',
                'name',
                'type',
                'imageUrl',
                [
                    sequelize.literal('(SELECT COUNT(*) FROM recipe_categories WHERE recipe_categories."categoryId" = "Category".id)'),
                    'recipeCount'
                ]
            ],
            order: [
                ['type', 'ASC'],
                ['name', 'ASC']
            ]
        });

        // Group categories by type
        const groupedCategories = {
            meal: categories.filter(cat => cat.type === 'meal'),
            ingredient: categories.filter(cat => cat.type === 'ingredient'),
            course: categories.filter(cat => cat.type === 'course'),
            dish: categories.filter(cat => cat.type === 'dish'),
            dietary: categories.filter(cat => cat.type === 'dietary')
        };

        // Get suggested users if user is logged in
        let suggestedUsers = [];
        if (req.session.user) {
            suggestedUsers = await User.findAll({
                where: {
                    id: {
                        [Op.ne]: req.session.user.id
                    }
                },
                attributes: [
                    'id', 
                    'username', 
                    'profileImage',
                    [
                        sequelize.literal('(SELECT COUNT(*) FROM recipes WHERE recipes."userId" = "User"."id")'),
                        'recipeCount'
                    ]
                ],
                limit: 4,
                order: sequelize.random()
            });

            // Convert to plain objects
            suggestedUsers = suggestedUsers.map(user => user.get({ plain: true }));
        }

        // Process data if user is logged in
        const userId = req.session.user ? req.session.user.id : null;
        const latestRecipesWithStatus = userId ? await addSavedStatus(latestRecipes, userId) : latestRecipes;
        const popularRecipesWithStatus = userId ? await addSavedStatus(popularRecipes, userId) : popularRecipes;

        res.render('pages/dashboard', {
            user: req.session.user,
            latestRecipes: latestRecipesWithStatus,
            popularRecipes: popularRecipesWithStatus,
            groupedCategories,
            suggestedUsers,
            error: req.session.error,
            success: req.session.success
        });

        delete req.session.error;
        delete req.session.success;
    } catch (error) {
        console.error('Dashboard error:', error);
        res.redirect('/');
    }
}));

export default router; 
import express from 'express';
import { User, Recipe, Category } from '../models/TableCreation.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import sequelize from '../config/db.js';
import { Op } from 'sequelize';

const router = express.Router();

router.get('/', asyncHandler(async (req, res) => {
    try {
        // Get recent recipes
        const recipes = await Recipe.findAll({
            limit: 6,
            order: [['createdAt', 'DESC']],
            include: [{
                model: User,
                as: 'author',
                attributes: ['username', 'id', 'profileImage']
            }]
        });

        // Get popular recipes (most saved/liked)
        const popularRecipes = await Recipe.findAll({
            limit: 6,
            order: [['createdAt', 'DESC']], // You might want to order by number of saves instead
            include: [{
                model: User,
                as: 'author',
                attributes: ['username', 'id', 'profileImage']
            }]
        });

        // Get categories and group them by type
        const categories = await Category.findAll({
            order: [
                ['type', 'ASC'],
                ['name', 'ASC']
            ],
            attributes: {
                include: [
                    [
                        sequelize.literal(`(
                            SELECT COUNT(*)
                            FROM recipe_categories
                            WHERE recipe_categories."categoryId" = "Category".id
                        )`),
                        'recipeCount'
                    ]
                ]
            }
        });

        // Group categories by type
        const groupedCategories = categories.reduce((acc, category) => {
            const type = category.type || 'Other';
            if (!acc[type]) {
                acc[type] = [];
            }
            acc[type].push(category);
            return acc;
        }, {});

        // Get suggested users if logged in
        let suggestedUsers = [];
        if (req.session.user) {
            suggestedUsers = await User.findAll({
                where: {
                    id: { [Op.ne]: req.session.user.id },
                    username: { [Op.ne]: 'themealdb' }
                },
                limit: 3,
                order: sequelize.random()
            });
        }

        res.render('pages/dashboard', {
            user: req.session.user,
            recipes,
            popularRecipes,
            groupedCategories,
            categories,
            suggestedUsers,
            path: '/'
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).render('pages/error', {
            error: 'Error loading dashboard',
            path: '/'
        });
    }
}));

export default router;

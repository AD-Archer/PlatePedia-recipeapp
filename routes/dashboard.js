import express from 'express';
import { User } from '../models/TableCreation.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { Op } from 'sequelize';
import { getCachedData } from '../utils/dataSync.js';

const router = express.Router();

router.get('/', asyncHandler(async (req, res) => {
    try {
        // Get cached data
        const { popularRecipes, recentRecipes, categories } = getCachedData();

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
            recipes: recentRecipes,
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

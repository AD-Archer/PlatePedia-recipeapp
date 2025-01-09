import express from 'express';
import { Recipe, User, Category } from '../models/TableCreation.js';
import { Op } from 'sequelize';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = express.Router();

// Dashboard home - accessible to all
router.get('/', asyncHandler(async (req, res) => {
    try {
        // Get popular recipes
        const popularRecipes = await Recipe.findAll({
            include: [{
                model: User,
                as: 'author',
                attributes: ['id', 'username', 'profileImage']
            }],
            limit: 6,
            order: [['createdAt', 'DESC']]
        });

        // Only get suggested users if user is logged in
        let suggestedUsers = [];
        if (req.session.user) {
            const users = await User.findAll({
                where: {
                    id: { [Op.ne]: req.session.user.id }
                },
                limit: 8,
                include: [
                    {
                        model: User,
                        as: 'followers',
                        where: { id: req.session.user.id },
                        required: false
                    },
                    {
                        model: Recipe,
                        as: 'recipes',
                        attributes: ['id']
                    }
                ],
                order: [[{ model: Recipe, as: 'recipes' }, 'id', 'DESC']]
            });

            // Add isFollowing property to each user
            suggestedUsers = users.map(user => ({
                ...user.toJSON(),
                isFollowing: user.followers.some(follower => follower.id === req.session.user.id),
                recipeCount: Array.isArray(user.recipes) ? user.recipes.length : 0
            }));
        }

        // Get categories with recipe counts
        console.log('Fetching categories...');
        const categories = await Category.findAll({
            include: {
                model: Recipe,
                as: 'recipes',
                through: { attributes: [] },
                required: false
            },
            raw: true,
            nest: true
        });

        console.log('Raw categories:', JSON.stringify(categories, null, 2));

        // Add recipe count to each category
        const categoriesWithCount = categories.map(category => ({
            ...category,
            recipeCount: Array.isArray(category.recipes) ? category.recipes.length : 0
        }));

        console.log('Categories with count:', JSON.stringify(categoriesWithCount, null, 2));

        // Get recent recipes
        const recentRecipes = await Recipe.findAll({
            include: [{
                model: User,
                as: 'author',
                attributes: ['id', 'username', 'profileImage']
            }],
            limit: 8,
            order: [['createdAt', 'DESC']]
        });

        res.render('pages/dashboard', {
            user: req.session.user || null,
            popularRecipes,
            recentRecipes,
            categories: categoriesWithCount,
            suggestedUsers,
            error: req.session.error,
            success: req.session.success
        });

        delete req.session.error;
        delete req.session.success;
    } catch (error) {
        console.error('Dashboard error:', error);
        req.session.error = 'Error loading dashboard';
        res.redirect('/');
    }
}));

export default router; 
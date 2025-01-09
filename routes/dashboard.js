import express from 'express';
import { Recipe, User } from '../models/TableCreation.js';
import { Op } from 'sequelize';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = express.Router();

// Dashboard route - accessible to all
router.get('/', asyncHandler(async (req, res) => {
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

    // Only get other users if user is logged in
    let otherUsers = [];
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
        otherUsers = users.map(user => ({
            ...user.toJSON(),
            isFollowing: user.followers.some(follower => follower.id === req.session.user.id),
            recipeCount: user.recipes.length
        }));
    }

    res.render('pages/dashboard', {
        user: req.session.user || null,
        popularRecipes,
        otherUsers,
        error: req.session.error,
        success: req.session.success
    });

    delete req.session.error;
    delete req.session.success;
}));

export default router; 
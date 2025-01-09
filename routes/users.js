import express from 'express';
import { User, Recipe, UserFollows, Category } from '../models/TableCreation.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { isAuthenticated } from '../middleware/authMiddleware.js';
import { Op, Sequelize } from 'sequelize';

const router = express.Router();

// Show all users/suggested users page - Public access
router.get('/', asyncHandler(async (req, res) => {
    // First, get recipe counts for all users
    const userRecipeCounts = await User.findAll({
        attributes: [
            'id',
            'username',
            'profileImage',
            [Sequelize.fn('COUNT', Sequelize.col('recipes.id')), 'recipe_count']
        ],
        include: [{
            model: Recipe,
            as: 'recipes',
            attributes: [],
            required: false
        }],
        group: ['User.id'],
        order: [[Sequelize.literal('recipe_count'), 'DESC']],
        raw: true
    });

    // Then, get follow status for logged-in user
    const users = await User.findAll({
        where: {
            id: {
                [Op.in]: userRecipeCounts.map(u => u.id)
            }
        },
        include: [{
            model: User,
            as: 'followers',
            where: req.session.user ? { id: req.session.user.id } : {},
            required: false
        }],
        limit: 20
    });

    // Combine the data
    const usersWithFollowStatus = users.map(user => {
        const recipeCount = userRecipeCounts.find(u => u.id === user.id)?.recipe_count || 0;
        return {
            ...user.toJSON(),
            isFollowing: req.session.user ? 
                user.followers.some(follower => follower.id === req.session.user.id) : 
                false,
            recipeCount: parseInt(recipeCount)
        };
    });

    res.render('pages/users/index', {
        users: usersWithFollowStatus,
        error: req.session.error,
        success: req.session.success
    });

    delete req.session.error;
    delete req.session.success;
}));

// View user profile - Public access
router.get('/:username', asyncHandler(async (req, res) => {
    try {
        const username = req.params.username;
        
        // Check if username exists
        const user = await User.findOne({
            where: { 
                username: username
            },
            include: [
                {
                    model: Recipe,
                    as: 'recipes',
                    include: [{
                        model: Category,
                        as: 'categories',
                        through: { attributes: [] }
                    }],
                    order: [['createdAt', 'DESC']]
                },
                {
                    model: User,
                    as: 'followers',
                    attributes: ['id', 'username', 'profileImage']
                },
                {
                    model: User,
                    as: 'following',
                    attributes: ['id', 'username', 'profileImage']
                }
            ]
        });

        if (!user) {
            req.session.error = 'User not found';
            return res.redirect('/users');
        }

        // Check if the logged-in user is following this user
        let isFollowing = false;
        if (req.session.user) {
            const followRelation = await UserFollows.findOne({
                where: {
                    followerId: req.session.user.id,
                    followingId: user.id
                }
            });
            isFollowing = !!followRelation;
        }

        // Get user's stats
        const stats = {
            recipeCount: user.recipes.length,
            followerCount: user.followers.length,
            followingCount: user.following.length
        };

        res.render('pages/users/profile', {
            profileUser: user,
            isFollowing,
            stats,
            error: req.session.error,
            success: req.session.success
        });

        delete req.session.error;
        delete req.session.success;

    } catch (error) {
        console.error('Error loading user profile:', error);
        req.session.error = 'Error loading user profile';
        res.redirect('/users');
    }
}));

// Follow user (requires authentication)
router.post('/:username/follow', isAuthenticated, asyncHandler(async (req, res) => {
    const userToFollow = await User.findOne({
        where: { username: req.params.username }
    });

    if (!userToFollow) {
        return res.status(404).json({ success: false, error: 'User not found' });
    }

    if (userToFollow.id === req.session.user.id) {
        return res.status(400).json({ success: false, error: 'You cannot follow yourself' });
    }

    const [relation, created] = await UserFollows.findOrCreate({
        where: {
            followerId: req.session.user.id,
            followingId: userToFollow.id
        }
    });

    res.json({ 
        success: true, 
        following: true,
        message: created ? 'Successfully followed user' : 'Already following user'
    });
}));

// Unfollow user (requires authentication)
router.delete('/:username/follow', isAuthenticated, asyncHandler(async (req, res) => {
    const userToUnfollow = await User.findOne({
        where: { username: req.params.username }
    });

    if (!userToUnfollow) {
        return res.status(404).json({ success: false, error: 'User not found' });
    }

    const deleted = await UserFollows.destroy({
        where: {
            followerId: req.session.user.id,
            followingId: userToUnfollow.id
        }
    });

    res.json({ 
        success: true, 
        following: false,
        message: deleted ? 'Successfully unfollowed user' : 'Not following user'
    });
}));

export default router; 
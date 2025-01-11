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
        user: req.session.user,
        error: req.session.error,
        success: req.session.success
    });

    delete req.session.error;
    delete req.session.success;
}));

// View user profile by username
router.get('/:username', asyncHandler(async (req, res) => {
    const username = req.params.username;

    // Find user by username
    const profileUser = await User.findOne({
        where: { username: username },
        attributes: ['id', 'username', 'profileImage', 'bio']
    });

    if (!profileUser) {
        req.session.error = 'User not found';
        return res.redirect('/');
    }

    // Get user's recipes
    const recipes = await Recipe.findAll({
        where: { userId: profileUser.id },
        include: [
            {
                model: User,
                as: 'author',
                attributes: ['username', 'id']
            },
            {
                model: Category,
                as: 'Categories',  // Make sure this matches your association
                through: { attributes: [] }
            }
        ],
        order: [['createdAt', 'DESC']]
    });

    // Check if logged-in user is following this user
    let isFollowing = false;
    if (req.session.user && req.session.user.id !== profileUser.id) {
        const followRelation = await UserFollows.findOne({
            where: {
                followerId: req.session.user.id,
                followingId: profileUser.id
            }
        });
        isFollowing = !!followRelation;
    }

    // Get follower and following counts
    const followerCount = await User.count({
        include: [{
            model: User,
            as: 'followedUsers',
            where: { id: profileUser.id }
        }]
    });

    const followingCount = await User.count({
        include: [{
            model: User,
            as: 'followerUsers',
            where: { id: profileUser.id }
        }]
    });

    res.render('pages/users/profile', {
        user: req.session.user,
        profileUser: {
            ...profileUser.toJSON(),
            followers: { length: followerCount },
            following: { length: followingCount },
            recipes: recipes
        },
        recipes: recipes,
        isFollowing,
        isOwnProfile: req.session.user && req.session.user.id === profileUser.id,
        error: req.session.error,
        success: req.session.success
    });

    delete req.session.error;
    delete req.session.success;
}));

// Follow/unfollow routes
router.post('/:id/follow', isAuthenticated, asyncHandler(async (req, res) => {
    try {
        const followerId = parseInt(req.session.user.id);
        const followingId = parseInt(req.params.id);

        console.log('Attempting to follow:', { followerId, followingId }); // Debug log

        // Validate IDs
        if (!followerId || !followingId) {
            return res.status(400).json({ 
                success: false, 
                error: 'Invalid user IDs' 
            });
        }

        // Don't allow following yourself
        if (followerId === followingId) {
            return res.status(400).json({ 
                success: false, 
                error: 'You cannot follow yourself' 
            });
        }

        // Check if user exists
        const userToFollow = await User.findByPk(followingId);
        if (!userToFollow) {
            return res.status(404).json({ 
                success: false, 
                error: 'User not found' 
            });
        }

        // Check if already following
        const existingFollow = await UserFollows.findOne({
            where: {
                followerId,
                followingId
            }
        });

        if (existingFollow) {
            return res.json({ 
                success: true, 
                following: true,
                message: 'Already following user'
            });
        }

        // Create new follow relationship with explicit values
        const newFollow = await UserFollows.create({
            followerId: followerId,
            followingId: followingId,
            createdAt: new Date(),
            updatedAt: new Date()
        }, {
            fields: ['followerId', 'followingId', 'createdAt', 'updatedAt']
        });

        console.log('Created follow relationship:', newFollow); // Debug log

        res.json({ 
            success: true, 
            following: true,
            message: 'Successfully followed user'
        });
    } catch (error) {
        console.error('Error following user:', error);
        console.error('Error details:', {
            followerId: req.session.user?.id,
            followingId: req.params.id,
            error: error.message
        });
        res.status(500).json({ 
            success: false, 
            error: 'Error following user' 
        });
    }
}));

router.delete('/:id/follow', isAuthenticated, asyncHandler(async (req, res) => {
    try {
        const followerId = parseInt(req.session.user.id);
        const followingId = parseInt(req.params.id);

        // Validate IDs
        if (!followerId || !followingId) {
            return res.status(400).json({ 
                success: false, 
                error: 'Invalid user IDs' 
            });
        }

        // Check if user exists
        const userToUnfollow = await User.findByPk(followingId);
        if (!userToUnfollow) {
            return res.status(404).json({ 
                success: false, 
                error: 'User not found' 
            });
        }

        const deleted = await UserFollows.destroy({
            where: {
                followerId: followerId,
                followingId: followingId
            }
        });

        res.json({ 
            success: true, 
            following: false,
            message: deleted ? 'Successfully unfollowed user' : 'Not following user'
        });
    } catch (error) {
        console.error('Error unfollowing user:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Error unfollowing user' 
        });
    }
}));

router.get('/some-route', asyncHandler(async (req, res) => {
    try {
        const categories = await Category.findAll({
            // Your query logic here
        });
        res.json(categories);
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).json({ error: 'Failed to fetch categories' });
    }
}));

export default router; 
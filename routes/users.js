import express from 'express';
import { User, Recipe, UserFollows, Category } from '../models/TableCreation.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { isAuthenticated } from '../middleware/authMiddleware.js';
import { body, validationResult } from 'express-validator';
import bcrypt from 'bcrypt';
import { Op, Sequelize } from 'sequelize';
import crypto from 'crypto';

const router = express.Router();

// Get user by username
router.get('/:username', asyncHandler(async (req, res) => {
    const user = await User.findOne({
        where: { username: req.params.username },
        include: [{
            model: Recipe,
            as: 'recipes',
            include: [{
                model: Category,
                as: 'categories',
                through: { attributes: [] }
            }]
        }, {
            model: User,
            as: 'followers',
            attributes: ['id']
        }, {
            model: User,
            as: 'following',
            attributes: ['id']
        }]
    });

    if (!user) {
        req.session.error = 'User not found';
        return res.redirect('/');
    }

    // Check if this is the profile owner
    const isOwnProfile = req.session.user && req.session.user.id === user.id;

    // Calculate stats
    const stats = {
        recipeCount: user.recipes.length,
        followerCount: user.followers.length,
        followingCount: user.following.length
    };

    // Check if logged-in user is following this user
    let isFollowing = false;
    if (req.session.user && req.session.user.id !== user.id) {
        isFollowing = user.followers.some(follower => follower.id === req.session.user.id);
    }

    res.render('pages/users/profile', {
        profileUser: user,
        recipes: user.recipes,
        stats,
        isFollowing,
        isOwnProfile,
        error: req.session.error,
        success: req.session.success
    });

    delete req.session.error;
    delete req.session.success;
}));

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

// View user profile
router.get('/:username', asyncHandler(async (req, res) => {
    const username = req.params.username;
    
    // First get the user's basic info
    let user = await User.findOne({
        where: { username },
        attributes: ['id', 'username', 'email', 'bio', 'profileImage', 'createdAt']
    });

    if (!user) {
        req.session.error = 'User not found';
        return res.redirect('/');
    }

    // Then get their recipes and other data
    const [recipes, savedRecipes, followers, following] = await Promise.all([
        Recipe.findAll({
            where: { userId: user.id },
            limit: 5,
            order: [['createdAt', 'DESC']]
        }),
        user.getSavedRecipes({
            limit: 5,
            order: [['createdAt', 'DESC']]
        }),
        user.getFollowers(),
        user.getFollowing()
    ]);

    // Combine all the data
    user = user.toJSON();
    user.recipes = recipes;
    user.savedRecipes = savedRecipes;
    user.followers = followers;
    user.following = following;

    // Calculate stats
    const stats = {
        recipeCount: recipes.length,
        followerCount: followers.length,
        followingCount: following.length
    };

    // Check if logged-in user is following this user
    let isFollowing = false;
    if (req.session.user && req.session.user.id !== user.id) {
        const followRelation = await UserFollows.findOne({
            where: {
                followerId: req.session.user.id,
                followingId: user.id
            }
        });
        isFollowing = !!followRelation;
    }

    // Check if this is the logged-in user viewing their own profile
    const isOwnProfile = req.session.user && req.session.user.id === user.id;

    res.render('pages/users/profile', {
        profileUser: user,
        isOwnProfile,
        isFollowing,
        stats,
        error: req.session.error,
        success: req.session.success
    });

    delete req.session.error;
    delete req.session.success;
}));

// Handle profile update
router.post('/:username/edit', isAuthenticated, [
    body('username')
        .trim()
        .isLength({ min: 3, max: 30 })
        .withMessage('Username must be between 3 and 30 characters')
        .matches(/^[a-zA-Z0-9_]+$/)
        .withMessage('Username can only contain letters, numbers, and underscores')
        .toLowerCase(),
    body('email')
        .trim()
        .isEmail()
        .withMessage('Please enter a valid email address')
        .normalizeEmail(),
    body('bio')
        .optional({ checkFalsy: true })
        .trim()
        .isLength({ max: 500 })
        .withMessage('Bio must not exceed 500 characters'),
    body('profileImage')
        .optional({ checkFalsy: true })
        .isURL()
        .withMessage('Please enter a valid URL for profile image')
], asyncHandler(async (req, res) => {
    // Ensure user can only edit their own profile
    if (req.params.username !== req.session.user.username) {
        return res.status(403).json({ error: 'Unauthorized' });
    }

    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ error: errors.array()[0].msg });
        }

        const user = await User.findByPk(req.session.user.id);
        
        // Check if username or email is already taken
        if (req.body.username !== user.username) {
            const existingUsername = await User.findOne({
                where: { username: req.body.username }
            });
            if (existingUsername) {
                return res.status(400).json({ error: 'Username is already taken' });
            }
        }

        if (req.body.email !== user.email) {
            const existingEmail = await User.findOne({
                where: { email: req.body.email }
            });
            if (existingEmail) {
                return res.status(400).json({ error: 'Email is already registered' });
            }
        }

        // Update user data
        await user.update({
            username: req.body.username,
            email: req.body.email,
            bio: req.body.bio,
            profileImage: req.body.profileImage
        });

        // Update session data
        req.session.user = {
            id: user.id,
            username: user.username,
            email: user.email,
            profileImage: user.profileImage
        };

        res.json({ 
            success: true, 
            message: 'Profile updated successfully',
            user: {
                username: user.username,
                email: user.email,
                bio: user.bio,
                profileImage: user.profileImage
            }
        });
    } catch (error) {
        console.error('Profile update error:', error);
        res.status(500).json({ error: 'Error updating profile' });
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

// Change password
router.post('/:username/change-password', isAuthenticated, [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword')
        .isLength({ min: 6 })
        .withMessage('New password must be at least 6 characters long'),
], asyncHandler(async (req, res) => {
    // Ensure user can only change their own password
    if (req.params.username !== req.session.user.username) {
        return res.status(403).json({ error: 'Unauthorized' });
    }

    const user = await User.findByPk(req.session.user.id);
    const { currentPassword, newPassword } = req.body;

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.password);
    if (!isValidPassword) {
        return res.status(400).json({ error: 'Current password is incorrect' });
    }

    // Hash and update new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await user.update({ password: hashedPassword });

    res.json({ success: true, message: 'Password updated successfully' });
}));

// Request password reset
router.post('/reset-password/request', [
    body('email').isEmail().withMessage('Valid email is required'),
], asyncHandler(async (req, res) => {
    const user = await User.findOne({ where: { email: req.body.email } });
    
    if (!user) {
        // Don't reveal if email exists
        return res.json({ success: true, message: 'If email exists, reset instructions will be sent' });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour

    await user.update({
        resetToken,
        resetTokenExpiry
    });

    // TODO: Send email with reset link
    // For now, just return the token in development
    if (process.env.NODE_ENV === 'development') {
        res.json({ 
            success: true, 
            message: 'Reset token generated',
            resetToken // Only include in development
        });
    } else {
        res.json({ success: true, message: 'Reset instructions sent to email' });
    }
}));

// Reset password with token
router.post('/reset-password/reset', [
    body('token').notEmpty().withMessage('Reset token is required'),
    body('newPassword')
        .isLength({ min: 6 })
        .withMessage('New password must be at least 6 characters long'),
], asyncHandler(async (req, res) => {
    const { token, newPassword } = req.body;

    const user = await User.findOne({
        where: {
            resetToken: token,
            resetTokenExpiry: { [Op.gt]: new Date() }
        }
    });

    if (!user) {
        return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    // Hash and update password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await user.update({
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null
    });

    res.json({ success: true, message: 'Password reset successfully' });
}));

// Debug route - REMOVE IN PRODUCTION
router.get('/debug/:id', asyncHandler(async (req, res) => {
    const users = await User.findAll({
        attributes: ['id', 'username']
    });
    const requestedUser = await User.findByPk(req.params.id);
    res.json({
        requestedUser,
        allUsers: users
    });
}));

// Follow a user
router.post('/:id/follow', asyncHandler(async (req, res) => {
    try {
        // Check authentication manually first
        if (!req.session.user) {
            return res.status(401).json({
                success: false,
                error: 'Please log in to follow users'
            });
        }

        console.log('Follow request received');
        console.log('Current user:', req.session.user);
        console.log('Target user param:', req.params.id);

        let userToFollow;
        const userId = parseInt(req.params.id);
        
        // Try to find by ID first, if not, try username
        if (!isNaN(userId)) {
            userToFollow = await User.findByPk(userId);
        } else {
            userToFollow = await User.findOne({
                where: { username: req.params.id }
            });
        }
        console.log('Found user:', userToFollow ? userToFollow.toJSON() : null);

        if (!userToFollow) {
            return res.status(404).json({ 
                success: false, 
                error: 'User not found' 
            });
        }

        // Check if trying to follow self
        if (userToFollow.id === req.session.user.id) {
            return res.status(400).json({
                success: false,
                error: 'Cannot follow yourself'
            });
        }

        // Check if already following
        const currentUser = await User.findByPk(req.session.user.id, {
            include: [{
                model: User,
                as: 'following',
                where: { id: userToFollow.id },
                required: false
            }]
        });

        if (!currentUser.following.length) {
            await currentUser.addFollowing(userToFollow);
            res.json({ 
                success: true, 
                message: 'Successfully followed user' 
            });
        } else {
            res.json({ 
                success: true, 
                message: 'Already following user' 
            });
        }
    } catch (error) {
        console.error('Error following user:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Error following user' 
        });
    }
}));

// Unfollow a user
router.delete('/:id/follow', asyncHandler(async (req, res) => {
    try {
        // Check authentication manually first
        if (!req.session.user) {
            return res.status(401).json({
                success: false,
                error: 'Please log in to unfollow users'
            });
        }

        let userToUnfollow;
        // Try to find by ID first
        const userId = parseInt(req.params.id);
        if (!isNaN(userId)) {
            userToUnfollow = await User.findByPk(userId);
        } else {
            // If not a number, try to find by username
            userToUnfollow = await User.findOne({
                where: { username: req.params.id }
            });
        }

        if (!userToUnfollow) {
            return res.status(404).json({ 
                success: false, 
                error: 'User not found' 
            });
        }

        const currentUser = await User.findByPk(req.session.user.id);
        await currentUser.removeFollowing(userToUnfollow);
        
        res.json({ 
            success: true, 
            message: 'Successfully unfollowed user' 
        });
    } catch (error) {
        console.error('Error unfollowing user:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Error unfollowing user' 
        });
    }
}));

export default router; 
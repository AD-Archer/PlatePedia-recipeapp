import express from 'express';
import { body, validationResult } from 'express-validator';
import { User } from '../models/TableCreation.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { isAuthenticated } from '../middleware/authMiddleware.js';
import bcrypt from 'bcrypt';
import { Recipe } from '../models/TableCreation.js';

const router = express.Router();

// Middleware to ensure user is authenticated
router.use(isAuthenticated);

// Show edit profile form
router.get('/edit', asyncHandler(async (req, res) => {
    const user = await User.findByPk(req.session.user.id);
    res.render('pages/profile/edit', {
        user,
        error: req.session.error,
        success: req.session.success
    });
    delete req.session.error;
    delete req.session.success;
}));

// Handle profile update
router.post('/edit', [
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
    body('currentPassword')
        .optional({ checkFalsy: true })
        .isLength({ min: 6 })
        .withMessage('Current password must be at least 6 characters'),
    body('newPassword')
        .optional({ checkFalsy: true })
        .isLength({ min: 6 })
        .withMessage('New password must be at least 6 characters'),
    body('confirmPassword')
        .optional({ checkFalsy: true })
        .custom((value, { req }) => {
            if (value !== req.body.newPassword) {
                throw new Error('Password confirmation does not match new password');
            }
            return true;
        }),
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
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            req.session.error = errors.array()[0].msg;
            return res.redirect('/profile/edit');
        }

        const user = await User.findByPk(req.session.user.id);
        if (!user) {
            req.session.error = 'User not found';
            return res.redirect('/login');
        }

        // Check if username or email is already taken
        if (req.body.username !== user.username) {
            const existingUsername = await User.findOne({
                where: { username: req.body.username }
            });
            if (existingUsername) {
                req.session.error = 'Username is already taken';
                return res.redirect('/profile/edit');
            }
        }

        if (req.body.email !== user.email) {
            const existingEmail = await User.findOne({
                where: { email: req.body.email }
            });
            if (existingEmail) {
                req.session.error = 'Email is already registered';
                return res.redirect('/profile/edit');
            }
        }

        // Handle password change if requested
        if (req.body.currentPassword && req.body.newPassword) {
            const isValidPassword = await bcrypt.compare(req.body.currentPassword, user.password);
            if (!isValidPassword) {
                req.session.error = 'Current password is incorrect';
                return res.redirect('/profile/edit');
            }
            // Hash the new password
            const hashedPassword = await bcrypt.hash(req.body.newPassword, 10);
            req.body.password = hashedPassword;
        }

        // Update user data
        await user.update({
            username: req.body.username,
            email: req.body.email,
            password: req.body.password || user.password,
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

        req.session.success = 'Profile updated successfully';
        res.redirect('/profile');
    } catch (error) {
        console.error('Profile update error:', error);
        req.session.error = 'Error updating profile';
        res.redirect('/profile/edit');
    }
}));

// View profile
router.get('/', asyncHandler(async (req, res) => {
    const user = await User.findByPk(req.session.user.id, {
        include: [
            {
                model: Recipe,
                as: 'recipes',
                limit: 5,
                order: [['createdAt', 'DESC']],
                include: [
                    {
                        model: User,
                        as: 'author',
                        attributes: ['username']
                    }
                ]
            },
            {
                model: Recipe,
                as: 'savedRecipes',
                limit: 5,
                order: [['createdAt', 'DESC']],
                include: [
                    {
                        model: User,
                        as: 'author',
                        attributes: ['username']
                    }
                ]
            },
            {
                model: User,
                as: 'followers'
            }
        ]
    });

    if (!user) {
        req.session.error = 'User not found';
        return res.redirect('/login');
    }

    res.render('pages/profile', {
        user,
        error: req.session.error,
        success: req.session.success
    });

    delete req.session.error;
    delete req.session.success;
}));

export default router; 
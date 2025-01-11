import express from 'express';
import { body, validationResult } from 'express-validator';
import { User, Recipe } from '../models/TableCreation.js';
import { isAuthenticated } from '../middleware/authMiddleware.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { Op } from 'sequelize';

const router = express.Router();

// View profile
router.get('/', isAuthenticated, asyncHandler(async (req, res) => {
    try {
        console.log('Profile route accessed:', {
            sessionUser: req.session.user,
            url: req.url
        });

        const user = await User.findByPk(req.session.user.id, {
            include: [
                {
                    model: Recipe,
                    as: 'userRecipes',
                    limit: 6,
                    order: [['createdAt', 'DESC']]
                },
                {
                    model: User,
                    as: 'followers'
                },
                {
                    model: User,
                    as: 'following'
                }
            ]
        });

        if (!user) {
            console.log('User not found in database');
            req.flash('error', 'User not found');
            return res.redirect('/login');
        }

        const userData = user.toJSON();
        console.log('User data:', userData);

        res.render('pages/profile/profile', {
            user: userData,
            path: '/profile'
        });
    } catch (error) {
        console.error('Error loading profile:', error);
        req.flash('error', 'Error loading profile');
        res.redirect('/dashboard');
    }
}));

// Show edit profile form
router.get('/edit', isAuthenticated, asyncHandler(async (req, res) => {
    try {
        const user = await User.findByPk(req.session.user.id);
        if (!user) {
            req.flash('error', 'User not found');
            return res.redirect('/login');
        }

        res.render('pages/profile/edit', {
            user: user.toJSON(),
            path: '/profile/edit'
        });
    } catch (error) {
        console.error('Error loading edit profile:', error);
        req.flash('error', 'Error loading edit profile page');
        res.redirect('/profile');
    }
}));

// Update profile
router.post('/edit', isAuthenticated, [
    body('username')
        .trim()
        .notEmpty()
        .withMessage('Username is required')
        .isLength({ min: 3, max: 30 })
        .withMessage('Username must be between 3 and 30 characters')
        .matches(/^[a-zA-Z0-9_]+$/)
        .withMessage('Username can only contain letters, numbers, and underscores'),
    body('email')
        .trim()
        .notEmpty()
        .withMessage('Email is required')
        .isEmail()
        .withMessage('Invalid email address'),
    body('bio')
        .optional({ checkFalsy: true })
        .trim()
        .isLength({ max: 500 })
        .withMessage('Bio must be less than 500 characters'),
    body('profileImage')
        .optional({ checkFalsy: true })
        .trim()
        .isURL()
        .withMessage('Profile image must be a valid URL')
], asyncHandler(async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            req.flash('error', errors.array()[0].msg);
            return res.redirect('/profile/edit');
        }

        const user = await User.findByPk(req.session.user.id);
        if (!user) {
            req.flash('error', 'User not found');
            return res.redirect('/login');
        }

        const { username, email, bio, profileImage } = req.body;

        // Check if username or email is already taken
        const existingUser = await User.findOne({
            where: {
                id: { [Op.ne]: user.id },
                [Op.or]: [
                    { username: username.toLowerCase() },
                    { email: email.toLowerCase() }
                ]
            }
        });

        if (existingUser) {
            req.flash('error', existingUser.username === username.toLowerCase() ? 
                'Username already taken' : 'Email already registered');
            return res.redirect('/profile/edit');
        }

        // Update user data
        await user.update({
            username: username.toLowerCase(),
            email: email.toLowerCase(),
            bio: bio || null,
            profileImage: profileImage || null
        });

        // Update session data
        req.session.user = {
            id: user.id,
            username: user.username,
            email: user.email,
            profileImage: user.profileImage
        };

        req.flash('success', 'Profile updated successfully');
        res.redirect('/profile');
    } catch (error) {
        console.error('Error updating profile:', error);
        req.flash('error', error.message || 'Error updating profile');
        res.redirect('/profile/edit');
    }
}));

export default router; 
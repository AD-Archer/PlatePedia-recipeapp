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
        const user = await User.findByPk(req.session.user.id, {
            include: [
                {
                    model: Recipe,
                    as: 'userRecipes',
                    limit: 6,
                    order: [['createdAt', 'DESC']]
                }
            ]
        });

        if (!user) {
            req.flash('error', 'User not found');
            return res.redirect('/login');
        }

        res.render('pages/profile/profile', {
            user: user.toJSON(),
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
        .notEmpty().withMessage('Username is required')
        .isLength({ min: 3, max: 30 }).withMessage('Username must be between 3 and 30 characters')
        .matches(/^[a-zA-Z0-9_-]+$/).withMessage('Username can only contain letters, numbers, underscores, and hyphens')
        .custom(async (value, { req }) => {
            const existingUser = await User.findOne({
                where: {
                    username: value.toLowerCase(),
                    id: { [Op.ne]: req.session.user.id } // Exclude current user
                }
            });
            if (existingUser) {
                throw new Error('Username is already taken');
            }
            return true;
        }),
    body('email')
        .trim()
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Invalid email address')
        .custom(async (value, { req }) => {
            const existingUser = await User.findOne({
                where: {
                    email: value.toLowerCase(),
                    id: { [Op.ne]: req.session.user.id } // Exclude current user
                }
            });
            if (existingUser) {
                throw new Error('Email is already registered');
            }
            return true;
        }),
    body('bio')
        .optional({ checkFalsy: true })
        .trim()
        .isLength({ max: 500 }).withMessage('Bio must be less than 500 characters'),
    body('profileImage')
        .optional({ checkFalsy: true })
        .trim()
        .isURL().withMessage('Profile image must be a valid URL')
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

        try {
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
            // Handle Sequelize unique constraint errors
            if (error.name === 'SequelizeUniqueConstraintError') {
                const field = error.errors[0].path;
                const message = field === 'username' ? 
                    'Username is already taken' : 
                    'Email is already registered';
                req.flash('error', message);
            } else {
                req.flash('error', 'Error updating profile');
                console.error('Profile update error:', error);
            }
            res.redirect('/profile/edit');
        }
    } catch (error) {
        console.error('Error in profile update route:', error);
        req.flash('error', 'An unexpected error occurred');
        res.redirect('/profile/edit');
    }
}));

export default router; 
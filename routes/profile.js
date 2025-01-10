import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import bcrypt from 'bcrypt';
import User from '../models/User.js';
import Recipe from '../models/Recipe.js';
import { isAuthenticated } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

const router = Router();

// View profile
router.get('/', isAuthenticated, asyncHandler(async (req, res) => {
    try {
        const user = await User.findByPk(req.session.user.id, {
            include: [
                {
                    model: Recipe,
                    as: 'userRecipes',
                    limit: 6,
                    order: [['createdAt', 'DESC']],
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
            req.session.error = 'User not found';
            return res.redirect('/login');
        }

        res.render('pages/profile/profile', {
            user,
            currentUser: req.session.user,
            error: req.session.error,
            success: req.session.success
        });

        delete req.session.error;
        delete req.session.success;
    } catch (error) {
        console.error('Error loading profile:', error);
        req.session.error = 'Error loading profile';
        res.redirect('/dashboard');
    }
}));

// Show edit profile form
router.get('/edit', isAuthenticated, asyncHandler(async (req, res) => {
    try {
        const user = await User.findByPk(req.session.user.id);
        if (!user) {
            req.session.error = 'User not found';
            return res.redirect('/login');
        }

        res.render('pages/profile/edit', {
            user,
            currentUser: req.session.user,
            error: req.session.error,
            success: req.session.success
        });

        delete req.session.error;
        delete req.session.success;
    } catch (error) {
        console.error('Error loading edit profile:', error);
        req.session.error = 'Error loading edit profile page';
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
        .withMessage('Username must be between 3 and 30 characters'),
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

        const { username, email, bio, profileImage } = req.body;

        // Update user data
        await user.update({
            username,
            email,
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

        req.session.success = 'Profile updated successfully';
        res.redirect('/profile');
    } catch (error) {
        console.error('Error updating profile:', error);
        req.session.error = error.message || 'Error updating profile';
        res.redirect('/profile/edit');
    }
}));

export default router; 
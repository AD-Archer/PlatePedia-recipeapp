import express from 'express';
import { body, validationResult } from 'express-validator';
import bcrypt from 'bcrypt';
import User from '../models/User.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { Op } from 'sequelize';
import sequelize from '../config/db.js';

const router = express.Router();

// Show signup form
router.get('/', (req, res) => {
    res.render('pages/signup', {
        error: req.session.error,
        success: req.session.success,
        formData: req.session.formData || {}
    });
    delete req.session.error;
    delete req.session.success;
    delete req.session.formData;
});

// Handle signup
router.post('/', [
    // Username validation
    body('username')
        .trim()
        .isLength({ min: 3, max: 30 }).withMessage('Username must be between 3 and 30 characters')
        .matches(/^[a-zA-Z0-9_-]+$/).withMessage('Username can only contain letters, numbers, underscores, and hyphens')
        .custom(async (value) => {
            const existingUser = await User.findOne({
                where: sequelize.or(
                    sequelize.where(
                        sequelize.fn('LOWER', sequelize.col('username')),
                        value.toLowerCase()
                    ),
                    sequelize.where(
                        sequelize.fn('LOWER', sequelize.col('email')),
                        value.toLowerCase()
                    )
                )
            });
            if (existingUser) {
                throw new Error('Username or email is already taken');
            }
            return true;
        }),

    // Email validation
    body('email')
        .trim()
        .isEmail().withMessage('Please enter a valid email')
        .normalizeEmail()
        .custom(async (value) => {
            const existingUser = await User.findOne({
                where: sequelize.or(
                    sequelize.where(
                        sequelize.fn('LOWER', sequelize.col('username')),
                        value.toLowerCase()
                    ),
                    sequelize.where(
                        sequelize.fn('LOWER', sequelize.col('email')),
                        value.toLowerCase()
                    )
                )
            });
            if (existingUser) {
                throw new Error('Username or email is already taken');
            }
            return true;
        }),

    // Password validation
    body('password')
        .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long')
        .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
        .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter')
        .matches(/[0-9]/).withMessage('Password must contain at least one number')
        .matches(/[!@#$%^&*]/).withMessage('Password must contain at least one special character (!@#$%^&*)'),

    // Password confirmation validation
    body('confirmPassword')
        .custom((value, { req }) => {
            if (value !== req.body.password) {
                throw new Error('Passwords do not match');
            }
            return true;
        })
], asyncHandler(async (req, res) => {
    console.log('Request body:', req.body);
    console.log('Content-Type:', req.headers['content-type']);

    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
        console.log('Validation errors:', errors.array());
        return res.status(400).json({ 
            success: false, 
            error: errors.array()[0].msg 
        });
    }

    try {
        const { username, email, password } = req.body;

        console.log('Creating user with:', { username, email });

        // Create user
        const user = await User.create({
            username,
            email,
            password: password // User model will hash this automatically
        });

        console.log('User created successfully:', user.id);

        res.json({ 
            success: true, 
            message: 'Account created successfully! Please log in.' 
        });

    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message || 'An error occurred during signup'
        });
    }
}));

export default router;
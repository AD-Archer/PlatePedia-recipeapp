import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import bcrypt from 'bcrypt';
import User from '../models/User.js';
import { Op } from 'sequelize';
import { generateToken } from '../utils/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

router.post('/login', [
    body('login')
        .trim()
        .notEmpty()
        .withMessage('Please enter your email or username'),
    body('password')
        .notEmpty()
        .withMessage('Password is required')
], asyncHandler(async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            req.session.error = errors.array()[0].msg;
            return res.redirect('/login');
        }

        const { login, password, remember } = req.body;

        // Find user by email or username
        const user = await User.findOne({
            where: {
                [Op.or]: [
                    { email: login.toLowerCase() },
                    { username: login.toLowerCase() }
                ]
            }
        });

        if (!user) {
            req.session.error = 'Invalid username/email or password';
            return res.redirect('/login');
        }

        // Rest of the login logic...
    } catch (error) {
        console.error('Login error:', error);
        req.session.error = 'Error during login';
        res.redirect('/login');
    }
})); 
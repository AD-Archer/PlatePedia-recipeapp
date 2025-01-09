import express from 'express';
import { body, validationResult } from 'express-validator';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import User from '../models/User.js';
import { Op } from 'sequelize';
import { getDb } from '../config/db.js';

const router = express.Router();
const sequelize = await getDb();

// Show login form
router.get('/', (req, res) => {
    res.render('pages/login', {
        error: req.session.error,
        success: req.session.success
    });
    delete req.session.error;
    delete req.session.success;
});

// Handle login
router.post('/', [
    body('identifier').trim().notEmpty().withMessage('Email or username is required'),
    body('password').notEmpty().withMessage('Password is required')
], async (req, res) => {
    try {
        console.log('Login attempt:', { identifier: req.body.identifier });
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            req.session.error = errors.array()[0].msg;
            return res.redirect('/login');
        }

        const { identifier, password, remember } = req.body;

        // Find user by email or username
        const user = await User.findOne({
            where: {
                [Op.or]: [
                    sequelize.where(
                        sequelize.fn('LOWER', sequelize.col('email')),
                        identifier.toLowerCase()
                    ),
                    sequelize.where(
                        sequelize.fn('LOWER', sequelize.col('username')),
                        identifier.toLowerCase()
                    )
                ]
            }
        });

        console.log('User found:', user ? 'yes' : 'no');

        if (!user) {
            req.session.error = 'Invalid credentials';
            return res.redirect('/login');
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password);
        console.log('Password check:', {
            provided: password ? 'yes' : 'no',
            stored: user.password ? 'yes' : 'no',
            valid: isValidPassword ? 'yes' : 'no'
        });
        
        if (!isValidPassword) {
            req.session.error = 'Invalid credentials';
            return res.redirect('/login');
        }

        // Set user session
        req.session.user = {
            id: user.id,
            username: user.username,
            email: user.email
        };

        // Wait for session to be saved
        await new Promise((resolve, reject) => {
            req.session.save((err) => {
                if (err) reject(err);
                else resolve();
            });
        });

        console.log('Session saved:', req.session.user);

        // Handle remember me
        if (remember) {
            // Generate remember token
            const token = crypto.randomBytes(32).toString('hex');
            const hashedToken = await bcrypt.hash(token, 10);
            
            // Save token to user
            await user.update({
                rememberToken: hashedToken,
                tokenExpires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
            });

            // Set remember me cookie
            res.cookie('rememberToken', `${user.id}:${token}`, {
                maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production'
            });
        }

        // Redirect to dashboard or previous page
        const redirectTo = req.session.returnTo || '/dashboard';
        delete req.session.returnTo;
        console.log('Redirecting to:', redirectTo);
        res.redirect(redirectTo);

    } catch (error) {
        console.error('Login error:', error);
        req.session.error = 'An error occurred during login';
        res.redirect('/login');
    }
});

export default router;
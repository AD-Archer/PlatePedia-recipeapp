import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import bcrypt from 'bcrypt';
import User from '../models/User.js';
import { Op } from 'sequelize';
import sequelize from '../config/db.js';
import { generateToken } from '../utils/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

const router = Router();

// Login routes
router.get('/login', (req, res) => {
    if (req.session.user) {
        return res.redirect('/dashboard');
    }
    res.render('pages/auth/login', {
        error: req.session.error,
        success: req.session.success
    });
    delete req.session.error;
    delete req.session.success;
});

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
        console.log('Login attempt:', {
            login,
            loginLower: login.toLowerCase(),
            isEmail: login.includes('@'),
            password: '***'
        });

        // First try direct email lookup
        let user = await User.findOne({
            where: {
                email: login.toLowerCase()
            }
        });

        // If no user found by email, try username
        if (!user) {
            user = await User.findOne({
                where: {
                    username: login.toLowerCase()
                }
            });
        }

        console.log('Search results:', {
            userFound: !!user,
            username: user?.username,
            email: user?.email
        });

        if (!user) {
            req.session.error = 'Invalid username/email or password';
            return res.redirect('/login');
        }

        // Verify password using bcrypt
        const validPassword = await bcrypt.compare(password, user.password);
        console.log('Password valid:', validPassword);

        if (!validPassword) {
            req.session.error = 'Invalid username/email or password';
            return res.redirect('/login');
        }

        // Set up session with user data
        req.session.user = {
            id: user.id,
            username: user.username,
            email: user.email,
            profileImage: user.profileImage
        };

        // Handle remember me token
        if (remember) {
            const token = await generateToken();
            await user.update({
                rememberToken: token,
                tokenExpires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            });
            res.cookie('remember_token', token, {
                maxAge: 30 * 24 * 60 * 60 * 1000,
                httpOnly: true
            });
        }

        console.log('Login successful, redirecting to dashboard');
        req.session.success = 'Welcome back, ' + user.username + '!';
        res.redirect('/dashboard');

    } catch (error) {
        console.error('Login error:', error);
        req.session.error = 'Error during login';
        res.redirect('/login');
    }
}));

// Logout route
router.get('/logout', (req, res) => {
    req.session.destroy();
    res.clearCookie('remember_token');
    res.redirect('/login');
});

export default router; 
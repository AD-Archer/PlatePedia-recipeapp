import express from 'express';
import { body, validationResult } from 'express-validator';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { User } from '../models/TableCreation.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = express.Router();

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
    body('email').isEmail().withMessage('Please enter a valid email'),
    body('password').notEmpty().withMessage('Password is required')
], asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        req.session.error = errors.array()[0].msg;
        return res.redirect('/login');
    }

    const { email, password } = req.body;

    try {
        // Find user by email
        const user = await User.findOne({ where: { email } });

        if (!user) {
            req.session.error = 'Invalid email or password';
            return res.redirect('/login');
        }

        // Check password
        const validPassword = await bcrypt.compare(password, user.password);

        if (!validPassword) {
            req.session.error = 'Invalid email or password';
            return res.redirect('/login');
        }

        // Set user session
        req.session.user = {
            id: user.id,
            username: user.username,
            email: user.email,
            profileImage: user.profileImage
        };

        // Save session and handle remember me token
        await new Promise((resolve, reject) => {
            req.session.save(async (err) => {
                if (err) {
                    reject(err);
                    return;
                }
                
                console.log('Session saved successfully:', req.sessionID);

                try {
                    // Handle "remember me"
                    if (req.body.remember) {
                        const token = crypto.randomBytes(32).toString('hex');
                        const expiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

                        await user.update({
                            rememberToken: token,
                            tokenExpires: expiry
                        });

                        res.cookie('remember_token', token, {
                            expires: expiry,
                            httpOnly: true,
                            secure: process.env.NODE_ENV === 'production'
                        });
                    }
                    resolve();
                } catch (error) {
                    reject(error);
                }
            });
        });

        // After successful login
        const returnTo = req.session.returnTo || '/dashboard';
        delete req.session.returnTo;

        // Ensure redirect happens after session is saved
        req.session.save((err) => {
            if (err) {
                console.error('Error saving session before redirect:', err);
            }
            res.redirect(returnTo);
        });

    } catch (error) {
        console.error('Login error:', error);
        req.session.error = 'An error occurred during login';
        res.redirect('/login');
    }
}));

export default router;
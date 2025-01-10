import express from 'express';
import { User } from '../models/TableCreation.js';
import bcrypt from 'bcrypt';
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
router.post('/', asyncHandler(async (req, res) => {
    const { username, password } = req.body;

    try {
        // Find user
        const user = await User.findOne({
            where: {
                username: username.toLowerCase()
            }
        });

        if (!user) {
            req.flash('error', 'Invalid username or password');
            return res.status(401).json({
                success: false,
                error: 'Invalid username or password'
            });
        }

        // Check password
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            req.flash('error', 'Invalid username or password');
            return res.status(401).json({
                success: false,
                error: 'Invalid username or password'
            });
        }

        // Set user session
        req.session.user = {
            id: user.id,
            username: user.username
        };

        // Wait for session to be saved
        await new Promise((resolve, reject) => {
            req.session.save((err) => {
                if (err) {
                    console.error('Session save error:', err);
                    reject(err);
                } else {
                    resolve();
                }
            });
        });

        console.log('Session saved:', req.session.user);

        // Send success response
        res.json({
            success: true,
            message: 'Login successful!'
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            error: 'An error occurred during login'
        });
    }
}));

export default router;
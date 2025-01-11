import express from 'express';
import { User } from '../models/TableCreation.js';
import bcrypt from 'bcrypt';
import { asyncHandler } from '../middleware/errorHandler.js';
import { Op } from 'sequelize';
import sequelize from '../config/db.js';

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
    const { login, password } = req.body;

    try {
        // Find user by username or email
        const user = await User.findOne({
            where: sequelize.or(
                sequelize.where(
                    sequelize.fn('LOWER', sequelize.col('username')),
                    sequelize.fn('LOWER', login.trim())
                ),
                sequelize.where(
                    sequelize.fn('LOWER', sequelize.col('email')),
                    sequelize.fn('LOWER', login.trim())
                )
            )
        });

        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'Invalid username/email or password'
            });
        }

        // Check password
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({
                success: false,
                error: 'Invalid username/email or password'
            });
        }

        // Set user session
        req.session.user = {
            id: user.id,
            username: user.username,
            email: user.email,
            profileImage: user.profileImage
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
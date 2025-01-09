import express from 'express';
import { body, validationResult } from 'express-validator';
import User from '../models/User.js';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

const router = express.Router();

// Middleware to ensure user is authenticated
const isAuthenticated = (req, res, next) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    next();
};

// Update profile
router.post('/update', isAuthenticated, [
    body('username').trim().isLength({ min: 3, max: 30 }),
    body('email').isEmail().normalizeEmail(),
    body('bio').trim().optional({ nullable: true, checkFalsy: true })
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ error: errors.array()[0].msg });
        }

        const { username, email, bio } = req.body;
        const userId = req.session.user.id;

        // Check if username or email is already taken
        const existingUser = await User.findOne({
            where: {
                id: { [Op.ne]: userId },
                [Op.or]: [{ username }, { email }]
            }
        });

        if (existingUser) {
            return res.status(400).json({
                error: 'Username or email already taken'
            });
        }

        // Update user
        await User.update(
            { username, email, bio },
            { where: { id: userId } }
        );

        // Update session
        const updatedUser = await User.findByPk(userId);
        req.session.user = updatedUser;

        res.json({ success: true });
    } catch (error) {
        console.error('Profile update error:', error);
        res.status(500).json({ error: 'Error updating profile' });
    }
});

// Change password
router.post('/change-password', isAuthenticated, [
    body('currentPassword').notEmpty(),
    body('newPassword').isLength({ min: 6 })
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ error: errors.array()[0].msg });
        }

        const { currentPassword, newPassword } = req.body;
        const user = await User.findByPk(req.session.user.id);

        // Verify current password
        const isValid = await user.validatePassword(currentPassword);
        if (!isValid) {
            return res.status(400).json({ error: 'Current password is incorrect' });
        }

        // Update password
        user.password = newPassword;
        await user.save();

        res.json({ success: true });
    } catch (error) {
        console.error('Password change error:', error);
        res.status(500).json({ error: 'Error changing password' });
    }
});

// Request password reset
router.post('/reset-password', [
    body('email').isEmail().normalizeEmail()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ error: errors.array()[0].msg });
        }

        const { email } = req.body;
        const user = await User.findOne({ where: { email } });

        if (!user) {
            // Return success even if user not found (security)
            return res.json({ success: true });
        }

        // Generate reset token
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour

        // Save token to user
        user.resetToken = resetToken;
        user.resetTokenExpiry = resetTokenExpiry;
        await user.save();

        // TODO: Send reset email
        console.log('Reset token:', resetToken);

        res.json({ success: true });
    } catch (error) {
        console.error('Password reset request error:', error);
        res.status(500).json({ error: 'Error requesting password reset' });
    }
});

export default router; 
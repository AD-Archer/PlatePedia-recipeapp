import express from 'express';
import UserManager from '../models/User.js';

const router = express.Router();

// Middleware to check if user is logged in
const isAuthenticated = (req, res, next) => {
    if (req.session.user) {
        next();
    } else {
        req.session.error = 'Please log in to view profile';
        res.redirect('/login');
    }
};

// Profile route
router.get('/', isAuthenticated, async (req, res) => {
    try {
        // Get fresh user data with recipes and other relations
        const userData = await UserManager.getUserWithDetails(req.session.user.id);
        
        res.render('pages/profile', {
            user: userData,
            error: req.session.error,
            success: req.session.success
        });
        
        // Clear flash messages
        delete req.session.error;
        delete req.session.success;
    } catch (error) {
        console.error('Profile error:', error);
        req.session.error = 'Error loading profile';
        res.redirect('/dashboard');
    }
});

export default router; 
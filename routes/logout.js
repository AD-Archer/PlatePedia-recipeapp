import express from 'express';
const router = express.Router();

router.get('/', (req, res) => {
    // Destroy the session
    req.session.destroy((err) => {
        if (err) {
            console.error('Error destroying session:', err);
        }
        // Redirect to home page
        res.redirect('/');
    });
});

export default router; 
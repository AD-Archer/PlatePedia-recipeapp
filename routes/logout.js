import express from 'express';
const router = express.Router();

router.get('/', (req, res) => {
    // Destroy the session
    req.session.destroy();
    
    // Redirect to home page
    res.redirect('/');
});

export default router; 
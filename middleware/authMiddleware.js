// This file is used to make sure that a can access certain features on certain pages on the site 


// Middleware to check if user is logged in
export const isAuthenticated = (req, res, next) => {
    if (req.session && req.session.user) {
        req.user = req.session.user; // Set the user object
        console.log('User authenticated:', req.user); // Log user info
        return next();
    }
    console.log('User not authenticated'); // Log if user is not authenticated
    res.status(401).json({ error: 'User not authenticated' });
};

// Middleware to check if user is NOT logged in (for login/signup pages)
export const isNotAuthenticated = (req, res, next) => {
    if (!req.session.user) {
        next();
    } else {
        res.redirect('/dashboard');
    }
}; 
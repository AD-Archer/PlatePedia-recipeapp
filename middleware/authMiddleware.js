// This file is used to make sure that a can access certain features on certain pages on the site 


// Middleware to check if user is logged in
export const isAuthenticated = (req, res, next) => {
    if (req.session.user) {
        next();
    } else {
        req.session.error = 'Please log in to access this page';
        res.redirect('/login');
    }
};

// Middleware to check if user is NOT logged in (for login/signup pages)
export const isNotAuthenticated = (req, res, next) => {
    if (!req.session.user) {
        next();
    } else {
        res.redirect('/dashboard');
    }
}; 
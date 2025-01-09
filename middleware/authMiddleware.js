// Middleware to check if user is logged in
export const isAuthenticated = (req, res, next) => {
    // Check if user is authenticated
    if (req.session && req.session.user && req.session.user.id) {
        // Refresh session
        req.session.touch();
        return next();
    }

    // Log authentication failure
    console.log('Authentication failed:', {
        sessionExists: !!req.session,
        userExists: !!req.session?.user,
        path: req.path,
        method: req.method
    });

    // If not authenticated but trying to access an API endpoint
    if (req.xhr || req.headers.accept?.includes('application/json')) {
        return res.status(401).json({
            success: false,
            error: 'Please log in to continue'
        });
    }

    // Store the requested URL to redirect back after login
    req.session.returnTo = req.originalUrl;
    
    // Set a more user-friendly message
    req.session.error = 'Please log in to access this feature';
    
    // Save session before redirecting
    req.session.save((err) => {
        if (err) {
            console.error('Session save error:', err);
        }
        res.redirect('/login');
    });
};

// Middleware to check if user is NOT logged in (for login/signup pages)
export const isNotAuthenticated = (req, res, next) => {
    if (!req.session.user) {
        next();
    } else {
        res.redirect('/dashboard');
    }
}; 
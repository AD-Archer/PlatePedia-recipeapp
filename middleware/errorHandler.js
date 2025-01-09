// Error handling middleware
export const errorHandler = (err, req, res, next) => {
    console.error('Error:', err);

    // Set locals, only providing error in development
    const error = {
        message: process.env.NODE_ENV === 'development' ? err.message : 'An error occurred',
        status: err.status || 500
    };

    // Add error to session for flash message
    req.session.error = error.message;

    // If it's an API request, send JSON response
    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
        return res.status(error.status).json({ 
            success: false, 
            error: error.message 
        });
    }

    // For regular requests, redirect with error message
    const redirectUrl = req.session.previousUrl || '/dashboard';
    // Save session before redirecting
    req.session.save((err) => {
        if (err) {
            console.error('Session save error:', err);
        }
        res.redirect(redirectUrl);
    });
};

// Store previous URL middleware
export const storePreviousUrl = (req, res, next) => {
    // Don't store URLs for errors or API endpoints
    if (!req.url.includes('/error') && !req.xhr) {
        req.session.previousUrl = req.originalUrl;
    }
    next();
};

// Async handler to catch errors in async routes
export const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
}; 
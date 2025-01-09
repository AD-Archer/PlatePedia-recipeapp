export const flashMiddleware = (req, res, next) => {
    // Transfer flash messages from session to res.locals
    res.locals.error = req.session.error;
    res.locals.success = req.session.success;
    
    // Clear flash messages immediately after transferring
    delete req.session.error;
    delete req.session.success;
    
    next();
}; 
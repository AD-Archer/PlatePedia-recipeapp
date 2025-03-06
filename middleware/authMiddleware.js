// This file is used to make sure that a can access certain features on certain pages on the site 


/**
 * Middleware to check if user is authenticated
 */
export const isAuthenticated = (req, res, next) => {
  // For debugging
  console.log('Checking authentication:', {
    session: req.session,
    user: req.session?.user,
    url: req.url
  });
  
  if (req.session?.user) {
    return next();
  }
  
  // Store the URL they were trying to access
  req.session.previousUrl = req.originalUrl;
  req.session.error = 'Please log in to access this page';
  res.redirect('/login');
};

// Middleware to check if user is NOT logged in (for login/signup pages)
export const isNotAuthenticated = (req, res, next) => {
    if (!req.session.user) {
        req.flash('error', 'Please log in to access PlatePedia features');
        return res.redirect('/login');
    }
}; 
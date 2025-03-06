/**
 * Middleware to add user to response locals
 */
export const addUserToLocals = (req, res, next) => {
  // Add user to res.locals if it exists in the session
  res.locals.user = req.session?.user || null;
  next();
}; 
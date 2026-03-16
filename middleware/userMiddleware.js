/**
 * Middleware to add common locals to all views
 */
export const addUserToLocals = (req, res, next) => {
  // Add user to res.locals if it exists in the session
  res.locals.user = req.session?.user || null;

  // Allow templates to set an analytics domain for Plausible / Vercel Insights.
  // Set ANALYTICS_DOMAIN in production (e.g. platepedia.vercel.app) to avoid tracking localhost.
  res.locals.analyticsDomain = process.env.ANALYTICS_DOMAIN || req.hostname;

  next();
};

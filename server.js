//Entry point to our application. server.js

import express from 'express';
import cookieParser from 'cookie-parser';
import { fileURLToPath } from 'url';
import path from 'path';
import 'dotenv/config';
import session from 'express-session';
import { errorHandler, storePreviousUrl } from './middleware/errorHandler.js';
import sequelize from './config/db.js'; // Updated to import sequelize from db.js
import { flashMiddleware } from './middleware/flashMiddleware.js';
import { User, Recipe, Category, UserFollows, SavedRecipe, RecipeCategory } from './models/TableCreation.js';
import flash from 'connect-flash';
import cache from 'memory-cache'; // Import memory-cache

// Import routes
import signup from './routes/signup.js';
import login from './routes/login.js';
import dashboard from './routes/dashboard.js';
import logout from './routes/logout.js';
import recipesRouter from './routes/recipes.js';
import usersRouter from './routes/users.js';
import profileRouter from './routes/profile.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const url = "localhost" // this can be changed if you wish but for dev purposes localhost works fine

// Initialize database and sync models
async function initializeDatabase() {
    try {
        console.log('Database URL:', process.env.DATABASE_URL ? 'Set' : 'Not set');
        // Use the sequelize instance to authenticate
        await sequelize.authenticate();
        console.log('Database connection successful');
        // Sync models with alter option to preserve data
        await User.sync({ alter: true });
        await Category.sync({ alter: true });
        await Recipe.sync({ alter: true });
        await RecipeCategory.sync({ alter: true });
        await UserFollows.sync({ alter: true });
        await SavedRecipe.sync({ alter: true });
    } catch (error) {
        console.error('Database connection error:', error);
        throw new Error('Database connection failed');
    }
}

app.enable('trust proxy');

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    },
    store: new session.MemoryStore()
}));

// Flash messages middleware
app.use(flash());

// Middleware to set flash messages in response locals
app.use((req, res, next) => {
    res.locals.error = req.flash('error');
    res.locals.success = req.flash('success');
    res.locals.user = req.session.user; // Ensure user is available in all views
    next();
});

// User and flash message middleware
app.use((req, res, next) => {
    res.locals.user = req.session.user;
    next();
});
app.use(flashMiddleware);

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use(storePreviousUrl);

// API routes first
app.get('/api/healthcheck', async (req, res) => {
    try {
        await sequelize.authenticate();
        res.status(200).json({ status: 'healthy' });
    } catch (error) {
        res.status(500).json({ status: 'unhealthy', error: error.message });
    }
});

// Main routes
app.use('/signup', signup);
app.use('/login', login);
app.use('/logout', logout);
app.use('/recipes', recipesRouter);
app.use('/users', usersRouter);
app.use('/profile', profileRouter);
app.use('/', dashboard);

// Debug middleware
app.use((req, res, next) => {
    console.log('Request URL:', req.url);
    console.log('Session user:', req.session.user);
    next();
});

// 404 handler
app.use((req, res) => {
    console.log('404 - Not Found:', req.url);
    res.status(404).render('pages/error', {
        error: 'Page not found',
        path: req.url,
        user: req.session.user
    });
});

// Error handler must be last
app.use(errorHandler);

// SEO routes
app.get('/manifest.json', (req, res) => {
    res.type('application/json');
    res.sendFile(path.join(__dirname, '/public/manifest.json'));
});

app.get('/sitemap.xml', async (req, res) => {
    try {
        // Check if recipes and categories are cached
        let recipes = cache.get('recipes');
        let categories = cache.get('categories');

        // If not cached, fetch from the database
        if (!recipes) {
            recipes = await Recipe.findAll();
            cache.put('recipes', recipes, 1000 * 60 * 5); // Cache for 5 minutes
        }

        if (!categories) {
            categories = await Category.findAll();
            cache.put('categories', categories, 1000 * 60 * 5); // Cache for 5 minutes
        }

        // Log the fetched recipes to check their structure
        console.log('Fetched Recipes:', recipes);

        // Start building the sitemap XML
        let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:mobile="http://www.google.com/schemas/sitemap-mobile/1.0">
`;

        // Add the homepage URL
        sitemap += `
    <url>
        <loc>https://food-finder-sepia.vercel.app/</loc>
        <lastmod>${new Date().toISOString()}</lastmod>
        <priority>1.00</priority>
        <mobile:mobile>yes</mobile:mobile>
    </url>`;

        // Loop through each recipe and add it to the sitemap
        recipes.forEach(recipe => {
            // Escape recipe title to prevent XML errors
            const title = escapeXML(recipe.title);
            const description = `Discover the recipe for ${title} on Food Finder.`;

            sitemap += `
    <url>
        <loc>https://food-finder-sepia.vercel.app/recipes/${recipe.id}</loc>
        <lastmod>${new Date(recipe.updatedAt).toISOString()}</lastmod>
        <priority>0.80</priority>
        <meta name="description" content="${description}"></meta>
        <mobile:mobile>yes</mobile:mobile>
    </url>`;
        });

        // Loop through each category and add it to the sitemap
        categories.forEach(category => {
            sitemap += `
    <url>
        <loc>https://food-finder-sepia.vercel.app/recipes/browse?category=${category.id}</loc>
        <lastmod>${new Date().toISOString()}</lastmod>
        <priority>0.70</priority>
        <mobile:mobile>yes</mobile:mobile>
    </url>`;
        });

        // Add other important URLs, like users, login, etc.
        const additionalUrls = [
            { loc: '/users', priority: '0.70' },
            { loc: '/recipes/browse', priority: '0.90' },
            { loc: '/login', priority: '0.80' },
            { loc: '/signup', priority: '0.80' },
            { loc: '/users/themealdb', priority: '0.80' },
        ];

        additionalUrls.forEach(page => {
            sitemap += `
    <url>
        <loc>https://food-finder-sepia.vercel.app${page.loc}</loc>
        <lastmod>${new Date().toISOString()}</lastmod>
        <priority>${page.priority}</priority>
        <mobile:mobile>yes</mobile:mobile>
    </url>`;
        });

        // Close the urlset tag properly
        sitemap += `
</urlset>`;

        // Set the content type and send the sitemap
        res.header('Content-Type', 'application/xml');
        res.send(sitemap);
    } catch (error) {
        console.error('Error generating sitemap:', error);
        res.status(500).send('Error generating sitemap');
    }
});

app.get('/robots.txt', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'robots.txt'));
});

// Start server based on environment
if (!process.env.VERCEL) {
    const PORT = process.env.PORT || 2555;
    // Initialize database and start server
    try {
        await initializeDatabase();
        app.listen(PORT, () => {
            console.log(`Server running on http://${url}:${PORT}`);
            console.log(`Environment: ${process.env.NODE_ENV}`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

export default app;

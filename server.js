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
import './utils/dataSync.js';  // Initialize data sync
import { Op } from 'sequelize';

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

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Bypass authentication for public files
app.use((req, res, next) => {
    if (req.path === '/manifest.json' || 
        req.path.startsWith('/images/') || 
        req.path === '/robots.txt') {
        return next();
    }
    next();
});

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false,
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

app.get('/dashboard', (req, res) => { // i make the mistake of redirecting to the dashboard route, which doesnt exist anymore so i need this
    res.redirect('/');
});

// SEO routes
app.get('/manifest.json', (req, res) => {
    // Ensure no auth required
    res.set({
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=3600'
    });

    const manifest = {
        "name": "PlatePedia - Recipe Videos & Cooking Tutorials",
        "short_name": "PlatePedia",
        "start_url": "/",
        "display": "standalone",
        "background_color": "#ffffff",
        "theme_color": "#ffffff",
        "description": "PlatePedia is your ultimate cooking companion, featuring video tutorials, step-by-step recipes, and a vibrant community of food enthusiasts. Learn from expert chefs, discover global cuisines, and master cooking techniques with our comprehensive collection of video-guided recipes.",
        "icons": [
            {
                "src": "/images/burger.svg",
                "sizes": "any",
                "type": "image/svg+xml"
            },
            {
                "src": "/images/burger.png",
                "sizes": "512x512",
                "type": "image/png"
            },
            {
                "src": "/images/burger.png",
                "sizes": "192x192",
                "type": "image/png"
            },
            {
                "src": "/images/burger.png",
                "sizes": "32x32",
                "type": "image/png"
            },
            {
                "src": "/images/burger.png",
                "sizes": "16x16",
                "type": "image/png"
            }
        ]
    };

    res.status(200).json(manifest);
});

function escapeXML(str) {
    return str.replace(/[<>&'"]/g, c => ({
        '<': '&lt;',
        '>': '&gt;',
        '&': '&amp;',
        '\'': '&apos;',
        '"': '&quot;',
    }[c]));
}

app.get('/sitemap.xml', async (req, res) => {
    try {
        // Fetch recipes with specific attributes
        const recipes = await Recipe.findAll({
            attributes: ['id', 'title', 'updatedAt'],
            where: {
                title: {
                    [Op.ne]: null  // Only get recipes with titles
                }
            },
            raw: true
        });

        const categories = await Category.findAll({
            attributes: ['id', 'name'],
            raw: true
        });

        // Start building the sitemap
        let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:mobile="http://www.google.com/schemas/sitemap-mobile/1.0">`;

        // Add homepage
        sitemap += `
    <url>
        <loc>https://platepedia.vercel.app/</loc>
        <lastmod>${new Date().toISOString()}</lastmod>
        <priority>1.00</priority>
        <mobile:mobile>yes</mobile:mobile>
    </url>`;

        // Add recipes with SEO-friendly URLs
        recipes.forEach(recipe => {
            // Create URL-safe title
            const safeTitle = recipe.title
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')  // Replace non-alphanumeric chars with hyphens
                .replace(/^-+|-+$/g, '')      // Remove leading/trailing hyphens
                .substring(0, 50);            // Limit length

            sitemap += `
    <url>
        <loc>https://platepedia.vercel.app/recipes/${safeTitle}</loc>
        <lastmod>${new Date(recipe.updatedAt || new Date()).toISOString()}</lastmod>
        <priority>0.80</priority>
        <mobile:mobile>yes</mobile:mobile>
    </url>`;
        });

        // Add categories with SEO-friendly URLs
        categories.forEach(category => {
            const safeName = category.name
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-+|-+$/g, '');

            sitemap += `
    <url>
        <loc>https://platepedia.vercel.app/recipes/browse?category=${safeName}</loc>
        <lastmod>${new Date().toISOString()}</lastmod>
        <priority>0.70</priority>
        <mobile:mobile>yes</mobile:mobile>
    </url>`;
        });

        // Close sitemap
        sitemap += `</urlset>`;

        // Send sitemap as XML
        res.header('Content-Type', 'application/xml').send(sitemap);
    } catch (error) {
        console.error('Error generating sitemap:', error);
        res.status(500).send('Error generating sitemap');
    }
});


app.get('/robots.txt', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'robots.txt'));
});
app.get('/ads.txt', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'ads.txt'));
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

// Initialize database
try {
    await initializeDatabase();
    
    // Start server if not in Vercel
    if (!process.env.VERCEL) {
        const PORT = process.env.PORT || 2555;
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    }
} catch (error) {
    console.error('Failed to initialize database:', error);
}

export default app;

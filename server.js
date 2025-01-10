import express from 'express';
import cookieParser from 'cookie-parser';
import { fileURLToPath } from 'url';
import path from 'path';
import 'dotenv/config';
import session from 'express-session';
import UserManager from './models/User.js';
import { errorHandler, storePreviousUrl } from './middleware/errorHandler.js';
import { getDb } from './config/db.js';
import { flashMiddleware } from './middleware/flashMiddleware.js';
import { User, Recipe, Category, UserFollows, SavedRecipe, RecipeCategory } from './models/TableCreation.js';
import { Sequelize } from 'sequelize';
import flash from 'connect-flash';


// Import routes
import signup from './routes/signup.js';
import login from './routes/login.js';
import dashboard from './routes/dashboard.js';
import logout from './routes/logout.js';
import recipesRouter from './routes/recipes.js';
import usersRouter from './routes/users.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Initialize database and sync models
async function initializeDatabase() {
    try {
        const sequelize = await getDb();
        await sequelize.authenticate();
        console.log('Database connection successful');

        // Sync models with alter option to preserve data
        await User.sync({ alter: true });
        await Category.sync({ alter: true });
        await Recipe.sync({ alter: true });
        await RecipeCategory.sync({ alter: true });
        await UserFollows.sync({ alter: true });
        await SavedRecipe.sync({ alter: true });

        // Keep your initial data creation logic
        const categoryCount = await Category.count();
        if (categoryCount === 0) {
            // Your existing category creation code...
            const categories = await Category.bulkCreate([
                // Meal Types
                { name: 'Breakfast', type: 'meal', imageUrl: 'https://www.themealdb.com/images/category/breakfast.png' },
                { name: 'Lunch', type: 'meal', imageUrl: 'https://www.themealdb.com/images/category/miscellaneous.png' },
                // ... rest of your categories
            ]);
        }

        console.log('Database synchronized successfully');
    } catch (error) {
        console.error('Database initialization error:', error);
        throw error;
    }
}

// Initialize database connection for each request
app.use(async (req, res, next) => {
    try {
        console.log('Database URL:', process.env.DATABASE_URL ? 'Set' : 'Not set');
        const sequelize = await getDb();
        await sequelize.authenticate();
        console.log('Database connection successful');
        next();
    } catch (error) {
        console.error('Database connection error:', error);
        const message = process.env.NODE_ENV === 'production' 
            ? 'Internal server error' 
            : error.message;
        return res.status(500).json({ 
            error: 'Database connection failed',
            message
        });
    }
});

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
    console.log('Session user:', req.session.user);
    next();
});
app.use(flashMiddleware);

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use(storePreviousUrl);

// Health check route
app.get('/api/debug', (req, res) => {
    res.json({
        env: {
            NODE_ENV: process.env.NODE_ENV,
            DATABASE_URL: process.env.DATABASE_URL ? 'Set' : 'Not set',
            SESSION_SECRET: process.env.SESSION_SECRET ? 'Set' : 'Not set'
        },
        session: {
            exists: !!req.session,
            id: req.sessionID,
            cookie: req.session?.cookie
        },
        headers: req.headers,
        user: req.session?.user || null
    });
});

app.get('/api/healthcheck', async (req, res) => {
    try {
        const sequelize = getDb();
        await sequelize.authenticate();
        res.status(200).json({ status: 'healthy' });
    } catch (error) {
        console.error('Health check failed:', error);
        res.status(500).json({ status: 'unhealthy', error: error.message });
    }
});

// Main routes
app.get('/', async (req, res) => {
    try {
        // Fetch recipes
        const popularRecipes = await Recipe.findAll({
            include: [{
                model: User,
                as: 'author',
                attributes: ['username', 'id']
            }],
            order: [['createdAt', 'DESC']],
            limit: 6
        });

        const latestRecipes = await Recipe.findAll({
            include: [{
                model: User,
                as: 'author',
                attributes: ['username', 'id']
            }],
            order: [['createdAt', 'DESC']],
            limit: 8
        });

        // Get categories with recipe count using sequelize instance
        const sequelize = await getDb();
        const categories = await Category.findAll({
            attributes: {
                include: [
                    [
                        sequelize.literal(
                            '(SELECT COUNT(*) FROM recipe_categories WHERE recipe_categories."categoryId" = "Category".id)'
                        ),
                        'recipeCount'
                    ]
                ]
            },
            order: [['type', 'ASC'], ['name', 'ASC']]
        });

        // Group categories by type
        const groupedCategories = categories.reduce((acc, category) => {
            const type = category.type || 'Other';
            if (!acc[type]) acc[type] = [];
            acc[type].push(category);
            return acc;
        }, {});

        // Add saved status only if user is logged in
        const processedPopularRecipes = req.user ? 
            await addSavedStatus(popularRecipes, req.user) : 
            popularRecipes;
            
        const processedLatestRecipes = req.user ? 
            await addSavedStatus(latestRecipes, req.user) : 
            latestRecipes;

        res.render('pages/dashboard', {
            user: req.user,
            popularRecipes: processedPopularRecipes,
            latestRecipes: processedLatestRecipes,
            groupedCategories
        });
    } catch (error) {
        console.error('Error loading dashboard:', error);
        res.status(500).render('pages/error', { 
            message: 'Error loading dashboard', 
            error 
        });
    }
});
app.use('/signup', signup);
app.use('/login', login);
app.use('/dashboard', dashboard);
app.use('/logout', logout);
app.use('/recipes', recipesRouter);
app.use('/users', usersRouter);

// Catch-all route
app.get('*', (req, res) => res.redirect('/'));

// Error handler must be last
app.use(errorHandler);

// Start server based on environment
if (!process.env.VERCEL) {
    const PORT = process.env.PORT || 2555;
    // Initialize database and start server
    try {
        await initializeDatabase();
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
            console.log(`Environment: ${process.env.NODE_ENV}`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

export default app;
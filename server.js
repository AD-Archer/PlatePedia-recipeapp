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


// Import routes
import signup from './routes/signup.js';
import login from './routes/login.js';
import dashboard from './routes/dashboard.js';
import logout from './routes/logout.js';
import recipes from './routes/recipes.js';
import users from './routes/users.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Initialize database and sync models
async function initializeDatabase() {
    try {
        const sequelize = await getDb();
        await sequelize.authenticate();
        console.log('Database connection successful');

        // Sync all models with the database
        console.log('Syncing database models...');
        await User.sync({ alter: true });
        await Category.sync({ alter: true });
        await Recipe.sync({ alter: true });
        await RecipeCategory.sync({ alter: true });
        await UserFollows.sync({ alter: true });
        await SavedRecipe.sync({ alter: true });

        // Add some initial data
        console.log('Adding initial data...');

        // Check if we need to create initial data
        const categoryCount = await Category.count();
        if (categoryCount === 0) {
            // Create categories with types
            const categories = await Category.bulkCreate([
                // Meal Types
                { name: 'Breakfast', type: 'meal', imageUrl: 'https://www.themealdb.com/images/category/breakfast.png' },
                { name: 'Lunch', type: 'meal', imageUrl: 'https://www.themealdb.com/images/category/miscellaneous.png' },
                { name: 'Dinner', type: 'meal', imageUrl: 'https://www.themealdb.com/images/category/miscellaneous.png' },
                
                // Main Ingredients
                { name: 'Beef', type: 'ingredient', imageUrl: 'https://www.themealdb.com/images/category/beef.png' },
                { name: 'Chicken', type: 'ingredient', imageUrl: 'https://www.themealdb.com/images/category/chicken.png' },
                { name: 'Lamb', type: 'ingredient', imageUrl: 'https://www.themealdb.com/images/category/lamb.png' },
                { name: 'Pork', type: 'ingredient', imageUrl: 'https://www.themealdb.com/images/category/pork.png' },
                { name: 'Seafood', type: 'ingredient', imageUrl: 'https://www.themealdb.com/images/category/seafood.png' },
                
                // Course Types
                { name: 'Starter', type: 'course', imageUrl: 'https://www.themealdb.com/images/category/starter.png' },
                { name: 'Side', type: 'course', imageUrl: 'https://www.themealdb.com/images/category/side.png' },
                { name: 'Dessert', type: 'course', imageUrl: 'https://www.themealdb.com/images/category/dessert.png' },
                
                // Dish Types
                { name: 'Pasta', type: 'dish', imageUrl: 'https://www.themealdb.com/images/category/pasta.png' },
                
                // Dietary
                { name: 'Vegetarian', type: 'dietary', imageUrl: 'https://www.themealdb.com/images/category/vegetarian.png' },
                { name: 'Vegan', type: 'dietary', imageUrl: 'https://www.themealdb.com/images/category/vegan.png' }
            ]);
        }
        else {
            // Update existing categories with types if they don't have them
            const categories = await Category.findAll();
            for (const category of categories) {
                if (!category.type) {
                    let type = 'meal';  // default type
                    if (['Beef', 'Chicken', 'Lamb', 'Pork', 'Seafood'].includes(category.name)) {
                        type = 'ingredient';
                    } else if (['Starter', 'Side', 'Dessert'].includes(category.name)) {
                        type = 'course';
                    } else if (['Pasta'].includes(category.name)) {
                        type = 'dish';
                    } else if (['Vegetarian', 'Vegan'].includes(category.name)) {
                        type = 'dietary';
                    }
                    await category.update({ type });
                }
            }
        }

        console.log('Database sync complete');
    } catch (error) {
        console.error('Database initialization error:', error);
        process.exit(1);
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
    saveUninitialized: true,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    },
    store: new session.MemoryStore()
}));

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
app.get('/', dashboard);
app.use('/signup', signup);
app.use('/login', login);
app.use('/dashboard', dashboard);
app.use('/logout', logout);
app.use('/recipes', recipes);
app.use('/users', users);

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
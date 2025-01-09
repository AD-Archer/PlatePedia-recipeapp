import express from 'express';
import cookieParser from 'cookie-parser';
import { fileURLToPath } from 'url';
import path from 'path';
import 'dotenv/config';
import session from 'express-session';
import UserManager from './models/User.js';
import { errorHandler, storePreviousUrl } from './middleware/errorHandler.js';
import sequelize from './config/db.js';
import { flashMiddleware } from './middleware/flashMiddleware.js';

// Import routes
import signup from './routes/signup.js';
import login from './routes/login.js';
import dashboard from './routes/dashboard.js';
import logout from './routes/logout.js';
import profile from './routes/profile.js';
import recipes from './routes/recipes.js';
import users from './routes/users.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const createServer = () => {
    const app = express();
    app.enable('trust proxy');

    // Middleware
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use(cookieParser());

    // Session configuration
    app.use(session({
        secret: process.env.SESSION_SECRET,
        resave: true,
        saveUninitialized: true,
        cookie: {
            secure: false,
            httpOnly: true,
            maxAge: 1000 * 60 * 60 * 24 * 7,
            sameSite: 'lax'
        },
        rolling: true,
        name: 'foodfinder.sid',
        store: new session.MemoryStore()
    }));

    // Add session debugging middleware
    app.use((req, res, next) => {
        console.log('Session ID:', req.sessionID);
        console.log('Session Data:', req.session);
        console.log('Is Authenticated:', !!req.session.user);
        next();
    });

    // User and flash message middleware
    app.use((req, res, next) => {
        res.locals.user = req.session.user;
        next();
    });
    app.use(flashMiddleware);

    // Remember me token
    app.use(async (req, res, next) => {
        if (!req.session.user && req.cookies.rememberToken) {
            try {
                const [userId, token] = req.cookies.rememberToken.split(':');
                const isValid = await UserManager.validateRememberToken(userId, token);
                
                if (isValid) {
                    const user = await UserManager.findById(userId);
                    if (user) {
                        req.session.user = user;
                        const newToken = await UserManager.generateRememberToken(userId);
                        res.cookie('rememberToken', `${userId}:${newToken}`, {
                            maxAge: 30 * 24 * 60 * 60 * 1000,
                            httpOnly: true,
                            secure: process.env.NODE_ENV === 'production'
                        });
                    }
                }
            } catch (error) {
                console.error('Remember token error:', error);
            }
        }
        next();
    });

    // View engine setup
    app.set('view engine', 'ejs');
    app.set('views', path.join(__dirname, 'views'));
    app.use(express.static(path.join(__dirname, 'public')));

    // Routes
    app.use(storePreviousUrl);

    // Test route for session verification
    app.get('/session-test', (req, res) => {
        res.json({
            sessionID: req.sessionID,
            session: req.session,
            user: req.session.user,
            cookies: req.cookies
        });
    });

    app.get('/check-session', (req, res) => {
        res.json({
            sessionExists: !!req.session,
            user: req.session.user || null,
            sessionID: req.sessionID
        });
    });
    app.get('/', (req, res) => res.render('pages/landingpage'));
    app.use('/signup', signup);
    app.use('/login', login);
    app.use('/dashboard', dashboard);
    app.use('/logout', logout);
    app.use('/profile', profile);
    app.use('/recipes', recipes);
    app.use('/users', users);
    app.get('*', (req, res) => res.redirect('/'));

    // Error handler
    app.use(errorHandler);

    return app;
};

// Database initialization
let isDbInitialized = false;

async function initDb() {
    if (!isDbInitialized) {
        try {
            await sequelize.authenticate();
            console.log('Database connection established.');
            isDbInitialized = true;
        } catch (error) {
            console.error('Database connection error:', error);
            throw error;
        }
    }
}

// Initialize database
await initDb();

const app = createServer();

// Start server in development
if (process.env.NODE_ENV !== 'production') {
    const port = process.env.PORT || 2555;
    app.listen(port, () => {
        console.log(`Server is running on port http://localhost:${port}`);
    });
}

// Export for Vercel
export default app;
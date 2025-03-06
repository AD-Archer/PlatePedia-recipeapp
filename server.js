//Entry point to our application. server.js

import express from 'express';
import cookieParser from 'cookie-parser';
import { fileURLToPath } from 'url';
import path from 'path';
import 'dotenv/config';
import session from 'express-session';
import { errorHandler, storePreviousUrl } from './middleware/errorHandler.js';
import { flashMiddleware } from './middleware/flashMiddleware.js';
import flash from 'connect-flash';
import { addUserToLocals } from './middleware/userMiddleware.js';

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

// Create data directory if it doesn't exist
import fs from 'fs';
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir);
}

// Copy mealdb_recipes.json to data directory if it doesn't exist
const jsonFilePath = path.join(dataDir, 'mealdb_recipes.json');
if (!fs.existsSync(jsonFilePath)) {
  // You'll need to make sure the file exists in the root directory first
  // This assumes you've run the Python script to generate it
  try {
    if (fs.existsSync(path.join(__dirname, 'mealdb_recipes.json'))) {
      fs.copyFileSync(
        path.join(__dirname, 'mealdb_recipes.json'), 
        jsonFilePath
      );
      console.log('Copied mealdb_recipes.json to data directory');
    } else {
      console.warn('mealdb_recipes.json not found in root directory');
      console.log('Please run: python fetch_mealdb_data.py to generate the data file');
    }
  } catch (error) {
    console.error('Error copying mealdb_recipes.json:', error);
  }
}

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: process.env.NODE_ENV === 'production' }
}));

app.use(flash());
app.use(flashMiddleware);
app.use(storePreviousUrl);

// Add user to all templates - IMPORTANT: This must be before routes
app.use(addUserToLocals);

// Set view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Routes
app.use('/', dashboard);
app.use('/signup', signup);
app.use('/login', login);
app.use('/logout', logout);
app.use('/recipes', recipesRouter);
app.use('/users', usersRouter);
app.use('/profile', profileRouter);

// Error handling
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).render('pages/error', { 
    error: 'Page not found',
    message: 'The page you are looking for does not exist.'
  });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://${url}:${PORT}`);
});

export default app;

# FoodFinder-Recipeapp 🍳

A modern recipe management application that lets users discover, create, and share recipes. Built with Node.js, Express, and PostgreSQL.

## Features 🌟

- **Recipe Management**
  - Create and share recipes
  - Browse recipes by categories
  - Save favorite recipes
  - Filter by meal type, ingredients, and dietary preferences

- **User Features**
  - User profiles with saved recipes
  - Follow other chefs
  - View cooking history
  - Personal recipe collections

- **Categories**
  - Meal Types (Breakfast, Lunch, Dinner)
  - Main Ingredients (Beef, Chicken, Lamb, Pork, Seafood)
  - Course Types (Starter, Side, Dessert)
  - Dish Types (Pasta)
  - Dietary (Vegetarian, Vegan)

## Installation 🚀

1. Clone the repository
```bash
git clone https://github.com/AD-archer/FoodFinder-Recipeapp.git
cd FoodFinder-Recipeapp
```

2. Install dependencies
```bash
npm install
```

3. Create a `.env` file in the root directory with:
```plaintext
DATABASE_URL=your_postgresql_url
SESSION_SECRET=your_session_secret
NODE_ENV=development
PORT=2555
```

4. Start the development server
```bash
npm run dev
```

## Database Setup 🗄️

Initialize the database with categories:
```bash
node seeders/categorySeeder.js
```

Or import sample recipes from MealDB:
```bash
node seedMealDB.js
```

## Project Structure 📁
```plaintext
FoodFinder-Recipeapp/
├── config/          # Database and app configuration
├── models/          # Sequelize models
├── routes/          # Express routes
├── views/           # EJS templates
├── public/          # Static assets
├── seeders/         # Database seeders note: seedMealDB is placed in root to ensure that it is not used by accident 
└── server.js        # Application entry point
```

## License 📝

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Author ✨

- A^2

## Acknowledgments 🙏

- TheMealDB for recipe data
- Bootstrap for UI components
- Express.js community

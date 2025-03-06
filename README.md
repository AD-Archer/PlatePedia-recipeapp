# This is a Demostration version of Platepedia, a recipe management application.
The original project used a neon postgres database, this version uses a json file to simulate a database. the orignal project's repo can be found [here](https://github.com/AD-Archer/PlatePedia-recipeapp/tree/Retired)

# Features
The features will remain the same, minus the following mechanics:
- User authentication
- User profiles
- User follow mechanics
- User recipe collections

# Unique Instation Requirements
- Scripts, we now have a npm run setup to run the setup script that will create the json file if it doesn't exist, and populate the database with the data.
- You will need to run the python script to populate the json file, this can be found in the root of the repo. then place it inside the data folder(I have done this already so technically you don't need to worry about this unless you want to use different data)


# Platepedia-Recipeapp 🍳

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

## Troubleshooting

If recipe images don't load properly, it might be due to CORS restrictions. The application uses images from TheMealDB API, which may be blocked by some browsers. Try using a browser extension that disables CORS restrictions for development purposes.

## License 📝

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Author ✨

- A^2

## Acknowledgments 🙏

- TheMealDB for recipe data
- Bootstrap for UI components
- Express.js community

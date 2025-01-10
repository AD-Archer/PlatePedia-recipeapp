import User from './User.js';
import Recipe from './Recipe.js';
import Category from './Category.js';
import SavedRecipe from './SavedRecipe.js';
import RecipeCategory from './RecipeCategory.js';
import UserFollows from './UserFollows.js';

//table creation

// Define associations
Recipe.belongsTo(User, {
    foreignKey: 'userId',
    as: 'author'
});

User.hasMany(Recipe, {
    foreignKey: 'userId',
    as: 'recipes'
});

// Recipe-Category associations
Recipe.belongsToMany(Category, {
    through: RecipeCategory,
    foreignKey: 'recipeId',
    otherKey: 'categoryId',
    as: 'Categories'
});

Category.belongsToMany(Recipe, {
    through: RecipeCategory,
    foreignKey: 'categoryId',
    otherKey: 'recipeId',
    as: 'Recipes'
});

// User-Recipe (Saved) associations
User.belongsToMany(Recipe, {
    through: SavedRecipe,
    foreignKey: 'user_id',
    otherKey: 'recipe_id',
    as: 'savedRecipes'
});

Recipe.belongsToMany(User, {
    through: SavedRecipe,
    foreignKey: 'recipe_id',
    otherKey: 'user_id',
    as: 'savedByUsers'
});

// User-User (Follows) associations - Fixed aliases
User.belongsToMany(User, {
    through: UserFollows,
    as: 'followedUsers',
    foreignKey: 'follower_id',
    otherKey: 'following_id'
});

User.belongsToMany(User, {
    through: UserFollows,
    as: 'followerUsers',
    foreignKey: 'following_id',
    otherKey: 'follower_id'
});

// Add direct associations for SavedRecipe
SavedRecipe.belongsTo(User, {
    foreignKey: 'user_id',
    as: 'user'
});

SavedRecipe.belongsTo(Recipe, {
    foreignKey: 'recipe_id',
    as: 'recipe'
});

export {
    User,
    Recipe,
    Category,
    SavedRecipe,
    RecipeCategory,
    UserFollows
};
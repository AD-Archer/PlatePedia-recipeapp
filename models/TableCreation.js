import User from './User.js';
import Recipe from './Recipe.js';
import Category from './Category.js';
import UserFollows from './UserFollows.js';
import SavedRecipe from './SavedRecipe.js';
import sequelize from '../config/db.js';

// User-Recipe relationship (authorship)
User.hasMany(Recipe, { foreignKey: 'userId', as: 'recipes' });
Recipe.belongsTo(User, { foreignKey: 'userId', as: 'author' });

// Recipe-Category relationship
Recipe.belongsToMany(Category, { 
    through: 'recipe_categories',
    foreignKey: 'recipeId',
    otherKey: 'categoryId',
    as: 'categories'
});
Category.belongsToMany(Recipe, { 
    through: 'recipe_categories',
    foreignKey: 'categoryId',
    otherKey: 'recipeId',
    as: 'recipes'
});

// User-User relationship (follows)
User.belongsToMany(User, {
    through: UserFollows,
    as: 'following',
    foreignKey: 'followerId'
});
User.belongsToMany(User, {
    through: UserFollows,
    as: 'followers',
    foreignKey: 'followingId'
});

// User-Recipe relationship (saved recipes)
User.belongsToMany(Recipe, { 
    through: SavedRecipe,
    as: 'savedRecipes',
    foreignKey: 'user_id',
    otherKey: 'recipe_id'
});
Recipe.belongsToMany(User, { 
    through: SavedRecipe,
    as: 'savedBy',
    foreignKey: 'recipe_id',
    otherKey: 'user_id'
});

// HasMany associations for SavedRecipe
User.hasMany(SavedRecipe, { foreignKey: 'user_id' });
SavedRecipe.belongsTo(User, { foreignKey: 'user_id' });
Recipe.hasMany(SavedRecipe, { foreignKey: 'recipe_id' });
SavedRecipe.belongsTo(Recipe, { foreignKey: 'recipe_id' });

export { User, Recipe, Category, UserFollows, SavedRecipe };
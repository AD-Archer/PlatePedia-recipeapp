import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

// this is used to connect the categories and the recipes tables 
const RecipeCategory = sequelize.define('RecipeCategory', {
    recipeId: {
        type: DataTypes.INTEGER,
        references: {
            model: 'recipes',
            key: 'id'
        }
    },
    categoryId: {
        type: DataTypes.INTEGER,
        references: {
            model: 'categories',
            key: 'id'
        }
    }
}, {
    tableName: 'recipe_categories',
    modelName: 'RecipeCategory',
    timestamps: true
});

export default RecipeCategory; 
import { DataTypes } from 'sequelize';
import { getDb } from '../config/db.js';

const sequelize = await getDb();

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
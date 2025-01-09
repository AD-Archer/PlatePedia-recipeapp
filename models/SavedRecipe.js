import { Model, DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

class SavedRecipe extends Model {}

SavedRecipe.init({
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        },
        field: 'user_id'
    },
    recipeId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'recipes',
            key: 'id'
        },
        field: 'recipe_id'
    }
}, {
    sequelize,
    modelName: 'SavedRecipe',
    tableName: 'saved_recipes',
    underscored: true,
    timestamps: true
});

export default SavedRecipe; 
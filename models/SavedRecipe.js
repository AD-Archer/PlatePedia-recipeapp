import { Model, DataTypes } from 'sequelize';
import sequelize from '../config/db.js';
import User from './User.js';
import Recipe from './Recipe.js';

// this is used to save recipes to the users model

class SavedRecipe extends Model {}

SavedRecipe.init({
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: User,
            key: 'id'
        },
        onDelete: 'CASCADE'
    },
    recipe_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: Recipe,
            key: 'id'
        },
        onDelete: 'CASCADE'
    }
}, {
    sequelize,
    modelName: 'SavedRecipe',
    tableName: 'saved_recipes',
    underscored: true,
    timestamps: true
});

export default SavedRecipe; 
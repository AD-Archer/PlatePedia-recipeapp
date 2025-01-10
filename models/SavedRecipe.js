import { Model, DataTypes } from 'sequelize';
import sequelize from '../config/db.js';
import User from './User.js';
import Recipe from './Recipe.js';

class SavedRecipe extends Model {}

SavedRecipe.init({
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'user_id',
        references: {
            model: User,
            key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    },
    recipeId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'recipe_id',
        references: {
            model: Recipe,
            key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    }
}, {
    sequelize,
    modelName: 'SavedRecipe',
    tableName: 'saved_recipes',
    timestamps: true,
    underscored: true,
    indexes: [
        {
            unique: true,
            fields: ['user_id', 'recipe_id'],
            name: 'saved_recipes_user_recipe_unique'
        }
    ]
});

// Define associations
SavedRecipe.belongsTo(User, {
    foreignKey: 'user_id',
    as: 'user'
});

SavedRecipe.belongsTo(Recipe, {
    foreignKey: 'recipe_id',
    as: 'recipe'
});

export default SavedRecipe; 
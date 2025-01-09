import { Model, DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

class Recipe extends Model {}

Recipe.init({
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    ingredients: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        allowNull: false,
        defaultValue: []
    },
    instructions: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
    cookingTime: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    servings: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    imageUrl: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    difficulty: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
            isIn: [['easy', 'medium', 'hard']]
        }
    },
    calories: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    tags: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        allowNull: true,
        defaultValue: []
    }
}, {
    sequelize,
    modelName: 'Recipe',
    tableName: 'recipes',
    timestamps: true
});

export default Recipe;


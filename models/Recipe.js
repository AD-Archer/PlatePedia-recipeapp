import { Model, DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

class Recipe extends Model {}

Recipe.init({
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    ingredients: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    instructions: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    cookingTime: {
        type: DataTypes.STRING,
        allowNull: false
    },
    servings: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    imageUrl: {
        type: DataTypes.TEXT('long'),
        allowNull: true,
        validate: {
            len: {
                args: [0, 2048],
                msg: 'Recipe image URL must be less than 2048 characters'
            }
        }
    },
    difficulty: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            isIn: [['easy', 'medium', 'hard']]
        }
    },
    calories: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    tags: {
        type: DataTypes.STRING,
        allowNull: true,
        get() {
            const rawValue = this.getDataValue('tags');
            if (Array.isArray(rawValue)) return rawValue;
            return rawValue ? rawValue.split(',').map(tag => tag.trim()) : [];
        },
        set(val) {
            if (Array.isArray(val)) {
                this.setDataValue('tags', val.filter(Boolean).join(','));
            } else if (typeof val === 'string') {
                this.setDataValue('tags', val.split(',').filter(Boolean).map(tag => tag.trim()).join(','));
            } else {
                this.setDataValue('tags', '');
            }
        }
    },
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        }
    }
}, {
    sequelize,
    modelName: 'Recipe',
    tableName: 'recipes'
});

export default Recipe;


import { DataTypes } from 'sequelize';
import { getDb } from '../config/db.js';

const sequelize = await getDb();

const Category = sequelize.define('Category', {
    name: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    type: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
            isIn: [['meal', 'ingredient', 'course', 'dish', 'dietary']]
        }
    },
    imageUrl: {
        type: DataTypes.STRING,
        allowNull: true
    }
}, {
    tableName: 'categories',
    modelName: 'Category',
    timestamps: true
});

export default Category; 
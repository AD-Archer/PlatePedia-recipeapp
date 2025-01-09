import { DataTypes } from 'sequelize';
import { getDb } from '../config/db.js';

const sequelize = await getDb();

const Category = sequelize.define('Category', {
    name: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    }
}, {
    tableName: 'categories',
    modelName: 'Category',
    timestamps: true
});

export default Category; 
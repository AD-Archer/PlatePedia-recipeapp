import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

const Category = sequelize.define('Category', {
    name: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    type: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'meal'
    },
    imageUrl: {
        type: DataTypes.STRING,
        allowNull: true
    }
}, {
    tableName: 'categories'
});

export default Category; 
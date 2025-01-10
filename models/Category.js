import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';
// this is use to define categories on the site to be dispalyed on our dashboard
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
import { Model, DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

class Category extends Model {}

Category.init({
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
    }
}, {
    sequelize,
    modelName: 'Category',
    tableName: 'categories',
    timestamps: true
});

export default Category; 
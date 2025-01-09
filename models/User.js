import { Model, DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

class User extends Model {}

User.init({
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    username: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
            isEmail: true,
        },
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    profileImage: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    bio: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    rememberToken: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    tokenExpires: {
        type: DataTypes.DATE,
        allowNull: true,
    }
}, {
    sequelize,
    modelName: 'User',
    tableName: 'users',
    timestamps: true
});

export default User;
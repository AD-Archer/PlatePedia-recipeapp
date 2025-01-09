import { Model, DataTypes } from 'sequelize';
import bcrypt from 'bcrypt';
import sequelize from '../config/db.js';

class User extends Model {}

User.init({
    username: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
            len: [3, 30],
            isLowercase(value) {
                if (value !== value.toLowerCase()) {
                    throw new Error('Username must be lowercase');
                }
            },
            async isUnique(value) {
                const user = await User.findOne({
                    where: sequelize.where(
                        sequelize.fn('LOWER', sequelize.col('username')),
                        value.toLowerCase()
                    )
                });
                if (user && user.id !== this.id) {
                    throw new Error('Username already taken');
                }
            }
        },
        set(value) {
            this.setDataValue('username', value.toLowerCase());
        }
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
            isEmail: true,
            async isUnique(value) {
                const user = await User.findOne({
                    where: sequelize.where(
                        sequelize.fn('LOWER', sequelize.col('email')),
                        value.toLowerCase()
                    )
                });
                if (user && user.id !== this.id) {
                    throw new Error('Email already registered');
                }
            }
        },
        set(value) {
            this.setDataValue('email', value.toLowerCase());
        }
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false
    },
    bio: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    profileImage: {
        type: DataTypes.STRING,
        allowNull: true
    },
    resetToken: {
        type: DataTypes.STRING,
        allowNull: true
    },
    resetTokenExpiry: {
        type: DataTypes.DATE,
        allowNull: true
    },
    rememberToken: {
        type: DataTypes.STRING,
        allowNull: true
    },
    tokenExpires: {
        type: DataTypes.DATE,
        allowNull: true
    }
}, {
    sequelize,
    modelName: 'User',
    tableName: 'users',
    timestamps: true,
    underscored: true
});

// Password hashing middleware
User.beforeCreate(async (user) => {
    if (user.password) {
        console.log('Hashing password for new user');
        user.password = await bcrypt.hash(user.password, 10);
        console.log('Password hashed successfully');
    }
});

User.beforeUpdate(async (user) => {
    if (user.changed('password')) {
        user.password = await bcrypt.hash(user.password, 10);
    }
});

export default User;
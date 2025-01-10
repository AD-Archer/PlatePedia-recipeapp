import { Model, DataTypes } from 'sequelize';
import bcrypt from 'bcrypt';
import sequelize from '../config/db.js';
import Recipe from './Recipe.js';
import UserFollows from './UserFollows.js';

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
        type: DataTypes.TEXT('long'),
        allowNull: true,
        validate: {
            isUrl: function(value) {
                if (value && !value.match(/^https?:\/\/.+/i)) {
                    throw new Error('Profile image must be a valid URL starting with http:// or https://');
                }
            },
            len: {
                args: [0, 2048],
                msg: 'Profile image URL must be less than 2048 characters'
            }
        }
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
        user.password = await bcrypt.hash(user.password, 10);
    }
});

User.beforeUpdate(async (user) => {
    if (user.changed('password')) {
        user.password = await bcrypt.hash(user.password, 10);
    }
});

// User associations
User.hasMany(Recipe, {
    foreignKey: 'userId',
    as: 'userRecipes'
});

User.belongsToMany(User, {
    through: 'user_follows',
    as: 'followers',
    foreignKey: 'following_id',
    otherKey: 'follower_id'
});

User.belongsToMany(User, {
    through: 'user_follows',
    as: 'following',
    foreignKey: 'follower_id',
    otherKey: 'following_id'
});

export default User;
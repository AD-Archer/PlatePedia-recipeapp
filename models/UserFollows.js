import { Model, DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

class UserFollows extends Model {}

UserFollows.init({
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    followerId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        }
    },
    followingId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        }
    }
}, {
    sequelize,
    modelName: 'UserFollows',
    tableName: 'user_follows',
    timestamps: true
});

export default UserFollows; 
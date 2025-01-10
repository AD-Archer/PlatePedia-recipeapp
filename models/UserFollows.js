import { Model, DataTypes } from 'sequelize';
import sequelize from '../config/db.js';
// this declares the user follows table
class UserFollows extends Model {}

UserFollows.init({
    followerId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'follower_id',
        references: {
            model: 'users',
            key: 'id'
        }
    },
    followingId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'following_id',
        references: {
            model: 'users',
            key: 'id'
        }
    }
}, {
    sequelize,
    modelName: 'UserFollows',
    tableName: 'user_follows',
    timestamps: true,
    underscored: true,
    indexes: [
        {
            unique: true,
            fields: ['follower_id', 'following_id']
        }
    ]
});

export default UserFollows; 
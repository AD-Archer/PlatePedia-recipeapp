import express from 'express';
import { User, Recipe, Category } from '../models/TableCreation.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { isAuthenticated } from '../middleware/authMiddleware.js';

const router = express.Router();

// View user profile by username
router.get('/:username', asyncHandler(async (req, res) => {
    const username = req.params.username;

    // Find user by username
    const profileUser = await User.findOne({
        where: { username: username },
        attributes: ['id', 'username', 'profileImage', 'bio']
    });

    if (!profileUser) {
        req.session.error = 'User not found';
        return res.redirect('/');
    }

    // Get user's recipes
    const recipes = await Recipe.findAll({
        where: { userId: profileUser.id },
        include: [
            {
                model: User,
                as: 'author',
                attributes: ['username', 'id']
            },
            {
                model: Category,
                as: 'Categories',  // Make sure this matches your association
                through: { attributes: [] }
            }
        ],
        order: [['createdAt', 'DESC']]
    });

    // Check if logged-in user is following this user
    let isFollowing = false;
    if (req.session.user && req.session.user.id !== profileUser.id) {
        const userFollows = await User.findOne({
            where: { 
                id: req.session.user.id,
                '$followedUsers.id$': profileUser.id 
            },
            include: [{
                model: User,
                as: 'followedUsers'
            }]
        });
        isFollowing = !!userFollows;
    }

    // Get follower and following counts
    const followerCount = await User.count({
        include: [{
            model: User,
            as: 'followedUsers',
            where: { id: profileUser.id }
        }]
    });

    const followingCount = await User.count({
        include: [{
            model: User,
            as: 'followerUsers',
            where: { id: profileUser.id }
        }]
    });

    res.render('pages/users/profile', {
        user: req.session.user,
        profileUser: {
            ...profileUser.toJSON(),
            followers: { length: followerCount },
            following: { length: followingCount },
            recipes: recipes
        },
        recipes: recipes,
        isFollowing,
        isOwnProfile: req.session.user && req.session.user.id === profileUser.id,
        error: req.session.error,
        success: req.session.success
    });

    delete req.session.error;
    delete req.session.success;
}));

// Follow/unfollow routes
router.post('/:username/follow', isAuthenticated, asyncHandler(async (req, res) => {
    const userToFollow = await User.findOne({
        where: { username: req.params.username }
    });

    if (!userToFollow) {
        return res.status(404).json({ success: false, error: 'User not found' });
    }

    const [userFollow] = await User.findOrCreate({
        where: {
            id: req.session.user.id,
            '$followedUsers.id$': userToFollow.id
        },
        include: [{
            model: User,
            as: 'followedUsers'
        }]
    });

    res.json({ success: true });
}));

router.delete('/:username/follow', isAuthenticated, asyncHandler(async (req, res) => {
    const userToUnfollow = await User.findOne({
        where: { username: req.params.username }
    });

    if (!userToUnfollow) {
        return res.status(404).json({ success: false, error: 'User not found' });
    }

    await User.destroy({
        where: {
            id: req.session.user.id,
            '$followedUsers.id$': userToUnfollow.id
        },
        include: [{
            model: User,
            as: 'followedUsers'
        }]
    });

    res.json({ success: true });
}));

export default router; 
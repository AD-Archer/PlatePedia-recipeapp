import express from 'express';
import { User } from '../models/TableCreation.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { Op } from 'sequelize';
import sequelize from '../config/db.js';
import { getCachedData } from '../utils/dataSync.js';
import Category from '../models/Category.js';

const router = express.Router();

// Define cuisine-specific default images directly here
const cuisineDefaultImages = {
  'american': 'https://images.unsplash.com/photo-1551782450-a2132b4ba21d', // burger
  'british': 'https://images.unsplash.com/photo-1577906096429-f73c2c312435', // fish and chips
  'canadian': 'https://images.unsplash.com/photo-1586805608485-add336722759', // poutine
  'chinese': 'https://images.unsplash.com/photo-1585032226651-759b368d7246', // dimsum
  'croatian': 'https://images.unsplash.com/photo-1599321955726-3f1f837bbe0b', // croatian food
  'dutch': 'https://images.unsplash.com/photo-1608855238293-a8853e7f7c98', // dutch food
  'egyptian': 'https://images.unsplash.com/photo-1542223616-9de9adb5e3e8', // falafel
  'filipino': 'https://images.unsplash.com/photo-1625471204831-00c2b9cde7c1', // filipino food
  'french': 'https://images.unsplash.com/photo-1608855238293-a8853e7f7c98', // french food
  'greek': 'https://images.unsplash.com/photo-1559598467-f8b76c8155d0', // greek food
  'indian': 'https://images.unsplash.com/photo-1585937421612-70a008356fbe', // indian curry
  'irish': 'https://images.unsplash.com/photo-1544780631-d7cc800ef62d', // irish stew
  'italian': 'https://images.unsplash.com/photo-1598866594230-a7c12756260f', // pasta
  'jamaican': 'https://images.unsplash.com/photo-1544378730-8b5104b41308', // jamaican food
  'japanese': 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351', // sushi
  'kenyan': 'https://images.unsplash.com/photo-1604329760661-e71dc83f8f26', // kenyan food
  'malaysian': 'https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58', // malaysian food
  'mexican': 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47', // tacos
  'default': 'https://images.unsplash.com/photo-1504674900247-0877df9cc836'
};

router.get('/', asyncHandler(async (req, res) => {
    try {
        // Get cached data
        const { popularRecipes, recentRecipes, categories } = getCachedData();

        // Add default images for categories without images
        categories.forEach(category => {
            if (!category.imageUrl) {
                category.imageUrl = cuisineDefaultImages[category.name.toLowerCase()] || cuisineDefaultImages.default;
            }
        });

        // Group categories by type
        const groupedCategories = categories.reduce((acc, category) => {
            const type = category.type || 'Other';
            if (!acc[type]) {
                acc[type] = [];
            }
            acc[type].push(category);
            return acc;
        }, {});

        // Get suggested users if logged in
        let suggestedUsers = [];
        if (req.session.user) {
            suggestedUsers = await User.findAll({
                where: {
                    id: { [Op.ne]: req.session.user.id },
                    username: { [Op.ne]: 'themealdb' }
                },
                limit: 3,
                order: sequelize.random()
            });
        }

        res.render('pages/dashboard', {
            user: req.session.user,
            recipes: recentRecipes,
            popularRecipes,
            groupedCategories,
            categories,
            suggestedUsers,
            path: '/'
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).render('pages/error', {
            error: 'Error loading dashboard',
            path: '/'
        });
    }
}));

export default router;

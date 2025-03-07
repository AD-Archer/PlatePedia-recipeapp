import express from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { 
  getRandomRecipes, 
  getRecentRecipes, 
  getAllCategories 
} from '../utils/jsonDataService.js';

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
    // Get data from JSON
    const [popularRecipes, recentRecipes, categories] = await Promise.all([
      getRandomRecipes(6),
      getRecentRecipes(6),
      getAllCategories()
    ]);
    
    // Format recipes to match expected structure
    const formatRecipe = recipe => ({
      id: recipe.id,
      title: recipe.title,
      description: `${recipe.title} - A delicious ${recipe.category} recipe from ${recipe.area} cuisine.`,
      imageUrl: recipe.thumbnail,
      author: { username: 'themealdb', id: '1', profileImage: 'https://www.themealdb.com/images/logo-small.png' }
    });
    
    const formattedPopular = popularRecipes.map(formatRecipe);
    const formattedRecent = recentRecipes.map(formatRecipe);
    
    // Add default images for categories
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
    
    res.render('pages/dashboard', {
      user: req.session?.user,
      recipes: formattedRecent,
      popularRecipes: formattedPopular,
      groupedCategories,
      categories,
      suggestedUsers: [],
      path: '/',
      criticalCSS: `
        .category-card { transition: transform 0.2s; }
        .category-card:hover { transform: translateY(-3px); }
        .card-img-top { background-color: #f8f9fa; }
      `
    });
  } catch (error) {
    console.error('Error loading dashboard:', error);
    res.status(500).send('Error loading dashboard');
  }
}));

export default router;

import express from 'express';
import { body, validationResult } from 'express-validator';
import { asyncHandler } from '../middleware/errorHandler.js';
import { isAuthenticated } from '../middleware/authMiddleware.js';
import { addSavedStatus } from '../utils/recipeUtils.js';
import { getCachedData, getUserSavedRecipes, clearCache } from '../utils/dataSync.js';
import { 
  getAllRecipes, 
  getRecipeById, 
  searchRecipes, 
  getRecipesByCategory,
  getAllCategories
} from '../utils/jsonDataService.js';

const router = express.Router();

// Middleware to check if user is the recipe creator
const isRecipeCreator = async (req, res, next) => {
    try {
        const recipeId = parseInt(req.params.id);
        
        if (isNaN(recipeId)) {
            req.session.error = 'Invalid recipe ID';
            return res.redirect('/');
        }

        const recipe = await Recipe.findByPk(recipeId, {
            include: [{
                model: Category,
                as: 'Categories',
                through: { attributes: [] }
            }]
        });

        if (!recipe) {
            req.session.error = 'Recipe not found';
            return res.redirect('/');
        }

        if (recipe.userId !== req.session.user.id) {
            req.session.error = 'You are not authorized to modify this recipe';
            return res.redirect('/recipes/' + recipeId);
        }

        req.recipe = recipe;
        next();
    } catch (error) {
        console.error('Error checking recipe creator:', error);
        req.session.error = 'Error checking authorization';
        res.redirect('/');
    }
};

// Route handler functions
const listRecipes = asyncHandler(async (req, res) => {
    const recipes = await Recipe.findAll({
        include: [
            {
                model: User,
                as: 'author',
                attributes: ['username']
            },
            {
                model: Category,
                as: 'Categories',
                through: { attributes: [] }
            }
        ],
        order: [['createdAt', 'DESC']]
    });

    res.render('pages/recipes/index', {
        recipes,
        error: req.session.error,
        success: req.session.success
    });

    delete req.session.error;
    delete req.session.success;
});

const showCreateForm = asyncHandler(async (req, res) => {
    // Double-check authentication
    if (!req.session.user) {
        req.session.error = 'Please log in to create recipes';
        return res.redirect('/login');
    }

    const categories = await Category.findAll({
        order: [['name', 'ASC']]
    });
    
    res.render('pages/recipes/create', {
        categories,
        formData: {},
        error: req.session.error,
        success: req.session.success
    });
    
    delete req.session.error;
    delete req.session.success;
});

const createRecipe = [
    // Validation middleware
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('ingredients.*').trim().notEmpty().withMessage('Each ingredient must not be empty'),
    body('instructions').trim().notEmpty().withMessage('Instructions are required'),
    body('calories').isInt({ min: 0 }).withMessage('Calories must be a positive number'),
    body('cookingTime').optional().isInt({ min: 0 }).withMessage('Cooking time must be a positive number'),
    body('servings').optional().isInt({ min: 1 }).withMessage('Servings must be at least 1'),
    body('difficulty').optional().isIn(['easy', 'medium', 'hard']).withMessage('Invalid difficulty level'),
    
    asyncHandler(async (req, res) => {
        const errors = validationResult(req);
        const categories = await Category.findAll({ order: [['name', 'ASC']] });

        if (!errors.isEmpty()) {
            return res.render('pages/recipes/create', {
                categories,
                error: errors.array()[0].msg,
                formData: {
                    ...req.body,
                    categories: Array.isArray(req.body.categories) ? req.body.categories : [req.body.categories]
                },
                success: req.session.success
            });
        }

        try {
            const {
                title,
                description,
                ingredients,
                instructions,
                cookingTime,
                servings,
                difficulty,
                calories,
                categories: selectedCategories
            } = req.body;

            // Ensure ingredients is always an array
            const ingredientsArray = Array.isArray(ingredients) ? ingredients : [ingredients];
            const cleanedIngredients = ingredientsArray.filter(ingredient => ingredient.trim() !== '');

            if (cleanedIngredients.length === 0) {
                return res.render('pages/recipes/create', {
                    categories,
                    error: 'At least one ingredient is required',
                    formData: {
                        ...req.body,
                        categories: Array.isArray(req.body.categories) ? req.body.categories : [req.body.categories]
                    },
                    success: req.session.success
                });
            }

            // Create recipe
            const recipe = await Recipe.create({
                userId: req.session.user.id,
                title: title.trim(),
                description: description ? description.trim() : null,
                ingredients: cleanedIngredients,
                instructions: instructions.trim(),
                cookingTime: cookingTime || null,
                servings: servings || null,
                difficulty: difficulty || null,
                calories: parseInt(calories),
                imageUrl: req.body.imageUrl || null
            });

            // Add categories if provided
            if (selectedCategories) {
                const categoryIds = Array.isArray(selectedCategories) ? selectedCategories : [selectedCategories];
                await recipe.setCategories(categoryIds);
            }

            req.session.success = 'Recipe created successfully!';
            return res.redirect(`/recipes/${recipe.id}`);

        } catch (error) {
            console.error('Error creating recipe:', error);
            return res.render('pages/recipes/create', {
                categories,
                error: 'Error creating recipe. Please try again.',
                formData: {
                    ...req.body,
                    categories: Array.isArray(req.body.categories) ? req.body.categories : [req.body.categories]
                },
                success: req.session.success
            });
        }
    })
];

const viewRecipe = asyncHandler(async (req, res) => {
    const recipeId = parseInt(req.params.id);
    if (isNaN(recipeId)) {
        req.session.error = 'Invalid recipe ID';
        return res.redirect('/dashboard');
    }

    const recipe = await Recipe.findByPk(recipeId, {
        include: [
            {
                model: Category,
                as: 'Categories',
                through: { attributes: [] }
            },
            {
                model: User,
                as: 'author',
                attributes: ['id', 'username', 'profileImage']
            }
        ]
    });

    if (!recipe) {
        req.session.error = 'Recipe not found';
        return res.redirect('/dashboard');
    }

    // Check if the logged-in user is following the recipe author
    let isFollowing = false;
    if (req.session.user && recipe.author.id !== req.session.user.id) {
        const followRelation = await UserFollows.findOne({
            where: {
                followerId: req.session.user.id,
                followingId: recipe.author.id
            }
        });
        isFollowing = !!followRelation;
    }

    let isSaved = false;
    if (req.session.user) {
        const savedRecipe = await SavedRecipe.findOne({
            where: {
                userId: req.session.user.id,
                recipeId: recipe.id
            }
        });
        isSaved = !!savedRecipe;
    }

    const recipeWithSave = {
        ...recipe.toJSON(),
        isSaved
    };

    res.render('pages/recipes/view', {
        recipe: recipeWithSave,
        user: req.session.user,
        isFollowing,
        error: req.session.error,
        success: req.session.success
    });

    delete req.session.error;
    delete req.session.success;
});

const showEditForm = [
    isAuthenticated,
    isRecipeCreator,
    asyncHandler(async (req, res) => {
        const categories = await Category.findAll({
            order: [['name', 'ASC']]
        });

        const recipeCategories = await req.recipe.getCategories();
        const categoryIds = recipeCategories.map(cat => cat.id);

        res.render('pages/recipes/edit', {
            recipe: req.recipe,
            categories,
            categoryIds,
            error: req.session.error,
            success: req.session.success
        });

        delete req.session.error;
        delete req.session.success;
    })
];

const updateRecipe = [
    isAuthenticated,
    isRecipeCreator,
    // ... your existing validation middleware ...
    asyncHandler(async (req, res) => {
        // ... your existing update recipe logic ...
        // (Keep your existing update recipe implementation)
    })
];

const deleteRecipe = [
    isAuthenticated,
    isRecipeCreator,
    asyncHandler(async (req, res) => {
        await req.recipe.destroy();
        req.session.success = 'Recipe deleted successfully';
        res.json({ 
            success: true, 
            message: 'Recipe deleted successfully',
            redirectUrl: '/dashboard'
        });
    })
];

// Save recipe
router.post('/:id/save', isAuthenticated, asyncHandler(async (req, res) => {
    const recipeId = parseInt(req.params.id);
    
    try {
        const [savedRecipe, created] = await SavedRecipe.findOrCreate({
            where: {
                user_id: req.session.user.id,
                recipe_id: recipeId
            },
            defaults: {
                user_id: req.session.user.id,
                recipe_id: recipeId
            }
        });

        res.json({
            success: true,
            saved: true,
            message: created ? 'Recipe saved successfully' : 'Recipe already saved'
        });
    } catch (error) {
        console.error('Error saving recipe:', error);
        res.status(500).json({
            success: false,
            error: 'Error saving recipe'
        });
    }
}));

// Unsave recipe
router.delete('/:id/save', isAuthenticated, asyncHandler(async (req, res) => {
    const recipeId = parseInt(req.params.id);
    
    try {
        const deleted = await SavedRecipe.destroy({
            where: {
                user_id: req.session.user.id,
                recipe_id: recipeId
            }
        });

        res.json({
            success: true,
            saved: false,
            message: deleted ? 'Recipe removed from saved' : 'Recipe was not saved'
        });
    } catch (error) {
        console.error('Error removing saved recipe:', error);
        res.status(500).json({
            success: false,
            error: 'Error removing saved recipe'
        });
    }
}));

// Saved recipes (simplified version that doesn't use the database)
router.get('/saved', isAuthenticated, asyncHandler(async (req, res) => {
  try {
    // Get some random recipes to display as saved recipes
    const recipes = await getRandomRecipes(8);
    
    // Format recipes to match expected structure
    const formattedRecipes = recipes.map(recipe => ({
      id: recipe.id,
      title: recipe.title,
      description: `${recipe.title} - A delicious ${recipe.category} recipe from ${recipe.area} cuisine.`,
      imageUrl: recipe.thumbnail,
      author: { username: 'themealdb', id: '1' },
      isSaved: true // Since these are "saved" recipes
    }));
    
    res.render('pages/recipes/saved', {
      recipes: formattedRecipes,
      user: req.session.user,
      error: req.session.error,
      success: req.session.success
    });
    
    delete req.session.error;
    delete req.session.success;
  } catch (error) {
    console.error('Error loading saved recipes:', error);
    req.session.error = 'Error loading saved recipes';
    res.redirect('/');
  }
}));

// My recipes (simplified version that doesn't use the database)
router.get('/my-recipes', isAuthenticated, asyncHandler(async (req, res) => {
  try {
    // Get some random recipes to display as user's recipes
    const recipes = await getRandomRecipes(6);
    
    // Format recipes to match expected structure
    const formattedRecipes = recipes.map(recipe => ({
      id: recipe.id,
      title: recipe.title,
      description: `${recipe.title} - A delicious ${recipe.category} recipe from ${recipe.area} cuisine.`,
      imageUrl: recipe.thumbnail,
      author: { 
        username: req.session.user.username, 
        id: req.session.user.id 
      },
      createdAt: new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000)
    }));
    
    res.render('pages/recipes/my-recipes', {
      recipes: formattedRecipes,
      user: req.session.user,
      error: req.session.error,
      success: req.session.success
    });
    
    delete req.session.error;
    delete req.session.success;
  } catch (error) {
    console.error('Error loading my recipes:', error);
    req.session.error = 'Error loading your recipes';
    res.redirect('/');
  }
}));

// Helper function to format recipe data
const formatRecipeData = (recipe) => {
    const data = recipe.toJSON();
    // Ensure tags are always an array
    data.tags = Array.isArray(data.tags) ? 
        data.tags : 
        (data.tags ? data.tags.split(',').map(tag => tag.trim()) : []);
    return data;
};

// Browse recipes
router.get('/browse', asyncHandler(async (req, res) => {
  try {
    const { search, category, tags } = req.query;
    
    let recipes = [];
    
    if (search) {
      // Search by query
      recipes = await searchRecipes(search);
    } else if (category) {
      // Filter by category
      recipes = await getRecipesByCategory(category);
    } else if (tags) {
      // Filter by tags (areas/cuisines in this case)
      const tagsArray = Array.isArray(tags) ? tags : [tags];
      const allRecipes = await getAllRecipes();
      recipes = allRecipes.filter(recipe => 
        tagsArray.includes(recipe.category) || tagsArray.includes(recipe.area)
      );
    } else {
      // Get all recipes
      recipes = await getAllRecipes();
    }
    
    // Format recipes to ensure they have imageUrl property
    const formattedRecipes = recipes.map(recipe => ({
      id: recipe.id,
      title: recipe.title,
      category: recipe.category,
      area: recipe.area,
      description: recipe.description || `${recipe.title} - A delicious ${recipe.category} recipe from ${recipe.area} cuisine.`,
      imageUrl: recipe.thumbnail, // Ensure imageUrl is set from thumbnail
      thumbnail: recipe.thumbnail,
      author: { username: 'themealdb', id: '1' }
    }));
    
    // Get all categories for the filter sidebar
    const allCategories = await getAllCategories();
    
    // Group categories by type
    const groupedCategories = allCategories.reduce((acc, category) => {
      const type = category.type || 'Other';
      if (!acc[type]) {
        acc[type] = [];
      }
      acc[type].push(category);
      return acc;
    }, {});
    
    // Add this before rendering the template
    console.log('Sample recipe image URLs:', formattedRecipes.slice(0, 3).map(r => r.imageUrl || r.thumbnail));
    
    res.render('pages/recipes/browse', {
      recipes: formattedRecipes, // Use formatted recipes
      categories: allCategories,
      groupedCategories,
      search: search || '',
      selectedCategory: category || '',
      selectedTags: tags ? (Array.isArray(tags) ? tags : [tags]) : [],
      user: req.session?.user,
      error: req.session?.error,
      success: req.session?.success
    });
    
    if (req.session) {
      delete req.session.error;
      delete req.session.success;
    }
  } catch (error) {
    console.error('Error browsing recipes:', error);
    res.status(500).render('pages/error', { 
      error: 'Error loading recipes',
      message: 'There was a problem loading the recipes. Please try again later.',
      user: req.session?.user
    });
  }
}));

// View a single recipe
router.get('/:id', asyncHandler(async (req, res) => {
  try {
    const recipeId = req.params.id;
    const recipe = await getRecipeById(recipeId);
    
    if (!recipe) {
      if (req.session) req.session.error = 'Recipe not found';
      return res.redirect('/recipes/browse');
    }
    
    // Format recipe for display
    const formattedRecipe = {
      id: recipe.id,
      title: recipe.title,
      description: recipe.description || `${recipe.title} - A delicious ${recipe.category} recipe from ${recipe.area} cuisine.`,
      ingredients: recipe.ingredients.map(i => `${i.measure} ${i.ingredient}`).join('\n'),
      instructions: recipe.instructions,
      imageUrl: recipe.thumbnail,
      cookingTime: recipe.estimated_time,
      servings: recipe.servings,
      difficulty: recipe.difficulty,
      calories: recipe.estimated_calories,
      author: { username: 'themealdb', id: '1' },
      categories: [
        { name: recipe.category },
        { name: recipe.area }
      ],
      isSaved: false // Default value since we don't have user-specific data
    };
    
    res.render('pages/recipes/view', {
      recipe: formattedRecipe,
      user: req.session?.user,
      isFollowing: false,
      error: req.session?.error,
      success: req.session?.success
    });
    
    if (req.session) {
      delete req.session.error;
      delete req.session.success;
    }
  } catch (error) {
    console.error('Error loading recipe:', error);
    if (req.session) req.session.error = 'Error loading recipe';
    res.redirect('/recipes/browse');
  }
}));

// 2. Authentication middleware for protected routes
router.use(['/new', '/my-recipes', '/saved', '/:id/edit', '/:id/save'], isAuthenticated);

// 3. Create recipe routes (must be before dynamic routes)
router.get('/create', asyncHandler(async (req, res) => {
    if (!req.session.user) {
        req.session.error = 'Please log in to create recipes';
        return res.redirect('/login');
    }

    const categories = await Category.findAll({
        order: [
            ['type', 'ASC'],
            ['name', 'ASC']
        ]
    });
    
    // Group categories by type
    const groupedCategories = {
        meal: categories.filter(cat => cat.type === 'meal'),
        ingredient: categories.filter(cat => cat.type === 'ingredient'),
        course: categories.filter(cat => cat.type === 'course'),
        dish: categories.filter(cat => cat.type === 'dish'),
        dietary: categories.filter(cat => cat.type === 'dietary')
    };
    
    res.render('pages/recipes/create', {
        groupedCategories,
        error: req.session.error,
        success: req.session.success
    });
    
    delete req.session.error;
    delete req.session.success;
}));

router.post('/', [
    // Validation middleware
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('ingredients').isArray().withMessage('Ingredients must be an array'),
    body('instructions').trim().notEmpty().withMessage('Instructions are required'),
    body('calories').isInt({ min: 0 }).withMessage('Calories must be a positive number'),
    body('cookingTime').optional().isInt({ min: 0 }).withMessage('Cooking time must be a positive number'),
    body('servings').optional().isInt({ min: 1 }).withMessage('Servings must be at least 1'),
    body('difficulty').isIn(['easy', 'medium', 'hard']).withMessage('Invalid difficulty level'),
], asyncHandler(async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Please log in to create recipes' });
    }

    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ error: errors.array()[0].msg });
        }

        // Convert ingredients array to string
        const recipeData = {
            ...req.body,
            ingredients: Array.isArray(req.body.ingredients) 
                ? req.body.ingredients.filter(i => i.trim()).join('\n')
                : req.body.ingredients,
            tags: Array.isArray(req.body.tags) 
                ? req.body.tags.join(',') 
                : req.body.tags,
            difficulty: req.body.difficulty || 'medium', // Default to medium if not provided
            calories: parseInt(req.body.calories) || 0, // Convert to number and default to 0
            cookingTime: req.body.cookingTime ? parseInt(req.body.cookingTime) : null,
            servings: req.body.servings ? parseInt(req.body.servings) : null
        };

        const recipe = await Recipe.create({
            ...recipeData,
            userId: req.session.user.id
        });

        // Add categories
        if (req.body.categories && req.body.categories.length > 0) {
            await recipe.setCategories(req.body.categories);
        }

        res.json({ 
            success: true, 
            message: 'Recipe created successfully!',
            recipeId: recipe.id
        });
    } catch (error) {
        console.error('Recipe creation error:', error);
        res.status(500).json({ error: 'Error creating recipe' });
    }
}));

// 4. Protected routes with specific paths
router.get('/new', isAuthenticated, asyncHandler(async (req, res) => {
    const { all: categories } = getCachedData('categories');
    
    // Group categories by type
    const groupedCategories = categories.reduce((acc, category) => {
        const type = category.type || 'other';
        if (!acc[type]) {
            acc[type] = [];
        }
        acc[type].push(category);
        return acc;
    }, {});

    res.render('pages/recipes/create', {
        categories,
        groupedCategories,
        formData: {},
        error: req.session.error,
        success: req.session.success
    });
    
    delete req.session.error;
    delete req.session.success;
}));

router.get('/my-recipes', asyncHandler(async (req, res) => {
    const recipes = await Recipe.findAll({
        where: { userId: req.session.user.id },
        include: [
            {
                model: Category,
                as: 'Categories',
                through: { attributes: [] }
            }
        ],
        order: [['createdAt', 'DESC']]
    });

    const recipesWithSaveStatus = await addSavedStatus(recipes, req.session.user.id);

    res.render('pages/recipes/my-recipes', {
        recipes: recipesWithSaveStatus,
        error: req.session.error,
        success: req.session.success
    });

    delete req.session.error;
    delete req.session.success;
}));

router.get('/saved', asyncHandler(async (req, res) => {
    const savedRecipes = await getUserSavedRecipes(req.session.user.id);

    res.render('pages/recipes/saved', {
        recipes: savedRecipes,
        error: req.session.error,
        success: req.session.success
    });

    delete req.session.error;
    delete req.session.success;
}));

// 5. Dynamic routes last
router.get('/:id', asyncHandler(async (req, res) => {
    const recipeId = parseInt(req.params.id);
    if (isNaN(recipeId)) {
        req.session.error = 'Invalid recipe ID';
        return res.redirect('/dashboard');
    }

    const recipe = await Recipe.findByPk(recipeId, {
        include: [{
            model: User,
            as: 'author',
            attributes: ['id', 'username', 'profileImage']
        }, {
            model: Category,
            as: 'Categories',
            through: { attributes: [] }
        }]
    });

    if (!recipe) {
        req.session.error = 'Recipe not found';
        return res.redirect('/dashboard');
    }

    // Check if the logged-in user is following the recipe author
    let isFollowing = false;
    if (req.session.user && recipe.author.id !== req.session.user.id) {
        const followRelation = await UserFollows.findOne({
            where: {
                followerId: req.session.user.id,
                followingId: recipe.author.id
            }
        });
        isFollowing = !!followRelation;
    }

    res.render('pages/recipes/view', {
        recipe,
        user: req.session.user,
        isFollowing,
        error: req.session.error,
        success: req.session.success
    });

    delete req.session.error;
    delete req.session.success;
}));

router.get('/:id/edit', isRecipeCreator, asyncHandler(async (req, res) => {
    try {
        const categories = await Category.findAll({
            order: [['name', 'ASC']]
        });

        const recipeCategories = await req.recipe.getCategories();
        const categoryIds = recipeCategories.map(cat => cat.id);

        // Convert ingredients string to array
        const recipe = req.recipe.toJSON();
        recipe.ingredients = recipe.ingredients.split('\n').filter(i => i.trim());

        res.render('pages/recipes/edit', {
            recipe: recipe,
            categories,
            categoryIds,
            error: req.session.error,
            success: req.session.success
        });

        delete req.session.error;
        delete req.session.success;
    } catch (error) {
        console.error('Error loading edit recipe page:', error);
        req.session.error = 'Error loading edit page';
        res.redirect('/recipes/' + req.params.id);
    }
}));

router.post('/:id/edit', isRecipeCreator, [
    // Validation middleware
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('ingredients.*').trim().notEmpty().withMessage('Ingredients cannot be empty'),
    body('instructions').trim().notEmpty().withMessage('Instructions are required'),
    body('calories').isInt({ min: 0 }).withMessage('Calories must be a positive number'),
    body('cookingTime').optional().isInt({ min: 0 }).withMessage('Cooking time must be a positive number'),
    body('servings').optional().isInt({ min: 1 }).withMessage('Servings must be at least 1'),
    body('difficulty').optional().isIn(['easy', 'medium', 'hard']).withMessage('Invalid difficulty level'),
    body('imageUrl')
        .optional({ checkFalsy: true })
        .trim()
], asyncHandler(async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            console.log('Validation errors:', errors.array());
            req.session.error = errors.array()[0].msg;
            return res.redirect(`/recipes/${req.params.id}/edit`);
        }

        const {
            title,
            description,
            ingredients,
            instructions,
            cookingTime,
            servings,
            difficulty,
            calories,
            categories,
            imageUrl
        } = req.body;

        console.log('Form data received:', req.body);

        // Ensure ingredients is always an array and clean it
        const ingredientsArray = Array.isArray(ingredients) ? ingredients : [ingredients];
        const cleanedIngredients = ingredientsArray
            .filter(ingredient => ingredient.trim() !== '')
            .join('\n');

        // Clean the image URL
        let cleanedImageUrl = imageUrl ? imageUrl.trim() : null;
        if (cleanedImageUrl === '') {
            cleanedImageUrl = null;
        }

        // Prepare update data
        const updateData = {
            title: title.trim(),
            description: description ? description.trim() : '',
            ingredients: cleanedIngredients,
            instructions: instructions.trim(),
            cookingTime: cookingTime || 0,
            servings: servings || 1,
            difficulty: difficulty || 'easy',
            calories: parseInt(calories),
            imageUrl: cleanedImageUrl
        };

        console.log('Attempting to update recipe with:', updateData);

        // Update recipe using findByPk and update
        const recipe = await Recipe.findByPk(req.recipe.id);
        if (!recipe) {
            throw new Error('Recipe not found');
        }
        
        await recipe.update(updateData);

        // Update categories if provided
        if (categories) {
            const categoryIds = Array.isArray(categories) ? categories : [categories];
            await recipe.setCategories(categoryIds);
        }

        console.log('Recipe updated successfully');
        req.session.success = 'Recipe updated successfully!';
        return res.redirect(`/recipes/${req.params.id}`);
    } catch (error) {
        console.error('Error updating recipe:', error);
        console.error('Error details:', error.message);
        console.error('Error stack:', error.stack);
        req.session.error = error.message || 'Error updating recipe';
        return res.redirect(`/recipes/${req.params.id}/edit`);
    }
}));

router.delete('/:id', [isAuthenticated, isRecipeCreator], asyncHandler(async (req, res) => {
    try {
        await req.recipe.destroy();
        // Clear the cache for recipes after deletion
        clearCache('recipes');
        res.json({ 
            success: true, 
            message: 'Recipe deleted successfully',
            redirectUrl: '/recipes/my-recipes'
        });
    } catch (error) {
        console.error('Error deleting recipe:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Error deleting recipe' 
        });
    }
}));

// 5. Save/unsave routes
router.post('/:id/save', isAuthenticated, asyncHandler(async (req, res) => {
    const recipeId = parseInt(req.params.id);
    
    try {
        const [savedRecipe, created] = await SavedRecipe.findOrCreate({
            where: {
                user_id: req.session.user.id,
                recipe_id: recipeId
            },
            defaults: {
                user_id: req.session.user.id,
                recipe_id: recipeId
            }
        });

        res.json({
            success: true,
            saved: true,
            message: created ? 'Recipe saved successfully' : 'Recipe already saved'
        });
    } catch (error) {
        console.error('Error saving recipe:', error);
        res.status(500).json({
            success: false,
            error: 'Error saving recipe'
        });
    }
}));

router.delete('/:id/save', isAuthenticated, asyncHandler(async (req, res) => {
    const recipeId = parseInt(req.params.id);
    
    try {
        const deleted = await SavedRecipe.destroy({
            where: {
                user_id: req.session.user.id,
                recipe_id: recipeId
            }
        });

        res.json({
            success: true,
            saved: false,
            message: deleted ? 'Recipe removed from saved' : 'Recipe was not saved'
        });
    } catch (error) {
        console.error('Error removing saved recipe:', error);
        res.status(500).json({
            success: false,
            error: 'Error removing saved recipe'
        });
    }
}));

export default router; 
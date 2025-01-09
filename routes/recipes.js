import express from 'express';
import { Recipe, User, Category, UserFollows, SavedRecipe } from '../models/TableCreation.js';
import { body, validationResult } from 'express-validator';
import { asyncHandler } from '../middleware/errorHandler.js';
import { isAuthenticated } from '../middleware/authMiddleware.js';
import { Op } from 'sequelize';
import sequelize from 'sequelize';

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
                as: 'categories',
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
                model: User,
                as: 'author',
                attributes: ['id', 'username', 'profileImage']
            },
            {
                model: Category,
                as: 'categories',
                through: { attributes: [] }
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
                userId: req.session.user.id,
                recipeId: recipeId
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
                userId: req.session.user.id,
                recipeId: recipeId
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

// View saved recipes
router.get('/saved', isAuthenticated, asyncHandler(async (req, res) => {
    // Double check authentication
    if (!req.session.user) {
        console.log('User session lost in /saved route');
        return res.redirect('/login');
    }

    const savedRecipes = await Recipe.findAll({
        include: [
            {
                model: User,
                as: 'author',
                attributes: ['username']
            },
            {
                model: Category,
                as: 'categories',
                through: { attributes: [] }
            },
            {
                model: User,
                as: 'savedBy',
                where: { id: req.session.user.id },
                attributes: [],
                through: { attributes: [] }
            }
        ],
        order: [['createdAt', 'DESC']]
    });

    console.log('Found saved recipes:', savedRecipes.length);

    res.render('pages/recipes/saved', {
        recipes: savedRecipes,
        error: req.session.error,
        success: req.session.success
    });

    delete req.session.error;
    delete req.session.success;
}));

// Helper function to check if recipes are saved
const addSavedStatus = async (recipes, userId) => {
    if (!userId) return recipes;
    
    const savedRecipes = await SavedRecipe.findAll({
        where: { userId },
        attributes: ['recipeId']
    });
    
    const savedRecipeIds = new Set(savedRecipes.map(sr => sr.recipeId));
    
    return recipes.map(recipe => ({
        ...recipe.toJSON(),
        isSaved: savedRecipeIds.has(recipe.id)
    }));
};

// 1. Public routes first (no authentication required)
router.get('/browse', asyncHandler(async (req, res) => {
    try {
        const { search, category, difficulty, tags } = req.query;
        let whereClause = {};
        let includeClause = [
            {
                model: User,
                as: 'author',
                attributes: ['username']
            },
            {
                model: Category,
                as: 'categories',
                through: { attributes: [] }
            }
        ];

        if (search) {
            whereClause[Op.or] = [
                { title: { [Op.iLike]: `%${search}%` } },
                { description: { [Op.iLike]: `%${search}%` } }
            ];
        }

        if (category) {
            includeClause[1].where = { id: category };
        }

        if (difficulty) {
            whereClause.difficulty = difficulty;
        }

        if (tags) {
            const selectedTags = Array.isArray(tags) ? tags : [tags];
            whereClause[Op.and] = [
                ...whereClause[Op.and] || [],
                { tags: { [Op.overlap]: selectedTags } }
            ];
        }

        const recipes = await Recipe.findAll({
            where: whereClause,
            include: includeClause,
            order: [['createdAt', 'DESC']]
        });

        const categories = await Category.findAll({
            order: [['name', 'ASC']]
        });

        const recipesWithSaveStatus = await addSavedStatus(recipes, req.session.user?.id);

        res.render('pages/recipes/browse', {
            recipes: recipesWithSaveStatus,
            categories,
            searchQuery: search || '',
            selectedCategory: category || '',
            selectedDifficulty: difficulty || '',
            selectedTags: tags || [],
            error: req.session.error,
            success: req.session.success
        });

        delete req.session.error;
        delete req.session.success;

    } catch (error) {
        console.error('Error loading recipes:', error);
        req.session.error = 'Error loading recipes';
        res.redirect('/');
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

router.post('/create', [
    // Validation middleware
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('ingredients.*').trim().notEmpty().withMessage('Each ingredient must not be empty'),
    body('instructions').trim().notEmpty().withMessage('Instructions are required'),
    body('calories').isInt({ min: 0 }).withMessage('Calories must be a positive number'),
    body('cookingTime').optional().isInt({ min: 0 }).withMessage('Cooking time must be a positive number'),
    body('servings').optional().isInt({ min: 1 }).withMessage('Servings must be at least 1'),
    body('difficulty').optional().isIn(['easy', 'medium', 'hard']).withMessage('Invalid difficulty level'),
], asyncHandler(async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Please log in to create recipes' });
    }

    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ error: errors.array()[0].msg });
        }

        const recipe = await Recipe.create({
            ...req.body,
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
router.get('/new', asyncHandler(async (req, res) => {
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
}));

router.get('/my-recipes', asyncHandler(async (req, res) => {
    const recipes = await Recipe.findAll({
        where: { userId: req.session.user.id },
        include: [
            {
                model: Category,
                as: 'categories',
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
    const savedRecipes = await Recipe.findAll({
        include: [
            {
                model: User,
                as: 'author',
                attributes: ['username']
            },
            {
                model: Category,
                as: 'categories',
                through: { attributes: [] }
            },
            {
                model: User,
                as: 'savedBy',
                where: { id: req.session.user.id },
                attributes: [],
                through: { attributes: [] }
            }
        ],
        order: [['createdAt', 'DESC']]
    });

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
        include: [
            {
                model: User,
                as: 'author',
                attributes: ['id', 'username', 'profileImage']
            },
            {
                model: Category,
                as: 'categories',
                through: { attributes: [] }
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

    res.render('pages/recipes/view', {
        recipe,
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

        res.render('pages/recipes/edit', {
            recipe: req.recipe,
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
], asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        req.session.error = errors.array()[0].msg;
        return res.redirect(`/recipes/${req.params.id}/edit`);
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
            categories
        } = req.body;

        // Ensure ingredients is always an array and clean it
        const ingredientsArray = Array.isArray(ingredients) ? ingredients : [ingredients];
        const cleanedIngredients = ingredientsArray.filter(ingredient => ingredient.trim() !== '');

        if (cleanedIngredients.length === 0) {
            req.session.error = 'At least one ingredient is required';
            return res.redirect(`/recipes/${req.params.id}/edit`);
        }

        // Update recipe
        await req.recipe.update({
            title: title.trim(),
            description: description ? description.trim() : null,
            ingredients: cleanedIngredients,
            instructions: instructions.trim(),
            cookingTime: cookingTime || null,
            servings: servings || null,
            difficulty: difficulty || null,
            calories: parseInt(calories),
            imageUrl: req.body.imageUrl || req.recipe.imageUrl
        });

        // Update categories if provided
        if (categories) {
            const categoryIds = Array.isArray(categories) ? categories : [categories];
            await req.recipe.setCategories(categoryIds);
        } else {
            await req.recipe.setCategories([]);
        }

        req.session.success = 'Recipe updated successfully!';
        return res.redirect(`/recipes/${req.params.id}`);

    } catch (error) {
        console.error('Error updating recipe:', error);
        req.session.error = 'Error updating recipe';
        return res.redirect(`/recipes/${req.params.id}/edit`);
    }
}));

router.delete('/:id', isRecipeCreator, asyncHandler(async (req, res) => {
    await req.recipe.destroy();
    req.session.success = 'Recipe deleted successfully';
    res.json({ 
        success: true, 
        message: 'Recipe deleted successfully',
        redirectUrl: '/dashboard'
    });
}));

// 5. Save/unsave routes
router.post('/:id/save', asyncHandler(async (req, res) => {
    const recipeId = parseInt(req.params.id);
    
    try {
        const [savedRecipe, created] = await SavedRecipe.findOrCreate({
            where: {
                userId: req.session.user.id,
                recipeId: recipeId
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

router.delete('/:id/save', asyncHandler(async (req, res) => {
    const recipeId = parseInt(req.params.id);
    
    try {
        const deleted = await SavedRecipe.destroy({
            where: {
                userId: req.session.user.id,
                recipeId: recipeId
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
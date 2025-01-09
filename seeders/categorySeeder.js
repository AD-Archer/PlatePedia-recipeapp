import { Category } from '../models/TableCreation.js';

const categories = [
    { name: 'Beef' },
    { name: 'Chicken' },
    { name: 'Dessert' },
    { name: 'Lamb' },
    { name: 'Pasta' },
    { name: 'Pork' },
    { name: 'Seafood' },
    { name: 'Side Dish' },
    { name: 'Starter' },
    { name: 'Vegan' },
    { name: 'Vegetarian' },
    { name: 'Breakfast' },
    { name: 'Goat' },
    { name: 'Miscellaneous' }
];

export const seedCategories = async () => {
    try {
        for (const category of categories) {
            await Category.findOrCreate({
                where: { name: category.name }
            });
        }
        console.log('Categories seeded successfully');
    } catch (error) {
        console.error('Error seeding categories:', error);
    }
}; 
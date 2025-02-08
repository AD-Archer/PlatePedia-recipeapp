import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';
// this is use to define categories on the site to be dispalyed on our dashboard
const Category = sequelize.define('Category', {
    name: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    type: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'cuisine'
    },
    imageUrl: {
        type: DataTypes.STRING,
        allowNull: true
    }
}, {
    tableName: 'categories'
});

// Organized default images by category type
const defaultImages = {
    cuisine: {
        'american': 'https://images.unsplash.com/photo-1551782450-a2132b4ba21d',
        'british': 'https://images.unsplash.com/photo-1542803293-59c8b2b0c37c',
        'canadian': 'https://images.unsplash.com/photo-1651699266566-2355d4f8f0b5',
        'chinese': 'https://images.unsplash.com/photo-1583475020831-fb4f737b000d',
        'croatian': 'https://images.unsplash.com/photo-1626200419199-391ae4be7a41',
        'dutch': 'https://images.unsplash.com/photo-1597823968481-20de5e9e2bad',
        'egyptian': 'https://images.unsplash.com/photo-1632843149665-1c0aea00c3c5',
        'filipino': 'https://images.unsplash.com/photo-1619898802059-c8451922b8cc',
        'french': 'https://images.unsplash.com/photo-1608855238293-a8853e7f7c98',
        'greek': 'https://images.unsplash.com/photo-1559598467-f8b76c8155d0',
        'indian': 'https://images.unsplash.com/photo-1585937421612-70a008356fbe',
        'irish': 'https://images.unsplash.com/photo-1617873653071-5cd0d5bed200',
        'italian': 'https://images.unsplash.com/photo-1598866594230-a7c12756260f',
        'jamaican': 'https://images.unsplash.com/photo-1626010148926-eb4012c5e1de',
        'japanese': 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351',
        'kenyan': 'https://images.unsplash.com/photo-1511910849309-0dffb8785146',
        'malaysian': 'https://images.unsplash.com/photo-1622643944007-450264a5f9a9',
        'mexican': 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47'
    },
    meal: {
        'breakfast': 'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666',
        'lunch': 'https://images.unsplash.com/photo-1547496502-affa22d38842',
        'dinner': 'https://images.unsplash.com/photo-1576867757603-05b134ebc379',
        'dessert': 'https://images.unsplash.com/photo-1488477181946-6428a0291777',
        'snack': 'https://images.unsplash.com/photo-1621939514649-280e2ee25f60'
    },
    diet: {
        'vegetarian': 'https://images.unsplash.com/photo-1540420773420-3366772f4999',
        'vegan': 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd',
        'gluten-free': 'https://images.unsplash.com/photo-1612549225454-0815b4778d08',
        'keto': 'https://images.unsplash.com/photo-1490645935967-10de6ba17061',
        'paleo': 'https://images.unsplash.com/photo-1490645935967-10de6ba17061'
    },
    default: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836'
};

// Updated instance method to handle different category types
Category.prototype.getDefaultImage = function() {
    const typeImages = defaultImages[this.type];
    if (typeImages) {
        return typeImages[this.name.toLowerCase()] || defaultImages.default;
    }
    return defaultImages.default;
};

export default Category; 
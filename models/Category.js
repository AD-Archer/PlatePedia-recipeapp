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
        defaultValue: 'meal'
    },
    imageUrl: {
        type: DataTypes.STRING,
        allowNull: true
    }
}, {
    tableName: 'categories'
});

// Add these cuisine-specific default images
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

// Add this instance method
Category.prototype.getDefaultImage = function() {
  return cuisineDefaultImages[this.name.toLowerCase()] || cuisineDefaultImages.default;
};

export default Category; 
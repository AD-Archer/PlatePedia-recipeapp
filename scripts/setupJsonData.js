// This is the script that is used to setup the JSON data

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');
const dataDir = path.join(rootDir, 'data');
const jsonFilePath = path.join(dataDir, 'mealdb_recipes.json');
const sourceFilePath = path.join(rootDir, 'mealdb_recipes.json');

// Create data directory if it doesn't exist
if (!fs.existsSync(dataDir)) {
  console.log('Creating data directory...');
  fs.mkdirSync(dataDir);
}

// Copy mealdb_recipes.json to data directory if it doesn't exist
if (!fs.existsSync(jsonFilePath)) {
  if (fs.existsSync(sourceFilePath)) {
    console.log('Copying mealdb_recipes.json to data directory...');
    fs.copyFileSync(sourceFilePath, jsonFilePath);
    console.log('Done!');
  } else {
    console.error('Error: mealdb_recipes.json not found in root directory');
    console.log('Please run the Python script to generate the file first:');
    console.log('python fetch_mealdb_data.py');
  }
} else {
  console.log('mealdb_recipes.json already exists in data directory');
} 
# This is the script that fetches the data from the MealDB API and saves it to a JSON file
# It is used to populate the database with data

import requests
import json
import time
import os
from tqdm import tqdm

def fetch_meals_by_letter(letter):
    """Fetch meals from TheMealDB API by first letter"""
    try:
        url = f"https://www.themealdb.com/api/json/v1/1/search.php?f={letter}"
        response = requests.get(url)
        data = response.json()
        return data.get('meals', [])
    except Exception as e:
        print(f"Error fetching meals starting with {letter}: {e}")
        return []

def fetch_all_meals():
    """Fetch meals for all letters of the alphabet"""
    all_meals = []
    alphabet = 'abcdefghijklmnopqrstuvwxyz'
    
    # Use tqdm for a progress bar
    for letter in tqdm(alphabet, desc="Fetching meals by letter"):
        print(f"\nFetching meals starting with letter: {letter}")
        meals = fetch_meals_by_letter(letter)
        if meals:
            all_meals.extend(meals)
            print(f"Found {len(meals)} meals starting with {letter}")
        else:
            print(f"No meals found starting with {letter}")
        
        # Add a small delay to avoid rate limiting
        time.sleep(0.5)
    
    return all_meals

def process_meal_data(meals):
    """Process and enhance the meal data"""
    processed_meals = []
    
    for meal in meals:
        # Format ingredients and measurements
        ingredients = []
        for i in range(1, 21):
            ingredient = meal.get(f"strIngredient{i}")
            measure = meal.get(f"strMeasure{i}")
            
            if ingredient and ingredient.strip():
                ingredients.append({
                    "ingredient": ingredient.strip(),
                    "measure": measure.strip() if measure else ""
                })
        
        # Estimate cooking time from instructions length
        instructions_length = len(meal.get("strInstructions", ""))
        estimated_time = max(30, min(180, int(instructions_length / 50)))
        
        # Estimate calories (random between 200-800 for demo)
        import random
        estimated_calories = random.randint(200, 800)
        
        # Determine difficulty
        if instructions_length > 1000:
            difficulty = "hard"
        elif instructions_length > 500:
            difficulty = "medium"
        else:
            difficulty = "easy"
        
        # Create processed meal object
        processed_meal = {
            "id": meal.get("idMeal"),
            "title": meal.get("strMeal"),
            "category": meal.get("strCategory"),
            "area": meal.get("strArea"),
            "instructions": meal.get("strInstructions"),
            "thumbnail": meal.get("strMealThumb"),
            "youtube": meal.get("strYoutube"),
            "ingredients": ingredients,
            "tags": meal.get("strTags", "").split(",") if meal.get("strTags") else [],
            "source": meal.get("strSource"),
            "estimated_time": estimated_time,
            "estimated_calories": estimated_calories,
            "difficulty": difficulty,
            "servings": 4  # Default value
        }
        
        processed_meals.append(processed_meal)
    
    return processed_meals

def main():
    print("Starting MealDB data extraction...")
    
    # Fetch all meals
    all_meals = fetch_all_meals()
    print(f"\nTotal meals fetched: {len(all_meals)}")
    
    # Process the meal data
    processed_meals = process_meal_data(all_meals)
    
    # Save to JSON file
    output_file = "mealdb_recipes.json"
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump({
            "recipes": processed_meals,
            "total": len(processed_meals),
            "generated_at": time.strftime("%Y-%m-%d %H:%M:%S")
        }, f, indent=2)
    
    print(f"\nData successfully saved to {output_file}")
    print(f"Total recipes: {len(processed_meals)}")

if __name__ == "__main__":
    main() 
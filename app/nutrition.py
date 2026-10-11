
# Basic nutrition estimates per serving.
# Values are illustrative estimates and vary by recipe and portion size.

NUTRITION_DATA = {
    "Aloo Gobi": {
        "serving": "1 cup (about 200 g)",
        "calories": 180, "protein_g": 4, "carbs_g": 24, "fat_g": 8
    },
    "Aloo Mutter": {
        "serving": "1 cup (about 200 g)",
        "calories": 200, "protein_g": 6, "carbs_g": 28, "fat_g": 7
    },
    "Amritsari Kulcha": {
        "serving": "1 piece",
        "calories": 300, "protein_g": 8, "carbs_g": 45, "fat_g": 10
    },
    "Burger": {
        "serving": "1 medium burger",
        "calories": 350, "protein_g": 17, "carbs_g": 38, "fat_g": 15
    },
    "Chai": {
        "serving": "1 cup (about 200 ml, with milk and sugar)",
        "calories": 100, "protein_g": 3, "carbs_g": 14, "fat_g": 3
    },
    "Chapati": {
        "serving": "1 medium chapati",
        "calories": 110, "protein_g": 3, "carbs_g": 20, "fat_g": 2
    },
    "Chole Bhature": {
        "serving": "1 serving (1 bhatura with chole)",
        "calories": 450, "protein_g": 13, "carbs_g": 65, "fat_g": 16
    },
    "Falooda": {
        "serving": "1 glass (about 250 ml)",
        "calories": 300, "protein_g": 6, "carbs_g": 48, "fat_g": 9
    },
    "Idiyappam": {
        "serving": "2 pieces",
        "calories": 160, "protein_g": 3, "carbs_g": 35, "fat_g": 1
    },
    "Puttu": {
        "serving": "1 medium portion (about 150 g)",
        "calories": 250, "protein_g": 5, "carbs_g": 48, "fat_g": 4
    },
    "Rasgulla": {
        "serving": "2 small pieces",
        "calories": 180, "protein_g": 4, "carbs_g": 35, "fat_g": 3
    },
    "Thali": {
        "serving": "1 medium mixed meal",
        "calories": 600, "protein_g": 18, "carbs_g": 85, "fat_g": 20
    },
}


def get_nutrition(food_name: str):
    data = NUTRITION_DATA.get(food_name)

    if data is None:
        return None

    return {
        "food_name": food_name,
        **data,
        "note": (
            "Approximate values for the listed serving. "
            "Actual nutrition varies with recipe, ingredients, "
            "portion size, and preparation."
        ),
    }

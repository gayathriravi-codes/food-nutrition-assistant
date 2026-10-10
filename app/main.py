
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image, UnidentifiedImageError
from io import BytesIO

from app.inference import predict_image
from app.nutrition import get_nutrition

app = FastAPI(title="NutriSnap Food Recognition API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def home():
    return {"message": "NutriSnap API is running!"}


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    if file.content_type and not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=400,
            detail="Please upload an image file."
        )

    try:
        contents = await file.read()
        image = Image.open(BytesIO(contents)).convert("RGB")
    except (UnidentifiedImageError, OSError, ValueError):
        raise HTTPException(
            status_code=400,
            detail="The uploaded file is not a valid image."
        )

    return predict_image(image)


@app.get("/nutrition/{food_name}")
def nutrition(food_name: str):
    result = get_nutrition(food_name)

    if result is None:
        return {
            "available": False,
            "food_name": food_name,
            "message": (
                "Nutrition information is not available for this food yet."
            )
        }

    return {
        "available": True,
        **result
    }

<<<<<<< HEAD
﻿
import os
from io import BytesIO

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image, UnidentifiedImageError

# Configuration
MAX_IMAGE_SIZE = 10 * 1024 * 1024  # 10 MB

ALLOWED_CONTENT_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
}

ALLOWED_IMAGE_FORMATS = {
    "JPEG",
    "PNG",
    "WEBP",
}

# Frontend development URLs
origins = [
    origin.strip().rstrip("/")
    for origin in os.getenv(
        "CORS_ORIGINS",
        "http://localhost:5173,http://localhost:3000",
    ).split(",")
    if origin.strip()
]

app = FastAPI(
    title="NutriSnap API",
    description="Food image recognition and nutrition assistant API.",
    version="0.1.0",
)
=======

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image, UnidentifiedImageError
from io import BytesIO

from app.inference import predict_image
from app.nutrition import get_nutrition

app = FastAPI(title="NutriSnap Food Recognition API")
>>>>>>> origin/main

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


<<<<<<< HEAD
# Health check
@app.get("/health")
def health():
    return {
        "status": "ok",
        "model_status": "not_integrated",
    }


# Food image upload and prediction
@app.post("/predict")
async def predict(image: UploadFile = File(...)):
    # Validate the declared content type.
    if image.content_type not in ALLOWED_CONTENT_TYPES:
        await image.close()
        raise HTTPException(
            status_code=415,
            detail="Unsupported image type. Upload a JPEG, PNG, or WEBP image.",
        )

    try:
        # Read at most 10 MB plus one byte to detect oversized uploads.
        image_bytes = await image.read(MAX_IMAGE_SIZE + 1)
    finally:
        await image.close()

    if not image_bytes:
        raise HTTPException(
            status_code=400,
            detail="The uploaded image is empty.",
        )

    if len(image_bytes) > MAX_IMAGE_SIZE:
        raise HTTPException(
            status_code=413,
            detail="Image exceeds the 10 MB upload limit.",
        )

    # Verify that the uploaded file contains a supported image.
    try:
        with Image.open(BytesIO(image_bytes)) as uploaded_image:
            if uploaded_image.format not in ALLOWED_IMAGE_FORMATS:
                raise HTTPException(
                    status_code=415,
                    detail="Unsupported image format.",
                )

            uploaded_image.verify()

    except HTTPException:
        raise
    except (
        UnidentifiedImageError,
        OSError,
        Image.DecompressionBombError,
    ):
        raise HTTPException(
            status_code=400,
            detail="The uploaded file is not a valid image.",
        ) from None

    # TODO: Integrate Gagana's verified food-recognition predictor.
    # This response is a placeholder, not an actual model prediction.
    return {
        "status": "unsupported",
        "food_id": None,
        "food_name": None,
        "confidence": None,
        "alternatives": [],
        "message": (
            "Image validated successfully. "
            "AI food recognition is not integrated yet."
        ),
        "model_status": "not_integrated",
    }


# Nutrition lookup
@app.get("/nutrition/{food_id}")
def get_nutrition(food_id: str):
    # TODO: Connect a verified nutrition dataset.
    # Never return invented nutrition values.
    raise HTTPException(
        status_code=404,
        detail=f"No verified nutrition record exists for '{food_id}'.",
    )

=======
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
>>>>>>> origin/main

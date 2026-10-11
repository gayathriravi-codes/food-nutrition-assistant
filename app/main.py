import os
from io import BytesIO

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image, UnidentifiedImageError

from app.inference import predict_image
from app.nutrition import get_nutrition


# --------------------------------------------------
# Configuration
# --------------------------------------------------

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

DEFAULT_ORIGINS = (
    "http://localhost:5173,"
    "http://localhost:3000"
)

origins = [
    origin.strip().rstrip("/")
    for origin in os.getenv(
        "CORS_ORIGINS",
        DEFAULT_ORIGINS,
    ).split(",")
    if origin.strip()
]


# --------------------------------------------------
# FastAPI application
# --------------------------------------------------

app = FastAPI(
    title="NutriSnap API",
    description=(
        "Food image recognition and nutrition "
        "assistant API."
    ),
    version="1.0.0",
)


# --------------------------------------------------
# CORS configuration
# --------------------------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


# --------------------------------------------------
# Root endpoint
# --------------------------------------------------

@app.get("/")
def home():
    return {
        "message": "NutriSnap API is running!",
        "docs": "/docs",
    }


# --------------------------------------------------
# Health check
# --------------------------------------------------

@app.get("/health")
def health():
    return {
        "status": "ok",
        "model_status": "loaded",
    }


# --------------------------------------------------
# Food image prediction
# --------------------------------------------------

@app.post("/predict")
async def predict(file: UploadFile = File(...)):

    # Validate the declared content type.
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        await file.close()

        raise HTTPException(
            status_code=415,
            detail=(
                "Upload a JPEG, PNG, or WEBP image."
            ),
        )

    try:
        # Read at most 10 MB plus one byte.
        contents = await file.read(
            MAX_IMAGE_SIZE + 1
        )

    finally:
        await file.close()

    # Reject empty uploads.
    if not contents:
        raise HTTPException(
            status_code=400,
            detail="The uploaded image is empty.",
        )

    # Reject oversized uploads.
    if len(contents) > MAX_IMAGE_SIZE:
        raise HTTPException(
            status_code=413,
            detail="Image exceeds the 10 MB limit.",
        )

    # Validate and decode the actual image.
    try:
        with Image.open(
            BytesIO(contents)
        ) as uploaded_image:

            if (
                uploaded_image.format
                not in ALLOWED_IMAGE_FORMATS
            ):
                raise HTTPException(
                    status_code=415,
                    detail="Unsupported image format.",
                )

            uploaded_image.verify()

        # Reopen after verify() and convert to RGB.
        with Image.open(
            BytesIO(contents)
        ) as uploaded_image:

            image = uploaded_image.convert("RGB")

    except HTTPException:
        raise

    except (
        UnidentifiedImageError,
        OSError,
        Image.DecompressionBombError,
    ):
        raise HTTPException(
            status_code=400,
            detail=(
                "The uploaded file is not a valid image."
            ),
        ) from None

    # Run the existing food classification model.
    try:
        prediction = predict_image(image)

        return prediction

    except Exception as exc:
        print(
            f"Food prediction failed: {exc}"
        )

        raise HTTPException(
            status_code=500,
            detail=(
                "Food recognition failed. "
                "Check the backend logs."
            ),
        ) from None


# --------------------------------------------------
# Nutrition information
# --------------------------------------------------

@app.get("/nutrition/{food_name}")
def nutrition(food_name: str):

    result = get_nutrition(food_name)

    if result is None:
        return {
            "available": False,
            "food_name": food_name,
            "message": (
                "Nutrition information is not "
                "available for this food yet."
            ),
        }

    return {
        "available": True,
        **result,
    }
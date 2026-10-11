import os
from io import BytesIO

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image, UnidentifiedImageError

from app.inference import predict_image
from app.nutrition import get_nutrition

MAX_IMAGE_SIZE = 10 * 1024 * 1024

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

app.add_middleware(
CORSMiddleware,
allow_origins=origins,
allow_credentials=False,
allow_methods=["GET", "POST", "OPTIONS"],
allow_headers=["*"],
)

@app.get("/")
def home():
return {"message": "NutriSnap API is running!"}

@app.get("/health")
def health():
return {"status": "ok", "model_status": "loaded"}

@app.post("/predict")
async def predict(file: UploadFile = File(...)):
if file.content_type not in ALLOWED_CONTENT_TYPES:
await file.close()
raise HTTPException(
status_code=415,
detail="Upload a JPEG, PNG, or WEBP image.",
)

```
try:
    contents = await file.read(MAX_IMAGE_SIZE + 1)
finally:
    await file.close()

if not contents:
    raise HTTPException(status_code=400, detail="The uploaded image is empty.")

if len(contents) > MAX_IMAGE_SIZE:
    raise HTTPException(status_code=413, detail="Image exceeds the 10 MB limit.")

try:
    with Image.open(BytesIO(contents)) as uploaded_image:
        if uploaded_image.format not in ALLOWED_IMAGE_FORMATS:
            raise HTTPException(
                status_code=415,
                detail="Unsupported image format.",
            )
        uploaded_image.verify()

    with Image.open(BytesIO(contents)) as uploaded_image:
        image = uploaded_image.convert("RGB")

except HTTPException:
    raise
except (UnidentifiedImageError, OSError, Image.DecompressionBombError):
    raise HTTPException(
        status_code=400,
        detail="The uploaded file is not a valid image.",
    ) from None

try:
    return predict_image(image)
except Exception as exc:
    # Log the actual exception on the server for debugging.
    print(f"Food prediction failed: {exc}")
    raise HTTPException(
        status_code=500,
        detail="Food recognition failed. Please try another image.",
    ) from None
```

@app.get("/nutrition/{food_name}")
def nutrition(food_name: str):
result = get_nutrition(food_name)

```
if result is None:
    return {
        "available": False,
        "food_name": food_name,
        "message": "Nutrition information is not available for this food yet.",
    }

return {
    "available": True,
    **result,
}


import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

origins = [
    origin.strip().rstrip("/")
    for origin in os.getenv(
        "CORS_ORIGINS",
        "http://localhost:5173,http://localhost:3000",
    ).split(",")
    if origin.strip()
]

app = FastAPI(title="Food Nutrition Assistant API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type"],
)

@app.get("/health")
def health():
    return {"status": "ok"}


import json
from pathlib import Path

import torch
from torch import nn
from torchvision import models, transforms
from PIL import Image


# Project paths
PROJECT_DIR = Path(__file__).resolve().parents[1]
ARTIFACTS_DIR = PROJECT_DIR / "artifacts"

MODEL_PATH = ARTIFACTS_DIR / "food_classifier.pth"
CLASSES_PATH = ARTIFACTS_DIR / "classes.json"

# Use GPU when available; otherwise use CPU
DEVICE = torch.device(
    "cuda" if torch.cuda.is_available() else "cpu"
)

# Load class names in the exact training order
with open(CLASSES_PATH, "r", encoding="utf-8") as file:
    CLASS_NAMES = json.load(file)

# Match the evaluation preprocessing used during training
IMAGE_SIZE = 224

IMAGE_TRANSFORM = transforms.Compose([
    transforms.Resize((IMAGE_SIZE, IMAGE_SIZE)),
    transforms.ToTensor(),
    transforms.Normalize(
        mean=[0.485, 0.456, 0.406],
        std=[0.229, 0.224, 0.225],
    ),
])


def load_model():
    """Load the saved ResNet-18 classifier."""
    checkpoint = torch.load(
        MODEL_PATH,
        map_location=DEVICE,
        weights_only=True,
    )

    num_classes = checkpoint["num_classes"]

    if num_classes != len(CLASS_NAMES):
        raise ValueError(
            "Model class count does not match classes.json."
        )

    if checkpoint["image_size"] != IMAGE_SIZE:
        raise ValueError(
            "Image size does not match the saved model."
        )

    model = models.resnet18(weights=None)

    model.fc = nn.Linear(
        model.fc.in_features,
        num_classes,
    )

    model.load_state_dict(checkpoint["model_state_dict"])
    model = model.to(DEVICE)
    model.eval()

    return model


# Load the model once instead of reloading for every image
model = load_model()


def predict_image(image: Image.Image) -> dict:
    """Predict the food category from a PIL image."""
    image = image.convert("RGB")
    tensor = IMAGE_TRANSFORM(image).unsqueeze(0)
    tensor = tensor.to(DEVICE)

    with torch.inference_mode():
        logits = model(tensor)
        probabilities = torch.softmax(logits, dim=1)[0]

        top_count = min(3, len(CLASS_NAMES))
        scores, indices = torch.topk(
            probabilities, top_count
        )

    top_predictions = [
        {
            "class_name": CLASS_NAMES[index.item()],
            "confidence": round(score.item(), 4),
        }
        for score, index in zip(scores, indices)
    ]

    best = top_predictions[0]

    return {
        "predicted_class": best["class_name"],
        "confidence": best["confidence"],
        "top_predictions": top_predictions,
    }

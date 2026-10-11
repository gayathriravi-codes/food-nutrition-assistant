
import json
import time
from pathlib import Path

import torch
from torch import nn
from torch.utils.data import DataLoader
from torchvision import datasets, transforms, models
from torchvision.models import ResNet18_Weights
from PIL import Image


# Dataset location
DATA_DIR = Path(
    r"C:\Users\Gagana R\OneDrive\Desktop\FoodSight-100\foodsight_dataset\dataset"
)

# Project and output locations
APP_DIR = Path(__file__).resolve().parent
ARTIFACTS_DIR = APP_DIR / "artifacts"
ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)

MODEL_PATH = ARTIFACTS_DIR / "food_classifier.pth"
CLASSES_PATH = ARTIFACTS_DIR / "classes.json"

# Training settings
IMAGE_SIZE = 224
BATCH_SIZE = 8
EPOCHS = 5
LEARNING_RATE = 0.0001

# Select GPU if available, otherwise CPU
device = torch.device(
    "cuda" if torch.cuda.is_available() else "cpu"
)


# Load images as RGB
def rgb_loader(path):
    with Image.open(path) as image:
        return image.convert("RGB")


def main():
    print("Checking dataset location...", flush=True)
    print(f"Dataset path: {DATA_DIR}", flush=True)
    print(f"Device: {device}", flush=True)

    if not DATA_DIR.exists():
        raise FileNotFoundError(
            f"Dataset folder not found: {DATA_DIR}"
        )

    train_path = DATA_DIR / "train"
    val_path = DATA_DIR / "validation"

    if not train_path.is_dir():
        raise FileNotFoundError(
            f"Training folder not found: {train_path}"
        )

    if not val_path.is_dir():
        raise FileNotFoundError(
            f"Validation folder not found: {val_path}"
        )

    print("Loading datasets...", flush=True)

    train_transform = transforms.Compose([
        transforms.Resize((IMAGE_SIZE, IMAGE_SIZE)),
        transforms.RandomHorizontalFlip(),
        transforms.RandomRotation(10),
        transforms.ColorJitter(
            brightness=0.15,
            contrast=0.15,
            saturation=0.15,
        ),
        transforms.ToTensor(),
        transforms.Normalize(
            mean=[0.485, 0.456, 0.406],
            std=[0.229, 0.224, 0.225],
        ),
    ])

    eval_transform = transforms.Compose([
        transforms.Resize((IMAGE_SIZE, IMAGE_SIZE)),
        transforms.ToTensor(),
        transforms.Normalize(
            mean=[0.485, 0.456, 0.406],
            std=[0.229, 0.224, 0.225],
        ),
    ])

    train_data = datasets.ImageFolder(
        train_path,
        loader=rgb_loader,
        transform=train_transform,
    )

    val_data = datasets.ImageFolder(
        val_path,
        loader=rgb_loader,
        transform=eval_transform,
    )

    if train_data.classes != val_data.classes:
        raise ValueError(
            "Training and validation class labels do not match."
        )

    num_classes = len(train_data.classes)

    if num_classes == 0:
        raise ValueError("No food categories were found.")

    if len(train_data) == 0 or len(val_data) == 0:
        raise ValueError(
            "Training or validation dataset is empty."
        )

    print(f"Food categories: {num_classes}", flush=True)
    print(f"Training images: {len(train_data)}", flush=True)
    print(f"Validation images: {len(val_data)}", flush=True)

    train_loader = DataLoader(
        train_data,
        batch_size=BATCH_SIZE,
        shuffle=True,
        num_workers=0,
    )

    val_loader = DataLoader(
        val_data,
        batch_size=BATCH_SIZE,
        shuffle=False,
        num_workers=0,
    )

    print("Loading pretrained ResNet-18...", flush=True)

    model = models.resnet18(
        weights=ResNet18_Weights.DEFAULT
    )

    # Freeze all pretrained layers initially
    for parameter in model.parameters():
        parameter.requires_grad = False

    # Fine-tune deeper feature layers
    for parameter in model.layer3.parameters():
        parameter.requires_grad = True

    for parameter in model.layer4.parameters():
        parameter.requires_grad = True

    # Replace the final layer for our food categories
    model.fc = nn.Linear(
        model.fc.in_features,
        num_classes,
    )

    model = model.to(device)

    criterion = nn.CrossEntropyLoss()

    optimizer = torch.optim.AdamW(
        [
            {
                "params": model.layer3.parameters(),
                "lr": LEARNING_RATE / 10,
            },
            {
                "params": model.layer4.parameters(),
                "lr": LEARNING_RATE,
            },
            {
                "params": model.fc.parameters(),
                "lr": LEARNING_RATE,
            },
        ],
        weight_decay=0.01,
    )

    best_accuracy = -1.0

    # Training loop
    for epoch in range(EPOCHS):
        start = time.time()
        model.train()
        total_loss = 0.0

        print(
            f"Starting epoch {epoch + 1}/{EPOCHS}...",
            flush=True,
        )

        for batch_number, (images, labels) in enumerate(
            train_loader, start=1
        ):
            images = images.to(device)
            labels = labels.to(device)

            optimizer.zero_grad()

            outputs = model(images)
            loss = criterion(outputs, labels)

            loss.backward()
            optimizer.step()

            total_loss += loss.item() * images.size(0)

            if batch_number == 1 or batch_number % 100 == 0:
                print(
                    f"Epoch {epoch + 1}/{EPOCHS} | "
                    f"Batch {batch_number}/{len(train_loader)} | "
                    f"Loss: {loss.item():.4f}",
                    flush=True,
                )

        average_loss = total_loss / len(train_data)

        # Validation
        print("Starting validation...", flush=True)
        model.eval()

        correct = 0
        total = 0

        with torch.inference_mode():
            for batch_number, (images, labels) in enumerate(
                val_loader, start=1
            ):
                images = images.to(device)
                labels = labels.to(device)

                outputs = model(images)
                predictions = outputs.argmax(dim=1)

                correct += (
                    predictions == labels
                ).sum().item()

                total += labels.size(0)

                if batch_number % 100 == 0:
                    print(
                        f"Validation batch "
                        f"{batch_number}/{len(val_loader)}",
                        flush=True,
                    )

        accuracy = correct / total if total else 0.0

        print(
            f"Epoch {epoch + 1}/{EPOCHS} completed | "
            f"Average loss: {average_loss:.4f} | "
            f"Validation accuracy: {accuracy:.2%} | "
            f"Time: {time.time() - start:.1f} seconds",
            flush=True,
        )

        # Save the best model and matching class names
        if accuracy > best_accuracy:
            best_accuracy = accuracy

            torch.save(
                {
                    "model_state_dict": model.state_dict(),
                    "num_classes": num_classes,
                    "image_size": IMAGE_SIZE,
                },
                MODEL_PATH,
            )

            with open(
                CLASSES_PATH, "w", encoding="utf-8"
            ) as file:
                json.dump(train_data.classes, file, indent=2)

            print(
                f"Best model saved to: {MODEL_PATH}",
                flush=True,
            )

    print(
        f"Best validation accuracy: {best_accuracy:.2%}",
        flush=True,
    )
    print("Training finished successfully!", flush=True)


if __name__ == "__main__":
    main()

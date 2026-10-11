
import random
from collections import defaultdict
from pathlib import Path

from PIL import Image
from torchvision import datasets

from app.inference import predict_image

DATA_DIR = Path(
    r"C:\Users\Gagana R\OneDrive\Desktop\FoodSight-100\foodsight_dataset\dataset"
)
VAL_DIR = DATA_DIR / "validation"

dataset = datasets.ImageFolder(VAL_DIR)
random.seed(42)

samples = random.sample(dataset.samples, min(500, len(dataset.samples)))

correct = 0
class_stats = defaultdict(lambda: [0, 0])

print(f"Evaluating {len(samples)} validation images...")

for i, (image_path, true_index) in enumerate(samples, start=1):
    try:
        with Image.open(image_path) as img:
            image = img.convert("RGB")
            result = predict_image(image)

        actual = dataset.classes[true_index]
        predicted = result["predicted_class"]

        class_stats[actual][1] += 1

        if predicted == actual:
            correct += 1
            class_stats[actual][0] += 1

        if i % 50 == 0:
            print(f"Processed {i}/{len(samples)} images")

    except Exception as exc:
        print(f"Skipped {image_path}: {exc}")

print("\nSample accuracy:", f"{correct / len(samples):.2%}")
print("\nPer-category results (categories with at least 3 sampled images):")

ranked = []
for name, (right, total) in class_stats.items():
    if total >= 3:
        ranked.append((right / total, name, right, total))

for accuracy, name, right, total in sorted(ranked)[:10]:
    print(f"{name}: {right}/{total} ({accuracy:.1%})")

print("\nBest-performing sampled categories:")
for accuracy, name, right, total in sorted(ranked, reverse=True)[:10]:
    print(f"{name}: {right}/{total} ({accuracy:.1%})")

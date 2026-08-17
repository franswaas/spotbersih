---
license: mit
tags:
- object-detection
- yolo
- yolov8
- waste-detection
- waste-classification
- recycling
- garbage-detection
- smart-city
- sustainability
library_name: ultralytics
pipeline_tag: object-detection
---

# Waste Detection & Classification – YOLOv8

This model detects and classifies different types of waste to support **smart waste segregation, recycling automation, and sustainability projects**.  
It was trained using **Ultralytics YOLOv8** on a custom waste dataset with ~250 images per class.

## 🔎 Detected Classes
- Cardboard  
- E-waste  
- Glass  
- Medical waste  
- Metal  
- Organic waste  
- Paper  
- Plastic  

## 🧠 Model Details
- **Architecture:** YOLOv8  
- **Framework:** Ultralytics (PyTorch)  
- **Task:** Object Detection  
- **Input:** RGB images  
- **Output:** Bounding boxes + class labels  
- **Training Data:** ~250 images per class  
- **Total Classes:** 8  

## 📊 Evaluation (Validation Set – Normalized Confusion Matrix Insights)
- **Organic:** ~96% recall  
- **Metal:** ~81% recall  
- **Paper:** ~83% recall  
- **Plastic:** ~63% recall  
- **Medical waste:** ~54% recall  
- **Cardboard:** ~76% recall  
- **E-waste:** ~75% recall  
- **Glass:** ~60% recall (approx)

The model performs strongly on **organic, metal, and paper** categories.  
Performance on **medical waste and plastic** can be improved with more diverse training samples.

## 📈 Training Curves & Confusion Matrix
You can find:
- Precision-Recall curves  
- F1 curve  
- Confusion matrix  
- Training visualizations  

inside the repository files.

## 🚀 How to Use

### Install Ultralytics
```bash
pip install ultralytics
```
### Run Inference
```bash
from ultralytics import YOLO

model = YOLO("best.pt")  # path to the downloaded weights
results = model("test.jpg", conf=0.25)
results[0].show()
```

### Batch Inference
```bash
results = model("path/to/images/", save=True)
```

### 🧪 Example Use Cases
- Smart waste segregation systems
- Recycling automation
- Smart bins
- Campus or city-level waste monitoring
- Sustainability & eco-tech projects

### ⚠️ Limitations
- Performance may drop on blurry or low-light images
- Medical and plastic waste classes may need more data for higher accuracy
- Not suitable for safety-critical decisions without human verification


### 📄 License
MIT License

### 👤 Author
**Hrutik Adsare**
If you use this model, consider giving it a ⭐
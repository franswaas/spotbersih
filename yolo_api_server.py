import io
import base64
import os
import cv2
import numpy as np
from PIL import Image
from fastapi import FastAPI, Body
from fastapi.middleware.cors import CORSMiddleware
from ultralytics import YOLO

app = FastAPI(title="Smart Unified Multi-Model AI Waste Detection Engine")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MODELS_DIR = os.path.join(os.path.dirname(__file__), "ml_models")

available_models = []

HRUTIK_PATH = os.path.join(MODELS_DIR, "hrutik_yolov8", "best.pt")
if os.path.exists(HRUTIK_PATH):
    print(f"Loading Model 1 (Hrutik 8-Class): {HRUTIK_PATH}")
    model_hrutik = YOLO(HRUTIK_PATH)
    available_models.append(("hrutik", model_hrutik))

ROBOFLOW_PATH = os.path.join(MODELS_DIR, "best.pt")
if os.path.exists(ROBOFLOW_PATH):
    print(f"Loading Model 2 (Roboflow 22-Class): {ROBOFLOW_PATH}")
    model_roboflow = YOLO(ROBOFLOW_PATH)
    available_models.append(("roboflow", model_roboflow))

UNDERWATER_PATH = os.path.join(MODELS_DIR, "underwater_yolov8", "best.pt")
if os.path.exists(UNDERWATER_PATH):
    print(f"Loading Model 3 (Underwater Denoised 15-Class): {UNDERWATER_PATH}")
    model_underwater = YOLO(UNDERWATER_PATH)
    available_models.append(("underwater", model_underwater))

face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")

# Indonesian & English Bilingual Waste Mapping
CATEGORY_MAPPING = {
    # ♻️ RECYCLABLE (DAUR ULANG)
    "cardboard": {
        "category": "RECYCLABLE",
        "label": "Kardus (Cardboard)",
        "label_id": "Kardus",
        "label_en": "Cardboard",
        "color": "#10B981"
    },
    "cardboard_box": {
        "category": "RECYCLABLE",
        "label": "Dus Karton (Cardboard Box)",
        "label_id": "Dus Karton",
        "label_en": "Cardboard Box",
        "color": "#10B981"
    },
    "can": {
        "category": "RECYCLABLE",
        "label": "Kaleng Minuman (Can)",
        "label_id": "Kaleng Minuman",
        "label_en": "Metal Can",
        "color": "#10B981"
    },
    "metal": {
        "category": "RECYCLABLE",
        "label": "Kaleng / Logam (Metal)",
        "label_id": "Kaleng / Logam",
        "label_en": "Metal Waste",
        "color": "#10B981"
    },
    "plastic_bottle": {
        "category": "RECYCLABLE",
        "label": "Botol Plastik (Plastic Bottle)",
        "label_id": "Botol Plastik",
        "label_en": "Plastic Bottle",
        "color": "#10B981"
    },
    "pbottle": {
        "category": "RECYCLABLE",
        "label": "Botol Plastik (Plastic Bottle)",
        "label_id": "Botol Plastik",
        "label_en": "Plastic Bottle",
        "color": "#10B981"
    },
    "plastic_bottle_cap": {
        "category": "RECYCLABLE",
        "label": "Tutup Botol (Bottle Cap)",
        "label_id": "Tutup Botol",
        "label_en": "Bottle Cap",
        "color": "#10B981"
    },
    "plastic": {
        "category": "RECYCLABLE",
        "label": "Plastik (Plastic)",
        "label_id": "Plastik Daur Ulang",
        "label_en": "Plastic",
        "color": "#10B981"
    },
    "reuseable_paper": {
        "category": "RECYCLABLE",
        "label": "Kertas Bersih (Paper)",
        "label_id": "Kertas Bersih",
        "label_en": "Clean Paper",
        "color": "#10B981"
    },
    "glass": {
        "category": "RECYCLABLE",
        "label": "Botol Kaca (Glass)",
        "label_id": "Botol Kaca",
        "label_en": "Glass Bottle",
        "color": "#10B981"
    },
    "gbottle": {
        "category": "RECYCLABLE",
        "label": "Botol Kaca (Glass Bottle)",
        "label_id": "Botol Kaca",
        "label_en": "Glass Bottle",
        "color": "#10B981"
    },
    "rod": {
        "category": "RECYCLABLE",
        "label": "Batang / Pipa Logam (Rod)",
        "label_id": "Pipa / Batang Logam",
        "label_en": "Metal Rod",
        "color": "#10B981"
    },
    "tire": {
        "category": "RECYCLABLE",
        "label": "Ban Bekas (Tire)",
        "label_id": "Ban Bekas",
        "label_en": "Tire",
        "color": "#10B981"
    },

    # 🗑️ NON-RECYCLABLE / RESIDU
    "scrap_paper": {
        "category": "NON_RECYCLABLE",
        "label": "Tisu / Kertas Kotor (Scrap Paper)",
        "label_id": "Tisu / Kertas Kotor",
        "label_en": "Scrap Paper / Tissue",
        "color": "#F59E0B"
    },
    "paper": {
        "category": "NON_RECYCLABLE",
        "label": "Kertas / Tisu (Paper)",
        "label_id": "Kertas / Tisu Bekas",
        "label_en": "Paper / Tissue",
        "color": "#F59E0B"
    },
    "plastic_bag": {
        "category": "NON_RECYCLABLE",
        "label": "Kantong Kresek (Plastic Bag)",
        "label_id": "Kantong Kresek",
        "label_en": "Plastic Bag",
        "color": "#3B82F6"
    },
    "pbag": {
        "category": "NON_RECYCLABLE",
        "label": "Kantong Kresek (Plastic Bag)",
        "label_id": "Kantong Kresek",
        "label_en": "Plastic Bag",
        "color": "#3B82F6"
    },
    "snack_bag": {
        "category": "NON_RECYCLABLE",
        "label": "Bungkus Snack / Sachet (Snack Bag)",
        "label_id": "Bungkus Snack / Sachet",
        "label_en": "Snack Wrapper",
        "color": "#3B82F6"
    },
    "plastic_cup": {
        "category": "NON_RECYCLABLE",
        "label": "Gelas Plastik (Plastic Cup)",
        "label_id": "Gelas Plastik",
        "label_en": "Plastic Cup",
        "color": "#3B82F6"
    },
    "plastic_box": {
        "category": "NON_RECYCLABLE",
        "label": "Mika / Box Plastik (Plastic Box)",
        "label_id": "Mika / Box Plastik",
        "label_en": "Plastic Box",
        "color": "#3B82F6"
    },
    "straw": {
        "category": "NON_RECYCLABLE",
        "label": "Sedotan Plastik (Straw)",
        "label_id": "Sedotan Plastik",
        "label_en": "Plastic Straw",
        "color": "#3B82F6"
    },
    "plastic_cup_lid": {
        "category": "NON_RECYCLABLE",
        "label": "Tutup Cup Plastik (Cup Lid)",
        "label_id": "Tutup Cup Plastik",
        "label_en": "Cup Lid",
        "color": "#3B82F6"
    },
    "scrap_plastic": {
        "category": "NON_RECYCLABLE",
        "label": "Serpihan Plastik (Scrap Plastic)",
        "label_id": "Serpihan Plastik",
        "label_en": "Scrap Plastic",
        "color": "#3B82F6"
    },
    "cardboard_bowl": {
        "category": "NON_RECYCLABLE",
        "label": "Mangkok Kertas (Paper Bowl)",
        "label_id": "Mangkok Kertas",
        "label_en": "Paper Bowl",
        "color": "#F59E0B"
    },
    "plastic_cultery": {
        "category": "NON_RECYCLABLE",
        "label": "Sendok/Garpu Plastik (Cutlery)",
        "label_id": "Sendok / Garpu Plastik",
        "label_en": "Plastic Cutlery",
        "color": "#3B82F6"
    },
    "stick": {
        "category": "NON_RECYCLABLE",
        "label": "Stik Kayu / Tusuk Gigi (Stick)",
        "label_id": "Stik Kayu / Tusukan",
        "label_en": "Stick",
        "color": "#F59E0B"
    },
    "net": {
        "category": "NON_RECYCLABLE",
        "label": "Jaring / Tali Plastik (Net)",
        "label_id": "Jaring / Tali Plastik",
        "label_en": "Net / Rope",
        "color": "#F59E0B"
    },
    "sunglasses": {
        "category": "NON_RECYCLABLE",
        "label": "Kacamata Rusak (Sunglasses)",
        "label_id": "Kacamata Rusak",
        "label_en": "Broken Sunglasses",
        "color": "#3B82F6"
    },
    "misc": {
        "category": "NON_RECYCLABLE",
        "label": "Sampah Campuran (Misc)",
        "label_id": "Sampah Campuran",
        "label_en": "Miscellaneous",
        "color": "#F59E0B"
    },

    # 🍃 ORGANIC (ORGANIK)
    "organic": {
        "category": "ORGANIC",
        "label": "Sampah Organik (Organic)",
        "label_id": "Sampah Organik / Makanan",
        "label_en": "Organic Waste",
        "color": "#10B981"
    },

    # ⚠️ HAZARDOUS & B3 (LIMBAH BERBAHAYA & MEDIS)
    "battery": {
        "category": "HAZARDOUS",
        "label": "Baterai Bekas (Battery)",
        "label_id": "Baterai Bekas",
        "label_en": "Battery",
        "color": "#EF4444"
    },
    "e-waste": {
        "category": "HAZARDOUS",
        "label": "Sampah Elektronik (E-Waste)",
        "label_id": "Sampah Elektronik (E-Waste)",
        "label_en": "Electronic Waste",
        "color": "#EF4444"
    },
    "electronics": {
        "category": "HAZARDOUS",
        "label": "Komponen Elektronik (Electronics)",
        "label_id": "Komponen Elektronik",
        "label_en": "Electronics",
        "color": "#EF4444"
    },
    "cellphone": {
        "category": "HAZARDOUS",
        "label": "HP Bekas / E-Waste (Phone)",
        "label_id": "HP Bekas / Gadget",
        "label_en": "Discarded Phone",
        "color": "#EF4444"
    },
    "medical": {
        "category": "HAZARDOUS",
        "label": "Limbah Medis (Medical)",
        "label_id": "Limbah Medis",
        "label_en": "Medical Waste",
        "color": "#EF4444"
    },
    "mask": {
        "category": "HAZARDOUS",
        "label": "Masker Medis (Face Mask)",
        "label_id": "Masker Medis",
        "label_en": "Face Mask",
        "color": "#EF4444"
    },
    "glove": {
        "category": "HAZARDOUS",
        "label": "Sarung Tangan Medis (Glove)",
        "label_id": "Sarung Tangan Medis",
        "label_en": "Medical Glove",
        "color": "#EF4444"
    },
    "chemical_spray_can": {
        "category": "HAZARDOUS",
        "label": "Kaleng Semprot Kimia (Spray Can)",
        "label_id": "Kaleng Semprot Kimia",
        "label_en": "Chemical Spray Can",
        "color": "#EF4444"
    },
    "chemical_plastic_bottle": {
        "category": "HAZARDOUS",
        "label": "Botol Kimia / Pembersih (Chemical Bottle)",
        "label_id": "Botol Kimia / Pembersih",
        "label_en": "Chemical Bottle",
        "color": "#EF4444"
    },
    "chemical_plastic_gallon": {
        "category": "HAZARDOUS",
        "label": "Galon Kimia (Chemical Gallon)",
        "label_id": "Galon Kimia",
        "label_en": "Chemical Gallon",
        "color": "#EF4444"
    },
    "light_bulb": {
        "category": "HAZARDOUS",
        "label": "Bohlam Lampu (Light Bulb)",
        "label_id": "Bohlam Lampu",
        "label_en": "Light Bulb",
        "color": "#EF4444"
    },
    "paint_bucket": {
        "category": "HAZARDOUS",
        "label": "Kaleng Cat (Paint Bucket)",
        "label_id": "Kaleng Cat",
        "label_en": "Paint Bucket",
        "color": "#EF4444"
    },
}

def calculate_iou(box1, box2):
    b1_x1, b1_y1, b1_x2, b1_y2 = box1
    b2_x1, b2_y1, b2_x2, b2_y2 = box2
    ix1 = max(b1_x1, b2_x1)
    iy1 = max(b1_y1, b2_y1)
    ix2 = min(b1_x2, b2_x2)
    iy2 = min(b1_y2, b2_y2)
    if ix2 <= ix1 or iy2 <= iy1:
        return 0.0
    inter_area = (ix2 - ix1) * (iy2 - iy1)
    b1_area = (b1_x2 - b1_x1) * (b1_y2 - b1_y1)
    b2_area = (b2_x2 - b2_x1) * (b2_y2 - b2_y1)
    union_area = b1_area + b2_area - inter_area
    return inter_area / union_area if union_area > 0 else 0.0

def is_strictly_face(box_coords, faces):
    bx1, by1, bx2, by2 = box_coords
    bcx = (bx1 + bx2) / 2
    bcy = (by1 + by2) / 2
    bw = bx2 - bx1
    bh = by2 - by1

    for (fx, fy, fw, fh) in faces:
        fcx = fx + fw / 2
        fcy = fy + fh / 2
        dist_sq = (bcx - fcx) ** 2 + (bcy - fcy) ** 2
        max_dist_sq = ((fw / 2) ** 2 + (fh / 2) ** 2)

        if dist_sq < max_dist_sq * 0.7 and (0.6 * fw * fh < bw * bh < 2.0 * fw * fh):
            return True
    return False

@app.get("/")
@app.get("/health")
def health():
    return {
        "status": "online",
        "service": "Smart Waste AI Detection API",
        "ready": len(available_models) > 0
    }

@app.post("/detect")
def detect_waste(payload: dict = Body(...)):
    try:
        image_data = payload.get("image")
        if not image_data:
            return {"error": "Missing 'image' payload", "status": "error"}

        if "," in image_data:
            image_data = image_data.split(",", 1)[1]

        image_bytes = base64.b64decode(image_data)
        np_arr = np.frombuffer(image_bytes, np.uint8)
        img_bgr = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

        if img_bgr is None:
            return {"error": "Failed to decode image", "status": "error"}

        h, w, _ = img_bgr.shape
        total_frame_area = w * h

        # Detect human faces to discard accidental face false-positives
        gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
        faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=4, minSize=(30, 30))

        raw_candidates = []

        # Run Ensemble Detection Engine
        for model_name, model_instance in available_models:
            results = model_instance(img_bgr, conf=0.25, verbose=False)
            res = results[0]

            for box in res.boxes:
                cls_id = int(box.cls[0].item())
                raw_name = model_instance.names.get(cls_id, f"class_{cls_id}").lower()
                conf = float(box.conf[0].item())
                x1, y1, x2, y2 = box.xyxy[0].tolist()

                bw = x2 - x1
                bh = y2 - y1
                box_area = bw * bh

                # Discard giant background boxes (> 65% of frame)
                if box_area > 0.65 * total_frame_area or bw > 0.80 * w or bh > 0.80 * h:
                    continue

                # Discard tiny noise
                if bw < 25 or bh < 25:
                    continue

                # Discard extreme aspect ratios
                aspect = bw / bh if bh > 0 else 1.0
                if aspect > 4.0 or aspect < 0.20:
                    continue

                # Discard face/head
                if is_strictly_face((x1, y1, x2, y2), faces):
                    continue

                raw_candidates.append({
                    "coords": (x1, y1, x2, y2),
                    "raw_name": raw_name,
                    "conf": conf,
                })

        # Non-Maximum Suppression (NMS)
        raw_candidates.sort(key=lambda c: c["conf"], reverse=True)
        final_boxes = []

        for candidate in raw_candidates:
            c_coords = candidate["coords"]
            overlaps = False
            for fb in final_boxes:
                if calculate_iou(c_coords, fb["coords"]) > 0.40:
                    overlaps = True
                    break
            if not overlaps:
                final_boxes.append(candidate)

        detections = []
        for i, box_item in enumerate(final_boxes):
            x1, y1, x2, y2 = box_item["coords"]
            raw_class_name = box_item["raw_name"]
            conf = box_item["conf"]

            pct_x = max(0.0, min(100.0, (x1 / w) * 100))
            pct_y = max(0.0, min(100.0, (y1 / h) * 100))
            pct_w = max(5.0, min(100.0 - pct_x, ((x2 - x1) / w) * 100))
            pct_h = max(5.0, min(100.0 - pct_y, ((y2 - y1) / h) * 100))

            meta = CATEGORY_MAPPING.get(raw_class_name, {
                "category": "RECYCLABLE",
                "label": raw_class_name.replace("_", " ").title(),
                "label_id": raw_class_name.replace("_", " ").title(),
                "label_en": raw_class_name.replace("_", " ").title(),
                "color": "#10B981"
            })

            detections.append({
                "id": f"det-{i}-{raw_class_name}",
                "class_name": raw_class_name,
                "label": meta["label"],
                "label_id": meta.get("label_id", meta["label"]),
                "label_en": meta.get("label_en", meta["label"]),
                "category": meta["category"],
                "confidence": round(conf * 100),
                "x": round(pct_x, 1),
                "y": round(pct_y, 1),
                "width": round(pct_w, 1),
                "height": round(pct_h, 1),
                "color": meta["color"],
            })

        return {
            "status": "success" if len(detections) > 0 else "no_waste_detected",
            "detected_count": len(detections),
            "detections": detections
        }

    except Exception as e:
        return {"error": str(e), "status": "error"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)

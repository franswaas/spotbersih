from ultralytics import YOLO


def main():
    model = YOLO("yolov8n.pt")

    model.train(
        data="dataset/data.yaml",
        epochs=150,
        imgsz=640,
        batch=8,

        optimizer="SGD",
        lr0=0.001,
        lrf=0.1,
        cos_lr=True,

        device=0,

        name="F0_v8n_150ep_sgd_lr0001_lrf01_cos"
    )


if __name__ == "__main__":
    main()
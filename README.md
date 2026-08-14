# AI-Powered Garbage Detection and Reporting System

A citizen reporting app for waste detection, along with the ML and backend pieces behind it.

## 📚 Technical Documentation & System Reference
- 📘 [System Architecture & Specifications](docs/SYSTEM_ARCHITECTURE.md)
- 🧠 [Engineering Skills & Capabilities Matrix](docs/SKILLS_AND_CAPABILITIES.md)
- 🚀 [Online Deployment Guide (GitHub & Hugging Face)](docs/DEPLOYMENT_GUIDE.md)

In normal use, the mobile app talks to a **deployed municipal dashboard**, which owns authentication, persistence, image storage, and ML inference. This repo also includes a local FastAPI backend, but that exists **for development and reference only** — see [Which backend am I using?](#which-backend-am-i-using).

## Which backend am I using?

> **TL;DR — building or running the app? You don't need a backend.** It ships pre-configured for production. Any section marked **[Local backend only]** can be skipped.

| | Production backend (default) | Local backend (optional) |
|---|---|---|
| What it is | Deployed dashboard at `waste-detection-nexty.vercel.app`, maintained externally ([source](https://github.com/jagrat-khatter/waste-detection-nexty)) | FastAPI server in this repo's `server/` folder |
| Who should use it | Everyone building or evaluating the app | Developers modifying or studying backend code |
| Setup required | None — already configured | Python, PostgreSQL, trained model, config changes |
| Auth | Firebase email + verification | None |
| Storage | Cloudinary + Postgres (managed by the dashboard) | Local disk + local PostgreSQL |
| ML inference | Hosted API (HuggingFace) | Local YOLO model (`ml_models/best.pt`) |

## Live Dashboard

- Dashboard: [waste-detection-nexty.vercel.app](https://waste-detection-nexty.vercel.app)
- API base URL used by the app: `https://waste-detection-nexty.vercel.app`
- Source repo: [jagrat-khatter/waste-detection-nexty](https://github.com/jagrat-khatter/waste-detection-nexty)

## Separation of Concerns

### Mobile App

The `app/` folder is the citizen-facing client. It handles:

- Sign-in and email verification
- Capturing or uploading waste photos
- Collecting GPS location with each report
- Sending reports to the deployed dashboard backend
- Report history, status, and detail views
- Clean, citizen-friendly UI copy

### Deployed Dashboard / Backend

The live dashboard is the system of record for reports. Source: [waste-detection-nexty](https://github.com/jagrat-khatter/waste-detection-nexty). It handles:

- Accepting report submissions from the mobile app
- Running the detection and storage workflow
- Persisting report data and images
- Returning report history and details
- Serving the citizen-specific report feed

### Local Server Code — [Local backend only]

The `server/` folder holds the FastAPI implementation used for local development, experimentation, and reference — the project's original standalone backend before the deployed dashboard took over.

Useful for inspecting backend behavior, adapting endpoints, or running detection locally against a database and trained model. **Not used by the app by default.** See [Running the Local FastAPI Backend](#running-the-local-fastapi-backend--local-backend-only).

### ML Assets — [Local backend / ML development only]

`ml_training/`, `ml_models/`, `runs/`, `weights/`, and `uploads/` support the local detection workflow — training/evaluation artifacts, the local inference model, annotated outputs, and upload directories. Production users don't need these; the deployed dashboard runs its own hosted inference.

## How the App Works

1. The citizen signs in (email + password, with email verification).
2. They capture or select a photo of waste.
3. The app attaches location data and submits the report.
4. The deployed dashboard processes the image and stores the result.
5. The app fetches and displays the citizen's report history and status updates.

## Features

### Mobile Experience

- Sign in and email verification
- Image capture and gallery upload
- Automatic GPS tagging
- Report submission to the live dashboard backend
- Report list, detail view, and confidence display
- Pull-to-refresh support
- Short, clean citizen-facing copy

### Backend Workflow

- Deployed API for report creation and retrieval
- Report status tracking
- Image storage and serving
- ML inference and result persistence
- Citizen-scoped report access

### Machine Learning

- YOLO-based garbage detection
- Bounding box generation
- Confidence scoring
- Custom model support

## Repository Layout

```text
garbage-detection/
|-- app/                    # React Native + Expo client (talks to production backend)
|-- server/                 # [Local backend only] FastAPI source for local/reference use
|-- ml_training/            # [ML development only] Training scripts and experiments
|-- ml_models/              # [Local backend only] Saved model artifacts
|-- uploads/                # [Local backend only] Original and annotated image outputs
|-- runs/                   # [ML development only] Training/inference run outputs
|-- weights/                # [ML development only] Additional model weights
`-- README.md
```

## Mobile App Setup (all users)

### 1. Install dependencies

```bash
cd app
npm install
```

### 2. Start Expo

```bash
npm start
```

Or run a platform directly:

```bash
npm run android
npm run ios
npm run web
```

### 3. Backend configuration

**No configuration needed** — the app is already pointed at production. The base URL lives in `app/src/config/api.ts` if you ever need to inspect or change it.

## Running the Local FastAPI Backend — [Local backend only]

> **Skip this unless you specifically want to run or modify `server/`.** The app works out of the box against production without any of this.

### What the local backend is (and isn't)

The project's original MVP backend: a FastAPI service that accepts an image, runs the YOLO model locally, stores results in a local database, and serves report data. **No authentication**; images stored on local disk. It exists to keep the backend logic inspectable, runnable, and adaptable within this repo.

### Prerequisites

- Python 3.11+
- PostgreSQL running locally
- A trained YOLO model at `ml_models/best.pt` (not shipped — ask a team member or train one via `ml_training/`)
- Node/Expo prerequisites from the app section, if also running the app against it

### 1. Create the environment file

Create `.env` in the **repository root** (not inside `server/`):

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=garbage_detection
DB_USER=postgres
DB_PASSWORD=your_password
```

### 2. Install dependencies

```bash
cd server
python -m venv .venv
.venv\Scripts\activate        # Windows
# source .venv/bin/activate   # Linux/macOS
pip install -r requirements.txt
```

### 3. Create the database and tables

With PostgreSQL running:

```sql
CREATE DATABASE garbage_detection;
CREATE TABLE reports (
    id SERIAL PRIMARY KEY,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    original_image_path TEXT NOT NULL,
    annotated_image_path TEXT,
    garbage_detected BOOLEAN NOT NULL,
    garbage_count INTEGER NOT NULL,
    highest_confidence DOUBLE PRECISION NOT NULL,
    status VARCHAR(255) DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

Important:

- The backend code currently does not auto-create tables.
- Make sure the `reports` table is created before starting the app, either with a migration or a manual SQL script.

### 4. Start the server

```bash
uvicorn app:app --host 0.0.0.0 --port 8001
```

Verify it's up:

- Health check: `http://127.0.0.1:8001/health`
- Interactive API docs (Swagger): `http://127.0.0.1:8001/docs`

The full detection workflow is exercisable from Swagger alone — upload an image to `POST /detect`, browse results via `GET /reports`.

### 5. Pointing the mobile app at the local server

**Important limitation:** the current app speaks the *production* API (`/api/v1/upload`, `/api/v1/mycomplaints`) with Firebase auth. The local server exposes the older API (`/detect`, `/reports`) with no auth. These aren't interchangeable — changing the base URL alone won't get today's app talking to the local server.

Your options:

1. **Recommended for backend work:** hit the local server directly through Swagger (`/docs`) or `curl` — no app changes needed.
2. **Run the legacy app version matching the local API:** check out the last pre-integration revision and run it via Expo:

   ```bash
   git checkout 84f37a4 -- app
   cd app && npm install && npm start
   ```

   That version targets `/detect` and `/reports`, auto-detects your PC's LAN IP, and expects the server on port 8001. Phone and PC must share Wi-Fi. Restore the current app afterward with `git checkout main -- app`.
3. **Adapt the current app:** point `BASE_URL` in `app/src/config/api.ts` at `http://<your-PC-LAN-IP>:8001` and rework `app/src/services/detectionService.ts` / `reportService.ts` to the local endpoint shapes. Worth it only if you're deliberately evolving the local backend into a full replacement.

### Limitations of the local setup

- No authentication or per-citizen filtering — every client sees every report.
- Images stored on local disk (`uploads/`), not cloud storage.
- Requires the trained model file locally; detection quality depends on the model supplied.
- Local reports aren't visible on the live dashboard, and vice versa — separate databases.
- Phone must share a network with the server, which must bind to `0.0.0.0`.

## Dataset — [ML development only]

The training dataset comes from Roboflow and isn't committed to this repository. Download it separately:

https://universe.roboflow.com/garbage-detection-czeg5/garbage_detection-wvzwv

To train or retrain the model locally, place the downloaded dataset in `dataset/` after cloning.

## Technology Stack

### Client

- React Native
- Expo
- React Navigation
- Axios
- Firebase Authentication
- Expo Image Picker
- Expo Location

### Local Backend — [Local backend only]

- FastAPI
- PostgreSQL (via SQLAlchemy)
- Uvicorn
- YOLO (Ultralytics) for local inference

### Machine Learning

- YOLO
- PyTorch
- OpenCV

## Development Notes

- Run `npm run typecheck` from `app` to validate the Expo client.
- The deployed backend base URL is defined in `app/src/config/api.ts`.
- The mobile app uses typed navigation and shared status types.
- If the live backend URL changes, update `app/src/config/api.ts` and the Live Dashboard section above.
- **[Local backend only]** The local server's detection confidence threshold is tunable via `DETECTION_CONF` in `.env`.

## License

This project is intended for academic and research purposes.

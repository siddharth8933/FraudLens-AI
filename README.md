# FraudLens AI — SIH 2026 Prototype

FraudLens AI is a modular fake identity/document screening system based on the uploaded SIH PPT.

## Features

- Document upload: Aadhaar / PAN / Driving Licence / Passport
- OCR field extraction
- Image-forensics checks:
  - blur / sharpness
  - contrast
  - noise / compression indicators
  - edge-density anomalies
  - copy-paste style duplicate-region heuristic
  - suspicious image metadata
- Identity/data cross-checks
- Multi-layer risk scoring
- Decision: `GENUINE`, `SUSPICIOUS`, or `FLAG`
- Face detection + optional face comparison
- Live camera frame analysis from the browser
- Login / sign-up with password hashing
- SQLite + SQLAlchemy persistence
- FastAPI REST API
- React + CSS frontend
- Modular AI/CV service layer
- Optional PaddleOCR adapter
- No external API keys required for the demo

> This is a screening/prototype system, not a legal identity-verification service. Never use the score alone for a consequential decision.

## Architecture

React UI -> FastAPI -> Screening Engine
                         |-> OCR
                         |-> OpenCV forensics
                         |-> Face checks
                         |-> Data/pattern checks
                         |-> Risk scoring
                         |-> SQLite

## Requirements

- Python 3.14
- Node.js 20+
- npm 10+

Python packages are deliberately lightweight. The default OCR adapter uses Tesseract through `pytesseract`; if Tesseract is not installed, the API still starts and reports OCR availability clearly. A PaddleOCR adapter is included as an optional extension.

## Fastest Windows route

Double-click `run_backend.bat` and `run_frontend.bat` in two separate terminals. The first starts FastAPI; the second starts React/Vite. Then open the Vite URL.

## 1. Backend

Windows PowerShell:

```powershell
cd backend
py -3.14 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
copy .env.example .env
python -m app.main
```

Linux/macOS:

```bash
cd backend
python3.14 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
cp .env.example .env
python -m app.main
```

API: http://127.0.0.1:8000
Docs: http://127.0.0.1:8000/docs

### Tesseract OCR

For real OCR, install Tesseract separately and make sure `tesseract` is on PATH.

Windows:
- Install Tesseract OCR from a trusted package/source.
- Add its installation folder to PATH.

Linux:
```bash
sudo apt install tesseract-ocr
```

The application automatically detects whether Tesseract is available.

## 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open the URL shown by Vite, normally http://localhost:5173.

## 3. Demo flow

1. Create an account.
2. Open Screening.
3. Select document type.
4. Upload a document image.
5. Optionally enter expected name / ID number.
6. Click Analyze.
7. Review:
   - extracted OCR text
   - field extraction
   - forensic signals
   - face signal
   - data checks
   - risk score
   - decision
8. Open Live Camera and allow browser camera access.
9. Start camera analysis.

## API endpoints

- `POST /api/auth/signup`
- `POST /api/auth/login`
- `GET /api/health`
- `POST /api/screen/analyze`
- `POST /api/screen/live-frame`
- `GET /api/screen/history`

## Important implementation note

The PPT names PaddleOCR, OpenCV and Face Verification. This prototype preserves that architecture while using an install-friendly OCR adapter by default. The optional `paddle_adapter.py` can be enabled later when the target Paddle/PaddleOCR environment is validated.

The face module is intentionally conservative: it reports face presence and a similarity signal when two images are supplied, rather than pretending that a simple CV prototype is equivalent to biometric-grade verification.

## Project mapping to PPT

- AI Detection Engine -> `backend/app/services/screening.py`
- OCR + image forensics -> `ocr.py` + `forensics.py`
- Visual + data + pattern checks -> `screening.py`
- Document scan -> upload/analyze UI
- Identity match -> expected-field comparison
- Authenticity check -> forensics signals
- Risk score -> weighted risk engine
- Face verification -> `face.py`
- Login/sign-up -> `auth.py`
- Python + FastAPI -> backend
- React + CSS -> frontend
- SQLite + SQLAlchemy -> database
- OpenCV -> CV/forensics
- Modular API-first design -> service modules

## Production hardening checklist

- Use PostgreSQL instead of SQLite.
- Add real session/JWT management and refresh tokens.
- Encrypt sensitive identity data at rest.
- Add document retention/deletion policies.
- Add audit logging and access control.
- Replace heuristic face checks with a validated biometric model and liveness detection.
- Add trained document-specific tamper models.
- Add document-template/layout models for Aadhaar/PAN/DL/passport.
- Add human review workflow.
- Add model monitoring, false-positive/false-negative evaluation and threshold calibration.

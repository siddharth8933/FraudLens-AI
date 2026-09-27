from pathlib import Path
import base64
import json
import uuid

from fastapi import FastAPI, Depends, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from .config import APP_NAME, UPLOAD_DIR, MAX_UPLOAD_MB, ALLOWED_ORIGINS
from .db import Base, engine, get_db
from .models import Screening, User
from .schemas import SignupRequest, LoginRequest, HealthResponse
from .services.auth import create_user, authenticate
from .services.ocr import tesseract_available
from .services.screening import screen_document
from .services.face import compare_faces

Base.metadata.create_all(bind=engine)

app = FastAPI(title=APP_NAME, version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def save_upload(upload: UploadFile) -> Path:
    suffix = Path(upload.filename or "").suffix.lower()
    if suffix not in {".jpg", ".jpeg", ".png", ".webp"}:
        raise HTTPException(400, "Only JPG, JPEG, PNG and WEBP images are supported.")
    data = upload.file.read()
    if len(data) > MAX_UPLOAD_MB * 1024 * 1024:
        raise HTTPException(413, f"File exceeds {MAX_UPLOAD_MB} MB.")
    target = UPLOAD_DIR / f"{uuid.uuid4().hex}{suffix}"
    target.write_bytes(data)
    return target

@app.get("/api/health", response_model=HealthResponse)
def health():
    return {"status": "ok", "ocr_available": tesseract_available(), "version": "1.0.0"}

@app.post("/api/auth/signup")
def signup(payload: SignupRequest, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == payload.email.lower()).first()
    if existing:
        raise HTTPException(409, "Email already registered.")
    user = create_user(db, payload.email, payload.password)
    return {"message": "Account created.", "user": {"id": user.id, "email": user.email}}

@app.post("/api/auth/login")
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = authenticate(db, payload.email, payload.password)
    if not user:
        raise HTTPException(401, "Invalid email or password.")
    # Prototype token: replace with JWT/session management before production.
    return {"message": "Login successful.", "user": {"id": user.id, "email": user.email}}

@app.post("/api/screen/analyze")
def analyze(
    document_type: str = Form(...),
    expected_name: str | None = Form(None),
    expected_id: str | None = Form(None),
    document: UploadFile = File(...),
    reference_face: UploadFile | None = File(None),
    db: Session = Depends(get_db),
):
    path = save_upload(document)
    ref_path = None
    try:
        if reference_face:
            ref_path = save_upload(reference_face)

        result = screen_document(
            path,
            document_type.lower(),
            expected_name,
            expected_id,
            ref_path,
        )
        record = Screening(
            document_type=document_type.lower(),
            filename=document.filename or "document",
            decision=result["decision"],
            risk_score=result["risk_score"],
            result_json=json.dumps(result),
        )
        db.add(record)
        db.commit()
        db.refresh(record)

        return {
            "screening_id": record.id,
            "decision": result["decision"],
            "risk_score": result["risk_score"],
            "result": result,
        }
    finally:
        # Keep source files for demo history. Production should implement retention controls.
        pass

@app.post("/api/screen/live-frame")
async def live_frame(frame: UploadFile = File(...)):
    path = save_upload(frame)
    result = screen_document(path, "passport")
    return {
        "decision": result["decision"],
        "risk_score": result["risk_score"],
        "live": True,
        "reasons": result["reasons"][:5],
        "face": result["layers"]["face_detection"],
        "forensics": result["layers"]["visual_forensics"],
    }

@app.post("/api/screen/live-match")
async def live_match(document: UploadFile = File(...), live_face: UploadFile = File(...)):
    """Compare a live camera capture with the face on the uploaded document.

    This is a prototype face-similarity signal, not biometric-grade identity proof.
    """
    document_path = save_upload(document)
    live_path = save_upload(live_face)
    result = compare_faces(document_path, live_path)
    similarity = float(result.get("similarity", 0) or 0)
    score = round(max(0.0, min(100.0, similarity * 100.0)), 1)
    if not result.get("performed"):
        decision = "UNABLE TO MATCH"
    elif score >= 78:
        decision = "MATCH"
    elif score >= 60:
        decision = "REVIEW"
    else:
        decision = "NO MATCH"
    return {
        "match_score": score,
        "decision": decision,
        "similarity": similarity,
        "document_face": result.get("performed", False),
        "reason": result.get("reason") or ("Live face is similar to the document face." if decision == "MATCH" else "Live face did not pass the prototype similarity threshold."),
        "method": result.get("method", "OpenCV face crop correlation prototype"),
        "warning": "Prototype screening signal only; not biometric-grade identity verification."
    }

@app.get("/api/screen/history")
def history(db: Session = Depends(get_db)):
    rows = db.query(Screening).order_by(Screening.id.desc()).limit(25).all()
    return [{
        "id": x.id,
        "document_type": x.document_type,
        "filename": x.filename,
        "decision": x.decision,
        "risk_score": x.risk_score,
        "created_at": x.created_at.isoformat() if x.created_at else None
    } for x in rows]

@app.get("/")
def root():
    return {"name": APP_NAME, "docs": "/docs"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=False)

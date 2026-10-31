import os
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Generator

import jwt
from fastapi import Depends, FastAPI, File, Form, HTTPException, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from PIL import Image, UnidentifiedImageError
from pwdlib import PasswordHash
from pydantic import BaseModel, ConfigDict, EmailStr
from sqlalchemy import Date, DateTime, ForeignKey, String, Text, create_engine, select
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column, relationship, sessionmaker

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./woundcare.db")
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+psycopg://", 1)
elif DATABASE_URL.startswith("postgresql://") and "+psycopg" not in DATABASE_URL:
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg://", 1)

SECRET_KEY = os.getenv("SECRET_KEY", "")
if not SECRET_KEY and os.getenv("ENVIRONMENT") == "production":
    raise RuntimeError("Set a strong SECRET_KEY environment variable in production.")
if not SECRET_KEY:
    SECRET_KEY = "local-development-only-change-this-secret"
ALGORITHM = "HS256"
TOKEN_HOURS = 12
MAX_UPLOAD_BYTES = 10 * 1024 * 1024
UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", "./private_uploads")).resolve()
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, connect_args=connect_args, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
password_hash = PasswordHash.recommended()

class Base(DeclarativeBase):
    pass

class User(Base):
    __tablename__ = "users"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    full_name: Mapped[str] = mapped_column(String(160))
    password_hash: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    wounds: Mapped[list["Wound"]] = relationship(back_populates="owner", cascade="all, delete-orphan")

class Wound(Base):
    __tablename__ = "wounds"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    owner_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(120))
    body_location: Mapped[str] = mapped_column(String(160))
    first_noticed: Mapped[datetime] = mapped_column(Date)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    owner: Mapped[User] = relationship(back_populates="wounds")
    photos: Mapped[list["WoundPhoto"]] = relationship(back_populates="wound", cascade="all, delete-orphan")

class WoundPhoto(Base):
    __tablename__ = "wound_photos"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    wound_id: Mapped[str] = mapped_column(ForeignKey("wounds.id", ondelete="CASCADE"), index=True)
    stored_name: Mapped[str] = mapped_column(String(80), unique=True)
    original_name: Mapped[str] = mapped_column(String(255))
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    captured_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    wound: Mapped[Wound] = relationship(back_populates="photos")

class RegisterInput(BaseModel):
    full_name: str
    email: EmailStr
    password: str

class LoginInput(BaseModel):
    email: EmailStr
    password: str

class WoundInput(BaseModel):
    name: str
    body_location: str
    first_noticed: datetime

class UserOutput(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    full_name: str
    email: EmailStr

class WoundOutput(BaseModel):
    id: str
    name: str
    body_location: str
    first_noticed: datetime
    photo_count: int

class PhotoOutput(BaseModel):
    id: str
    wound_id: str
    note: str | None
    captured_at: datetime
    image_url: str

Base.metadata.create_all(bind=engine)

app = FastAPI(title="WoundCare API", version="0.1.0", description="Private wound record and photo timeline API. Not a diagnostic service.")
origins = [x.strip() for x in os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",") if x.strip()]
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def make_token(user: User) -> str:
    now = datetime.now(timezone.utc)
    return jwt.encode({"sub": user.id, "iat": now, "exp": now + timedelta(hours=TOKEN_HOURS)}, SECRET_KEY, algorithm=ALGORITHM)

def current_user(token: str, db: Session) -> User:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired access token")
    user = db.get(User, user_id) if user_id else None
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user

from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
bearer = HTTPBearer(auto_error=False)

def require_user(credentials: HTTPAuthorizationCredentials | None = Depends(bearer), db: Session = Depends(get_db)) -> User:
    if not credentials:
        raise HTTPException(status_code=401, detail="Sign in required")
    return current_user(credentials.credentials, db)

@app.get("/health")
def health():
    return {"status": "ok", "service": "woundcare-api"}

@app.post("/auth/register", status_code=201)
def register(data: RegisterInput, db: Session = Depends(get_db)):
    if len(data.password) < 10:
        raise HTTPException(400, "Password must be at least 10 characters")
    email = data.email.lower()
    if db.scalar(select(User).where(User.email == email)):
        raise HTTPException(409, "An account with this email already exists")
    user = User(full_name=data.full_name.strip(), email=email, password_hash=password_hash.hash(data.password))
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"access_token": make_token(user), "token_type": "bearer", "user": UserOutput.model_validate(user)}

@app.post("/auth/login")
def login(data: LoginInput, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.email == data.email.lower()))
    if not user or not password_hash.verify(data.password, user.password_hash):
        raise HTTPException(401, "Email or password is incorrect")
    return {"access_token": make_token(user), "token_type": "bearer", "user": UserOutput.model_validate(user)}

@app.get("/me", response_model=UserOutput)
def me(user: User = Depends(require_user)):
    return user

@app.get("/wounds", response_model=list[WoundOutput])
def list_wounds(user: User = Depends(require_user), db: Session = Depends(get_db)):
    wounds = db.scalars(select(Wound).where(Wound.owner_id == user.id).order_by(Wound.created_at.desc())).all()
    return [WoundOutput(id=w.id, name=w.name, body_location=w.body_location, first_noticed=w.first_noticed, photo_count=len(w.photos)) for w in wounds]

@app.post("/wounds", response_model=WoundOutput, status_code=201)
def create_wound(data: WoundInput, user: User = Depends(require_user), db: Session = Depends(get_db)):
    wound = Wound(owner_id=user.id, name=data.name.strip(), body_location=data.body_location.strip(), first_noticed=data.first_noticed.date())
    db.add(wound)
    db.commit()
    db.refresh(wound)
    return WoundOutput(id=wound.id, name=wound.name, body_location=wound.body_location, first_noticed=wound.first_noticed, photo_count=0)

@app.post("/wounds/{wound_id}/photos", response_model=PhotoOutput, status_code=201)
async def upload_photo(wound_id: str, file: UploadFile = File(...), note: str | None = Form(None), user: User = Depends(require_user), db: Session = Depends(get_db)):
    wound = db.scalar(select(Wound).where(Wound.id == wound_id, Wound.owner_id == user.id))
    if not wound:
        raise HTTPException(404, "Wound not found")
    allowed = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp"}
    if file.content_type not in allowed:
        raise HTTPException(415, "Only JPEG, PNG and WEBP images are accepted")
    raw = await file.read(MAX_UPLOAD_BYTES + 1)
    if len(raw) > MAX_UPLOAD_BYTES:
        raise HTTPException(413, "Image must be 10 MB or smaller")
    try:
        from io import BytesIO
        image = Image.open(BytesIO(raw))
        image.verify()
    except (UnidentifiedImageError, OSError):
        raise HTTPException(400, "Uploaded file is not a valid image")
    stored = f"{uuid.uuid4()}{allowed[file.content_type]}"
    (UPLOAD_DIR / stored).write_bytes(raw)
    photo = WoundPhoto(wound_id=wound.id, stored_name=stored, original_name=(file.filename or "photo")[:255], note=note)
    db.add(photo)
    db.commit()
    db.refresh(photo)
    return PhotoOutput(id=photo.id, wound_id=wound.id, note=photo.note, captured_at=photo.captured_at, image_url=f"/photos/{photo.id}")

@app.get("/wounds/{wound_id}/photos", response_model=list[PhotoOutput])
def list_photos(wound_id: str, user: User = Depends(require_user), db: Session = Depends(get_db)):
    wound = db.scalar(select(Wound).where(Wound.id == wound_id, Wound.owner_id == user.id))
    if not wound:
        raise HTTPException(404, "Wound not found")
    return [PhotoOutput(id=p.id, wound_id=p.wound_id, note=p.note, captured_at=p.captured_at, image_url=f"/photos/{p.id}") for p in db.scalars(select(WoundPhoto).where(WoundPhoto.wound_id == wound.id).order_by(WoundPhoto.captured_at.desc())).all()]

@app.get("/photos/{photo_id}")
def get_photo(photo_id: str, user: User = Depends(require_user), db: Session = Depends(get_db)):
    photo = db.scalar(select(WoundPhoto).join(Wound).where(WoundPhoto.id == photo_id, Wound.owner_id == user.id))
    if not photo:
        raise HTTPException(404, "Photo not found")
    path = UPLOAD_DIR / photo.stored_name
    if not path.is_file():
        raise HTTPException(404, "Image file not found")
    media = {".jpg": "image/jpeg", ".png": "image/png", ".webp": "image/webp"}.get(path.suffix, "application/octet-stream")
    return FileResponse(path, media_type=media, filename=photo.original_name, headers={"Cache-Control": "private, no-store"})

@app.get("/")
def root():
    return {"message": "WoundCare API", "docs": "/docs", "health": "/health"}

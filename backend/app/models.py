from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, Text
from .db import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class Screening(Base):
    __tablename__ = "screenings"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, nullable=True)
    document_type = Column(String(50), nullable=False)
    filename = Column(String(255), nullable=False)
    decision = Column(String(30), nullable=False)
    risk_score = Column(Float, nullable=False)
    result_json = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
